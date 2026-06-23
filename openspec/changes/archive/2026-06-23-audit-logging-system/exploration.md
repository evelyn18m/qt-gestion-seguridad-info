# Exploration: audit-logging-system

## Change Intent
Generar auditorías para: login de usuarios, uso de herramientas, registro de activos nuevos, actualización de activos (qué se modificó, quién, cuándo), y descarga del informe en XLSX.

---

## 1. Current State Summary

### 1.1 User Login / Authentication Flow

**How auth works end-to-end:**
- **Keycloak** (port 8080, realm `quito-turismo`, client `sgsi-app`) handles ALL authentication via OIDC/OAuth2.
- **Frontend** (`keycloak-js` v26): Initializes Keycloak with `check-sso`, obtains JWT tokens. No backend login endpoint exists — login is entirely client-side via `$keycloak.login()`.
- **Backend** (`passport-jwt` + `jwks-rsa`): Validates JWT tokens against Keycloak's JWKS endpoint. The `AuthGuard` is applied globally (APP_GUARD) via `app.module.ts`. The `JwtStrategy` extracts `userId`, `username`, `email`, and `roles` from the JWT payload.
- **Token refresh**: Handled client-side — `useApi.ts` calls `$keycloak.updateToken(30)` before every API call. Background refresh every 60 seconds.

**Login tracking — NONE EXISTS:**
- No `User` model in the Prisma schema. The system has `Funcionario` (custodians) and `Area` (owners) but NO user entity for login tracking.
- No `last_login`, `login_at`, or any session tracking field anywhere.
- The backend has NO login endpoint — it's purely a JWT validator. The "login" event happens entirely in Keycloak's domain.

**Key files:**
- `backend/src/auth/auth.guard.ts` — global JWT guard
- `backend/src/auth/jwt.strategy.ts` — JWT validation via JWKS
- `backend/src/auth/jwt.types.ts` — `extractJwtPayload()` extracts user info
- `backend/src/main.ts` — app bootstrap, NO middleware or interceptors
- `frontend/plugins/keycloak.client.ts` — Keycloak init
- `frontend/composables/useAuth.ts` — login/logout composable
- `frontend/composables/useSession.ts` — session expiry tracking

### 1.2 Tool Usage (Herramientas)

**CRITICAL FINDING — "Herramienta" does NOT exist as a domain entity:**
- Zero results for "herramienta" or "tool" in backend source code.
- Only CSS references in frontend (`.catalogo-toolbar`, apex `toolbar`, `tooltip`).
- The system is an **SGSI (Sistema de Gestión de Seguridad de la Información)**, not a general tool management system.

**Interpretation:** "Uso de herramientas" most likely means **usage of the system's modules/features** — i.e., HTTP-level request auditing across all endpoints. The system's "tools" are:

| Module | Controller | Operations |
|--------|-----------|------------|
| Catálogos | `CatalogosController` | CRUD for 15 catalog types |
| Valoraciones | `ValoracionesController` | CRUD + risk calculation |
| Reportes | `ReportesController` | 10 read endpoints + 4 export endpoints |
| Parametrización | `ParametrosController` | Config CRUD |

**Alternatively**, the user may be referring to a NOT-YET-IMPLEMENTED feature. This needs clarification in the proposal phase.

### 1.3 Asset Registration (Registro de Activos Nuevos)

**What exists:**
- Main entity: `ValoracionActivo` (Prisma model, ~35 fields).
- Creation endpoint: `POST /valoraciones` → `ValoracionesService.create()`.
- Creation is a single call that creates the `ValoracionActivo` record and optionally multiple `DetalleRiesgo` child records in a transaction.
- DTO: `CreateValoracionDto` has all fields (nombreActivo, tipoActivoId, formatoId, macroProcesoId, subProcesoId, propietarioId, custodioId, descripcion, controlSeguridad, ubicacion, observaciones, confidencialidadId, integridadId, disponibilidadId, tieneDatosPersonales, amenazas, vulnerabilidades, etc.).

