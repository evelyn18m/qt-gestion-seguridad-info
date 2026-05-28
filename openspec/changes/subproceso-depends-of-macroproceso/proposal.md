# Proposal: Subproceso Depends on MacroProceso

## Intent

Model the **mandatory dependency relationship** between Subproceso and MacroProceso — every subprocess MUST belong to a macroprocess. This enables DB-level referential integrity and UI cascading based on process hierarchy. The `codigo` field on MacroProceso (e.g., "GODPT", "GAJ", "GPEI", "GC", "ADF") is the stable identifier used to resolve the FK from subprocess names.

## Scope

### In Scope
- Add `codigo: String` field to `MacroProceso` model in Prisma schema
- Add required `macroProcesoId: Int` foreign key to `Subproceso` model in Prisma schema
- Create Prisma migration with `Restrict` on delete (prevent macroproceso deletion if subprocesses exist)
- Update `CatalogosService` `FIELD_MAP` for both models to reflect new fields
- Update seed logic: extract `codigo` from end of MacroProceso nombre via regex `\((\w+)\)$`, then resolve Subproceso FK by matching code extracted from start of subprocess nombre via regex `^\((\w+)\)`
- Frontend: add macroproceso select in subprocess form

### Out of Scope
- Cascade delete logic (`Restrict` prevents deletion, not cascades)
- Multiple macroprocesos per subprocess (1:N)
- Retrofitting existing subprocess rows (seed is re-runnable; existing rows get `macroProcesoId` via manual edit)

## Capabilities

### New Capabilities
- `subproceso-macroproceso-rel`: Subproceso now declares a mandatory dependency on MacroProceso, enabling DB-level referential integrity and UI filtering

### Modified Capabilities
- None (FIELD_MAP update is implementation-only; no new requirements at spec level)

## Approach

**Required FK with bidirectional code extraction** — `Subproceso.macroProcesoId` is NOT nullable. Every subprocess MUST have a parent macroprocess. When a MacroProceso is deleted and subprocesses exist, deletion is BLOCKED (not silently nulled).

Code extraction patterns:
- MacroProceso codigo: `\((\w+)\)$` — extract from END of name
  - Example: `"Gestión Organizacional de Desarrollo de Productos (GODPT)"` → `codigo = "GODPT"`
- Subproceso FK resolution: `^\((\w+)\)` — extract code from START of name, look up MacroProceso where `codigo` matches
  - Example: `"(GODPT) Gestión de Desarrollo de Productos Sostenibles"` → resolve `macroProcesoId` via MacroProceso where `codigo = "GODPT"`

1. Add `codigo: String` to `MacroProceso` model
2. Add `macroProcesoId: Int` (required FK) to `Subproceso` model
3. Update `FIELD_MAP` for both models
4. Write and run Prisma migration with `Restrict` onDelete
5. Update seed: parse MacroProceso names for codigo (end), parse Subproceso names to resolve FK via code matching (start)
6. Update frontend with macroproceso selector in subprocess form

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modified | `codigo` on MacroProceso; required FK on Subproceso |
| `backend/src/catalogos/catalogos.service.ts` | Modified | `FIELD_MAP` for both models updated |
| `backend/prisma/migrations/` | New | FK + column migration |
| `backend/prisma/seed.ts` | Modified | Extract codigo from MacroProceso (end), resolve Subproceso FK by code (start) |
| `frontend/pages/catalogos.vue` | Modified | Macroproceso selector in subprocess form |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Seed FK resolution fails if regex doesn't match | Medium | Validate all MacroProceso names follow `(XXXX)` pattern; all Subproceso names follow `(XXXX) Name` pattern |
| Existing subprocess rows orphaned after migration | Medium | Migration requires all existing rows to have valid macroProcesoId; seed first or add placeholder |
| FK index performance on large tables | Low | Index auto-created by Prisma on FK |

## Rollback Plan

- Revert migration: `prisma migrate reset` or manual down migration
- `macroProcesoId` is NOT nullable — requires fixing orphaned rows before reverting
- `codigo` on MacroProceso is nullable-friendly — existing rows stay valid
- Seed data: re-run `ts-node prisma/seed.ts` restores relationships

## Dependencies

- Prisma CLI available inside backend container (`docker compose exec backend npx prisma`)
- All MacroProceso names in `catalogos.json` must end with `(XXXX)` pattern
- All Subproceso names in `catalogos.json` must start with `(XXXX)` pattern

## Success Criteria

- [ ] `npx prisma db push` succeeds without errors
- [ ] Migration created and applies cleanly
- [ ] Subproceso with valid `macroProcesoId` saves correctly
- [ ] Subproceso WITHOUT `macroProcesoId` is rejected (required FK)
- [ ] Deleting a MacroProceso with child subprocesses is BLOCKED (Restrict)
- [ ] `codigo` extracted correctly from MacroProceso names via regex `\((\w+)\)$`
- [ ] Subproceso FK resolved correctly by matching code extracted from subprocess name start
- [ ] Frontend shows macroproceso dropdown for subprocess type
- [ ] `npm run test` passes