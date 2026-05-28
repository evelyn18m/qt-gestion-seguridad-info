# Exploration (Iteration 2): Tab Component Extraction

## Current Tab Structure

### Tab 1 — Valoración de Activo (lines 698–803)
- **Two-column grid**: Left = Identification, Right = CIA values
- **Fields written**: `valForm` (nombreActivo, tipoActivo, formato, macroProceso, subProceso, propietario, custodio, descripcion, controlSeguridad, ubicacion, tieneDatosPersonales, observaciones)
- **CIA fields**: confidencialidad, integridad, disponibilidad + `ciaAverage` display
- **Catalog reads**: `valMacroprocesos`, `valSubprocesos`, `valFuncionarios`, `valAreas`, `valTipoActivo`, `valFormatos`
- **Impact reads**: `valImpactos` (via `getNivelesImpacto()`)
- **Computed**: `subprocesosFiltrados` (filter by macroProceso), `macroProcesoName`

### Tab 2 — Análisis de Riesgos (lines 806–888)
- **Two-column grid**: Left = inputs, Right = selected chips
- **Fields written**: `analisisForm` (macroProceso, nombreActivo, amenazas[], vulnerabilidades[], controlesImplementacion)
- **Local UI state**: `amenazaCategoria`, `vulnerabilidadCategoria`, `amenazaSeleccionada`, `vulnerabilidadSeleccionada`
- **Functions**: `agregarAmenaza()`, `quitarAmenaza()`, `agregarVulnerabilidad()`, `quitarVulnerabilidad()`, `rebuildDetalles()`
- **Catalog reads**: `valAmenazas`, `valVulnerabilidades` (filtered by categoria)
- **Computed**: `amenazaCategorias`, `vulnerabilidadCategorias`, `amenazasFiltradas`, `vulnerabilidadesFiltradas`
- **Helper reads**: `getAmenazaLabel()`, `getVulnerabilidadLabel()`
- **Side effect**: Adds to `detallesRiesgo[]` via `rebuildDetalles()` when threats/vulns are added

### Tab 3 — Evaluación de Riesgo (lines 891–953)
- **Single-column layout** with risk evaluation table
- **Reads**: `ciaAverage` (from composable, derived from Tab 1 CIA selections)
- **Fields written**: `evaluacionForm` (controlesArea, amenazaRiesgoId, vulnerabilidadRiesgoId)
- **Reads/writes**: `detallesRiesgo[]` (per-row `riesgoId`, triggers `recalcAllEvaluaciones()`)
- **Table columns**: Tipo | Item | Nivel de Riesgo (select) | Evaluación (computed) | Nivel (computed)
- **Catalog reads**: `valRiesgos` (threat/vuln risk levels), `valImpactos` (indirectly via ciaAverage)
- **Side effect**: `updateEvaluacionDetalle()` recalculates all `detallesRiesgo`

### Tab 4 — Tratamiento de Riesgo (lines 956–1054)
- **Two-column layout**: Threats (left) | Vulnerabilities (right)
- **No form writes** — writes directly to `detallesRiesgo[]` items
- **Per-row fields written on `detalleRiesgo` item**: `metodoTratamiento`, `tipoControlId`, `riesgoControlId`
- **Computed (read-only display)**: `evaluacionRiesgoControl`, `nivelRiesgoControl`
- **Catalog reads**: `valTiposControl`, `valRiesgos`
- **Helper reads**: `getCatalogoLabel()`, `getTipoControlName()`, `getNivelStyle()`
- **Side effect**: `updateControlDetalle()` on `riesgoControlId` change

### View Modal (lines 1066–1182)
- **Read-only** — no form state, uses `viewItem` prop
- **Displays all 4 sections** in a flat layout (not tabbed)
- **Helper reads**: `getCatalogoLabel()`, `getTipoControlName()`, `getNivelStyle()`, `calculateRowCiaAverage()`, `getCiaLevel()`

---

## Recommended Extraction Order

### 1. Tab 4 (Tratamiento) — Easiest first
**Why**: No form object ownership — only mutates `detallesRiesgo[]` items directly. No local UI state (no `ref` for UI). Two identical columns (threats/vulns) with the same table structure. Minimal catalog dependencies (`valTiposControl`, `valRiesgos`).

