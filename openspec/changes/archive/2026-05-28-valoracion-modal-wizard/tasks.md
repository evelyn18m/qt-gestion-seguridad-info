# Tasks: ValoracionModal — Tabs to Wizard Conversion

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~205 (ValoracionModal.vue ~200, valoracion.vue ~5) |
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
| 1 | Full wizard conversion | PR 1 | All 5 phases + smoke test |

## Phase 1: ValoracionModal.vue — Props & State

- [x] 1.1 Remove `activeTab: number` from `defineProps` interface in `frontend/components/ValoracionModal.vue`
- [x] 1.2 Remove `'tab-change': [index: number]` from `defineEmits` interface
- [x] 1.3 Add `const currentStep = ref(0)` and `const TOTAL_STEPS = 4` in `<script setup>`
- [x] 1.4 Add `const tabs = [{ label: 'Valoración de Activo' }, { label: 'Análisis de Riesgos' }, { label: 'Evaluación de Riesgo' }, { label: 'Tratamiento de Riesgo' }]`
- [x] 1.5 Add `watch(() => props.modelValue, (isOpen) => { if (!isOpen) currentStep.value = 0 })` for reset on close

## Phase 2: ValoracionModal.vue — Validation Functions

- [x] 2.1 Add `canAdvanceFromStep1()`: returns true if all 13 required Step 1 fields are filled (`nombreActivo`, `tipoActivo`, `formato`, `macroProceso`, `subProceso`, `propietario`, `custodio`, `descripcion`, `controlSeguridad`, `ubicacion`, `confidencialidad`, `integridad`, `disponibilidad`)
- [x] 2.2 Add `canAdvanceFromStep2()`: returns `riskRows.value.length > 0`
- [x] 2.3 Add `canAdvanceFromStep3()`: returns `riskRows.value.every(row => findMatchedDetalle(row)?.riesgoId && findMatchedDetalle(row)?.vulnerabilidadRiesgoId)`
- [x] 2.4 Add `nextStep()`: runs gate validation per step, shows `alert()` on fail, increments `currentStep` if pass
- [x] 2.5 Add `prevStep()`: decrements `currentStep` if > 0 (no validation)

## Phase 3: ValoracionModal.vue — Template Changes

- [x] 3.1 Replace `.val-tabs` div (around line 486–495) with `.val-stepper` div using `v-for="(tab, idx) in tabs"` with `active` and `completed` CSS classes driven by `currentStep === idx` and `currentStep > idx`
- [x] 3.2 Replace all `v-show="activeTab === N"` with `v-show="currentStep === N"` on the 4 tab panel divs
- [x] 3.3 Replace action buttons: `Cancelar` always visible (resets `currentStep = 0`); `Atrás` visible when `currentStep > 0`; `Siguiente` visible when `currentStep < TOTAL_STEPS - 1`; `Guardar` visible when `currentStep === TOTAL_STEPS - 1` (is submit button)

## Phase 4: ValoracionModal.vue — CSS

- [x] 4.1 Add `.val-stepper`, `.val-step`, `.val-step-circle`, `.val-step-label` CSS classes in `<style scoped>` (flexbox stepper from design doc)
- [x] 4.2 Comment out or remove `.val-tab` and `.val-tab.active` CSS (no longer used)

## Phase 5: valoracion.vue — Parent Cleanup

- [x] 5.1 Remove `:active-tab="activeTab"` prop from `<ValoracionModal>` in `frontend/pages/valoracion.vue`
- [x] 5.2 Remove `@tab-change="activeTab = $event"` handler from `<ValoracionModal>`

## Phase 6: Smoke Test

- [ ] 6.1 Step 1 → click "Siguiente" with empty required fields → blocked, stays on Step 1
- [ ] 6.2 Step 1 → fill all required fields → "Siguiente" → Step 2 shows
- [ ] 6.3 Step 2 → click "Siguiente" with zero rows → blocked, stays on Step 2
- [ ] 6.4 Step 2 → add one row → "Siguiente" → Step 3 shows
- [ ] 6.5 Step 3 → click "Siguiente" without eval on rows → blocked, stays on Step 3
- [ ] 6.6 Step 3 → eval all rows → "Siguiente" → Step 4 shows "Guardar" (not "Siguiente")
- [ ] 6.7 Step 4 → click "Guardar" → form submits
- [ ] 6.8 Back: Step 3 → "Atrás" → Step 2, state preserved
- [ ] 6.9 Cancel → close modal → reopen → Step 1 (reset confirmed)
## Phase 7: Design Adjustments — Footer Fixed + Unified Header

- [x] 7.1 Unified Header: Remove close (X) button, merge stepper into header row (title left, stepper right)
- [x] 7.2 Fixed Footer: `.val-actions` moved outside `.val-modal-body` — true fixed footer, only body scrolls
- [x] 7.3 Stepper styling: removed `border-bottom`, `padding`, `margin-bottom` — stepper fully integrated in header
- [x] 7.4 Footer background: `var(--card-bg)` instead of hardcoded `white`
- [x] 7.5 Submit outside form: "Guardar" button uses `@click="emit('submit')"` with `type="button"` — footer is sibling of form
- [x] 7.6 Global `.btn-secondary` added to `app.vue` — outline style for "Atrás" button
