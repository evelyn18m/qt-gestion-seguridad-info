# Proposal: Pestaña 3 — Campo "Controles Area" independiente

## Intent

Tab 2 and Tab 3 in `ValoracionModal` share `controlesImplementados` — writing in one tab overwrites the other. Add a dedicated `controlesArea` field to `DetalleRiesgo` so Tab 3 has independent per-row storage.

## Scope

### In Scope
- `DetalleRiesgo.controlesArea` column (nullable `@db.Text`) in Prisma schema
- `DetalleRiesgoDto.controlesArea?: string` in NestJS DTO
- Spread mapping in `mapDetalleRiesgo()` service helper
- `controlesArea?: string` in frontend `DetalleRiesgo` type
- `controlesArea: string` in `RiskRow` interface and `agregarFila()` initializer
- Wire up `row.controlesArea` in `syncRowsToDetalles()` and `loadExistingRows()`
- Map `controlesArea` in `valoracion.vue` save payload and edit load
- Rename Tab 3 column header `Controles` → `Controles Area`
- Change Tab 3 textarea `v-model` from `row.controlesImplementados` to `row.controlesArea`
- `npx prisma db push` to sync new column

### Out of Scope
- Tab 2 behavior (untouched; still uses `controlesImplementados`)
- `ValoracionActivo.controlesArea` (field-level, coexists without conflict)

## Capabilities

### New Capabilities
None — data field addition, no new behavioral capability.

### Modified Capabilities
None — no existing spec-level requirements change.

## Approach

Full-stack field addition: Prisma schema → DTO → service spread → frontend type → RiskRow → UI binding. The new `controlesArea` field mirrors `controlesImplementados` structurally but is exclusive to Tab 3.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modified | New `controlesArea String? @db.Text` on DetalleRiesgo |
| `backend/src/valoraciones/dto/create-valoracion.dto.ts` | Modified | New `controlesArea?: string` in DetalleRiesgoDto |
| `backend/src/valoraciones/valoraciones.service.ts` | Modified | Spread `controlesArea` in mapDetalleRiesgo |
| `frontend/types/api.d.ts` | Modified | New `controlesArea?: string` in DetalleRiesgo |
| `frontend/components/ValoracionModal.vue` | Modified | RiskRow, agregarFila, syncRowsToDetalles, loadExistingRows, header, textarea binding |
| `frontend/pages/valoracion.vue` | Modified | save payload and edit load mapping |
| MySQL `DetalleRiesgo` table | Modified | New `controlesArea TEXT` column via db push |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Name collision with `ValoracionActivo.controlesArea` | Low | Separate tables, separate contexts |
| Existing rows get NULL values | Low | Frontend defaults to `''` via `\|\| ''` pattern |

## Rollback Plan

Remove `controlesArea` from Prisma schema, run `db push`, revert 6 files. No data migration needed.

## Dependencies

- Docker containers running for `db push`

## Success Criteria

- [ ] Tab 2 writes to `controlesImplementados` and Tab 3 writes to `controlesArea` independently
- [ ] Editing Tab 3 textarea does NOT overwrite Tab 2 textarea content
- [ ] Existing Tab 2 data preserved (no regression)
- [ ] `db push` succeeds without errors
- [ ] Backend unit tests pass