**What's MISSING for audit:**
- No `createdBy` field on `ValoracionActivo`.
- No audit record is created when a new asset is registered.
- The service method has no access to WHO is making the request (no user context extraction).

### 1.4 Asset Update Trail (Actualización de Activos)

**What exists:**
- Update endpoint: `PATCH /valoraciones/:id` → `ValoracionesService.update()`.
- On update, existing `DetalleRiesgo` children are **deleted and recreated** (no diff).
- Model has `createdAt` and `updatedAt` timestamps automatically managed by `@default(now())` and `@updatedAt`.
- DTO: `UpdateValoracionDto` extends `CreateValoracionDto` (same fields, all optional).

**What's MISSING for audit:**
- No `updatedBy` field.
- No history/version table — you cannot tell WHO changed WHAT or WHEN.
- No field-level diff — you cannot reconstruct the exact change.
- The delete-and-recreate pattern for `DetalleRiesgo` makes per-field tracking harder.

### 1.5 Report Download (Descarga XLSX)

**What EXISTS — substantial:**
- 4 export endpoints already implemented:
  - `GET /reportes/valoracion-activos/export`
  - `GET /reportes/analisis-riesgo-activos/export`
  - `GET /reportes/evaluacion-riesgo/export`
  - `GET /reportes/tratamiento-riesgo/export`
- Library: `xlsx-js-style` v1.2.0 (already in `backend/package.json` dependencies).
- Also has `xlsx` v0.18.5 as a dependency.
- Export pattern: `ReportesService.export*()` generates `Buffer`, controller streams it with proper headers.
- Frontend: Each report page has an `exportExcel()` function that calls the export endpoint, receives a blob, and triggers download via `window.URL.createObjectURL`.
- Styled headers (purple `#4F46E5` background, white text), auto-filter, auto-width columns.

**What's MISSING for audit:**
- No logging when an export/download happens.
- No record of who downloaded what report, with what filters, at what time.

### 1.6 Existing Audit Infrastructure

**COMPLETELY ABSENT:**
- **No audit tables** in Prisma schema (0 audit/history/log models).
- **No NestJS interceptor** for request/response logging.
- **No Prisma middleware** for change tracking.
- **No audit decorator** or custom metadata.
- `PrismaService` is bare — only `$connect()` and `$disconnect()`.
- `main.ts` has no interceptors, no middleware beyond `ValidationPipe` and `CORS`.
- The `AuthGuard` provides user info but it's NOT propagated to service/controller context.

---

## 2. Prisma Schema Analysis

### 2.1 Current Models (18 total)

