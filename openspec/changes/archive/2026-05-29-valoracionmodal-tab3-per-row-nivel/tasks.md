# Tasks: valoracionmodal-tab3-per-row-nivel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~130–180 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full feature | PR 1 | All backend + frontend changes in one PR |

## Phase 1: Database & Schema

- [x] 1.1 In `backend/prisma/schema.prisma`, add `vulnerabilidadRiesgoId Int?` field to the `DetalleRiesgo` model (after `riesgoId`). Nullable for backward compat with existing rows.
- [x] 1.2 Run `docker compose exec backend npx prisma db push` to apply the new nullable column to MySQL — no data loss, additive only.

## Phase 2: TypeScript Interface

- [x] 2.1 In `frontend/types/api.d.ts`, add `vulnerabilidadRiesgoId?: number | null` field to the `DetalleRiesgo` interface (next to existing `riesgoId` field).

## Phase 3: Frontend Template — Remove Global Selects

- [x] 3.1 In `frontend/components/ValoracionModal.vue`, locate the global selects block around lines 706–720 (the `<div class="val-grid" style="grid-template-columns: 1fr 1fr">` containing `evaluacionForm.amenazaRiesgoId` and `evaluacionForm.vulnerabilidadRiesgoId` selects). Delete the entire block. The global `previewRiesgo` display driven by those selects should also be removed — search for `previewRiesgo` in Tab 3 and remove any display that depends on the deleted global selects.

## Phase 4: Frontend Template — Per-Row Dual Selects & Preview

- [x] 4.1 In Tab 3's `<table>` header row (around line 724), add a new `<th>` column header labeled "Nivel Vulnerabilidad" — place it after the "Nivel de Amenaza" column header and before the existing "Evaluación" column. Confirm exact column position with spec (open question #2).
- [x] 4.2 In the `<tr v-for="d in detallesRiesgo" ...>` table body row, after the existing amenaza `select[v-model="d.riesgoId"]`, add a second `select[v-model="d.vulnerabilidadRiesgoId"]` with the same pattern: iterate `catalogData.valRiesgos` (filtered for vulnerabilidad items if needed), `@change="updateEvaluacionDetalle(d)"`, `style="min-width:130px;"`.
- [x] 4.3 Add per-row preview `evaluacionRiesgo` display: use a `v-bind` reactive pattern or a minimal inline computed to call `localCalculateRiesgo(ciaAverage, getValorRiesgo(d.riesgoId), getValorRiesgo(d.vulnerabilidadRiesgoId))` **once per row** (not three times for eval, nivel, badge). Show `.evaluacionRiesgo.toFixed(2)` when > 0, else show `—`.
- [x] 4.4 Add per-row `nivelRiesgo` badge display alongside the evaluacion display — extracted from the same single per-row `localCalculateRiesgo` call.
- [x] 4.5 Add read-only `controlesImplementados` column to Tab 3 table as `<td><span style="font-size:0.8rem;">{{ d.controlesImplementados || '—' }}</span></td>` — no `v-model`, displayed as plain text.

## Phase 5: Verification

- [x] 5.1 Run `docker compose exec frontend npm run build` to confirm frontend builds without errors.
- [x] 5.2 Verify: edit an existing `ValoracionActivo` record — each Tab 3 row shows two independent selects; rows with null `vulnerabilidadRiesgoId` render empty select and show `—` for preview.