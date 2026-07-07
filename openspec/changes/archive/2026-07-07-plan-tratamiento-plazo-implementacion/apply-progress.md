# Apply Progress: Plazo de implementación en Plan de Tratamiento

## Summary

All 18 tasks were implemented. Strict TDD was followed for backend testable tasks:
- Seed catalog idempotency
- DTO ISO date validation
- Service cross-field validation

Backend tests pass (374 tests). Focused lint on changed files is clean; the full backend lint report still contains pre-existing errors unrelated to this change.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.3 + 3.1 + 3.2 | `backend/prisma/seed-plan-tratamiento.spec.ts` | Unit | Existing `seedOpcionesTratamiento` and `seedEstadosPlanTratamiento` tests passing (file modified, not new) | Written | Passed | 3 cases (C/M/L, unrelated model, idempotent) | Clean |
| 2.1 + 3.5 | `backend/src/plan-tratamiento/dto/create-plan-tratamiento.dto.spec.ts` | Unit | N/A (new) | Written | Passed | 4 cases (valid, invalid fin, no timeframe, non-int plazo) | Clean |
| 2.4 + 3.3 + 3.4 | `backend/src/plan-tratamiento/plan-tratamiento.service.spec.ts` | Unit | N/A (new) | Written | Passed | 7 cases (valid, missing inicio, missing fin, equal dates, end before start, empty timeframe, not-found update) | Clean |
| 1.1, 1.2, 1.4, 2.2, 2.3, 4.1–4.5 | — | — | N/A (structural / frontend / config) | N/A | N/A | Skipped: no testable logic | Clean |

## Test Summary

- **Total tests written**: 14 (3 seed + 4 DTO + 7 service)
- **Total tests passing**: 14 / 14
- **Backend suite result**: 374 passed, 0 failed
- **Layers used**: Unit (14)
- **Approval tests**: None — no refactoring-only tasks
- **Pure functions created**: `formatPlazoLabel`, `timeframeValidation`, `parseDate`

## Completed Tasks

### Phase 1 — Database & Catalog
- [x] 1.1 Schema change: added `PlazoImplementacion`, dropped legacy `plazoImplementacion`, added FK + date columns.
- [x] 1.2 Migration `20260707114355_add_plazo_implementacion_catalog` created and resolved as applied.
- [x] 1.3 Idempotent `seedPlazosImplementacion` upserts `[C] Corto`, `[M] Medio`, `[L] Largo`.
- [x] 1.4 Wired seed into `backend/prisma/seed.ts`.

### Phase 2 — Core Backend
- [x] 2.1 `CreatePlanTratamientoDto` accepts `plazoImplementacionId`, `fechaInicioImplementacion`, `fechaFinImplementacion`.
- [x] 2.2 `UpdatePlanTratamientoDto` inherits the new optional fields via `PartialType`.
- [x] 2.3 `plazos-implementacion` registered in `TIPO_MAP` and `FIELD_MAP`.
- [x] 2.4 `PlanTratamientoService` includes `plazoImplementacion` relation, maps dates, and validates cross-field rules.

### Phase 3 — Tests
- [x] 3.1 RED test for seed catalog.
- [x] 3.2 GREEN seed implementation.
- [x] 3.3 RED service validation tests.
- [x] 3.4 GREEN service validation implementation.
- [x] 3.5 DTO date validation tests.

### Phase 4 — Frontend
- [x] 4.1 `frontend/types/api.d.ts` updated with `PlazoImplementacion` and new plan fields.
- [x] 4.2 `plazos-implementacion` preloaded in `frontend/pages/catalogos.vue`.
- [x] 4.3 Modal replaced single date with plazo select + start/end date inputs.
- [x] 4.4 Client-side validation and `[C] Corto` display helper added.
- [x] 4.5 Backend test + lint run; smoke-tested API create and validation.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `backend/prisma/schema.prisma` | Modified | Added `PlazoImplementacion`; replaced `plazoImplementacion` with FK + two date columns. |
| `backend/prisma/migrations/20260707114355_add_plazo_implementacion_catalog/migration.sql` | Created | Migration for new catalog and `PlanTratamiento` column changes. |
| `backend/prisma/seed-plan-tratamiento.ts` | Modified | Added `seedPlazosImplementacion`. |
| `backend/prisma/seed.ts` | Modified | Calls `seedPlazosImplementacion()`. |
| `backend/prisma/seed-plan-tratamiento.spec.ts` | Modified | Added TDD tests for plazo seed. |
| `backend/src/catalogos/catalogos.service.ts` | Modified | Registered `plazos-implementacion` in `TIPO_MAP`/`FIELD_MAP`. |
| `backend/src/plan-tratamiento/dto/create-plan-tratamiento.dto.ts` | Modified | Replaced legacy date with new three fields. |
| `backend/src/plan-tratamiento/dto/create-plan-tratamiento.dto.spec.ts` | Created | TDD tests for DTO validation. |
| `backend/src/plan-tratamiento/plan-tratamiento.service.ts` | Modified | Added relation include, date mapping, cross-field validation. |
| `backend/src/plan-tratamiento/plan-tratamiento.service.spec.ts` | Created | TDD tests for service validation. |
| `frontend/types/api.d.ts` | Modified | Added `PlazoImplementacion`; updated `PlanTratamiento`. |
| `frontend/pages/catalogos.vue` | Modified | Preloaded `plazos-implementacion`. |
| `frontend/pages/plan-tratamiento.vue` | Modified | New modal fields, validation, and display helper. |
| `backend/prisma.config.ts` | Modified (reverted) | Temporarily added `shadowDatabaseUrl` to enable migration diff; reverted before finishing. |

## Deviations from Design

1. **Migration generation**: `npx prisma migrate dev` could not be run cleanly because the existing migration history was inconsistent with the real database schema. We used `npx prisma db push` to apply the schema, created the migration SQL manually, and resolved it as applied with `npx prisma migrate resolve --applied`. This records the migration without executing it against the already-synced dev database.
2. **Seeding**: The full `seed.ts` was not re-run because it uses non-idempotent `create` calls for many catalogs and would duplicate existing rows. Instead, a temporary script invoked `seedPlazosImplementacion` directly.

## Issues Found

- Pre-existing backend lint failures (~338 problems, mostly `any` usage in tests and catch blocks) remain. The code introduced by this change passes focused lint checks.

## Verification Commands Run

```bash
# Backend tests — 374 passing
docker compose exec backend npm run test

# Focused lint on changed files — clean
docker compose exec backend npx eslint \
  "src/plan-tratamiento/**/*.ts" \
  "prisma/seed-plan-tratamiento.spec.ts" \
  "prisma/seed-plan-tratamiento.ts" \
  "prisma/seed.ts" \
  "src/catalogos/catalogos.service.ts"

# Smoke tests
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/catalogos/plazos-implementacion
curl -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"idRiesgo":"R-TEST-1", ...}' http://localhost:3001/plan-tratamiento
curl -X POST ... with inverted dates ...  # returned 400 as expected
```

## Status

18/18 tasks complete. Ready for `sdd-verify`.