| Model | Key Fields | Notes |
|-------|-----------|-------|
| `Amenaza` | id, categoria, nombre, tipoFuente, createdAt, updatedAt | Threat catalog |
| `Vulnerabilidad` | id, categoria, descripcion, createdAt, updatedAt | Vulnerability catalog |
| `Impacto` | id, tipo, nivel, valor, criterio, createdAt, updatedAt | CIA impact catalog |
| `Formato` | id, nombre, createdAt, updatedAt | Format catalog |
| `Subproceso` | id, nombre, macroProcesoId, createdAt, updatedAt | Subprocess catalog |
| `MacroProceso` | id, nombre, codigo, createdAt, updatedAt, subprocesses[] | Macro process catalog |
| `TipoActivo` | id, nombre, detalle, createdAt, updatedAt | Asset type catalog |
| `Valoracion` | id, nombre, createdAt, updatedAt | Valuation name catalog |
| `Funcionario` | id, nombre, createdAt, updatedAt | Custodian catalog |
| `Area` | id, nombre, createdAt, updatedAt | Owner/area catalog |
| `ValoracionActivo` | id, nombreActivo, tipoActivoId, formatoId, macroProcesoId, subProcesoId, propietarioId, custodioId, descripcion, controlSeguridad, ubicacion, observaciones, confidencialidadId, integridadId, disponibilidadId, tieneDatosPersonales, amenazas, vulnerabilidades, controlesImplementacion, impacto, probabilidadId, amenazaRiesgoId, vulnerabilidadRiesgoId, controlesArea, evaluacionRiesgo, nivelRiesgo, metodoTratamiento, tipoControl, controlesImplementar, nivelAmenazaControl, nivelVulnerabilidadControl, evaluacionRiesgoControl, nivelRiesgoControl, createdAt, updatedAt | **Main asset entity** (~35+ fields, NO createdBy/updatedBy) |
| `DetalleRiesgo` | id, valoracionActivoId, tipo, catalogoId, riesgoId, vulnerabilidadRiesgoId, evaluacionRiesgo, nivelRiesgo, metodoTratamiento, tipoControlId, riesgoControlId, vulnerabilidadControlId, evaluacionRiesgoControl, nivelRiesgoControl, riesgoResidual, amenazaIds, vulnerabilidadIds, controlesImplementados, controlesArea, controlesImplementarId, createdAt, updatedAt | Risk detail per asset, delete+recreate on update |
| `TipoControl` | id, nombre, createdAt, updatedAt | Control type catalog |
| `Probabilidad` | id, nombre, valor, createdAt, updatedAt | Probability catalog |
| `Riesgo` | id, tipo, nivel, valor, createdAt, updatedAt | Risk level catalog |
| `CategoriaControlesImplementar` | id, nombre, controlesImplementar[] | Control category catalog |
| `ConfiguracionRiesgo` | id, riesgoBajoMax, riesgoBajoDesde, ... (20+ config fields), createdAt, updatedAt | Risk thresholds |
| `ControlesImplementar` | id, seccion, descripcion, categoriaId, categoria, detallesRiesgo[] | Controls catalog |

### 2.2 What's MISSING for Audit

A new `AuditLog` model is needed. Recommended schema:

```prisma
model AuditLog {
  id          Int      @id @default(autoincrement())
  accion      String   // "LOGIN", "CREATE_ASSET", "UPDATE_ASSET", "EXPORT_REPORT", "ACCESS_MODULE"
  entidad     String?  // e.g. "ValoracionActivo", "Reporte", "Catalogo"
  entidadId   Int?     // ID of the affected entity
  usuarioId   String   // Keycloak sub (user ID)
  usuarioNombre String  // preferred_username from JWT
  detalles    String?  @db.Text // JSON: old/new values for updates, filters for exports, etc.
  ip          String?  // client IP (optional)
  createdAt   DateTime @default(now())
}
```

### 2.3 Fields to ADD to Existing Models

For direct attribution, add to `ValoracionActivo`:
```prisma
createdBy String? // Keycloak user ID who created the asset
updatedBy String? // Keycloak user ID who last modified the asset
```

---

## 3. Module Map — Backend

| Module | Path | Controller | Service | Key Operations |
|--------|------|-----------|---------|---------------|
| **Auth** | `src/auth/` | - (no controller) | - (strategy only) | JWT validation, user extraction |
| **Catalogos** | `src/catalogos/` | `CatalogosController` | `CatalogosService` | Generic CRUD for 15 catalog types |
| **Valoraciones** | `src/valoraciones/` | `ValoracionesController` | `ValoracionesService` + `CalculoRiesgoService` | Asset CRUD, risk calculation, recalculation |
| **Reportes** | `src/reportes/` | `ReportesController` | `ReportesService` | 10 read endpoints, 4 Excel exports |
| **Parametros** | `src/parametros/` | `ParametrosController` | `ParametrosService` | Risk config CRUD |
| **Prisma** | `src/prisma/` | - | `PrismaService` | DB connection (bare — no middleware) |

**No `Herramienta` module exists anywhere in the codebase.**

---

## 4. Frontend Routes

