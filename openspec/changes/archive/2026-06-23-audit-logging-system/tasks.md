# Tasks: Audit Logging System

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750-820 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 foundation (~350L) → PR2 integration (~350L) → PR3 frontend (~75L) |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Notes |
|------|------|-----------|------|-------|
| 1 | Audit models + core service + controller + decorator + ip.util | PR 1 | feature/audit-logging | ~350L, tests included, autonomous (importable module) |
| 2 | Interceptor + valoraciones CRUD + reportes export integration | PR 2 | PR 1 branch | ~350L, tests included, autonomous (wired end-to-end) |
| 3 | Frontend plugins + proxy routes | PR 3 | PR 2 branch | ~75L, lightweight wiring only |

## Phase 1: Foundation (PR 1 candidate)

- [ ] 1.1 (TDD, RED→GREEN) Add `AuditLog` model + `createdBy`/`updatedBy` to `ValoracionActivo` in `prisma/schema.prisma`; `db push`
- [ ] 1.2 (TDD, RED→GREEN) Create `src/audit/dto/` (audit-event, page-visit, audit-query), `src/auth/decorators/current-user.decorator.ts`, `src/audit/ip.util.ts`; specs for decorator + ip.util
- [ ] 1.3 (TDD, RED→GREEN) Create `src/audit/audit.service.ts` — `log()` fire-and-forget try/catch, `findAll()`, `findById()`; spec for log + findAll
- [ ] 1.4 Create `src/audit/audit.module.ts` (@Global, provides AuditService + APP_INTERCEPTOR), `src/audit/audit.controller.ts` (POST login + page-visit, GET audit), wire `app.module.ts`; controller spec

## Phase 2: Automatic Capture (PR 2 candidate)

- [ ] 2.1 (TDD, RED→GREEN) Create `src/audit/audit.interceptor.ts` — whitelist skip `/health`, `/api/docs`, `/favicon.ico`; capture method/path/userId/IP/userAgent/status/durationMs; fire-and-forget; spec

## Phase 3: Business Integration (PR 2 candidate, parallel with 2.1)

- [ ] 3.1 (TDD, RED→GREEN) Add `@CurrentUser()`+`@Req()` to `ValoracionesController.create()/update()`; inject `AuditService` in `ValoracionesService`; implement `computeDiff()` field-level; log CREATE with `createdBy` + UPDATE with diff JSON; import `AuditModule`; spec
- [ ] 3.2 (TDD, RED→GREEN) Add `@CurrentUser()`+`@Req()` to 4 export endpoints in `ReportesController`; inject `AuditService` in `ReportesService`; log EXPORT with tipo+filtros after buffer in all 4 methods; import `AuditModule`; spec

## Phase 4: Frontend (PR 3 candidate)

- [ ] 4.1 Modify `frontend/plugins/keycloak.client.ts` — fire-and-forget `$fetch(POST /api/audit/login)` after init success with `userId`
- [ ] 4.2 Create `frontend/plugins/audit-page-tracker.ts` — Nuxt plugin: `useRouter().afterEach` → `$fetch(POST /api/audit/page-visit)`
- [ ] 4.3 Create `frontend/server/api/audit/login.post.ts` + `page-visit.post.ts` — proxy to backend forwarding `user-agent` + `x-forwarded-for`

## Dependency Graph

```
1.1 (schema) → 1.2 (DTOs+decorator+ip) → 1.3 (AuditService) → 1.4 (module+controller)
                 1.2 + 1.3 can parallelize

1.3 (AuditService) ─┬── 2.1 (interceptor)
                    ├── 3.1 (valoraciones audit)
                    └── 3.2 (reportes audit)
                    All three can parallelize after 1.3

1.4 (controller) → 4.1, 4.2, 4.3 (frontend — all parallel)
```

## Implementation Order

1. Phase 1: 1.1 → 1.2/1.3 (parallel) → 1.4 (sequential — foundation required first)
2. Phase 2+3: 2.1, 3.1, 3.2 all parallel after 1.3 (AuditService exists)
3. Phase 4: 4.1, 4.2, 4.3 all parallel after 1.4 (backend endpoints exist)

## Parallelization Opportunities

- **1.2 + 1.3**: DTOs/decorator/ip.util + AuditService after schema (different files, shared Prisma types)
- **2.1, 3.1, 3.2**: Interceptor + valoraciones + reportes after AuditService (different modules, NO shared state)
- **4.1, 4.2, 4.3**: All frontend tasks after backend controller (different files, NO shared dependencies)
