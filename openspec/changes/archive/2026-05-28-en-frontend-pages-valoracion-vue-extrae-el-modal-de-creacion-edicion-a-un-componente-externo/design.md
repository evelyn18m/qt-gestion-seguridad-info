# Design: Extraer modal de valoracion.vue a ValoracionModal.vue

## Technical Approach

Extract the inline modal block (lines 781–1171 of `valoracion.vue`) into a dedicated `ValoracionModal.vue` component using a props/emit interface. The parent (`valoracion.vue`) remains the sole source of truth for all state, API calls, and data coordination.

## Architecture Decisions

### Decision: Props/Emit over Slots or Composables

**Choice**: Props/emit — parent owns all state, child receives data and emits events.

**Alternatives considered**:
- **Slots**: No slot usage exists in the frontend codebase. Introducing slots would be an unfamiliar pattern without precedent.
- **Composables**: No composable pattern exists in the frontend (no `use*` files). Creating one would be speculative and add unnecessary indirection.

**Rationale**: Props/emit keeps the data flow unidirectional and reduces coordination risk. The parent handles all async operations and persistence; the child is purely presentational.

### Decision: v-model for Modal Visibility

**Choice**: `modelValue` + `update:modelValue` for the modal overlay visibility.

**Rationale**: Aligns with Vue 3 conventions. The parent manages `showModalVal`; the child emits close events without needing to own any visibility state.

## Data Flow

```
valoracion.vue (STATE OWNER)
    ├── valForm, analisisForm, evaluacionForm, tratamientoForm, detallesRiesgo
    ├── catalogData (all 12 catalogs via individual props)
    ├── API calls: submitValoracion, loadValoraciones, editValoracion
    └── showModalVal, valEditId, activeTab state

    │──── props ────► ValoracionModal.vue (PRESENTATION ONLY)
    │◄─── events ────
```

### Events emitted by ValoracionModal.vue

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `boolean` | Close modal |
| `submit` | Full form data object | Trigger submit from modal |
| `tab-change` | `number` | Tab navigation |
| `reset-form` | none | Reset all forms |

## Component API

### Props (all required)

```typescript
interface Props {
  modelValue: boolean           // v-model for visibility
  editId: number | null         // null = create, number = edit
  activeTab: number             // current tab index 0–3
  catalogData: CatalogData      // all 12 catalog arrays
  valForm: ValFormData           // Tab 1 data
  analisisForm: AnalisisFormData // Tab 2 data
  evaluacionForm: EvaluacionFormData // Tab 3 data
  tratamientoForm: TratamentFormData  // Tab 4 data
  detallesRiesgo: DetalleRiesgo[]     // risk details array
  valSaving: boolean             // submitting flag
  valSuccess: string              // success message
  valLoading: boolean             // loading flag
}
```

> **CatalogData**: an object with 12 optional array properties:
> `valTipoActivo`, `valFormatos`, `valMacroprocesos`, `valSubprocesos`, `valAmenazas`, `valVulnerabilidades`, `valImpactos`, `valFuncionarios`, `valAreas`, `valRiesgos`, `valProbabilidades`, `valTiposControl`

### Usage in valoracion.vue

```vue
<ValoracionModal
  v-model="showModalVal"
  :edit-id="valEditId"
  :active-tab="activeTab"
  :catalog-data="{
    valTipoActivo, valFormatos, valMacroprocesos, valSubprocesos,
    valAmenazas, valVulnerabilidades, valImpactos, valFuncionarios,
    valAreas, valRiesgos, valProbabilidades, valTiposControl
  }"
  :val-form="valForm"
  :analisis-form="analisisForm"
  :evaluacion-form="evaluacionForm"
  :tratamiento-form="tratamientoForm"
  :detalles-riesgo="detallesRiesgo"
  :val-saving="valSaving"
  :val-success="valSuccess"
  :val-loading="valLoading"
  @submit="submitValoracion"
  @tab-change="activeTab = $event"
  @reset-form="resetForm"
/>
```

## File Structure After Extraction

```
frontend/
├── pages/
│   └── valoracion.vue           # Simplified: table + view modal + <ValoracionModal />
└── components/
    └── ValoracionModal.vue       # NEW — extracted modal (~390 lines)
```

## What Stays in valoracion.vue

- All reactive state: `valForm`, `analisisForm`, `evaluacionForm`, `tratamientoForm`, `detallesRiesgo`
- All 12 catalog arrays (via `catalogData` prop)
- API calls: `submitValoracion`, `loadValoraciones`, `editValoracion`, `viewValoracion`, `deleteValoracion`
- Helper functions: `getCatalogoLabel`, `calcularEvaluacionRiesgo`, `rebuildDetalles`, `toggleAmenaza`, `toggleVulnerabilidad`, etc.
- `showModalVal`, `valEditId`, `activeTab` state
- `onMounted` data loading
- Table UI (both tables)
- View modal (lines 1173–1290)
- All `<style scoped>` — stays in valoracion.vue

## What Goes to ValoracionModal.vue

- The `<div v-if="showModalVal" class="val-modal-overlay">` block (lines 781–1171)
- Props declaration and typing
- Emits declaration
- Computed properties that affect only modal UI:
  - `subprocesosFiltrados`, `amenazaCategorias`, `vulnerabilidadCategorias`
  - `amenazasFiltradas`, `vulnerabilidadesFiltradas`
  - `ciaAverage`, `evaluacionRiesgo`, `nivelRiesgo`, `evaluacionRiesgoControl`, `nivelRiesgoControl`
  - `detallesAmenazas`, `detallesVulnerabilidades`
  - `macroProcesoName`
- Helper functions used only in modal:
  - `getNivelesImpacto`, `getValorImpacto`, `getValorRiesgo`
  - `getAmenazaLabel`, `getVulnerabilidadLabel`, `getNivelStyle`
- All 4 tab content templates (Tab 1: lines 806–911, Tab 2: 914–996, Tab 3: 999–1061, Tab 4: 1064–1162)
- Tab navigation buttons (lines 792–801)
- Modal header and close button
- Form submit button and cancel

## Open Questions

- None — all decisions documented above.

## Migration Steps

1. **Create `frontend/components/ValoracionModal.vue`**
   - Copy lines 781–1171 from `valoracion.vue`
   - Add `<script setup>` with all props and emits
   - Import shared types
   - Define `Props` interface matching the component API above

2. **Update `valoracion.vue`**
   - Import `ValoracionModal` from `~/components/ValoracionModal.vue`
   - Replace inline modal block (lines 781–1171) with `<ValoracionModal ... />`
   - Wire up all props and event handlers

3. **Test**
   - Create new valoración → all 4 tabs work
   - Edit existing valoración → all 4 tabs pre-populated correctly
   - Verify CIA sync, threat/vulnerability selection, risk evaluation, and treatment all function end-to-end

## Rollback

```bash
git revert <commit>
```
Restores the inline modal block. No data migration required.