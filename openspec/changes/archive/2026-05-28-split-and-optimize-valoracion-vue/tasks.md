# Tasks: split-and-optimize-valoracion-vue

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 lines moved (not added) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Create useRiskCalculations Composable

- [x] 1.1 Read `frontend/pages/valoracion.vue` script section — identify exact line ranges for: computeds (109-139), calcularEvaluacionRiesgo/calcularNivelRiesgo (166-179), getNivelesImpacto/getValorImpacto/calculateRowCiaAverage/getCiaLevel/getValorRiesgo (279-317), calculateEvaluacionRiesgo duplicate (319-325), getNivelStyle/getMaxNivelIndex/getNivelFromIndex (610-631)
- [x] 1.2 Create `frontend/composables/useRiskCalculations.ts` with Vue import and `useRiskCalculations` function signature accepting 5 Ref parameters: `valImpactos`, `valRiesgos`, `valForm`, `evaluacionForm`, `tratamientoForm`
- [x] 1.3 Copy computeds into composable: `evaluacionRiesgo`, `nivelRiesgo`, `evaluacionRiesgoControl`, `nivelRiesgoControl` (lines 109-139), `ciaAverage` (lines 289-296)
- [x] 1.4 Copy functions: `calcularEvaluacionRiesgo` (166-172), `calcularNivelRiesgo` (174-179), `getNivelesImpacto` (279-281), `getValorImpacto` (283-287), `calculateRowCiaAverage` (298-305), `getCiaLevel` (307-311), `getValorRiesgo` (313-317), `getNivelStyle` (610-616), `getMaxNivelIndex` (618-624), `getNivelFromIndex` (626-631)
- [x] 1.5 Export all computeds and functions from composable, adjusting internal refs to use passed parameters

## Phase 2: Wire Into valoracion.vue

- [x] 2.1 Add import: `const { ciaAverage, evaluacionRiesgo, nivelRiesgo, evaluacionRiesgoControl, nivelRiesgoControl, getNivelesImpacto, getValorImpacto, getValorRiesgo, calculateRowCiaAverage, getCiaLevel, calcularEvaluacionRiesgo, calcularNivelRiesgo, getNivelStyle, getMaxNivelIndex, getNivelFromIndex } = useRiskCalculations(...)` above line 109
- [x] 2.2 Call `useRiskCalculations(valImpactos, valRiesgos, valForm, evaluacionForm, tratamientoForm)` at the composable call site
- [x] 2.3 Remove inline `evaluacionRiesgo`, `nivelRiesgo`, `evaluacionRiesgoControl`, `nivelRiesgoControl` computeds (lines 109-139)
- [x] 2.4 Remove `calcularEvaluacionRiesgo` (166-172) and `calcularNivelRiesgo` (174-179) function definitions
- [x] 2.5 Remove `getNivelesImpacto`, `getValorImpacto`, `calculateRowCiaAverage`, `getCiaLevel`, `getValorRiesgo` (lines 279-317)
- [x] 2.6 Remove duplicate `calculateEvaluacionRiesgo` function (lines 319-325)
- [x] 2.7 Remove `getNivelStyle`, `getMaxNivelIndex`, `getNivelFromIndex` (lines 610-631)
- [x] 2.8 Verify all template references (`{{ ciaAverage }}`, `{{ getNivelStyle(x).label }}`, etc.) remain valid — they use destructured imports from composable call

## Phase 3: Verification

- [ ] 3.1 Run TypeScript check: `docker compose exec frontend npx tsc --noEmit` (if type-check script exists)
- [ ] 3.2 Manual smoke test: open valoracion page at `/valoracion`, change Confidentiality/Integrity/Availability dropdowns on Tab 1, verify `ciaAverage` display updates immediately
- [ ] 3.3 Manual smoke test: on Tab 3, set amenaza and vulnerabilidad dropdowns, verify `evaluacionRiesgo` and `nivelRiesgo` update and match expected thresholds (Crítico ≥18, Alto ≥9, Medio ≥3, Bajo <3)
- [ ] 3.4 Manual smoke test: on Tab 4, set control amenaza/vulnerabilidad, verify `evaluacionRiesgoControl` and `nivelRiesgoControl` update correctly
- [ ] 3.5 Verify `getNivelStyle()` badge colors render correctly: Critico=#dc2626, Alto=#ea580c, Medio=#ca8a04, Bajo=#16a34a

