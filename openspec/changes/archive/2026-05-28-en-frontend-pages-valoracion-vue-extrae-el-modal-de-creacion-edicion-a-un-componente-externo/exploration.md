## Exploration: Extraer modal de valoracion.vue a componente externo

### Current State

The `valoracion.vue` page (1693 lines total) contains a monolithic creation/edit modal embedded directly in the page at lines 781–1171. This modal:

- **Trigger**: Opened via `openNewValoracion()` (new) or `editValoracion(item)` (edit), controlled by `showModalVal` and `valEditId` refs
- **Structure**: Overlay with tabs — Tab 1 (Valoración de Activo CIA), Tab 2 (Análisis de Riesgos), Tab 3 (Evaluación de Riesgo), Tab 4 (Tratamiento de Riesgo)
- **State**: All form state lives in the page: `valForm`, `analisisForm`, `evaluacionForm`, `tratamientoForm`, `detallesRiesgo`, `amenazaCategoria`, `amenazaSeleccionada`, `vulnerabilidadCategoria`, `vulnerabilidadSeleccionada`, `activeTab`, `valEditId`, `showModalVal`
- **Functions**: `submitValoracion`, `editValoracion`, `resetForm`, `openNewValoracion`, `rebuildDetalles`, `recalcAllEvaluaciones`, `updateEvaluacionDetalle`, `updateControlDetalle`, `agregarAmenaza`, `quitarAmenaza`, `agregarVulnerabilidad`, `quitarVulnerabilidad`, and ~15 computed helpers
- **Catalog data**: `valTipoActivo`, `valFormatos`, `valMacroprocesos`, `valSubprocesos`, `valAmenazas`, `valVulnerabilidades`, `valImpactos`, `valFuncionarios`, `valAreas`, `valRiesgos`, `valProbabilidades`, `valTiposControl` — all loaded via `loadValoracionData()` on mount

The modal also has a companion **View Modal** (lines 1173–1291) that displays read-only data for an existing valoración.

### Affected Areas

- `frontend/pages/valoracion.vue` — lines 781–1291 (both edit/create modal + view modal), ~510 lines of template + all the reactive state and functions listed above
- `frontend/components/` — only `CatalogoManager.vue` exists; naming convention is `PascalCase.vue`
- `frontend/types/api.ts` — `ValoracionActivo` and `CatalogoItem` types used throughout

### Approaches

#### 1. Single monolithic component — `ValoracionModal.vue`
Extract the entire edit/create modal as one `ValoracionModal.vue` component. Keep the view modal inline (it's simpler and read-only).

- **Pros**: Simplest extraction — one boundary, less prop drilling
- **Cons**: Component will be large (~400 template lines), still couples all 4 tabs together; harder to test incrementally
- **Effort**: Medium

#### 2. Composed sub-components per tab
Create `ValoracionTab1.vue`, `ValoracionTab2.vue`, `ValoracionTab3.vue`, `ValoracionTab4.vue` and compose them inside `ValoracionModal.vue`.

- **Pros**: Clear separation, easier to test per tab, follows single-responsibility
- **Cons**: More files, more prop drilling between parent modal and tabs; state coordination becomes more complex
- **Effort**: High

#### 3. Smart/dumb component split — extract modal shell only
Extract only the modal overlay shell and the tab navigation to `ValoracionModal.vue`, passing each tab as a slot. Each tab content stays in `valoracion.vue` as named slots.

- **Pros**: Keeps tab content in context of the page (access to all catalog data without prop drilling); modal shell is the reusable part
- **Cons**: The page still needs to hold all the form state and functions; boundary is shallow
- **Effort**: Low

#### 4. Component with `v-model` pattern + props/emits
Extract fully to `ValoracionModal.vue` with props for catalog data and emits for submit/close/cancel. Page passes all catalog data as props.

- **Pros**: Clean boundary, fully reusable, page is only the orchestrator
- **Cons**: Large prop surface (12 catalog arrays + form state + functions); significant refactoring of `valoracion.vue` to move all state; many helper functions need to move or be reconsidered
- **Effort**: High

### Recommendation

**Approach 3 (Smart/dumb shell + slots)** is the pragmatic first step. The modal shell (overlay, header, tab navigation, actions) is the truly reusable piece. Keeping tab content in the page avoids prop drilling for the catalog data that already lives there. The component contract is simple: page provides catalog data and form state via reactive refs; component receives `@submit`, `@cancel`, `@close` events. This is achievable in one SDD cycle.

**If** the team wants full reusability (e.g., embedding this modal in other pages), the longer-term path is **Approach 4** — but that requires moving catalog data loading to a composable and restructuring state management significantly.

### Risks

- **State coordination**: Moving form state to the component requires careful handling of `detallesRiesgo` reactive array and the `rebuildDetalles`/`recalcAllEvaluaciones` functions that cross tab boundaries
- **Validation coupling**: Tab 2 (Análisis) depends on Tab 1 (CIA) computed values; if state moves, the watch sync between tabs must be preserved
- **View modal**: The read-only view modal (lines 1173–1291) shares helper functions like `getNivelStyle`, `getCatalogoLabel`, `getTipoControlName` — these need to be accessible from the page or moved to a shared location
- **Size**: The extracted component will be ~400 lines of template; plan for chained PRs if the full extraction exceeds 400 changed lines

### Ready for Proposal: Yes

The extraction is well-bounded. A single `ValoracionModal.vue` component with a clear prop/emit interface is the right scope for the first proposal.