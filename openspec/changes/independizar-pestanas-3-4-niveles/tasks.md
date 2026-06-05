# Tasks: Make Tab 3 and Tab 4 Risk Levels Independent

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + backend + frontend wiring + tests | Single PR | ~150 lines, independent slices |

## Phase 1: Schema Foundation

- [x] 1.1 Add `vulnerabilidadControlId Int?` after L149 in `backend/prisma/schema.prisma`, then run `docker compose exec backend npx prisma db push`
- [x] 1.2 Add `vulnerabilidadControlId?: number | null` to `DetalleRiesgo` interface after L86 in `frontend/types/api.d.ts`

## Phase 2: Backend DTO + Service (Strict TDD)

- [x] 2.1 RED: Write `DetalleRiesgoDto` test in `backend/src/valoraciones/dto/*.spec.ts` — validates `vulnerabilidadControlId` as optional number, passes with valid int, rejects non-number
- [x] 2.2 GREEN: Add `@IsOptional() @IsNumber() vulnerabilidadControlId?: number` after `riesgoControlId` in `DetalleRiesgoDto`
- [x] 2.3 RED: Write service test — `mapDetalleRiesgo()` spreads `vulnerabilidadControlId` when defined, omits when undefined; calls `calculateRiesgo()` with control valors
- [x] 2.4 GREEN: Update `mapDetalleRiesgo()`: spread `vulnerabilidadControlId`, add `nivelAmenazaControlValor?`/`nivelVulnerabilidadControlValor?` params, pass to `calculateRiesgo(3, a, v, ca, cv)`
- [x] 2.5 RED: Write service test — `create()` runs `prisma.riesgo.findUnique()` lookups for `riesgoControlId`/`vulnerabilidadControlId`, passes resolved valors to `mapDetalleRiesgo()`
- [x] 2.6 GREEN: Add parallel `Promise.all` lookup blocks for `riesgoControlId`/`vulnerabilidadControlId` in `create()` and `update()` of `valoraciones.service.ts`

## Phase 3: Frontend Wiring

- [x] 3.1 Redirect Tab 4 bindings in `ValoracionModal.vue`: L988 `riesgoId` → `riesgoControlId`, L1000 `vulnerabilidadRiesgoId` → `vulnerabilidadControlId`
- [x] 3.2 Update `updateControlDetalleRow()` L534: change `calcularEvaluacionRiesgo(d.riesgoId, d.vulnerabilidadRiesgoId)` → `calcularEvaluacionRiesgo(d.riesgoControlId, d.vulnerabilidadControlId)`
- [x] 3.3 Add control field preservation in `syncRowsToDetalles()` L235-286: add `vulnerabilidadControlId: undefined` to entry objects, build `prevMap` keyed by `${e.tipo}:${e.catalogoId}:${amenazaIds}:${vulnerabilidadIds}`, copy `riesgoControlId`/`vulnerabilidadControlId` from matched previous entries
- [x] 3.4 In `valoracion.vue` L302-331: add `nivelAmenazaControl`/`nivelVulnerabilidadControl` catalog lookup (analogous to L306-315), extend `/calcular` body to include both control-level valors

## Phase 4: Verification

- [x] 4.1 Run `docker compose exec backend npm run test` — all Jest tests pass
- [ ] 4.2 Manual smoke: select Tab 4 dropdowns, verify Tab 3 values unchanged; edit Tab 2 rows, verify control fields preserved; save and reload, verify control selections persisted
