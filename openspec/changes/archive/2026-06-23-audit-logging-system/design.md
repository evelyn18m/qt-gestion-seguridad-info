# Design: Audit Logging System

## Technical Approach

Greenfield 3-layer audit infrastructure: (1) explicit business events via `AuditService.log()` in valoraciones/reportes, (2) automatic `AuditInterceptor` (global APP_INTERCEPTOR) for all HTTP routes with whitelist filtering, (3) Nuxt plugin `router.afterEach` → server proxy → backend endpoint for page tracking. Every entry links to Keycloak user via `usuarioId` (`sub` claim), with IP + user-agent captured everywhere. AuditService wraps Prisma writes in try/catch — fire-and-forget, NEVER throws.

**Critical**: JWT strategy maps `sub → userId`, `preferred_username → username`. Use `request.user.userId` and `request.user.username`, NOT raw Keycloak claim names.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| AuditModule scope | Global vs per-module import | Global avoids import in 3+ modules; per-module is explicit | `@Global()` — used by valoraciones, reportes, controllers |
| Interceptor registration | APP_INTERCEPTOR in module vs main.ts `useGlobalInterceptors` | Module provider follows existing APP_GUARD pattern; main.ts is simpler but less NestJS-idiomatic | `APP_INTERCEPTOR` in AuditModule providers — matches `APP_GUARD` precedent |
| User field names | `user.userId` / `user.username` vs modify JWT strategy to pass `sub` | Strategy already transforms claims; changing it risks breaking existing consumers | Use `user.userId`/`user.username` — zero impact, matches existing `JwtPayload` interface |
| Asset diff granularity | Full 35-field record vs only changed fields | Full diff is verbose but complete; changed-only needs fetch-then-compare | Changed-only — fetch current record, compare DTO fields, omit unchanged. Reduces storage |
| Frontend audit proxy | Nuxt `server/api/` vs direct `$fetch` to backend | Server routes keep backend URL internal, forward headers; direct exposes backend to browser | Server routes — proxy pattern keeps backend private, forwards user-agent + IP |
| IP extraction | `x-forwarded-for` → `req.ip` fallback → `'unknown'` | Multiple sources handle proxies; single source is simpler | Implement `extractIp()` utility with chain fallback |

## Data Flow