---

# Tasks: split-and-optimize-valoracion-vue (Iteration 2 — Tab 4 Extraction)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~120 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Create ValoracionTab4.vue Component

- [x] 1.1 Read `frontend/pages/valoracion.vue` lines ~955-1054 — Tab 4 template region (v-show activeTab === 3) and inline functions: `getCatalogoLabel` (line 135), `updateControlDetalle` (line 208), `detallesAmenazas` computed (line 213), `detallesVulnerabilidades` computed (line 214)
- [x] 1.2 Create `frontend/components/valoracion/ValoracionTab4.vue` with `<script setup lang="ts">`
- [x] 1.3 Define props interface: `detallesRiesgo` (DetalleRiesgo[] — reactive by reference, do NOT destructure), `valRiesgos` (CatalogoItem[]), `valTiposControl` (CatalogoItem[]), `valAmenazas` (CatalogoItem[]), `valVulnerabilidades` (CatalogoItem[])
- [x] 1.4 Import from `useRiskCalculations`: `calcularEvaluacionRiesgo`, `calcularNivelRiesgo`, `getNivelStyle`
- [x] 1.5 Inline `getCatalogoLabel(tipo, catalogoId)` — reads from `valAmenazas` and `valVulnerabilidades` props
- [x] 1.6 Inline `updateControlDetalle(d: DetalleRiesgo)` — calls imported `calcularEvaluacionRiesgo(d.riesgoControlId, 0)` and `calcularNivelRiesgo(d.evaluacionRiesgoControl)`; note: evaluacionForm.vulnerabilidadRiesgoId dependency noted in design open questions — use 0 as fallback
- [x] 1.7 Inline `detallesAmenazas` and `detallesVulnerabilidades` computeds — filter `props.detallesRiesgo` by tipo
- [x] 1.8 Copy Tab 4 template HTML from `valoracion.vue` lines 957-1054 — Amenazas column (table with amenaza rows) + Vulnerabilidades column (table with vulnerabilidad rows), including all inline styles, selects, and `getNivelStyle` bindings

## Phase 2: Create useValoracionTab2State.ts Skeleton

- [x] 2.1 Create `frontend/composables/useValoracionTab2State.ts` exporting `useValoracionTab2State(detallesRiesgo, valAmenazas, valVulnerabilidades)` function
- [x] 2.2 Define placeholder signatures: `agregarAmenaza(catalogoId: number): void`, `quitarAmenaza(catalogoId: number): void`, `agregarVulnerabilidad(catalogoId: number): void`, `quitarVulnerabilidad(catalogoId: number): void`, `rebuildDetalles(): void`
- [x] 2.3 Each placeholder throws `"not implemented"` or returns `console.warn('placeholder')` — no-op implementation

## Phase 3: Wire Into valoracion.vue

- [x] 3.1 Add import: `import ValoracionTab4 from '~/components/valoracion/ValoracionTab4.vue'`
- [x] 3.2 Replace Tab 4 `<div v-show="activeTab === 3">` region (lines 956-1054) with `<ValoracionTab4 :detallesRiesgo="detallesRiesgo" :valRiesgos="valRiesgos" :valTiposControl="valTiposControl" :valAmenazas="valAmenazas" :valVulnerabilidades="valVulnerabilidades" />`
- [x] 3.3 Add `import { calcularEvaluacionRiesgo, calcularNivelRiesgo } from '~/composables/useRiskCalculations'` if not already imported (used by `updateControlDetalle`)
- [x] 3.4 Remove inline `updateControlDetalle` function only if no other callers exist outside Tab 4 (grep first)
- [x] 3.5 Verify: `getCatalogoLabel` stays in `valoracion.vue` (used by view modal) — do NOT remove it
- [x] 3.6 Verify template compiles — run `docker compose exec frontend npx vue-tsc --noEmit 2>&1 | head -50` if available, else skip

## Phase 4: Verification

- [ ] 4.1 Manual smoke test: open valoracion page → new valoracion → Tab 4 shows amenaza/vulnerabilidad rows
- [ ] 4.2 Manual smoke test: change `riesgoControlId` dropdown → `evaluacionRiesgoControl` and `nivelRiesgoControl` update
- [ ] 4.3 Manual smoke test: save valoracion with Tab 4 data → data persists and loads correctly in view modal
