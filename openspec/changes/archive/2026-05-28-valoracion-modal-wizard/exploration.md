# Exploration: ValoracionModal — Tabs to Wizard Conversion

## Current State

`ValoracionModal.vue` uses **free tab navigation** — 4 tabs rendered as buttons in `.val-tabs`, each activating a `v-show` panel. Users can click any tab at any time (except Tab 3/4 warn if no data from Tab 2). The parent `valoracion.vue` holds `activeTab` in its own state and passes it as a prop; the modal emits `tab-change` to update the parent.

**Key current mechanics:**
- `activeTab` prop drives which panel is visible (`v-show="activeTab === N"`)
- Tab bar at lines 486-495 — button row, click → `emit('tab-change', idx)`
- Actions bar (Cancel / Guardar) lives at bottom of form, always visible
- No validation gates between tabs — users can freely skip to any tab
- `riskRows` state lives inside the modal, synced to `detallesRiesgo` prop

**Parent `valoracion.vue` manages:**
- `activeTab = ref(0)` — owns the tab navigation state
- `showModalVal` — modal visibility
- `submitValoracion()` — aggregates all forms + `detallesRiesgo` for API call
- `editValoracion()` / `openNewValoracion()` — set `activeTab = 0` before opening modal

## Affected Areas

- `frontend/components/ValoracionModal.vue` — primary target: replace `.val-tabs` with stepper, add Back/Next buttons, move "Guardar" to final step only
- `frontend/pages/valoracion.vue` — parent may need changes: remove `activeTab` prop (wizard state is self-contained in modal), remove `@tab-change` handler, optionally remove Tab 1 mandatory validation alert on submit since wizard gates it
- CSS in `ValoracionModal.vue` — `.val-tabs` styles become obsolete; need `.val-stepper` / `.val-step` / button styles for Back/Next

## Approaches

### 1. Wizard-as-local-state inside ValoracionModal (RECOMMENDED)

Keep all wizard state (`currentStep`, `riskRows`, all forms) self-contained in the modal. Replace the tab bar with:
- A visual step indicator (horizontal stepper: "1. Valoración" → "2. Análisis" → "3. Evaluación" → "4. Tratamiento")
- Back / Siguiente buttons (Siguiente → increment step, Back → decrement)
- Final step: "Guardar" replaces "Siguiente"
- Emit `submit` only from the final step

**Validation gate:** Before `currentStep++`, validate that the current step's required fields are filled. Block navigation if not. Since the form data is already passed as props from the parent, validation lives in the modal.

**Changes to parent `valoracion.vue`:**
- Remove `:active-tab="activeTab"` prop
- Remove `@tab-change` emit handler
- Keep `activeTab` ref only for the "Edit opens at Tab 0" behavior (or remove if no longer needed)
- The submit flow (`submitValoracion`) remains identical

- **Pros:** Modal is fully encapsulated; parent coupling drops; validation is natural (can't advance without completing current step); easy to extend with step-specific submit
- **Cons:** Modal grows ~50-80 lines for stepper logic and navigation buttons; state duplication risk if parent needs to sync
- **Effort:** Medium — ~120-180 lines changed

### 2. Wizard state in parent (`valoracion.vue`) — emit step navigation

Keep `activeTab` in parent (rename to `currentStep = 0`). Modal receives `currentStep` prop and emits `step-change` or `next-step` / `prev-step`. Modal has no internal navigation — just renders the current step's panel. Validation before advancing happens in the parent (or forwarded to modal for re-validation).

- **Pros:** Parent fully controls navigation flow; aligns with existing architecture where parent owns `activeTab`
- **Cons:** Requires changing both files significantly; validation logic distributed; parent gets more responsibility for a purely UI concern
- **Effort:** Medium — similar line count to option 1 but more parent changes

### 3. Extract a new `ValoracionWizard.vue` wrapper component

Build a brand new wrapper component that contains the stepper shell and delegates to `ValoracionModal` internally (or merges all content). `ValoracionModal` stays as-is (or gets simplified). This is essentially a refactor toward the Strategy pattern.

- **Pros:** Clean separation of concerns; `ValoracionModal` becomes a pure form component; easy to test stepper in isolation
- **Cons:** Most effort — requires routing logic between components, updating parent to use new component, likely 2x the files
- **Effort:** High — significant restructure

## Recommendation

**Approach 1: Wizard-as-local-state inside ValoracionModal.**

Rationale:
- The modal is already a well-isolated component. Adding `currentStep` state (local to the modal) is a natural extension, not a structural violation.
- It eliminates the `tab-change` emit entirely, reducing parent coupling.
- Validation gates become natural UX — you can't reach Step 3 without completing Step 2's `riskRows`. This is the core value of a wizard over tabs.
- Effort is comparable to approach 2 but with cleaner encapsulation.
- Approach 3 is over-engineering for what is essentially a UI pattern change, not a component architecture refactor.

## Risks

- **Step 2 (Análisis) requires at least one `riskRow` before advancing to Step 3** — should we require this, or allow empty? The current tab design allows free navigation; wizard should enforce at least one row if the user intends to proceed to evaluation.
- **Edit mode** — when reopening an existing valoración, the wizard should restore the correct step state. Currently `editValoracion()` sets `activeTab = 0`. With wizard-as-local-state, the modal decides its own step on open (defaulting to 0 or restoring from `detallesRiesgo`).
- **"Cancelar" behavior** — should "Cancelar" reset wizard state? Currently it just closes the modal. With local step state, the parent needs to handle reset on next open (`watch(modelValue)` already calls `loadExistingRows()`).
- **CSS for stepper** — no existing stepper component. Need to build a visual horizontal stepper from scratch (CSS flexbox + active/completed step indicators).
- **Step 1 validation on submit** — currently `submitValoracion` in parent alerts if Tab 1 fields are incomplete. With wizard gating, this becomes redundant but should be kept as a safety net.

## Ready for Proposal

**Yes.** The request is clear: convert tab navigation to wizard. Key decisions needed from user:

1. **Should Tab 1 be required before Tab 2?** (Strict wizard: yes.)
2. **Should Tab 2 require at least one risk row before Tab 3?** (Recommended: yes.)
3. **Should Tab 3 be required before Tab 4?** (Recommended: yes, since Tab 4's "Riesgo (Ctrl)" dropdowns depend on Tab 3 data.)
4. **Where should the Back/Next buttons live?** (Inside modal footer — between the tab content and the Cancel action bar.)
5. **What does the step indicator look like?** (Horizontal numbered steps with labels; completed steps show checkmark.)