# Tasks: Eliminar columna "Riesgo Residual" de Pestaña 2

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~15 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Remove Riesgo Residual column from Tab 2 template | PR 1 | Single file, ~15 lines deleted, no logic changes |

## Phase 1: Template Removal

- [x] 1.1 Remove `<th>Riesgo Residual</th>` from Tab 2 `<thead>` in `frontend/components/ValoracionModal.vue` (~L678)
- [x] 1.2 Remove `<td>` badge cell (ACEPTABLE/INACEPTABLE) from Tab 2 `<tbody>` in `frontend/components/ValoracionModal.vue` (~L756-771)

## Phase 2: Verification

- [x] 2.1 Visual: Tab 2 renders 4 columns (Amenazas, Vulnerabilidades, Controles, Acción) — no "Riesgo Residual"
- [x] 2.2 Visual: Wizard Step 2 → Step 3 navigation works with `riskRows.length > 0`
- [x] 2.3 Visual: Tabs 1, 3, 4 render without regressions
- [x] 2.4 Backend tests: `docker compose exec backend npm run test` — all assertions pass (backend unchanged)
