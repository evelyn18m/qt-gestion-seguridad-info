# Proposal: Audit Logging System

## Intent
SGSI has zero audit infrastructure — no login tracking, no change attribution, no download logs, no module usage tracking. This is a compliance gap for an information security management system. Need to answer: who did what, when, and what changed.

## Scope

### In Scope
- **Login audit**: Capture user login events from frontend after Keycloak auth
- **Asset CRUD audit**: Log creation with creator attribution; log updates with field-level diff (old→new)
- **XLSX download audit**: Log user, report type, and filter params for all 4 export endpoints
- **Module/page tracking**: NestJS global interceptor capturing HTTP method, path, user, timestamp
- **User context propagation**: `@CurrentUser()` decorator extracting JWT claims for controllers/services

### Out of Scope
- Real-time alerting on audit events
- Audit log retention/rotation policies
- Audit log UI (search/filter/view) — separate frontend change
- Catalog CRUD auditing (Amenaza, Vulnerabilidad, etc.) — only ValoracionActivo in scope

## Capabilities

### New Capabilities
- `audit-login`: Track user login with Keycloak identity
- `audit-asset-crud`: Log asset creation and field-level update diffs
- `audit-report-exports`: Log XLSX downloads with user and filter context
- `audit-http-tracking`: Global HTTP interceptor for module usage analysis
- `user-context-propagation`: Expose JWT user claims to NestJS handlers

### Modified Capabilities
None — greenfield audit infrastructure.

## Approach

**New `AuditLog` model**: `id, accion, modulo, entidad, entidadId, usuarioId, usuarioNombre, detalles (JSON @db.Text), ip, createdAt`. Add `createdBy`/`updatedBy` (String?) to `ValoracionActivo`.

**Two-layer architecture**:
1. **Explicit** (business events): `AuditService.log()` called in ValoracionesService for create/update, in ReportesService for exports, and via `POST /audit/login` for login events.
2. **Automatic** (interceptor): Global `AuditInterceptor` captures method, path, user, duration. Whitelist filter excludes health/static noise.

**User propagation**: Custom `@CurrentUser()` param decorator reads `request.user` (set by AuthGuard). Controllers pass user to services.

**Asset diff on update**: Fetch current record before update, diff DTO fields, store `{campo: {old, new}}` JSON in `detalles`.

**Login audit trigger**: Frontend `keycloak.client.ts` calls `POST /audit/login` after successful Keycloak init.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | New + Mod | AuditLog model; createdBy/updatedBy on ValoracionActivo |
| `backend/src/audit/` | New | AuditModule, AuditService, controller, AuditInterceptor |
| `backend/src/auth/` | New | CurrentUser decorator |
| `backend/src/valoraciones/` | Modified | Inject AuditService, log create/update with diff |
| `backend/src/reportes/` | Modified | Log export events in service |
| `backend/src/app.module.ts` | Modified | Import AuditModule, register interceptor |
| `frontend/plugins/keycloak.client.ts` | Modified | Call POST /audit/login after init |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| AuditLog table growth → perf | Med | `createdAt` index; future retention policy (out of scope) |
| Interceptor noise (static, health) | Low | Whitelist-based path filtering |
| Asset 35-field diff verbosity | Low | Store only changed fields; omit null/unchanged |

## Rollback
1. Remove AuditModule from `app.module.ts`
2. Drop `AuditLog` table, revert `ValoracionActivo.createdBy`/`updatedBy` via `db push`
3. Audit is additive — no existing behavior changes. Rollback is clean.

## Dependencies
None. Uses existing JWT auth (`JwtStrategy`, `extractJwtPayload`) and `PrismaService`.

## Success Criteria
- [ ] `POST /audit/login` records login events from frontend
- [ ] Asset creation logs `createdBy` attribution and audit entry
- [ ] Asset update logs field-level diff in `detalles` JSON
- [ ] All 4 XLSX export endpoints log user + report type + filters
- [ ] Global interceptor captures method + path + user for all app routes
- [ ] New code has unit tests (AuditService, decorator, interceptor)
- [ ] `@CurrentUser()` decorator works in controllers behind AuthGuard
