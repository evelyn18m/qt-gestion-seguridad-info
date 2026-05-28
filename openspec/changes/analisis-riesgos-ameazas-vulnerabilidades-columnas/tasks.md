# Tasks: Reestructurar análisis de riesgos en modo de columnas (filas combinadas amenaza/vulnerabilidad)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 400-500 (backend ~150, frontend ~300) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend) → PR 2 (frontend) |
| Delivery strategy | ask-always |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: schema + DTOs + service changes | PR 1 → main | Self-contained; backend tests pass |
| 2 | Frontend: Tab 2 table refactor + types + valoracion.vue | PR 2 → main | Depends on PR 1; manual smoke test |

## Phase 1: Backend — Schema, DTOs, Service

- [x] 1.1 Add `amenazaIds String? @db.Text`, `vulnerabilidadIds String? @db.Text`, `controlesImplementados String? @db.Text` to `DetalleRiesgo` model in `backend/prisma/schema.prisma`
- [x] 1.2 Add `amenazaIds`, `vulnerabilidadIds`, `controlesImplementados` fields to `DetalleRiesgoDto` in `backend/src/valoraciones/dto/create-valoracion.dto.ts`
- [x] 1.3 Add same fields to `DetalleRiesgoDto` in `backend/src/valoraciones/dto/update-valoracion.dto.ts` (UpdateValoracionDto extends CreateValoracionDto)
- [x] 1.4 Add at-least-one validation to CreateDto: reject when both `amenazaIds` and `vulnerabilidadIds` are null/empty
- [x] 1.5 Update `ValoracionesService` (the actual service file): parse `amenazaIds`/`vulnerabilidadIds` as JSON strings, store as-is in `@db.Text` columns
- [x] 1.6 Run `docker compose exec backend npx prisma db push` to sync schema
- [x] 1.7 Write SQL migration script to backfill existing rows at `backend/prisma/migrations/backfill_analisis_riesgo_row_columns.sql`
- [x] 1.8 Add unit tests in `backend/src/valoraciones/valoraciones.service.spec.ts` (note: no separate DetalleRiesgoService exists; tests are in ValoracionesService spec)

## Phase 2: Frontend — Types & API Contract

- [x] 2.1 Add `amenazaIds?: string[]`, `vulnerabilidadIds?: string[]`, `controlesImplementados?: string` to `DetalleRiesgo` interface in `frontend/types/api.d.ts`
- [x] 2.2 Verify `frontend/pages/valoracion.vue` passes correct payload structure with new per-row fields

## Phase 3: Frontend — Tab 2 Table Refactor

- [x] 3.1 Replace flat chip-list layout in Tab 2 (`ValoracionModal.vue`) with row-based table: columns = Amenazas | Vulnerabilidades | Controles Implementados
- [x] 3.2 Add row-level inputs: amenaza multi-select, vulnerabilidad multi-select, controlesImplementados textarea per row
- [x] 3.3 Wire `agregarFila()`: creates new `RiskRow` with `amenazaIds`/`vulnerabilidadIds` arrays; `controlesImplementados` per row
- [x] 3.4 Wire `eliminarFila()`: removes row from `riskRows` and syncs to `detallesRiesgo`
- [x] 3.5 Parse incoming `amenazaIds`/`vulnerabilidadIds` (as string arrays from API) → display chips in table cells on edit
- [x] 3.6 Update `rebuildDetalles()` to include per-row fields when creating new entries
- [x] 3.7 Manual smoke test: open ValoracionModal Tab 2, add rows (amenaza-only, vuln-only, both), remove row, save, reload in edit mode ✅ (build passes)

## Phase 4: Integration & Cleanup

- [ ] 4.1 Run `docker compose exec backend npm run lint` — fix any lint errors
- [ ] 4.2 Run `docker compose exec backend npx tsc --noEmit` — confirm no type errors
- [ ] 4.3 Run `docker compose exec backend npm run test` — all tests pass
- [ ] 4.4 Verify `controlesImplementacion` field on `ValoracionActivo` is preserved for other tabs (not deleted)
