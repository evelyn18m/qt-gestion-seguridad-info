# Design: split-and-optimize-valoracion-vue (Iteration 2 — Tab 4 Extraction)

## Technical Approach

Extract the Tab 4 ("Tratamiento de Riesgo") panel from `valoracion.vue` into a standalone `ValoracionTab4.vue` component. Follow the reactive-by-reference pattern established by `useRiskCalculations.ts` (iteration 1): pass the raw reactive `detallesRiesgo` ref directly to the child — no destructuring, no emits. Vue 3 propagates mutations automatically since the array reference is shared.

## Architecture Decisions

### Decision: Reactive-by-reference for `detallesRiesgo`

**Choice**: Pass `detallesRiesgo` as the raw ref — `PropType<DetalleRiesgo[]>` — and let the child mutate items directly.
**Alternatives considered**: Event-driven (child emits changes up), Pinia store (overkill for one tab's data).
**Rationale**: The parent already owns this array; mutations must propagate back for save. Emitting per keystroke creates boilerplate; a store adds a layer that doesn't suit page-level data. Reactive reference sharing is the most idiomatic Vue 3 pattern for this scenario.

### Decision: `getCatalogoLabel` lives in the component

**Choice**: Define `getCatalogoLabel` locally in `ValoracionTab4.vue`, receiving `valAmenazas` and `valVulnerabilidades` as props.
**Alternatives considered**: Extract to shared utility (used in view modal too — premature extraction), keep in `valoracion.vue` and emit a string (unnecessary indirection).
**Rationale**: Tab 4 needs this function exclusively. Extracting to a shared util risks coupling across the view modal, which uses the same function on a different data shape. Local definition is the right scope.

### Decision: No new composable in this iteration

**Choice**: `useValoracionTab2State.ts` is defined as a placeholder only; no logic is implemented in this iteration.
**Alternatives considered**: Implement full Tab 2 state management now (out of scope per proposal).
**Rationale**: The proposal explicitly defers Tab 2 composable implementation. The placeholder documents the intended API without introducing unused code.

### Decision: Inline scoped styles in `ValoracionTab4.vue`

**Choice**: Copy Tab 4's `<style scoped>` styles into the new component.
**Alternatives considered**: Global CSS class reuse (risks unintended stylebleed), CSS variables from parent (requires keeping parent styles).
**Rationale**: The page currently has no `<style scoped>` for Tab 4 (it relies on parent-level styles). Moving styles inline ensures the component is self-contained and visual rendering doesn't depend on parent class presence.

## Data Flow

```
valoracion.vue (parent)
  └── detallesRiesgo (ref — raw reactive array)
        │
        ├── Tab 3 reads/writes ──► evaluacionForm ──► saves to API
        │
        └── <ValoracionTab4 />
              ├── reads item.catalogoId → getCatalogoLabel(tipo, id)
              ├── mutates item.metodoTratamiento (direct)
              ├── mutates item.tipoControlId (direct)
              ├── mutates item.riesgoControlId ──► updateControlDetalle()
              └── propagates via shared reference
```

No data needs to travel UP to the parent via emit — all mutations land directly in `detallesRiesgo.value[]` which the parent reads at save time.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/valoracion/ValoracionTab4.vue` | Create | Tab 4 standalone component (~100 lines extracted from `valoracion.vue`) |
| `frontend/composables/useValoracionTab2State.ts` | Create | Tab 2 composable skeleton — placeholder functions only |
| `frontend/pages/valoracion.vue` | Modify | Remove Tab 4 template region (~100 lines), replace with `<ValoracionTab4 />` |

## Interfaces / Contracts

### `ValoracionTab4.vue` Props

```typescript
interface Props {
  detallesRiesgo: DetalleRiesgo[]     // Raw reactive array — do NOT destructure
  valRiesgos: CatalogoItem[]
  valTiposControl: CatalogoItem[]
  valAmenazas: CatalogoItem[]
  valVulnerabilidades: CatalogoItem[]
}
```

### `useValoracionTab2State.ts` (Skeleton)

```typescript
export function useValoracionTab2State(
  detallesRiesgo: Ref<DetalleRiesgo[]>,
  valAmenazas: Ref<CatalogoItem[]>,
  valVulnerabilidades: Ref<CatalogoItem[]>,
) {
  return {
    agregarAmenaza: (catalogoId: number) => {},
    quitarAmenaza: (catalogoId: number) => {},
    agregarVulnerabilidad: (catalogoId: number) => {},
    quitarVulnerabilidad: (catalogoId: number) => {},
  }
}
```

### Local computed in `ValoracionTab4.vue`

```typescript
const detallesAmenazas = computed(() => props.detallesRiesgo.filter(d => d.tipo === 'amenaza'))
const detallesVulnerabilidades = computed(() => props.detallesRiesgo.filter(d => d.tipo === 'vulnerabilidad'))
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Tab 4 renders correctly after extraction | Open modal, navigate to Tab 4, verify threat/vulnerability rows display with all 6 columns |
| Manual | Inline edits persist | Change `metodoTratamiento`, select a `tipoControlId`, change `riesgoControlId` — verify evaluation and level cells update |
| Manual | Save round-trip | Fill Tab 4, submit form, reopen record, navigate to Tab 4 — verify all values persisted |
| Review | No regression in Tab 1-3 | Smoke-test all other tabs in the same session |

## Migration / Rollout

No migration required. This is a pure refactor — same data shapes, same API surface. Rollback is file deletion + template restoration (see proposal rollback plan).

## Open Questions

- [ ] `updateControlDetalle` depends on `evaluacionForm.value.vulnerabilidadRiesgoId` (outer scope). Verify this is always set correctly before Tab 4 is accessed — if not, the composable or component may need a fallback.
- [ ] View modal (Tab 4 read-only display) still uses `getCatalogoLabel` from `valoracion.vue`. When Tab 2 extraction happens, check if view modal also moves — it may need a shared utility at that point.