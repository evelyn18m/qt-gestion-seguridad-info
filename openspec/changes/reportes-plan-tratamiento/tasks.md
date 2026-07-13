# Tasks: Reporte de Plan de Tratamiento

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450–550 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 backend → PR 2 frontend |
| Delivery strategy | single-pr-default |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend JSON + Excel endpoints with tests | PR 1 | Targets main; includes DTO, service, controller, unit tests |
| 2 | Frontend page, tabs, and types | PR 2 | Targets main or PR 1 branch; depends on backend API |

## Phase 1: Foundation

- [x] 1.1 Add `PlanTratamientoReporteDto` to `backend/src/reportes/dto/reporte-response.dto.ts`
- [x] 1.2 Add `PlanTratamientoReporte` interface to `frontend/types/api.d.ts`
- [x] 1.3 Confirm catalog helpers (`safeParseJsonArray`) and Prisma model fields support the DTO shape

## Phase 2: Backend Core

- [x] 2.1 Implement `getPlanTratamiento(filters)` in `backend/src/reportes/reportes.service.ts` with Prisma `where` and catalog enrichment
- [x] 2.2 Implement `exportPlanTratamiento(filters, user?, req?)` in `backend/src/reportes/reportes.service.ts` reusing `getPlanTratamiento` and `xlsx-js-style`
- [x] 2.3 Add `GET /reportes/plan-tratamiento` and `GET /reportes/plan-tratamiento/export` handlers in `backend/src/reportes/reportes.controller.ts`
- [x] 2.4 Register both new endpoints in the `GET /reportes` index array

## Phase 3: Frontend Core

- [x] 3.1 Fix `ReportesTabs.vue` route to `/reportes/plan-tratamiento` and insert the tab in the required order
- [x] 3.2 Create `frontend/pages/reportes/plan-tratamiento.vue` with sidebar filters, table, and export button
- [x] 3.3 Wire the export button to call `/reportes/plan-tratamiento/export` with active filters and download the blob

## Phase 4: Testing

- [x] 4.1 Add unit tests in `backend/src/reportes/reportes.service.spec.ts` for default query, combined filters, and malformed JSON fallback
- [x] 4.2 Add unit tests for `exportPlanTratamiento` buffer, styled headers, and `AuditService.log` call
- [x] 4.3 Verify `GET /reportes` index includes the two new plan-tratamiento entries
- [x] 4.4 Manual smoke test: frontend page renders, filters apply, Excel download uses active filters