**Challenge**: `detallesRiesgo` is a shared array — mutations must propagate to parent. Vue's reactive array proxy handles this if we pass the array by reference.

### 2. Tab 3 (Evaluación) — Second
**Why**: Still reads `ciaAverage` from composable, but the table structure is readable. `detallesRiesgo` mutations (riesgoId changes) trigger `recalcAllEvaluaciones()`.

**Challenge**: Inline `select v-model="d.riesgoId"` on each row — the row object is from the parent's `detallesRiesgo` array. Passing the array by reference handles this naturally.

### 3. Tab 2 (Análisis) — Third
**Why**: Most complex wiring — 4 local UI `ref`s (`amenazaCategoria`, etc.), 4 helper functions that write to `analisisForm` AND call `rebuildDetalles()`. This is the hardest tab to extract cleanly.

**Challenge**: Must preserve `rebuildDetalles()` side effect (populates `detallesRiesgo` when threats/vulns change). The add/remove functions need to live somewhere — either in the component (emitting events) or in a composable.

### 4. Tab 1 (Activo) — Last
**Why**: Most fields, most catalog props. The `subprocesosFiltrados` computed depends on `valForm.macroProceso` reactively — this could be handled internally or by the composable.

**Challenge**: CIA section uses `getNivelesImpacto()` from `useRiskCalculations`. The composable already exists (extracted in iteration 1) — Tab 1 can call it directly rather than receiving `getNivelesImpacto` as a prop.

---

## Component Architecture

### Props Strategy: Reactive Objects by Reference

The key insight: all form objects (`valForm`, `analisisForm`, `evaluacionForm`) and the `detallesRiesgo` array are `ref<>()` wrappers. When passed to a child component, Vue 3's reactivity system automatically unwraps the `ref` in templates, but the reactive connection is maintained **by reference**.

```
// Parent holds:
const valForm = ref({ ... })
const detallesRiesgo = ref<DetalleRiesgo[]>([])

// Child receives (via props):
const props = defineProps<{
  valForm: { nombreActivo: string; ... }
  detallesRiesgo: DetalleRiesgo[]
}>()

// Child mutates (directly, since it's by reference):
props.detallesRiesgo.push(newItem) // parent sees it
props.valForm.nombreActivo = 'foo' // parent sees it
```

**This eliminates the need for emit-heavy patterns** — child components mutate shared reactive state directly, and Vue's proxy system propagates changes automatically.

### State Sharing: Composable-Only + Props

Instead of provide/inject (which adds indirection), use this layered approach:

| Data | Lives In | Accessed By |
|------|----------|-------------|
| Form objects (`valForm`, `analisisForm`, etc.) | Parent page | Passed as props |
| `detallesRiesgo` array | Parent page | Passed as props (by reference) |
| Catalog data (12 refs) | Parent page | Passed as props |
| `useRiskCalculations` composable | Composables | Tab components import directly |
| Tab-specific helpers (`agregarAmenaza`, etc.) | New `useValoracionTab2` composable | Tab 2 component |

### Component Naming

Following Nuxt 3 auto-import conventions (PascalCase subdirectory prefix):

```
components/
  valoracion/
    ValoracionTab1.vue     # "ValoracionTab1" (auto-imported)
    ValoracionTab2.vue     # "ValoracionTab2"
    ValoracionTab3.vue     # "ValoracionTab3"
    ValoracionTab4.vue     # "ValoracionTab4"
    ValoracionFormModal.vue
    ValoracionViewModal.vue
```

**Alternative** (flat, matching existing `components/CatalogoManager.vue`):
```
components/
  ValoracionTab1.vue
  ValoracionTab2.vue
  ...
```

Nuxt's flat approach would yield `<ValoracionTab1 />`. The subdirectory approach yields `<ValoracionTab1 />` as well (prefix from directory). Recommend **subdirectory** since it groups related components.

### Tab 2's Special Case: Helper Functions

Tab 2 has 4 functions that both update `analisisForm` AND call `rebuildDetalles()`. These should move to a new composable `useValoracionTab2State`:

