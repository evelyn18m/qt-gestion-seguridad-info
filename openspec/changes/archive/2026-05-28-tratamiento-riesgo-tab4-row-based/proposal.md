# Proposal: Tab 4 Tratamiento de Riesgo — Row-based

## Intent

Tab 4 (Tratamiento de Riesgo) currently renders one row per `DetalleRiesgo` entry — iterating `detallesAmenazas` and `detallesVulnerabilidades` separately. This creates a per-item view where a row's amenaza and vulnerabilidad are disconnected from their shared row context. Tabs 2 and 3 already use `riskRows[]` as source of truth (one row = one amenazaIds[] + vulnerabilidadIds[] combination). Tab 4 should follow the same pattern so treatment fields propagate across all entries belonging to the same row.

## Scope

### In Scope
- Refactor Tab 4 template in `ValoracionModal.vue` to iterate `riskRows` instead of `detallesAmenazas`/`detallesVulnerabilidades`
- Use `findMatchedDetalle(row)` to bind treatment inputs per row, matching Tab 3 pattern
- Propagate treatment fields (`metodoTratamiento`, `tipoControlId`, `riesgoControlId`, `evaluacionRiesgoControl`, `nivelRiesgoControl`) to **all** `DetalleRiesgo` entries sharing the same row's `amenazaIds[]` + `vulnerabilidadIds[]` when `submitValoracion()` runs
- Update Tab 4 header from "por Item" to "por Fila"
- No changes to `syncRowsToDetalles()`, Tab 2, Tab 3, or backend/prisma schema

### Out of Scope
- Data migration of previously saved per-item records
- Tab 2/3 refactor (already row-based)
- Backend schema changes
- Changes to how legacy entries (without amenazaIds/vulnerabilidadIds) are handled

## Capabilities

### Modified Capabilities
- `valoracion-modal`: Tab 4 Treatment display/save behavior changes from per-item (iterating `detallesAmenazas`/`detallesVulnerabilidades`) to per-row (iterating `riskRows` + `findMatchedDetalle()`). Treatment fields propagate to all row entries on save. A delta spec will be written to capture the new row-based behavior.

## Approach

**Approach 3 Hybrid** (confirmed by exploration):
1. Tab 4 template: iterate `riskRows` instead of filtered detalle lists; use `findMatchedDetalle(row)` to bind treatment inputs
2. `submitValoracion()` in `valoracion.vue`: after `syncRowsToDetalles()`, iterate all entries and propagate treatment fields from the row's matched entry to all other entries with identical `amenazaIds` + `vulnerabilidadIds`
3. `syncRowsToDetalles()` unchanged — preserves combined entries with shared arrays

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modified | Tab 4 template refactored to row-based (iterates `riskRows` + `findMatchedDetalle()`); header text updated |
| `frontend/pages/valoracion.vue` | Modified | `submitValoracion()` adds propagation loop for treatment fields across row entries |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Propagation logic in `submitValoracion()` misses edge cases | Medium | Test with multi-threat + multi-vuln rows; verify all entries receive same treatment values |
| Pre-existing per-item saved data renders differently after change | Medium | Load path via `loadExistingRows()` de-duplicates by threat+vuln arrays — existing records load correctly into single rows |
| Users expect per-item treatment but get row propagation | Low | UI label "por Fila" sets correct expectations; propagation is intentional UX |

## Rollback Plan

1. Revert Tab 4 template in `ValoracionModal.vue` to iterate `detallesAmenazas`/`detallesVulnerabilidades` (restore current two-column layout)
2. Remove propagation loop from `submitValoracion()` in `valoracion.vue`
3. Revert Tab 4 header text to "por Item"
4. No migration needed — backend data format unchanged

## Dependencies

- `findMatchedDetalle(row)` function already exists in `ValoracionModal.vue` (used by Tab 3)
- `syncRowsToDetalles()` already creates combined entries with shared `amenazaIds[]` and `vulnerabilidadIds[]` arrays
- Backend/prisma schema unchanged — already stores arrays as JSON

## Success Criteria

- [ ] Tab 4 renders one row per `riskRow` entry (matching Tab 2/3 structure)
- [ ] Changing treatment fields on a row and saving propagates values to all entries sharing the same amenazaIds+vulnerabilidadIds
- [ ] Existing saved records load correctly via `loadExistingRows()` (de-duplicated into rows)
- [ ] Tab 4 header reads "Tratamiento de Riesgo — por Fila"
- [ ] No regression in Tabs 2 and 3 behavior