| Route | Page | Features |
|-------|------|----------|
| `/` | `index.vue` | Welcome dashboard (empty grid) |
| `/catalogos?tipo=...` | `catalogos.vue` | CRUD for 15 catalog types via `CatalogoManager` component |
| `/valoracion` | `valoracion.vue` | Asset valuation CRUD with `ValoracionModal` and `ValoracionViewModal` |
| `/parametrizacion` | `parametrizacion.vue` | Risk configuration editor |
| `/reportes/valoracion-activos` | `reportes/valoracion-activos.vue` | Asset valuation report + Excel export |
| `/reportes/analisis-riesgo` | `reportes/analisis-riesgo.vue` | Risk analysis report + Excel export |
| `/reportes/evaluacion-riesgo` | `reportes/evaluacion-riesgo.vue` | Risk evaluation report + Excel export |
| `/reportes/tratamiento-riesgo` | `reportes/tratamiento-riesgo.vue` | Risk treatment report + Excel export |
| `/reportes/mapa-calor` | `reportes/mapa-calor.vue` | Heatmap visualization |
| `/reportes/index` | `reportes/index.vue` | Reports landing page |

**No `/herramientas` or tool-related page exists.**

---

## 5. Gap Analysis

### 5.1 What's MISSING for Each Audit Feature

| Feature | DB Schema | Backend | Frontend | Complexity |
|---------|-----------|---------|----------|------------|
| **Login audit** | `AuditLog` table | Endpoint to receive login event from frontend; extract user from JWT | Call audit endpoint after Keycloak login success | LOW |
| **Tool usage** | Same `AuditLog` table | NestJS interceptor to capture HTTP method, path, user, timestamp | None needed (backend-only) | MEDIUM |
| **Asset creation audit** | `createdBy` on `ValoracionActivo` + `AuditLog` row | Extract user from request in `ValoracionesService.create()` | None needed | LOW |
| **Asset update audit** | `updatedBy` on `ValoracionActivo` + `AuditLog` row with field-level diff | Extract user + compare old/new fields in `ValoracionesService.update()` | None needed | MEDIUM |
| **Report download audit** | `AuditLog` row with report type + filters | Log in each export endpoint with user + filter params | None needed (backend-only) | LOW |

### 5.2 Critical Infrastructure Gaps

1. **No user context propagation** — controllers/services have no access to the authenticated user. The `AuthGuard` authenticates, but the user object is NOT passed through to service methods. Need to extract user info at the controller level or via an interceptor.

2. **No audit module** — must create `src/audit/` from scratch (model, module, service).

3. **"Herramienta" clarification needed** — the system has no domain entity called "herramienta". The user likely means "module/feature usage tracking" but this needs explicit confirmation in the proposal phase.

---

## 6. Implementation Complexity Estimates

| Sub-Feature | Complexity | Reason |
|-------------|------------|--------|
| AuditLog Prisma model + migration | LOW | Single table, straightforward fields |
| AuditModule + AuditService | LOW | Standard NestJS module with create method |
| Login audit endpoint | LOW | One POST endpoint, called from frontend after Keycloak login |
| Asset creation audit | LOW | Add `createdBy` field, log in `create()` method |
| Asset update audit | MEDIUM | Field-level diff logic + `updatedBy` field |
| XLSX download audit | LOW | Add logging in existing export methods |
| Global HTTP tool usage audit | MEDIUM | Interceptor design, path-to-tool mapping, filtering noise |
| User context propagation | MEDIUM | Need decorator or interceptor to make user accessible in services |
| Frontend login hook | LOW | Call audit endpoint after Keycloak init |
| **TOTAL** | **MEDIUM** | Most pieces are individually low complexity; user-propagation and update-diff are the two medium items |

---

## 7. Key Files for Implementation

### Backend (must touch)

