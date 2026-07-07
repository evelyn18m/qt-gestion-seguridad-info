# Exploration: Plazo de implementación en Plan de Tratamiento

## Current State

The **Plan de Tratamiento** module already has a modal with a single *Plazo de implementación* field. Today it is stored as one `DateTime?` column:

- `backend/prisma/schema.prisma` → `PlanTratamiento.plazoImplementacion DateTime?`
- `backend/src/plan-tratamiento/dto/create-plan-tratamiento.dto.ts` → `@IsDateString() plazoImplementacion?: string`
- `backend/src/plan-tratamiento/plan-tratamiento.service.ts` → converts the ISO string to `new Date(dto.plazoImplementacion)`
- `frontend/pages/plan-tratamiento.vue` → renders `<input type="date" v-model="form.plazoImplementacion">` and converts the stored ISO date to `YYYY-MM-DD` on edit.

The requirement is to replace this single date with three sub-fields:

1. A catalog for deadline length: `[C] Corto`, `[M] Medio`, `[L] Largo`.
2. An editable start date (`dd/mm/aaaa`).
3. An editable end date (`dd/mm/aaaa`).

The DB currently has **0 rows in `PlanTratamiento`**, so there is no existing date data to migrate.

## Affected Areas

- `backend/prisma/schema.prisma` — drop `plazoImplementacion DateTime?`; add `PlazoImplementacion` catalog model plus `plazoImplementacionId`, `fechaInicioImplementacion`, `fechaFinImplementacion` on `PlanTratamiento`.
- `backend/prisma/seed-plan-tratamiento.ts` — add idempotent seed function for the new catalog (`C/M/L`).
- `backend/prisma/seed.ts` — call the new seed function.
- `backend/src/catalogos/catalogos.service.ts` — register `plazos-implementacion` in `TIPO_MAP` and `FIELD_MAP`.
- `backend/src/catalogos/catalogos.controller.ts` — generic routes already cover it after service registration.
- `backend/src/plan-tratamiento/dto/create-plan-tratamiento.dto.ts` and `update-plan-tratamiento.dto.ts` — replace `plazoImplementacion` with `plazoImplementacionId`, `fechaInicioImplementacion`, `fechaFinImplementacion`.
- `backend/src/plan-tratamiento/plan-tratamiento.service.ts` — update `toPrismaData`, `planInclude`, and date coercion logic.
- `frontend/types/api.d.ts` — update `PlanTratamiento` interface and add relation type.
- `frontend/pages/plan-tratamiento.vue` — replace the single date input with a catalog select + two date inputs; update `form`, `openEditModal`, `savePlan`, and validation.
- `frontend/pages/catalogos.vue` — preload `plazos-implementacion` and add it to `FIELD_MAP`.
- `frontend/layouts/default.vue` — add the new catalog to the sidebar if it should be editable from `/catalogos`.

## Approaches

### 1. Replace single date with catalog + two date fields

Drop `PlanTratamiento.plazoImplementacion` and introduce:

```prisma
model PlazoImplementacion {
  id     Int    @id @default(autoincrement())
  codigo String @unique // C | M | L
  nombre String // Corto | Medio | Largo
  planesTratamiento PlanTratamiento[]
}

model PlanTratamiento {
  ...
  plazoImplementacionId      Int?
  plazoImplementacion        PlazoImplementacion?
  fechaInicioImplementacion  DateTime?
  fechaFinImplementacion     DateTime?
}
```

- **Pros**: Matches the requirement exactly; keeps schema normalized; catalog is reusable and admin-editable via existing `/catalogos` CRUD.
- **Cons**: Slightly more files touched; requires a new migration.
- **Effort**: Medium

### 2. Keep old column and add three new optional fields

Leave `plazoImplementacion DateTime?` in place and add `plazoImplementacionId`, `fechaInicioImplementacion`, `fechaFinImplementacion` as additional optional fields.

- **Pros**: Zero risk of breaking anything that reads the old column; no migration that drops data.
- **Cons**: Leaves dead/ambiguous data in the schema; the modal would show four date-related concepts; does not match the requirement to replace the field.
- **Effort**: Low

### 3. Store plazo as an enum or free-text instead of a catalog table

Use a Prisma `enum` or plain `String` for `[C] Corto`, `[M] Medio`, `[L] Largo`.

- **Pros**: Fewer models; no seed/CRUD registration needed.
- **Cons**: Violates the established catalog pattern used by `OpcionTratamiento` and `EstadoPlanTratamiento`; admins cannot edit values without a code change; inconsistent with `/catalogos` generic UI.
- **Effort**: Low (but architecturally poor)

## Recommendation

Use **Approach 1 — Replace single date with catalog + two date fields**. It aligns with the existing catalog pattern, keeps the schema normalized, and because the table is empty there is no data-migration risk. The implementation should:

1. Add `PlazoImplementacion` catalog with `codigo` (`C`, `M`, `L`) and `nombre`.
2. Seed it idempotently alongside the other Plan de Tratamiento catalogs.
3. Register it in the backend generic catalog service and frontend catalog registration.
4. Replace `plazoImplementacion` in the DTOs/service with the three new fields.
5. Update the frontend modal to show a select for the catalog and two `type="date"` inputs for start/end.
6. Keep backend date parsing simple: accept ISO date strings (`YYYY-MM-DD`) and convert with `new Date(...)`, which matches the current `IsDateString()` pattern.

## Risks

- **Data loss**: The old `plazoImplementacion` column must be dropped. Mitigation: the production table currently has 0 rows, so no migration of historical dates is needed. If this assumption is wrong in another environment, the migration should be adjusted.
- **Date format mismatch**: The user asks for `dd/mm/aaaa` display. The existing frontend uses HTML5 `type="date"` inputs, which expose `YYYY-MM-DD` to code and display according to browser locale. We should verify whether the locale-aware display is acceptable or whether a masked text input is required.
- **Validation inconsistency**: Backend must validate `fechaInicioImplementacion <= fechaFinImplementacion` if both are provided. There is no central date-validation utility today, so this logic will be new.
- **Generic catalog registration**: Adding `codigo` to the new catalog requires that `FIELD_MAP` includes both `codigo` and `nombre`, following the `macroprocesos` pattern.
- **Testing**: Backend has Jest and mocked Prisma tests; frontend has no test runner. Plan backend tests for the service/DTO and seed; frontend verification will be manual.

## Ready for Proposal

Yes. The scope is clear, the codebase patterns are well established, and there is a safe path forward. The orchestrator should confirm whether the HTML5 `type="date"` locale display satisfies the `dd/mm/aaaa` requirement or if a custom masked input is mandatory.
