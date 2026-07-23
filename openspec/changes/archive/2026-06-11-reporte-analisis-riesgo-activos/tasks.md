# Tasks: Reporte de Análisis de Riesgo de Activos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~500–650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend TDD + DTO + Types | PR 1 | Add DTO, frontend types, and failing tests. Verification: `npm run test` shows new tests failing. |
| 2 | Backend Implementation | PR 2 | Implement service and controller. Base: PR 1 branch. Verification: `npm run test` all green. |
| 3 | Frontend Integration | PR 3 | Add tab, filters, table. Base: PR 2 branch. Verification: manual end-to-end. |

## Phase 1: Foundation (RED)

- [x] 1.1 Add `AnalisisRiesgoActivoDto` to `backend/src/reportes/dto/reporte-response.dto.ts`
- [x] 1.2 Add `AnalisisRiesgoActivoReporte` interface to `frontend/types/api.d.ts`
- [x] 1.3 Update controller spec mocks to include `getAnalisisRiesgoActivos` in `backend/src/reportes/reportes.controller.spec.ts`
- [x] 1.4 Add failing controller test for `GET /reportes/analisis-riesgo-activos` (HTTP 200, shape, query forwarding)
- [x] 1.5 Update Prisma mocks in `backend/src/reportes/reportes.service.spec.ts` to include `amenaza` and `vulnerabilidad`
- [x] 1.6 Add failing service test for `getAnalisisRiesgoActivos` (Prisma calls, JSON parsing, concatenated names, malformed JSON edge case)

## Phase 2: Core Implementation (GREEN)

- [x] 2.1 Implement `getAnalisisRiesgoActivos` in `backend/src/reportes/reportes.service.ts` (hybrid filtering, catalog enrichment, error handling)
- [x] 2.2 Implement `GET /reportes/analisis-riesgo-activos` handler in `backend/src/reportes/reportes.controller.ts`
- [x] 2.3 Run `docker compose exec backend npm run test` to verify all tests pass

## Phase 3: Frontend Integration

- [x] 3.1 Convert `frontend/pages/reportes.vue` to tabbed layout with "Valoración de Activos" and "Análisis de Riesgo de Activos" tabs
- [x] 3.2 Add state, filters, and debounced search (300ms) for the new tab
- [x] 3.3 Add table for `AnalisisRiesgoActivoReporte` with columns: Activo, Macroproceso, Amenaza, Vulnerabilidad, Controles

## Phase 4: Verification

- [x] 4.1 Verify endpoint returns enriched DTO and applies combined filters correctly
- [x] 4.2 Verify malformed JSON in `amenazaIds`/`vulnerabilidadIds` is handled gracefully without throwing
- [x] 4.3 Verify frontend tab loads data, applies filters, and shows empty state when no results match
