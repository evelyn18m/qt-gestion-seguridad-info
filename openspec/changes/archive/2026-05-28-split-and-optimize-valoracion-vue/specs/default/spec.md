# Delta for valoracion-frontend

## ADDED Requirements

### Requirement: useRiskCalculations composable extraction

The system MUST provide a `useRiskCalculations` composable at `frontend/composables/useRiskCalculations.ts` containing all CIA and risk calculation logic previously inlined in `valoracion.vue`. The composable MUST export the following functions and computeds with identical behavior:

**Functions:**
- `getValorImpacto(id: string | number): number` — resolves impacto catalog item by ID, returns its `valor` field or 0
- `getValorRiesgo(id: string | number): number` — resolves riesgo catalog item by ID, returns its `valor` or 0
- `calculateRowCiaAverage(v: any): number` — computes CIA average from row-level CIA IDs
- `getCiaLevel(avg: number): string` — returns 'Alto' if avg >= 2.5, 'Medio' if >= 1.5, else 'Bajo'
- `calcularEvaluacionRiesgo(amenazaRiesgoId, vulnerabilidadRiesgoId): number` — computes impacto × amenaza × vulnerabilidad
- `calcularNivelRiesgo(evaluacion: number): string` — maps evaluacion to Crítico/Alto/Medio/Bajo
- `getNivelesImpacto(tipo: string): CatalogoItem[]` — filters valImpactos by tipo (confidencialidad/integridad/disponibilidad)
- `getNivelStyle(nivel: string): { label, color, bg }` — returns badge styling for nivel
- `getMaxNivelIndex(nivel: string): number` — returns 4 for Crítico, 3 for Alto, 2 for Medio, 1 for Bajo
- `getNivelFromIndex(idx: number): string` — maps index back to nivel name

**Computeds (require reactive inputs — page provides refs):**
- `ciaAverage` — requires `valForm` ref and `valImpactos` ref
- `evaluacionRiesgo` — requires `evaluacionForm` ref, `ciaAverage`, `getValorRiesgo`
- `nivelRiesgo` — requires `evaluacionRiesgo`
- `evaluacionRiesgoControl` — requires `tratamientoForm` ref, `ciaAverage`, `getValorRiesgo`
- `nivelRiesgoControl` — requires `evaluacionRiesgoControl`

The composable MUST be pure TypeScript — no Vue template refs, no API calls, no catalog fetching.

#### Scenario: Import and use composable in valoracion.vue

- GIVEN `useRiskCalculations.ts` composable exists at `frontend/composables/`
- WHEN `valoracion.vue` imports the composable and calls `getValorImpacto` or reads `ciaAverage`
- THEN all calculation functions and computeds produce identical results to before extraction

#### Scenario: TypeScript compilation passes

- GIVEN `useRiskCalculations.ts` is extracted
- WHEN `npx tsc --noEmit` runs on the frontend
- THEN no TypeScript errors are emitted

#### Scenario: Reactive computeds maintain reactivity

- GIVEN the composable is wired into `valoracion.vue` with proper ref bindings
- WHEN a user changes CIA fields (confidencialidad/integridad/disponibilidad) on Tab 1
- THEN `ciaAverage` updates immediately
- AND `evaluacionRiesgo` and `nivelRiesgo` update on Tab 3
- AND no reactivity is lost compared to before extraction

### Requirement: Catalog access unchanged

The `valoracion.vue` page MUST retain all `val*` refs (`valMacroprocesos`, `valSubprocesos`, `valImpactos`, `valRiesgos`, `valAmenazas`, `valVulnerabilidades`, etc.) as page-level reactive state. The `useCatalog()` composable and `fetchCatalog()` usage MUST remain unchanged.

#### Scenario: valImpactos still bound to form selects

- GIVEN `valoracion.vue` still declares `valImpactos` as a page-level ref
- WHEN the "Confidencialidad" dropdown renders
- THEN the `valImpactos` catalog items are used identically to before extraction

#### Scenario: getValorImpacto reads valImpactos via composable parameter

- GIVEN `useRiskCalculations` exposes `getValorImpacto`
- WHEN it is called with a catalog ID
- THEN it reads from the `valImpactos` ref passed into the composable

### Requirement: View modal behavior preserved

The view modal invoked via `openViewModal()` MUST continue to populate all 4 tabs. No extraction changes affect modal logic, data loading, or submit behavior.

#### Scenario: View modal opens after extraction

- GIVEN `valoracion.vue` has been refactored to use `useRiskCalculations`
- WHEN a user clicks "Ver" on an existing `ValoracionActivo` row
- THEN the view modal opens with all 4 tabs populated identically to before extraction

