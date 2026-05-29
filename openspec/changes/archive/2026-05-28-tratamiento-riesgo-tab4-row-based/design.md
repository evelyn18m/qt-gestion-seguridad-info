# Design: Tab 4 Tratamiento de Riesgo — Row-based

## Technical Approach

Tab 4 template is refactored to iterate `riskRows` (matching Tab 3 pattern) with a single unified table instead of two separate columns. Each row shows amenaza chips + vulnerabilidad chips with treatment inputs bound via `findMatchedDetalle(row)`. The header text is updated from "por Item" to "por Fila". After `syncRowsToDetalles()` builds entries, a propagation loop in `submitValoracion()` copies treatment fields (`metodoTratamiento`, `tipoControlId`, `riesgoControlId`, `evaluacionRiesgoControl`, `nivelRiesgoControl`) from the first matched `DetalleRiesgo` entry to all other entries that share the same `amenazaIds[]` + `vulnerabilidadIds[]` arrays.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|---------------|-----------|
| Tab 4 display pattern | Iterate `riskRows` (row-based) | Per-item iteration (current: `detallesAmenazas` / `detallesVulnerabilidades` columns) | Tab 3 already uses this pattern; aligns treatment view with risk evaluation view; enables row-level propagation |
| Propagation scope | All entries with identical `amenazaIds` + `vulnerabilidadIds` arrays | Propagate only to first match | Tabs 2/3 already create combined entries with shared arrays via `syncRowsToDetalles()` — propagation must reach all of them |
| Propagation timing | In `submitValoracion()` before building payload | Propagate inline on every field change | Propagating on every keystroke would be noisy; save-time propagation is cleaner and matches Tab 2/3 UX |
| No backend/schema changes | Prisma schema unchanged | — | Array fields already exist; no migration needed |

## Data Flow

```
riskRows[] (source of truth per Tab 2)
    │
    ▼
syncRowsToDetalles()  ──→  detallesRiesgo[] (one entry per amenaza + one per vulnerabilidad,
    │                           all sharing row's amenazaIds[] + vulnerabilidadIds[])
    │                           │
Tab 4 display ◄────────────────┘
(iterate riskRows + findMatchedDetalle(row))

submitValoracion():
    │
    ├─ syncRowsToDetalles() called by caller (outside our change)
    ├─ propagation loop: for each row, copy treatment fields from
    │   matched entry → all entries with same amenazaIds+vulnerabilidadIds
    └─ detallesRiesgo[] → API payload
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modify | Tab 4 template: replace two-column `detallesAmenazas`/`detallesVulnerabilidades` iteration with single `riskRows` iteration + `findMatchedDetalle(row)` bindings; header text "por Item" → "por Fila" |
| `frontend/pages/valoracion.vue` | Modify | `submitValoracion()`: after `syncRowsToDetalles()` (called by caller), add propagation loop copying treatment fields to all row-matching entries |

### ValoracionModal.vue — Tab 4 template (lines 794–893)

Replace the two-column layout (lines 799–891) with a single `riskRows` table replacing `detallesAmenazas`/`detallesVulnerabilidades` loops. Pattern mirrors Tab 3 (lines 744–787):

```html
<!-- OLD (two columns, per-item) -->
<div class="val-grid" style="grid-template-columns: 1fr 1fr; gap:1.5rem;">
  <div><!-- columna amenazas --></div>
  <div><!-- columna vulneribilidades --></div>
</div>

<!-- NEW (single table, row-based) -->
<table class="val-table">
  <thead>
    <tr>
      <th>Amenaza</th>
      <th>Vulnerabilidad</th>
      <th>Método</th>
      <th>Tipo Control</th>
      <th>Riesgo (Ctrl)</th>
      <th>Eval. (Ctrl)</th>
      <th>Nivel (Ctrl)</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="row in riskRows" :key="...">
      <td><!-- amenaza chips --></td>
      <td><!-- vulnerabilidad chips --></td>
      <td><!-- inputs bound to findMatchedDetalle(row) --></td>
      <!-- ... same td pattern as Tab 3 for controls ... -->
    </tr>
  </tbody>
</table>
```

Empty-row guard: `v-if="row.amenazaIds.length === 0 && row.vulnerabilidadIds.length === 0"` (skip rendering) — already handled by `findMatchedDetalle` returning `undefined` for empty rows.

### valoracion.vue — Propagation loop (in `submitValoracion()`)

Insert after `syncRowsToDetalles()` resolves in the caller and before building `detallesPayload`:

```typescript
// Propagate treatment fields from first-matched entry to all row siblings
const TREATMENT_FIELDS = ['metodoTratamiento', 'tipoControlId', 'riesgoControlId',
                          'evaluacionRiesgoControl', 'nivelRiesgoControl'] as const
for (const row of riesgoRows ?? []) {
  const matched = detallesRiesgo.value.find(d =>
    JSON.stringify(d.amenazaIds) === JSON.stringify(row.amenazaIds) &&
    JSON.stringify(d.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds)
  )
  if (!matched) continue
  detallesRiesgo.value
    .filter(d => d !== matched &&
      JSON.stringify(d.amenazaIds) === JSON.stringify(row.amenazaIds) &&
      JSON.stringify(d.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds))
    .forEach(sibling => {
      TREATMENT_FIELDS.forEach(f => { sibling[f] = matched[f] })
    })
}
```

Note: `riesgoRows` is populated via `syncRowsToDetalles()` internally in `ValoracionModal.vue`. The propagation must target the `detallesRiesgo` array that `submitValoracion()` already works with. The modal's internal `syncRowsToDetalles()` is called before the `@submit` emit fires.

## Interfaces / Contracts

`DetalleRiesgo` (api.d.ts) is unchanged. Treatment fields already exist on the interface:

```typescript
metodoTratamiento?: string
tipoControlId?: number | string | null
riesgoControlId?: number | string | null
evaluacionRiesgoControl?: number
nivelRiesgoControl?: string
```

## Testing Strategy

No frontend test runner detected. Manual smoke test:

| Step | Action | Expected |
|------|--------|----------|
| 1 | Create/edit valoración, complete Tab 2 with ≥2 amenazas + ≥1 vulnerabilidad | Risk rows appear in Tab 3 |
| 2 | Go to Tab 4 | One row per riskRow; chips for all threats+ vulns per row; treatment inputs editable |
| 3 | Fill treatment fields on a row, save | All entries sharing the same arrays receive the same field values |
| 4 | Reload saved valoración | Row-based treatment values load and display correctly |
| 5 | Tab 2/3 unchanged | No regression in Tab 2 (row selection) or Tab 3 (evaluation binding) |

Backend-side via existing integration tests (if any): verify `detallesRiesgo` records store identical `amenazaIds`/`vulnerabilidadIds` arrays and equal treatment field values after save.

## Migration / Rollback

No migration required. Backend data format unchanged — `amenazaIds`/`vulnerabilidadIds` arrays already stored. Rollback: revert Tab 4 template to two-column layout, remove propagation loop from `submitValoracion()`, restore header text.

## Open Questions

- None. This is a low-risk refactor that follows existing Tab 3 patterns and leverages fully-tested infrastructure (`syncRowsToDetalles`, `findMatchedDetalle`).
