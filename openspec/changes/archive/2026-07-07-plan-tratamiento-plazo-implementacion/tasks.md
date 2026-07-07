# Tasks: Plazo de implementación en Plan de Tratamiento

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300–400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend model, seed, catalog, DTO, service validation | PR 1 | Includes tests; base = feature branch |
| 2 | Frontend modal wiring and validation | PR 1 | Same PR; depends on Unit 1 API |

## Phase 1: Foundation / Database & Catalog

- [x] 1.1 [backend] Modify `backend/prisma/schema.prisma`: add `PlazoImplementacion` model, drop `PlanTratamiento.plazoImplementacion`, add FK + two date columns.
- [x] 1.2 [backend] Generate migration `add_plazo_implementacion_catalog` with `npx prisma migrate dev` inside backend container.
- [x] 1.3 [backend] Add idempotent `seedPlazosImplementacion` upserts for `[C] Corto`, `[M] Medio`, `[L] Largo` in `backend/prisma/seed-plan-tratamiento.ts`.
- [x] 1.4 [backend] Wire `seedPlazosImplementacion()` into `backend/prisma/seed.ts`.

## Phase 2: Core Backend Implementation

- [x] 2.1 [backend] Update `backend/src/plan-tratamiento/dto/create-plan-tratamiento.dto.ts` to accept optional `plazoImplementacionId` (int), `fechaInicioImplementacion` and `fechaFinImplementacion` (ISO date strings).
- [x] 2.2 [backend] Update `backend/src/plan-tratamiento/dto/update-plan-tratamiento.dto.ts` to allow partial updates of the same three fields.
- [x] 2.3 [backend] Register `plazos-implementacion` in `backend/src/catalogos/catalogos.service.ts` maps.
- [x] 2.4 [backend] Update `backend/src/plan-tratamiento/plan-tratamiento.service.ts` include/`toPrismaData`, and enforce cross-field validation: if plazo is set, both dates are required and end must be strictly after start.

## Phase 3: Testing & Validation

- [x] 3.1 [test] RED: add failing test in `backend/prisma/seed-plan-tratamiento.spec.ts` asserting C/M/L are upserted without duplicates.
- [x] 3.2 [test] GREEN: implement seed logic and verify the spec passes.
- [x] 3.3 [test] RED: create `backend/src/plan-tratamiento/plan-tratamiento.service.spec.ts` with failing tests for missing date with plazo, equal dates, and empty timeframe.
- [x] 3.4 [test] GREEN: implement service validation and verify all service tests pass.
- [x] 3.5 [test] Add `backend/src/plan-tratamiento/dto/create-plan-tratamiento.dto.spec.ts` verifying valid ISO dates are accepted and invalid strings return 400.

## Phase 4: Frontend & Verification

- [x] 4.1 [frontend] Update `frontend/types/api.d.ts`: add `PlazoImplementacion` interface and add `plazoImplementacionId`, `fechaInicioImplementacion`, `fechaFinImplementacion` to `PlanTratamiento`.
- [x] 4.2 [frontend] Preload `plazos-implementacion` catalog in `frontend/pages/catalogos.vue`.
- [x] 4.3 [frontend] Replace single date input in `frontend/pages/plan-tratamiento.vue` with a plazo select plus `Fecha de inicio` and `Fecha de fin` `type="date"` inputs.
- [x] 4.4 [frontend] Add client-side validation and `[C] Corto` display helper in `frontend/pages/plan-tratamiento.vue`.
- [x] 4.5 [test] Run backend `npm run test` and `npm run lint` in container; manual smoke test create/edit modal with plazo and dates.
