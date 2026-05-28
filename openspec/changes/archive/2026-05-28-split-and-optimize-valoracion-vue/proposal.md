# Proposal: split-and-optimize-valoracion-vue (Iteration 2)

## Intent

Extract Tab 4 ("Tratamiento de Riesgo") panel from `valoracion.vue` into a standalone `ValoracionTab4.vue` component under `frontend/components/valoracion/`. Phase 1 of iteration 2 — lowest-risk tab first, establishes extraction pattern for remaining tabs.

## Scope

### In Scope (Phase 1 — Tab 4)

- **`ValoracionTab4.vue`** — new component extracted from `valoracion.vue` lines ~956–1054
- **`useValoracionTab2State.ts`** — composable skeleton for Tab 2 helpers (defined now, used in future iteration)
- Wire `<ValoracionTab4 />` into `valoracion.vue`, replacing the original template region

### Out of Scope

- Tab 1, Tab 2, Tab 3 component extraction (future iterations)
- View modal refactor
- Changes to modal orchestration
- Any backend changes

## Capabilities

> Contract between proposal and specs phases.

### New Capabilities

- `valoracion-tab4`: Tab 4 "Tratamiento de Riesgo" panel as a standalone Vue component. Handles threat/vulnerability rows with inline selects for `metodoTratamiento`, `tipoControlId`, `riesgoControlId`. Reads `detallesRiesgo[]` by reference — mutations propagate to parent without emit.

### Modified Capabilities

- None — pure refactor, no behavior change.

## Approach

**Reactive by reference** — `detallesRiesgo` is passed as the raw reactive array proxy. The child component mutates array items directly; Vue 3 reactivity propagates automatically. No emit needed since the array reference is shared.

```vue
<!-- valoracion.vue -->
<ValoracionTab4
  :detallesRiesgo="detallesRiesgo"
  :riesgos="valRiesgos"
  :tiposControl="valTiposControl"
/>
```

**Why not Pinia?** Overkill — catalog data comes from API and lives at page level. Tab components only read/write their local slice.

**Composable skeleton** — `useValoracionTab2State.ts` is defined here (not yet used) to document the Tab 2 helper API ahead of iteration 3.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/valoracion/ValoracionTab4.vue` | New | Tab 4 template + logic extracted |
| `frontend/composables/useValoracionTab2State.ts` | New | Tab 2 helper composable skeleton |
| `frontend/pages/valoracion.vue` | Modified | Tab 4 region replaced with `<ValoracionTab4 />`, import added |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Vue reactivity breaks if array is destructured in child | Low | Pass array reference directly, do not destructure items |
| Style isolation — tab styles currently in page `<style scoped>` | Low | Inline scoped styles in component; verify visually after extraction |
| Nuxt auto-import naming conflict | Low | Test `components/valoracion/ValoracionTab4.vue` imports as `<ValoracionTab4 />` |

## Rollback Plan

Delete `ValoracionTab4.vue` and `useValoracionTab2State.ts`. Restore the original Tab 4 template region in `valoracion.vue`. No schema, API, or behavior changes — rollback is file deletion + template restoration.

## Dependencies

- Nuxt 4 auto-imports for composables and components
- No backend changes
- No new npm packages
- Iteration 1 composable `useRiskCalculations.ts` already in place

## Success Criteria

- [ ] `ValoracionTab4.vue` renders correctly with threat/vulnerability rows
- [ ] `detallesRiesgo[]` mutations from Tab 4 propagate to parent and persist correctly
- [ ] Manual smoke test: open valoracion page, navigate to Tab 4, verify all selects and writes work identically to before-extraction
- [ ] `valoracion.vue` line count reduced by ~100 lines (Tab 4 region removed)