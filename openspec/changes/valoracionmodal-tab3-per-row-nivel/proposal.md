# Proposal: Per-Row Nivel Selection in Tab 3 (Evaluación de Riesgo)

## Intent

Fix Tab 3 of `ValoracionModal` so each risk item row has its own amenaza nivel and vulnerabilidad nivel selects, computing its own evaluation preview — matching the per-row pattern already working in Tab 2. Currently, Tab 3 has two useless global selects at lines 707–718 that drive a single shared `previewRiesgo`; every row shows the same preview regardless of its own selection.

## Scope

### In Scope
- Add `vulnerabilidadRiesgoId Int?` column to `DetalleRiesgo` Prisma schema (mirrors `riesgoId` for amenaza)
- Add `vulnerabilidadRiesgoId?: number | null` to `DetalleRiesgo` TypeScript interface in `api.d.ts`
- Tab 3 table: each row gets **two selects** — `d.riesgoId` (amenaza nivel, already exists) + `d.vulnerabilidadRiesgoId` (new per-row vulnerabilidad nivel)
- Each row computes its own `evaluacionRiesgo` and `nivelRiesgo` from its own select values via `localCalculateRiesgo`
- Remove global `evaluacionForm.amenazaRiesgoId` and `evaluacionForm.vulnerabilidadRiesgoId` selects from Tab 3 (lines 706–720)
- Per-row `controles de área`: each `DetalleRiesgo` entry already has `controlesImplementados` (from Tab 2); Tab 3 should read/write per-row, not a global field
- DB migration to add `vulnerabilidadRiesgoId` column

### Out of Scope
- Tab 2 changes (row-based model already working correctly)
- Tab 4 (Tratamiento de Riesgo) — separate concern, uses different fields
- Backend API changes for save flow (frontend-only visual change per-row)
- Adding per-row `controlesImplementados` editing in Tab 3 (already stored per-row in DetalleRiesgo; read-only display is fine)

## Approach

**Full-stack with schema migration + frontend per-row computation**

1. **Schema**: Add `vulnerabilidadRiesgoId` to `DetalleRiesgo` in `schema.prisma`. Run `npx prisma db push` to apply without migration (additive only).
2. **TypeScript**: Add `vulnerabilidadRiesgoId?: number | null` to `DetalleRiesgo` interface in `frontend/types/api.d.ts`.
3. **Frontend Tab 3**:
   - Remove the global two-select block (lines 706–720 of current file).
   - In the table row, add second select `d.vulnerabilidadRiesgoId` next to the existing `d.riesgoId` select.
   - Each row computes `localCalculateRiesgo(ciaAverage, getValorRiesgo(d.riesgoId), getValorRiesgo(d.vulnerabilidadRiesgoId))` and displays the result inline.
   - Display both `evaluacionRiesgo` and `nivelRiesgo` per row (replaces global `previewRiesgo`).
   - Global `evaluacionForm.controlesArea` textarea at line 702 can remain (or be removed — it's currently not used per-row in the table anyway).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modified | Added `vulnerabilidadRiesgoId Int?` to `DetalleRiesgo` model |
| `frontend/types/api.d.ts` | Modified | Added `vulnerabilidadRiesgoId?: number \| null` to `DetalleRiesgo` |
| `frontend/components/ValoracionModal.vue` | Modified | Per-row selects and preview in Tab 3; removed global selects at lines 706-720 |
| `frontend/pages/valoracion.vue` | No change | Parent doesn't need to change — `detallesRiesgo` entries updated in place |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing records with global `evaluacionForm.amenazaRiesgoId` set but no per-row selects | Low | Migration is additive; existing `riesgoId` per row remains; new `vulnerabilidadRiesgoId` defaults to null. Legacy entries without row data still work via `detallesRiesgo` filter. |
| Breaking edit of records created before this change | Low | Tab 3 still shows rows; per-row selects default to empty; calculation works with null values. |
| Schema drift after migration | Low | Run `npx prisma db push` immediately after schema change, before frontend work. |

## Rollback Plan

1. Revert `backend/prisma/schema.prisma` to remove `vulnerabilidadRiesgoId` column.
2. Run `npx prisma db push` to drop the column.
3. Revert `frontend/types/api.d.ts` to remove `vulnerabilidadRiesgoId` from interface.
4. Revert `frontend/components/ValoracionModal.vue` to restore global selects and shared `previewRiesgo`.
5. No data migration rollback needed — column was added-only.

## Dependencies

- `npx prisma generate` after schema change (Prisma client regeneration)
- DB must be reachable at `localhost:3306` for `db push`

## Success Criteria

- [ ] Tab 3 table rows each show two selects: amenaza nivel (`d.riesgoId`) and vulnerabilidad nivel (`d.vulnerabilidadRiesgoId`)
- [ ] Each row computes and displays its own `evaluacionRiesgo` and `nivelRiesgo` from `localCalculateRiesgo`, independent of other rows
- [ ] Global `evaluacionForm.amenazaRiesgoId` and `evaluacionForm.vulnerabilidadRiesgoId` selects are removed from Tab 3
- [ ] `DetalleRiesgo` schema has `vulnerabilidadRiesgoId Int?` column
- [ ] `DetalleRiesgo` TypeScript interface has `vulnerabilidadRiesgoId?: number | null`
- [ ] Existing records load correctly in edit mode (rows show with empty per-row selects or pre-populated if data exists)
- [ ] Build succeeds: `docker compose exec frontend npm run build`