| File | Why |
|------|-----|
| `backend/prisma/schema.prisma` | Add `AuditLog` model, add `createdBy`/`updatedBy` to `ValoracionActivo` |
| `backend/src/audit/` | NEW — module, service, controller |
| `backend/src/valoraciones/valoraciones.controller.ts` | Extract user from request, pass to service |
| `backend/src/valoraciones/valoraciones.service.ts` | Inject AuditService, log create/update operations |
| `backend/src/reportes/reportes.controller.ts` | Extract user, pass to service for export logging |
| `backend/src/reportes/reportes.service.ts` | Inject AuditService, log in export methods |
| `backend/src/app.module.ts` | Import AuditModule |
| `backend/src/auth/jwt.types.ts` | Already has `extractJwtPayload()` — reusable |
| `backend/src/prisma/prisma.service.ts` | Already configured — no changes needed |

### Frontend (must touch)

| File | Why |
|------|-----|
| `frontend/plugins/keycloak.client.ts` | Add audit ping after successful login |
| `frontend/composables/useApi.ts` | Already has auth logic — may need minor changes |

### Potentially "herramienta-related" if user means module tracking

| File | Why |
|------|-----|
| `backend/src/catalogos/catalogos.controller.ts` | Auditing catalog operations |
| `backend/src/catalogos/catalogos.service.ts` | Auditing catalog mutations |
| `backend/src/parametros/parametros.controller.ts` | Auditing config changes |
| `backend/src/parametros/parametros.service.ts` | Auditing config mutations |

---

## 8. Recommendations

### 8.1 Architecture: Two-Layer Audit

**Layer 1 — Domain-Specific Audit (explicit, business-level)**
- Login, asset create/update, report exports.
- Each controller/service explicitly calls `AuditService.log()` with structured data.
- This captures business-meaningful events with rich context (old/new values for updates, filter params for exports).

**Layer 2 — HTTP Interceptor Audit (automatic, request-level)**
- A NestJS interceptor that captures every request: method, path, user, status code, duration.
- This fulfills "uso de herramientas" by logging which modules/pages are accessed.
- Must filter out noise (health checks, static assets) and protect against log bloat.

### 8.2 User Context Propagation

Use a NestJS custom decorator `@CurrentUser()` to extract user info from the request object:
```typescript
// auth/user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // { userId, username, email, roles }
  }
);
```

This is clean, follows NestJS patterns, and requires minimal changes to existing controllers.

### 8.3 Asset Update Diff Strategy

When updating `ValoracionActivo`, before calling `prisma.valoracionActivo.update()`:
1. Fetch the current record (`await this.findOne(id)`)
2. Compare DTO fields with current values
3. Store diff as JSON: `{ campo: { old: "X", new: "Y" }, ... }`
4. Log the AuditLog entry with `detalles` = that JSON

### 8.4 "Herramienta" — PENDING CLARIFICATION

Before proceeding to spec/design, confirm with the user:
- Does "herramientas" mean HTTP-level module tracking (as assumed above)?
- Or is there a planned "Herramienta" module/entity to be created?
- If the former: use the interceptor approach (Layer 2).
- If the latter: treat it as a new domain entity with its own audit rules.

### 8.5 Database Migration

Run `npx prisma db push` after adding `AuditLog` model (no migration history needed for MVP).
`db push` syncs schema without migration files — preferred for this project per AGENTS.md.

### 8.6 Testing Considerations

- Backend has TDD support (Jest 30 + ts-jest). Write unit tests for `AuditService`.
- Test `ValoracionesService` changes to verify audit logs are created on create/update.
- Frontend has NO test runner — login audit ping testing is manual.

### 8.7 "Tool Usage" Recommendation

Use a NestJS global interceptor that:
- Captures all `POST`, `PATCH`, `PUT`, `DELETE` requests (mutations only — to reduce noise).
- Maps `Controller` + `path` to a user-friendly "tool" name (e.g., `POST /valoraciones` → "Creación de Activo").
- Uses a whitelist approach: only log known application routes, skip health/config.

---

## 9. Ready for Proposal

**Yes** — but with one pending clarification: the definition of "herramientas" needs user confirmation before proceeding to spec/design. The exploration assumes HTTP-level module usage tracking, which may or may not match the user's intent.

All other five audit areas have clear implementation paths with LOW to MEDIUM complexity.
