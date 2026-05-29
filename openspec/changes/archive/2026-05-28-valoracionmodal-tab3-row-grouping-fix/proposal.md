# Proposal: ValoracionModal Tab 3 Row Grouping Fix

## Intent

Tab 3 currently renders one row per DetalleRiesgo entry (flattened by `syncRowsToDetalles`), so amenaza and vulnerabilidad from the same RiskRow appear on SEPARATE rows. The global "Controles de Área" textarea is redundant — each row already has `controlesImplementados`. Controles are shown read-only when they should be editable. These UX issues make the risk evaluation workflow confusing.

## Scope

### In Scope
- Tab 3 iterates over `riskRows` (grouped) instead of `detallesRiesgo` (flattened)
- Each Tab 3 row shows: amenaza label(s) + vulnerabilidad label(s) in same row
- Tab 3 row includes: amenaza nivel select + vulnerabilidad nivel select + `controlesImplementados` textarea + preview
- `controlesImplementados` is now a textarea bound with v-model (editable), replacing read-only `<span>`
- Remove global `evaluacionForm.controlesArea` textarea from Tab 3
- Fix Tab 2 filter (line 678): replace `===` array reference comparison with `JSON.stringify` comparison

### Out of Scope
- Backend schema changes (schema already supports `amenazaIds[]`, `vulnerabilidadIds[]`, `controlesImplementados`)
- Tab 2 structure changes beyond the filter fix
- Tab 4 changes

## Capabilities

### New Capabilities
None — this is a refactor of existing UI behavior within the same component.

### Modified Capabilities
- `valoracion-modal`: Tab 3 row rendering changes from flat (one row per amenaza OR vulnerabilidad) to grouped (one row per amenaza+vulnerabilidad combination); `controlesImplementados` becomes editable textarea; `controlesArea` removed.

## Approach

**Use `riskRows` as Tab 3's display source** (matching Tab 2 architecture). Tab 3's `<tbody>` iterates over `riskRows` directly:
- Each `<tr>` renders `row.amenazaIds` labels + `row.vulnerabilidadIds` labels in the same row
- Two `<select>` elements per row: `d.riesgoId` (amenaza nivel) and `d.vulnerabilidadRiesgoId` (vulnerabilidad nivel) — find the matching DetalleRiesgo entry per row's arrays using `JSON.stringify` comparison
- `<textarea v-model="row.controlesImplementados">` replaces read-only `<span>`
- Delete lines 712-714 (`evaluacionForm.controlesArea` textarea)
- Fix Tab 2 filter: `JSON.stringify(dd.amenazaIds) === JSON.stringify(row.amenazaIds) && JSON.stringify(dd.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds)`

`syncRowsToDetalles()` stays (needed for Tab 4 / API submission) but is no longer used as Tab 3 display model.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modified | Tab 3 tbody iterates `riskRows`; remove `controlesArea`; fix Tab 2 filter; `controlesImplementados` → textarea |
| `frontend/types/api.d.ts` | None | No type changes needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tab 3 select bindings (`riesgoId`, `vulnerabilidadRiesgoId`) point to wrong DetalleRiesgo entry after grouping | Med | Use `JSON.stringify` comparison to find matching entry per row in `detallesRiesgo` |
| Breaking Tab 4 / API submit that depends on flattened `detallesRiesgo` | Low | `syncRowsToDetalles` unchanged; only Tab 3 display changes |

## Rollback Plan

Revert `frontend/components/ValoracionModal.vue` to previous commit. No schema or type changes involved. Tab 3 returns to flat rendering, textarea removed, `controlesArea` restored.

## Dependencies

- No external dependencies
- `riskRows` and `detallesRiesgo` already exist in component state

## Success Criteria

- [ ] Tab 3 shows one row per RiskRow (amenaza + vulnerabilidad labels together)
- [ ] Each Tab 3 row has two selects (amenaza nivel, vulnerabilidad nivel) and one editable textarea for controles
- [ ] Global `controlesArea` textarea no longer appears in Tab 3
- [ ] Tab 2 "Riesgo Residual" column shows ACEPTABLE/INACEPTABLE badges (filter fix)
- [ ] Existing valoración edit mode works correctly