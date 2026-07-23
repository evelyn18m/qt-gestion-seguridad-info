# Tasks: Reporte de Valoración de Activos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~420–520 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend) → PR 2 (frontend) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend endpoint + tests | PR 1 | base=main; DTO, service, controller, tests |
| 2 | Frontend tab + integration | PR 2 | base=PR 1 or feature branch; depends on backend |

## Phase 1: Contracts & Types

- [x] 1.1 Add `ValoracionActivoReporteDto` to `backend/src/reportes/dto/reporte-response.dto.ts`
- [x] 1.2 Add `ValoracionActivoReporte` interface to `frontend/types/api.d.ts`

## Phase 2: TDD — Failing Tests (RED)

- [x] 2.1 Add controller mock `getValoracionActivos` and test `GET /reportes/valoracion-activos` returns 200
- [x] 2.2 Add controller test asserting query params are forwarded to service
- [x] 2.3 Add service test asserting `findMany` is called with correct `where` clause
- [x] 2.4 Add service test asserting batch enrichment maps relation IDs to names
- [x] 2.5 Add service test for empty result returning `[]`
- [x] 2.6 Add service test that `%` and `_` in search are escaped before `findMany`

## Phase 3: Core Implementation (GREEN)

- [x] 3.1 Implement `getValoracionActivos(filters)` in `backend/src/reportes/reportes.service.ts` with Prisma `where`, batch fetch, and DTO mapping
- [x] 3.2 Add `GET /reportes/valoracion-activos` to `backend/src/reportes/reportes.controller.ts` with `@Query()` forwarding
- [x] 3.3 Add tab 5 "Valoración de Activos" to `frontend/pages/reportes.vue` with table, search input, and dropdown filters
- [x] 3.4 Wire 300ms debounced search and reactive filter params in new tab

## Phase 4: Verification

- [x] 4.1 Run `docker compose exec backend npm run test` and confirm all tests pass
- [x] 4.2 Verify frontend tab fetches data via `useApi` and shows empty state when no results
