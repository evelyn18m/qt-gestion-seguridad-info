# Tasks: Subproceso Depends on MacroProceso

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250–350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

Not needed — single PR fits within budget.

## Phase 1: Database Schema & Migration

- [x] 1.1 Add `codigo String` field to `MacroProceso` model in `backend/prisma/schema.prisma`
- [x] 1.2 Add `macroProcesoId Int` required FK to `Subproceso` model with `onDelete: Restrict` in `backend/prisma/schema.prisma`
- [x] 1.3 Run `npx prisma migrate dev --name add_macroproceso_codigo_and_subproceso_fk` inside backend container
- [x] 1.4 Run `npx prisma generate` to update Prisma client after schema change

## Phase 2: FIELD_MAP and DTO

- [x] 2.1 Update `FIELD_MAP.macroProceso` to `['nombre', 'codigo']` in `backend/src/catalogos/catalogos.service.ts`
- [x] 2.2 Update `FIELD_MAP.subproceso` to `['nombre', 'macroProcesoId']` in `backend/src/catalogos/catalogos.service.ts`
- [x] 2.3 Add `macroProcesoId?: number` to `CreateCatalogoDto` in `backend/src/catalogos/dto/create-catalogo.dto.ts`

## Phase 3: Seeder Update

- [x] 3.1 Update MacroProceso seeding: extract `codigo` from end of `nombre` using regex `\((\w+)\)$`
- [x] 3.2 Build a `codigo → id` map after MacroProcesos are seeded
- [x] 3.3 Update Subproceso seeding: extract code from start using regex `^\((\w+)\)`, look up `macroProcesoId` from map, log warning and skip row if not found
- [x] 3.4 Run seed: `ts-node prisma/seed.ts` to verify FK resolution works end-to-end

## Phase 4: Unit Tests

- [x] 4.1 Create `backend/src/catalogos/catalogos.service.spec.ts` with TDD approach
- [x] 4.2 RED: Write test `should reject subprocess without macroProcesoId` — expect thrown error
- [x] 4.3 RED: Write test `should accept subprocess with valid macroProcesoId`
- [x] 4.4 RED: Write test `should block MacroProceso deletion when subprocesses exist` via `onDelete: Restrict`
- [x] 4.5 GREEN: Run `npm run test` — all tests pass

## Phase 5: Frontend

- [x] 5.1 Add `macroprocesos` ref in `frontend/pages/catalogos.vue`
- [x] 5.2 In `openCreateForm`/`openEditForm`, when tipo is `subprocesos`, fetch macroprocesos into list
- [x] 5.3 Update `FIELD_MAP.subprocesos` to include `macroProcesoId`
- [x] 5.4 In form rendering, add `<select>` for `macroProcesoId` when field is `macroProcesoId` with options `codigo + " - " + nombre`, marked required
- [x] 5.5 Verify subprocess list shows `macroProceso.codigo + " - " + macroProceso.nombre` via existing table rendering (relation auto-included in findMany)

## Phase 6: Verification

- [x] 6.1 Run `docker compose exec backend npm run test` — all tests green
- [x] 6.2 Run `npx prisma db push` to confirm schema syncs cleanly
- [ ] 6.3 Manual: create subprocess without macroproceso — expect rejection
- [ ] 6.4 Manual: delete macroproceso with subprocesses — expect block