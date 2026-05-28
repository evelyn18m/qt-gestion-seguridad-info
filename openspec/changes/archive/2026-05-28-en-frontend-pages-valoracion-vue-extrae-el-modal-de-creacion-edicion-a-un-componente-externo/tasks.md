# Tasks: Extraer modal de valoracion.vue a ValoracionModal.vue

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~500-600 (new component ~400 lines + wiring ~150 in parent) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Single PR (self-contained refactor, easy to rollback) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (user decision needed) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Extract ValoracionModal.vue component (~400 lines) | PR 1 | Base: main; includes types, props, emits, all 4 tab templates |
| 2 | Wire ValoracionModal in valoracion.vue (~150 line changes) | PR 1 (same) | Replace inline modal block with component tag + wire props/events |

> **Note**: This is a pure extraction refactor — same behavior, new file. Rollback is a single file deletion + git revert. Keeping as single PR for simplicity, but user must confirm via ask-on-risk strategy.

## Phase 1: Type Definitions

- [x] 1.1 Define `CatalogData` interface in `frontend/components/ValoracionModal.vue`
- [x] 1.2 Define `ValFormData`, `AnalisisFormData`, `EvaluacionFormData`, `TratamientoFormData` interfaces
- [x] 1.3 Define `DetalleRiesgo` interface (already exported from `~/types/api`)

## Phase 2: Create ValoracionModal.vue

- [x] 2.1 Create `frontend/components/ValoracionModal.vue` with `<script setup lang="ts">` skeleton
- [x] 2.2 Define Props interface: `modelValue`, `editId`, `catalogData`, `valForm`, `analisisForm`, `evaluacionForm`, `tratamientoForm`, `detallesRiesgo`, `activeTab`, `valSaving`, `valSuccess`, `valLoading`
- [x] 2.3 Define emits: `update:modelValue`, `submit`, `tab-change`, `reset-form`
- [x] 2.4 Copy computed properties used only by modal: `subprocesosFiltrados`, `amenazaCategorias`, `vulnerabilidadCategorias`, `amenazasFiltradas`, `vulnerabilidadesFiltradas`, `ciaAverage`, `detallesAmenazas`, `detallesVulnerabilidades`, `macroProcesoName`
- [x] 2.5 Copy helper functions used only by modal: `getNivelesImpacto`, `getValorImpacto`, `getCatalogoLabel`, `calcularEvaluacionRiesgo`, `calcularNivelRiesgo`, `getNivelStyle`, `getAmenazaLabel`, `getVulnerabilidadLabel`, `getCiaLevel`, `getTipoControlName`, `getValorRiesgo`
- [x] 2.6 Move Tab 0 template (Identificación del Activo + CIA) into `<template><form>`
- [x] 2.7 Move Tab 1 template (Análisis de Riesgos)
- [x] 2.8 Move Tab 2 template (Evaluación de Riesgo)
- [x] 2.9 Move Tab 3 template (Tratamiento de Riesgo)
- [x] 2.10 Add tab navigation (val-tabs, val-tab, val-tab-panel structure)
- [x] 2.11 Add modal header with dynamic title ("Nueva"/"Editar") and close button
- [x] 2.12 Wire form `@submit.prevent` to emit `submit` event
- [x] 2.13 Add loading/saving states to submit button (disable when valSaving)

## Phase 3: Wire in valoracion.vue

- [x] 3.1 Import `ValoracionModal` from `~/components/ValoracionModal.vue`
- [x] 3.2 Replace inline modal block (lines 781-1171) with `<ValoracionModal v-model="showModalVal" ... />`
- [x] 3.3 Pass all required props: catalogData, valForm, analisisForm, evaluacionForm, tratamientoForm, detallesRiesgo, activeTab, valSaving
- [x] 3.4 Wire `@update:model-value="showModalVal = $event"` for close
- [x] 3.5 Wire `@submit` to existing `submitValoracion` function
- [x] 3.6 Wire `@tab-change="activeTab = $event"` for tab navigation
- [x] 3.7 Wire `@reset-form` to existing `rebuildDetalles` function
- [x] 3.8 Remove inline modal HTML (lines 781-1171)
- [x] 3.9 Remove computed properties now in ValoracionModal.vue (kept: `evaluacionRiesgo`, `nivelRiesgo`, `evaluacionRiesgoControl`, `nivelRiesgoControl`, `riesgosAmenaza`, `riesgosVulnerabilidad` — used by table)
- [x] 3.10 Remove helper functions now in ValoracionModal.vue (kept: `calculateRowCiaAverage`, `calculateEvaluacionRiesgo`, `getRiesgoEvaluacion`, `getTipoControlName`, `getMaxNivelIndex`, `getNivelFromIndex`, `resumenEvaluacionRiesgo`, `resumenControl` — used by table/view modal)
- [x] 3.11 Verify no references to removed functions/properties remain in valoracion.vue
- [ ] 3.12 Remove local state variables now in ValoracionModal.vue (amenazaCategoria, vulnerabilidadCategoria, amenazaSeleccionada, vulnerabilidadSeleccionada — if not used elsewhere)

## Phase 4: Verification

- [ ] 4.1 Create new valoración — verify modal opens, form works, save succeeds
- [ ] 4.2 Edit existing valoración — verify pre-population of all 4 tabs
- [ ] 4.3 Test tab navigation across all 4 tabs
- [ ] 4.4 Verify CIA average calculates correctly in modal
- [ ] 4.5 Verify close/cancel works (backdrop click and X button)
- [ ] 4.6 Run backend tests: `docker compose exec backend npm run test`
- [ ] 4.7 Verify no console errors in frontend
