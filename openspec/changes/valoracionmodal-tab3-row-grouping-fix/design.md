# Design: ValoracionModal Tab 3 Row Grouping Fix

## Technical Approach

Refactor Tab 3 to iterate over `riskRows` (grouped by amenaza+vulnerabilidad) instead of `detallesRiesgo` (flattened). Each row shows amenaza and vulnerabilidad labels together with two independent selects. Controles become an editable textarea. Remove the redundant global `controlesArea` textarea. Fix Tab 2 array comparison with `JSON.stringify`.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Tab 3 display source | `riskRows` (grouped) | `detallesRiesgo` (flattened) | Matches Tab 2 architecture; one row = one riesgo combination |
| Select binding per row | Match to first `amenazaIds[0]` / `vulnerabilidadIds[0]` entry in `detallesRiesgo` | Store riesgoIds directly on RiskRow | Leverages existing `syncRowsToDetalles`; no schema change |
| Preview calculation | `getRowPreview(matchedDetalle)` with `riesgoId`/`vulnerabilidadRiesgoId` from matched entry | Store preview state on RiskRow | Direct use of existing function; no duplication |
| Controles display | `<textarea v-model="row.controlesImplementados">` | Per-entry `d.controlesImplementados` | Binds directly to row; no flattening needed |
| Tab 2 array filter | `JSON.stringify(a) === JSON.stringify(b)` | Deep equality utility, `every()` loop | Simplest fix; no deps added |

## Data Flow

```
riskRows (grouped)
  └── Tab 3 iteration: v-for="row in riskRows"
        ├── amenaza label: getAmenazaLabel(row.amenazaIds[0])
        ├── vulnerabilidad label: getVulnerabilidadLabel(row.vulnerabilidadIds[0])
        ├── amenaza select: v-model="matchedDetalle.riesgoId"
        │     └── matchedDetalle = detallesRiesgo.find(d => d.catalogoId === Number(row.amenazaIds[0]))
        ├── vulnerabilidad select: v-model="matchedDetalle.vulnerabilidadRiesgoId"
        ├── preview: getRowPreview(matchedDetalle)
        ├── controles: v-model="row.controlesImplementados"
        └── sync: (no new sync — changes to matchedDetalle write back to detallesRiesgo)

syncRowsToDetalles() ← unchanged (still needed for Tab 4 / API submit)

Tab 2 filter (fixed):
  detallesRiesgo.filter(dd =>
    JSON.stringify(dd.amenazaIds) === JSON.stringify(row.amenazaIds) &&
    JSON.stringify(dd.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds)
  )
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modify | Tab 3 grouped iteration, dual selects, editable textarea, remove global controlesArea, fix Tab 2 filter |

### Specific line changes in ValoracionModal.vue

| Section | Change |
|---------|--------|
| Lines 711-714 | Delete `controlesArea` textarea group |
| Line 716 table header | Add "Amenaza" and "Vulnerabilidad" columns; remove "Tipo" and "Item" columns |
| Line 729 | Change `v-for="d in detallesRiesgo"` → `v-for="row in riskRows"` |
| Lines 730-731 | Show amenaza label(s) + vulnerabilidad label(s) in same row |
| Lines 732-746 | Two selects per row: amenaza nivel bound to `matchedDetalle.riesgoId`, vulnerabilidad bound to `matchedDetalle.vulnerabilidadRiesgoId`; preview via `getRowPreview(matchedDetalle)` |
| Line 754 | Replace read-only span with `<textarea v-model="row.controlesImplementados">` |
| Line 678 (Tab 2 filter) | Replace `dd.amenazaIds === row.amenazaIds` with `JSON.stringify(dd.amenazaIds) === JSON.stringify(row.amenazaIds)` (and same for vulnerabilidadIds) |

## Interfaces / Contracts

```typescript
// RiskRow (existing, no changes)
export interface RiskRow {
  amenazaIds: string[]
  vulnerabilidadIds: string[]
  controlesImplementados: string
  tempId?: number
}

// getRowPreview (existing signature — no change)
function getRowPreview(d: DetalleRiesgo): PreviewRiesgo

// New: helper to find matched DetalleRiesgo for a row
function findMatchedDetalle(row: RiskRow): DetalleRiesgo | undefined {
  if (!row.amenazaIds[0]) return undefined
  return detallesRiesgo.find(d =>
    d.tipo === 'amenaza' &&
    d.catalogoId === Number(row.amenazaIds[0]) &&
    JSON.stringify(d.amenazaIds) === JSON.stringify(row.amenazaIds) &&
    JSON.stringify(d.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds)
  )
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `findMatchedDetalle()` returns correct entry | Test with multi-id rows |
| Integration | Tab 3 renders grouped rows; amenaza+vulnerabilidad labels appear together | Manual test with multi-entry riskRows |
| Integration | Select changes persist to `detallesRiesgo`; Tab 4 reads them | Test Tab 3 → Tab 4 flow |
| E2E | Full valoración: Tab 2 add rows → Tab 3 grouped display → Tab 4 tratamiento | Verify complete flow |

## Migration / Rollout

No migration required. This is a pure frontend refactor — same API payload, no schema changes.

## Open Questions

None — all decisions resolved in proposal/spec.