```
LOGIN:
  keycloak.init() → token → $fetch(POST /api/audit/login) → Nuxt proxy → POST /audit/login → AuditService.log()

PAGE VISIT:
  router.afterEach(to) → $fetch(POST /api/audit/page-visit, {path}) → Nuxt proxy → POST /audit/page-visit → AuditService.log()

ASSET UPDATE:
  Controller(@CurrentUser user, @Req req) → Service.update(id, dto, user, req) → fetch current → prisma update → computeDiff() → AuditService.log(diff)

EXPORT:
  Controller(@CurrentUser user, @Req req, @Query filters) → Service.export(tipo, filters, user, req) → generate XLSX → AuditService.log({accion:EXPORT, ...})
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | Add `AuditLog` model + `createdBy`/`updatedBy` on `ValoracionActivo` |
| `backend/src/audit/audit.module.ts` | Create | `@Global()` module, imports PrismaService, provides AuditService + AuditInterceptor |
| `backend/src/audit/audit.service.ts` | Create | `log(dto)`, `findAll(query)`, `findById(id)` — fire-and-forget wrapper |
| `backend/src/audit/audit.controller.ts` | Create | `POST /audit/login`, `POST /audit/page-visit`, `GET /audit` |
| `backend/src/audit/audit.interceptor.ts` | Create | Global NestInterceptor, whitelist skips `/health`, `/api/docs`, `/favicon.ico` |
| `backend/src/audit/dto/audit-event.dto.ts` | Create | `CreateAuditEventDto` with class-validator |
| `backend/src/audit/dto/page-visit.dto.ts` | Create | `PageVisitDto { path: string }` |
| `backend/src/audit/dto/audit-query.dto.ts` | Create | `AuditQueryDto` — pagination + filter by accion/modulo/usuarioId/date range |
| `backend/src/audit/ip.util.ts` | Create | `extractIp(request)` — x-forwarded-for → req.ip → unknown |
| `backend/src/auth/decorators/current-user.decorator.ts` | Create | `@CurrentUser()` param decorator → `request.user` |
| `backend/src/valoraciones/valoraciones.controller.ts` | Modify | Add `@CurrentUser()`, `@Req()` params; pass to service |
| `backend/src/valoraciones/valoraciones.service.ts` | Modify | Add `AuditService` injection; `create(id, dto, user, req)` with diff; `computeDiff()` helper |
| `backend/src/valoraciones/valoraciones.module.ts` | Modify | Import `AuditModule` |
| `backend/src/reportes/reportes.controller.ts` | Modify | Add `@CurrentUser()`, `@Req()` to 4 export endpoints |
| `backend/src/reportes/reportes.service.ts` | Modify | Add `AuditService` injection; log EXPORT after buffer generation in 4 methods |
| `backend/src/reportes/reportes.module.ts` | Modify | Import `AuditModule` |
| `backend/src/app.module.ts` | Modify | Import `AuditModule` |
| `frontend/plugins/audit-page-tracker.ts` | Create | Nuxt plugin: `router.afterEach` → `$fetch(POST /api/audit/page-visit)` |
| `frontend/plugins/keycloak.client.ts` | Modify | After `keycloak.init()` success, fire-and-forget `$fetch(POST /api/audit/login)` |
| `frontend/server/api/audit/login.post.ts` | Create | Proxy to backend `POST /audit/login`, forward user-agent + IP |
| `frontend/server/api/audit/page-visit.post.ts` | Create | Proxy to backend `POST /audit/page-visit`, forward user-agent + IP |

## Interfaces / Contracts

### AuditService.log() — fire-and-forget contract
```typescript
async log(dto: CreateAuditEventDto): Promise<void> {
  try { await this.prisma.auditLog.create({ data: dto }); }
  catch (e) { console.error('[AuditService] log failed:', e); }
  // NEVER throws — caller must not await
}
```

### computeDiff() — only changed fields
```typescript
private computeDiff(current: ValoracionActivo, dto: UpdateValoracionDto): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, newVal] of Object.entries(dto)) {
    if (newVal === undefined || newVal === null) continue;
    const oldVal = (current as any)[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }
  return diff;
}
```

### extractIp utility
```typescript
export function extractIp(request: any): string {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.ip || 'unknown';
}
```

### @CurrentUser decorator
```typescript
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user ?? null,
);
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit: AuditService | `log()` wraps create in try/catch, never throws | Jest mock Prisma: simulate success + failure |
| Unit: AuditService | `findAll()` paginates and filters correctly | Mock Prisma findMany, assert filter args |
| Unit: AuditInterceptor | Skips whitelist paths, logs others with user/ip/duration | Mock ExecutionContext, CallHandler; assert log() called/not called |
| Unit: CurrentUser decorator | Returns `request.user` when set, null when absent | Mock ExecutionContext with/without user |
| Unit: ValoracionesService | `create()` calls AuditService.log with CREATE + user fields | Mock AuditService, assert log() args |
| Unit: ValoracionesService | `update()` calls computeDiff + AuditService.log with diff | Mock current record, assert diff structure |
| Unit: ReportesService | 4 export methods call AuditService.log with EXPORT + tipo + filters | Mock AuditService, verify log() per export |
| Unit: extractIp | Parses x-forwarded-for, falls back to req.ip | Jest unit, no NestJS needed |
| E2E | POST /audit/login creates AuditLog row | Supertest, verify 201 + DB insert |
| E2E | Interceptor captures API_ACCESS on GET /valoraciones | Supertest with auth header, verify AuditLog insert |

## Migration / Rollout

```bash
docker compose exec backend npx prisma db push
```
No data migration needed — AuditLog starts empty, `createdBy`/`updatedBy` start NULL. Rollback: remove AuditModule from imports, drop AuditLog table + revert ValoracionActivo columns via `db push`.

## Open Questions

- None — all technical decisions resolved by proposal v2 clarifications and codebase inspection.
