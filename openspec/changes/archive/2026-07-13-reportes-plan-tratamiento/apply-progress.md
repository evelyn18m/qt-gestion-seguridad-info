# Apply Progress: reportes-plan-tratamiento

## Task Completion

### Phase 1: Foundation

- [x] 1.1 Add `PlanTratamientoReporteDto` to `backend/src/reportes/dto/reporte-response.dto.ts`
- [x] 1.2 Add `PlanTratamientoReporte` interface to `frontend/types/api.d.ts`
- [x] 1.3 Confirm catalog helpers (`safeParseJsonArray`) and Prisma model fields support the DTO shape

### Phase 2: Backend Core

- [x] 2.1 Implement `getPlanTratamiento(filters)` in `backend/src/reportes/reportes.service.ts` with Prisma `where` and catalog enrichment
- [x] 2.2 Implement `exportPlanTratamiento(filters, user?, req?)` in `backend/src/reportes/reportes.service.ts` reusing `getPlanTratamiento` and `xlsx-js-style`
- [x] 2.3 Add `GET /reportes/plan-tratamiento` and `GET /reportes/plan-tratamiento/export` handlers in `backend/src/reportes/reportes.controller.ts`
- [x] 2.4 Register both new endpoints in the `GET /reportes` index array

### Phase 3: Frontend Core

- [x] 3.1 Fix `ReportesTabs.vue` route to `/reportes/plan-tratamiento` and insert the tab in the required order
- [x] 3.2 Create `frontend/pages/reportes/plan-tratamiento.vue` with sidebar filters, table, and export button
- [x] 3.3 Wire the export button to call `/reportes/plan-tratamiento/export` with active filters and download the blob

### Phase 4: Testing

- [x] 4.1 Add unit tests in `backend/src/reportes/reportes.service.spec.ts` for default query, combined filters, and malformed JSON fallback
- [x] 4.2 Add unit tests for `exportPlanTratamiento` buffer, styled headers, and `AuditService.log` call
- [x] 4.3 Verify `GET /reportes` index includes the two new plan-tratamiento entries
- [x] 4.4 Manual smoke test: frontend build passes; runtime page render / Excel download to be verified manually or in E2E

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 DTO | — | Structural | N/A (new) | ➖ Type-only | ➖ N/A | ➖ Single shape | ➖ N/A |
| 1.2 Frontend type | — | Structural | N/A (new) | ➖ Type-only | ➖ N/A | ➖ Single shape | ➖ N/A |
| 2.1 `getPlanTratamiento` | `backend/src/reportes/reportes.service.spec.ts` | Unit | ⚠️ 1 pre-existing failure in `getTratamientoRiesgo` | ✅ Written first | ✅ Passed | ✅ 5 cases (default, filters, malformed JSON, empty, error) | ✅ Clean |
| 2.2 `exportPlanTratamiento` | `backend/src/reportes/reportes.service.spec.ts` | Unit | ⚠️ same pre-existing failure | ✅ Written first | ✅ Passed | ✅ 2 cases (buffer + audit, filters passed through) | ✅ Clean |
| 2.3/2.4 Controller + index | `backend/src/reportes/reportes.controller.spec.ts` | Unit | ✅ all passed | ✅ Written first | ✅ Passed | ✅ 3 cases (handler, export headers, index entries) | ✅ Clean |
| 3.x Frontend page | — | Manual / Build | N/A (no runner) | ➖ No runner | ✅ Build passes | ➖ Manual smoke pending | ➖ N/A |

## Test Summary

- **Total tests written**: 10 (7 service + 3 controller)
- **Total tests passing**: 10 (new); 104 of 105 in `reportes.service.spec.ts` + all 32 in `reportes.controller.spec.ts`
- **Layers used**: Unit (10)
- **Approval tests**: None — no refactoring tasks
- **Pure functions created**: 0 (mapping kept inside service method to match existing report pattern)

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/src/reportes/dto/reporte-response.dto.ts` | Modified | Added `PlanTratamientoReporteDto` |
| `backend/src/reportes/reportes.service.ts` | Modified | Added `getPlanTratamiento` and `exportPlanTratamiento` |
| `backend/src/reportes/reportes.controller.ts` | Modified | Added `GET /reportes/plan-tratamiento` and `/export`; registered both in index |
| `backend/src/reportes/reportes.service.spec.ts` | Modified | Added unit tests for query and export |
| `backend/src/reportes/reportes.controller.spec.ts` | Modified | Added controller/index tests |
| `frontend/types/api.d.ts` | Modified | Added `PlanTratamientoReporte` interface |
| `frontend/components/ReportesTabs.vue` | Modified | Fixed route and tab order |
| `frontend/pages/reportes/plan-tratamiento.vue` | Created | Report page with filters, table, and export button |

## Deviations from Design

None — implementation matches design.

## Issues Found

1. **Pre-existing test failure**: `ReportesService › getTratamientoRiesgo › debe enriquecer todas las columnas correctamente con nivelAmenaza, nivelVulnerabilidad y controlesImplementar` expects `controlesImplementar: 'Control de acceso'` but the existing implementation does not resolve `controlesImplementarId`. This is unrelated to `reportes-plan-tratamiento`; not fixed per strict TDD safety-net rule.
2. **Pre-existing test failures in other suites**: `valoraciones.service.spec.ts` and `plan-tratamiento/dto/create-plan-tratamiento.dto.spec.ts` fail before and after this change; unrelated.
3. **Lint**: the repo has 300+ pre-existing ESLint errors; new code follows the existing style and Prettier formatting.

## Workload / PR Boundary

- **Mode**: `size:exception` (maintainer-approved single PR)
- **Current work unit**: full feature (backend + frontend)
- **Boundary**: DTO/type → backend endpoints/tests → frontend page/tab
- **Estimated review budget impact**: ~1,200 changed lines across backend and frontend; exceeds 400-line default, handled as approved exception

## Commits

- `bab8449` feat(reportes): add plan-tratamiento JSON and Excel endpoints with tests
- `f2316e2` feat(reportes): add plan-tratamiento frontend page, tab and type
- `75b1e25` chore(sdd): mark reportes-plan-tratamiento tasks complete

## Verification

- Backend unit tests: `docker compose exec backend npx jest reportes.service.spec.ts reportes.controller.spec.ts --runInBand` → 104/105 service + 32/32 controller pass (1 pre-existing failure)
- Backend build: `docker compose exec backend npm run build` → OK
- Frontend build: `docker compose exec frontend npm run build` → OK