---

## ADDED Requirements (Iteration 2 — Tab 4 Extraction)

### Requirement: ValoracionTab4.vue component extraction

The system MUST provide a `ValoracionTab4.vue` component at `frontend/components/valoracion/ValoracionTab4.vue` that renders the Tab 4 "Tratamiento de Riesgo" panel. The component MUST:

- Accept props: `detallesRiesgo` (reactive array), `riesgos`, `tiposControl`, `valRiesgos`, `valTiposControl`
- Render threat/vulnerability control table rows with inline selects for `metodoTratamiento`, `tipoControlId`, `riesgoControlId`
- Move all local functions (`updateControlDetalle`, etc.) inline without external API calls
- Read from passed props only — no API calls, no page-level refs

#### Scenario: Tab 4 renders threat/vulnerability rows

- GIVEN `ValoracionTab4.vue` is imported and wired in `valoracion.vue`
- WHEN tab 4 is visible
- THEN the threat/vulnerability table renders with correct catalog-bound selects

#### Scenario: riesgoControlId dropdown triggers update

- GIVEN `ValoracionTab4.vue` is imported and wired in `valoracion.vue`
- WHEN tab 4 is visible AND user changes `riesgoControlId` dropdown
- THEN `updateControlDetalle` is called AND `evaluacionRiesgoControl` and `nivelRiesgoControl` update in parent's `detallesRiesgo` array

### Requirement: ValoracionTab4.vue wired by reference

The `valoracion.vue` page MUST replace the Tab 4 `<div v-show="activeTab === 3">` region with `<ValoracionTab4 :detallesRiesgo="detallesRiesgo" :riesgos="valRiesgos" :tiposControl="valTiposControl" />`. The `detallesRiesgo` array MUST be passed by reference — no `v-if` guard on the component; the parent tab panel controls visibility.

#### Scenario: Props passed by reference — no emit needed

- GIVEN `detallesRiesgo` is a reactive array ref in parent
- WHEN child component mutates an item's `evaluacionRiesgoControl`
- THEN the parent's `detallesRiesgo` reactive array reflects the change immediately (no emit required)

#### Scenario: getCatalogoLabel and getTipoControlName inlined or passed

- GIVEN the component only reads from props
- WHEN it needs a `getCatalogoLabel` or `getTipoControlName`
- THEN those functions are either passed from parent or inlined in the component
- AND no catalog API call is made from within `ValoracionTab4.vue`

### Requirement: useValoracionTab2State.ts composable skeleton

The system MUST provide a `useValoracionTab2State.ts` composable at `frontend/composables/useValoracionTab2State.ts` with placeholder bodies for the following signatures, defined now for use in future iterations:

- `agregarAmenaza(amenaza: Amenaza): void`
- `quitarAmenaza(index: number): void`
- `agregarVulnerabilidad(vulnerabilidad: Vulnerabilidad): void`
- `quitarVulnerabilidad(index: number): void`
- `rebuildDetalles(): void`

#### Scenario: Composable skeleton compiles without error

- GIVEN `useValoracionTab2State.ts` exists with placeholder signatures
- WHEN `npx tsc --noEmit` runs on the frontend
- THEN no TypeScript errors are emitted

#### Scenario: Composable exported as named export

- GIVEN `useValoracionTab2State.ts` is placed in `frontend/composables/`
- WHEN `valoracion.vue` or a future tab component imports it
- THEN it imports as a named export `import { useValoracionTab2State } from '~/composables/useValoracionTab2State'`

---

## REMOVED Requirements

### Requirement: Inline CIA and risk calculation logic (removed)

The inline CIA average computation, risk evaluation functions, and nivel styling previously defined directly in `valoracion.vue` are REMOVED and replaced by imports from `useRiskCalculations`. The extracted code includes: `getValorImpacto`, `getValorRiesgo`, `calculateRowCiaAverage`, `getCiaLevel`, `calcularEvaluacionRiesgo`, `calcularNivelRiesgo`, `getNivelStyle`, `getMaxNivelIndex`, `getNivelFromIndex`, `ciaAverage`, `evaluacionRiesgo`, `nivelRiesgo`, `evaluacionRiesgoControl`, `nivelRiesgoControl`.

(Reason: pure code relocation to enable independent composable testing and future tab-component extraction)

#### Scenario: Inline functions removed from valoracion.vue

- GIVEN extraction is complete
- WHEN the `valoracion.vue` source is inspected for `function getValorImpacto`
- THEN the function definition is NOT present inline
- AND the function is only present in `useRiskCalculations.ts`