# Design: ValoracionModal — Tabs to Wizard Conversion

## Technical Approach

Replace `.val-tabs` button-row with a `.val-stepper` horizontal step indicator. Navigation becomes sequential via Back/Next buttons only — free tab clicking is removed. Local `currentStep = ref(0)` inside the modal replaces the `activeTab` prop from the parent. Validation gates on "Next" enforce step completion before advancing.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State location | Local `currentStep` ref in modal | Encapsulates wizard state; parent no longer controls step |
| Validation timing | On "Next" click, before advancing | Natural UX gate; user corrects before moving forward |
| Step indicator | Flexbox numbered circles + labels | Simple layout matching dark theme; reuses `.val-tab` border-bottom |
| Back button placement | Between step content and Cancel | Standard wizard pattern; no forward validation on back |
| Guardar placement | Replaces "Siguiente" on Step 4 | Final step submits; earlier steps never submit |
| Step indicator CSS | New `.val-stepper` + `.val-step` classes | Clean separation from old `.val-tabs`; no style collision |

## Data Flow

```
User clicks "Siguiente"
    ↓
canAdvanceFromStepN() validation
    ↓ (pass)
currentStep.value++ → Vue re-renders step indicator + panel
    ↓ (fail)
alert() → stays on current step

User clicks "Atrás"
    ↓
currentStep.value-- (no validation)
    ↓
Vue re-renders step indicator + panel

watch(() => props.modelValue) on close → currentStep = 0
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modify | Remove `activeTab` prop; add `currentStep` ref; replace `.val-tabs` with `.val-stepper`; replace `tab-change` emit with `nextStep()`/`prevStep()`; move action buttons inside `<form>` before `</form>` |
| `frontend/pages/valoracion.vue` | Modify | Remove `:active-tab="activeTab"` prop; remove `@tab-change` handler; `activeTab` ref becomes unused (kept for future reuse) |

## Interface Changes

**Props — REMOVE from `defineProps`:**
```typescript
activeTab: number  // REMOVE
```

**Emits — REMOVE:**
```typescript
'tab-change': [index: number]  // REMOVE
```

**NEW local state in `<script setup>`:**
```typescript
const currentStep = ref(0)
const TOTAL_STEPS = 4

const tabs = [
  { label: 'Valoración de Activo' },
  { label: 'Análisis de Riesgos' },
  { label: 'Evaluación de Riesgo' },
  { label: 'Tratamiento de Riesgo' },
]
```

**NEW functions:**
```typescript
function canAdvanceFromStep1(): boolean {
  return !!(
    props.valForm.nombreActivo &&
    props.valForm.tipoActivo &&
    props.valForm.formato &&
    props.valForm.macroProceso &&
    props.valForm.subProceso &&
    props.valForm.propietario &&
    props.valForm.custodio &&
    props.valForm.descripcion &&
    props.valForm.controlSeguridad &&
    props.valForm.ubicacion &&
    props.valForm.confidencialidad &&
    props.valForm.integridad &&
    props.valForm.disponibilidad
  )
}

function canAdvanceFromStep2(): boolean {
  return riskRows.value.length > 0
}

function canAdvanceFromStep3(): boolean {
  return riskRows.value.every(row =>
    findMatchedDetalle(row)?.riesgoId &&
    findMatchedDetalle(row)?.vulnerabilidadRiesgoId
  )
}

function nextStep() {
  if (currentStep.value === 0 && !canAdvanceFromStep1()) {
    alert('Complete todos los campos requeridos en Valoración de Activo')
    return
  }
  if (currentStep.value === 1 && !canAdvanceFromStep2()) {
    alert('Agregue al menos una fila de riesgo')
    return
  }
  if (currentStep.value === 2 && !canAdvanceFromStep3()) {
    alert('Complete la evaluación de riesgo en todas las filas')
    return
  }
  if (currentStep.value < TOTAL_STEPS - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}
```

**NEW watch for reset on close:**
```typescript
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) currentStep.value = 0
  if (isOpen) loadExistingRows()
})
```

**Step indicator HTML (replaces `.val-tabs` div):**
```html
<div class="val-stepper">
  <div
    v-for="(tab, idx) in tabs"
    :key="idx"
    class="val-step"
    :class="{ active: currentStep === idx, completed: currentStep > idx }"
  >
    <div class="val-step-circle">
      <span v-if="currentStep > idx">✓</span>
      <span v-else>{{ idx + 1 }}</span>
    </div>
    <div class="val-step-label">{{ tab.label }}</div>
  </div>
</div>
```

**Action buttons (inside `<form>`, after last tab panel, before `.val-actions`):**
```html
<div class="val-actions">
  <button type="button" class="btn-cancel" @click="emit('update:modelValue', false); currentStep = 0">Cancelar</button>
  <button v-if="currentStep > 0" type="button" class="btn-secondary" @click="prevStep">Atrás</button>
  <button v-if="currentStep < TOTAL_STEPS - 1" type="button" class="btn-primary" @click="nextStep">Siguiente</button>
  <button v-else type="submit" class="btn-primary" :disabled="valSaving">
    {{ valSaving ? 'Guardando...' : editId ? 'Actualizar' : 'Guardar' }}
  </button>
</div>
```

## CSS Changes

**Replace `.val-tabs` styles with `.val-stepper` block in `<style scoped>`:**

```css
.val-stepper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 1.5rem;
}

.val-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  opacity: 0.5;
}

.val-step.active {
  opacity: 1;
}

.val-step.completed {
  opacity: 0.8;
}

.val-step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.val-step.active .val-step-circle {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.val-step.completed .val-step-circle {
  background: rgba(22, 163, 74, 0.2);
  border-color: #16a34a;
  color: #16a34a;
}

.val-step-label {
  font-size: 0.75rem;
  text-align: center;
  color: var(--text-muted);
  max-width: 80px;
}
```

Remove `.val-tab` and `.val-tab.active` CSS — no longer used.

## Testing Strategy

No frontend test runner. Manual smoke test checklist:
- Step 1: click "Siguiente" with empty required fields → blocked, stays on Step 1
- Step 1: fill all required fields → "Siguiente" enabled → click → Step 2 shows
- Step 2: click "Siguiente" with zero rows → blocked, stays on Step 2
- Step 2: add one row → click "Siguiente" → Step 3 shows
- Step 3: click "Siguiente" without amenaza/vulnerabilidad selects → blocked, stays on Step 3
- Step 3: select amenaza+vulnerabilidad on all rows → "Siguiente" → Step 4 shows "Guardar" (not "Siguiente")
- Step 4: click "Guardar" → form submits
- Back: from Step 3 → click "Atrás" → Step 2, state preserved
- Back: from Step 2 → click "Atrás" → Step 1
- Cancel: close modal → reopen → Step 1 (reset confirmed)

## Migration / Rollout

No migration required. No database or API changes. This is a pure UI refactor.

## Open Questions

- [ ] None — all decisions resolved in proposal and spec phases.