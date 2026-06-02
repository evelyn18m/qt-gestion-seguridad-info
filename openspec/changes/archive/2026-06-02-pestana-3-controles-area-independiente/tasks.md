# Tasks: Pestaña 3 — Campo "Controles Area" independiente

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~15 additions across 6 files |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Schema

- [x] 1.1 Add `controlesArea String? @db.Text` to `DetalleRiesgo` in `backend/prisma/schema.prisma` after `controlesImplementados` (L155)
- [x] 1.2 Run `docker compose exec backend npx prisma db push` to sync new column to MySQL

## Phase 2: Backend

- [x] 2.1 Add `controlesArea?: string` to `DetalleRiesgoDto` in `backend/src/valoraciones/dto/create-valoracion.dto.ts` after `controlesImplementados` (L105)
- [x] 2.2 Spread `controlesArea: d.controlesArea` in `mapDetalleRiesgo()` in `backend/src/valoraciones/valoraciones.service.ts` after `controlesImplementados` spread (L50)

## Phase 3: Frontend

- [x] 3.1 Add `controlesArea?: string` to `DetalleRiesgo` interface in `frontend/types/api.d.ts` after `controlesImplementados` (L78)
- [x] 3.2 Add `controlesArea: string` to `RiskRow` interface in `frontend/components/ValoracionModal.vue` after `controlesImplementados` (L158)
- [x] 3.3 Add `controlesArea: ''` to `agregarFila()` initializer in `frontend/components/ValoracionModal.vue` after `controlesImplementados` (L169)
- [x] 3.4 Add `controlesArea: row.controlesArea` to amenaza entry in `syncRowsToDetalles()` in `frontend/components/ValoracionModal.vue` after `controlesImplementados` (L251)
- [x] 3.5 Add `controlesArea: row.controlesArea` to vulnerabilidad entry in `syncRowsToDetalles()` in `frontend/components/ValoracionModal.vue` after `controlesImplementados` (L269)
- [x] 3.6 Add `controlesArea: d.controlesArea || ''` to `loadExistingRows()` in `frontend/components/ValoracionModal.vue` after `controlesImplementados` (L292)
- [x] 3.7 Rename Tab 3 column header `<th>Controles</th>` → `<th>Controles Area</th>` in `frontend/components/ValoracionModal.vue` (L797)
- [x] 3.8 Change Tab 3 textarea `v-model` from `row.controlesImplementados` → `row.controlesArea` in `frontend/components/ValoracionModal.vue` (L843)
- [x] 3.9 Add `controlesArea: d.controlesArea || null` to save payload in `frontend/pages/valoracion.vue` after `controlesImplementados` (L249)
- [x] 3.10 Add `controlesArea: d.controlesArea || ''` to edit load mapping in `frontend/pages/valoracion.vue` after `controlesImplementados` (L419)

## Phase 4: Verify

- [x] 4.1 Run `docker compose exec backend npm run test` — all existing tests must pass (63/63 passed)
- [ ] 4.2 Manual smoke test: write in Tab 3, save, reload, confirm Tab 2 data is independent and persisted
