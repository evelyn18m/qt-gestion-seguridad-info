# Tasks: Tab 4 Tratamiento de Riesgo — Row-based

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~120–140 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full change | PR 1 | Tab 4 template + propagation loop; no split needed |

## Phase 1: ValoracionModal.vue — Tab 4 Template Refactor

- [x] 1.1 `frontend/components/ValoracionModal.vue` line 797: Change header `h3` text from `"Tratamiento de Riesgo por Item"` to `"Tratamiento de Riesgo — por Fila"`
- [x] 1.2 `ValoracionModal.vue` lines 799–891: Replace the two-column `div` wrapper (`val-grid grid-template-columns: 1fr 1fr`) with a single `<table class="val-table">` iterating `v-for="row in riskRows"` (same pattern as Tab 3 at lines 744–788)
- [x] 1.3 Add `v-if="row.amenazaIds.length === 0 && row.vulnerabilidadIds.length === 0"` guard before the `<tr>` to skip empty rows
- [x] 1.4 In each `<tr>`, render amenaza chips using `v-for="aId in row.amenazaIds"` with `getAmenazaLabel(aId)` and vulnerabilidad chips using `v-for="vId in row.vulnerabilidadIds"` with `getVulnerabilidadLabel(vId)` — same chip markup as Tab 3 columns (lines 746–751)
- [x] 1.5 Bind `metodoTratamiento`, `tipoControlId`, `riesgoControlId` inputs via `findMatchedDetalle(row)` (matching Tab 3 pattern at lines 754–770)
- [x] 1.6 Display `evaluacionRiesgoControl` and `nivelRiesgoControl` badge via `findMatchedDetalle(row)` — same display pattern as Tab 4's existing eval/nivel columns (lines 831–838)

## Phase 2: valoracion.vue — Propagation Loop

- [x] 2.1 `frontend/pages/valoracion.vue` line ~249: After `detallesPayload` mapping and before the `for (let i = 0; i < detallesPayload.length; i++)` loop, insert propagation loop
- [x] 2.2 Define `const TREATMENT_FIELDS = ['metodoTratamiento', 'tipoControlId', 'riesgoControlId', 'evaluacionRiesgoControl', 'nivelRiesgoControl'] as const`
- [x] 2.3 Build `riesgoRows` from `detallesRiesgo.value` — collect unique `{ amenazaIds, vulnerabilidadIds }` combos (skip entries with no arrays)
- [x] 2.4 For each unique row: find first `detalleRiesgo` match by array equality (`JSON.stringify`), then copy TREATMENT_FIELDS to all siblings with identical arrays

## Phase 3: Smoke Test

- [x] 3.1 Create/edit valoración in Tab 2: add row with ≥2 amenazas + ≥1 vulnerabilidad
- [x] 3.2 Complete Tab 3 evaluation, go to Tab 4 — verify ONE row shows all amenaza chips + vulnerabilidad chips
- [x] 3.3 Fill treatment fields on that row, save, reload — verify propagation applied (all entries with same arrays have identical treatment values)
- [x] 3.4 Verify Tab 2/3 unchanged — no regression in row selection or evaluation binding