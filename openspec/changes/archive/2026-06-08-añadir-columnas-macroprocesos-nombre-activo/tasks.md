# Tasks: Añadir columnas Macroproceso y Nombre del Activo en Pestañas 3 y 4

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 30 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Tab 3 — Evaluación de Riesgo

- [ ] 1.1 Insert 2 `<th>` (Nombre del Activo, Macroproceso) before `<th>Amenaza</th>` in Tab 3 thead (after line 876)
  - **File**: `frontend/components/ValoracionModal.vue`
  - **Pattern**: Copy lines 741-742 (Tab 2 header)
  - **Verify**: Column headers visible in Tab 3 above Amenaza column

- [ ] 1.2 Insert 2 readonly `<td>` inputs before Amenaza `<td>` in Tab 3 tbody (before line 888, inside `v-for="row in riskRows"`)
  - **File**: `frontend/components/ValoracionModal.vue`
  - **Pattern**: Copy lines 751-761 (Tab 2 body cells) — `<input :value="analisisForm.nombreActivo" readonly>` + `<input :value="macroProcesoName" readonly>`
  - **Verify**: Each row shows asset name and macroprocess label, readonly styling applied

## Phase 2: Tab 4 — Tratamiento de Riesgo

- [ ] 2.1 Insert 2 `<th>` (Nombre del Activo, Macroproceso) before `<th>Amenaza</th>` in Tab 4 thead (after line 971)
  - **File**: `frontend/components/ValoracionModal.vue`
  - **Pattern**: Copy lines 741-742 (Tab 2 header)
  - **Verify**: Column headers visible in Tab 4 above Amenaza column

- [ ] 2.2 Insert 2 readonly `<td>` inputs before Amenaza `<td>` in Tab 4 tbody (before line 988, inside `<template v-for="row in riskRows">`)
  - **File**: `frontend/components/ValoracionModal.vue`
  - **Pattern**: Copy lines 751-761 (Tab 2 body cells)
  - **Verify**: Each row shows asset name and macroprocess label, readonly styling applied

## Phase 3: Verification

- [ ] 3.1 Backend regression: run `docker compose exec backend npm run test` — all 88 tests must pass
  - **Verify**: Zero new failures, output shows `✓ 88 passed`

- [ ] 3.2 Manual smoke: run `docker compose up -d`, open valoración modal, navigate Tab 2 → Tab 3 → Tab 4
  - **Verify**: Tab 3 and Tab 4 show "Nombre del Activo" and "Macroproceso" columns with correct values, existing columns unchanged, wizard navigation works, submit/update functional