```typescript
// composables/useValoracionTab2State.ts
export function useValoracionTab2State(
  analisisForm: Ref<AnalisisForm>,
  detallesRiesgo: Ref<DetalleRiesgo[]>,
  valAmenazas: Ref<CatalogoItem[]>,
  valVulnerabilidades: Ref<CatalogoItem[]>,
) {
  // amenazaCategoria, vulnerabilidadCategoria, amenazaSeleccionada, vulnerabilidadSeleccionada
  // agregarAmenaza, quitarAmenaza, agregarVulnerabilidad, quitarVulnerabilidad
  // rebuildDetalles()
  // getAmenazaLabel, getVulnerabilidadLabel
  // amenazaCategorias, vulnerabilidadCategorias, amenazasFiltradas, vulnerabilidadesFiltradas
}
```

Tab 2 component imports this composable and calls the functions directly.

---

## Component Props Summary

### ValoracionTab1.vue
```typescript
defineProps<{
  valForm: ValFormShape
  valTipoActivo: CatalogoItem[]
  valFormatos: CatalogoItem[]
  valMacroprocesos: CatalogoItem[]
  valSubprocesos: CatalogoItem[]
  valFuncionarios: CatalogoItem[]
  valAreas: CatalogoItem[]
  // NO valImpactos — Tab1 calls useRiskCalculations directly
}>()
```

### ValoracionTab2.vue
```typescript
defineProps<{
  analisisForm: AnalisisFormShape
  detallesRiesgo: DetalleRiesgo[]
  valAmenazas: CatalogoItem[]
  valVulnerabilidades: CatalogoItem[]
}>()
// Uses useValoracionTab2State composable internally
```

### ValoracionTab3.vue
```typescript
defineProps<{
  evaluacionForm: EvaluacionFormShape
  detallesRiesgo: DetalleRiesgo[]
  valRiesgos: CatalogoItem[]
}>()
// Uses useRiskCalculations composable directly (ciaAverage already available)
```

### ValoracionTab4.vue
```typescript
defineProps<{
  detallesRiesgo: DetalleRiesgo[]
  valTiposControl: CatalogoItem[]
  valRiesgos: CatalogoItem[]
}>()
// No form object — mutates detallesRiesgo items directly
```

---

## Risks

1. **`detallesRiesgo` mutation propagation**: Tab 3 and Tab 4 both write to items in the shared `detallesRiesgo` array. Passing by reference works, but Vue's reactivity must stay intact through the prop chain. If extracted to a component that destructures the array, reactivity breaks.

2. **`rebuildDetalles()` side effect chain**: Tab 2's `agregarAmenaza()` calls `rebuildDetalles()` which rebuilds the entire `detallesRiesgo` array. If Tab 3 or Tab 4 hold references to old array items, those references become stale after a rebuild.

3. **View modal is not tab-based**: The view modal displays all 4 sections flat (not tabbed), so tab components can't be reused directly — Tab 4 components share the same `<table>` structure, but the view modal's version has no inputs.

4. **Nuxt auto-import of subdirectory components**: Components in `components/valoracion/` auto-import as `ValoracionTab1` etc. Must verify this works with the current Nuxt 4 setup.

5. **Style collision**: All tab styles currently live in `valoracion.vue`'s `<style scoped>`. Extracted components will need their own scoped styles or the page must re-export the card/table styles.

---

## Open Questions for Orchestrator

1. **View modal reuse**: Should the view modal sections be extracted as read-only versions of each tab component, or kept as a separate monolithic template?
2. **Tabuless view modal**: The view modal doesn't use tabs — it shows all 4 sections stacked. Should this stay as-is or be refactored to use the same tab components in read-only mode?
3. **Phase 1 (composables) already done**: `useRiskCalculations` is extracted. Does iteration 2 focus purely on tab component extraction, or also tackle `useValoracionForms`/`useCatalogSelectors` composables?

---

## Ready for Proposal

**Yes — ready for sdd-propose** for the tab extraction sub-work.

The analysis confirms:
- Clear extraction order identified (Tab 4 → Tab 3 → Tab 2 → Tab 1)
- Reactive-by-reference prop passing handles cross-tab state without emit overhead
- Tab 2's helper functions need a dedicated composable to avoid massive prop drilling
- View modal adds a secondary consideration (reuse vs. separate read-only template)
- Style isolation needs explicit handling during extraction

**Next**: `sdd-propose` for the tab extraction change (or `sdd-design` if scope is already defined).
