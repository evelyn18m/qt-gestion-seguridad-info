# Proposal: Plazo de implementación en Plan de Tratamiento

## Intent

Replace the single *Plazo de implementación* date field in the Plan de Tratamiento modal with a structured set of three fields: a fixed catalog (`[C] Corto`, `[M] Medio`, `[L] Largo`) plus editable start and end dates. This gives users a clear timeframe classification while capturing the exact implementation window.

## Scope

### In Scope
- Add `PlazoImplementacion` catalog table and seed `C/M/L` values.
- Drop `PlanTratamiento.plazoImplementacion`; add `plazoImplementacionId`, `fechaInicioImplementacion`, `fechaFinImplementacion`.
- Register the catalog in the generic `/catalogos` service and frontend catalog map.
- Update backend DTOs, service, and Prisma include logic.
- Update frontend modal with select + two `type="date"` inputs and validation.
- Update frontend types and catalog preload.

### Out of Scope
- Custom masked `dd/mm/aaaa` input (uses HTML5 `type="date"`; browser locale handles display).
- Admin UI editing of `Corto/Medio/Largo` values (fixed, code-seeded catalog).
- Reports or filters consuming the new fields.

## Capabilities

### New Capabilities
- `plan-tratamiento`: Full CRUD behavior for Plan de Tratamiento, including the new plazo implementation fields.

### Modified Capabilities
- None.

## Approach

Use Approach 1 from exploration: normalized catalog + two date columns. Because `PlanTratamiento` is empty, the old column can be dropped without data migration. Backend accepts ISO date strings (`YYYY-MM-DD`) and converts with `new Date(...)`, matching the existing `@IsDateString()` pattern. The catalog follows the same pattern as `EstadoPlanTratamiento` and `OpcionTratamiento`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modified | Drop `plazoImplementacion`; add `PlazoImplementacion` model and new fields. |
| `backend/prisma/seed-plan-tratamiento.ts` | Modified | Add idempotent seed for `C/M/L`. |
| `backend/src/catalogos/catalogos.service.ts` | Modified | Register `plazos-implementacion` in `TIPO_MAP` and `FIELD_MAP`. |
| `backend/src/plan-tratamiento/dto/*.ts` | Modified | Replace date field with catalog id + two date fields. |
| `backend/src/plan-tratamiento/plan-tratamiento.service.ts` | Modified | Update `toPrismaData`, `planInclude`, date coercion, validation. |
| `frontend/types/api.d.ts` | Modified | Update `PlanTratamiento` interface and add relation type. |
| `frontend/pages/plan-tratamiento.vue` | Modified | Replace single date input with select + two date inputs. |
| `frontend/pages/catalogos.vue` | Modified | Preload `plazos-implementacion` and add to `FIELD_MAP`. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Old column has data in another environment | Low | Verify `PlanTratamiento` row count before migration; adjust if non-zero. |
| Date format expectation mismatch | Low | Confirmed: HTML5 `type="date"` with browser locale is acceptable. |
| Validation gaps between frontend and backend | Med | Backend validates required dates when plazo is set and `fechaFin > fechaInicio`. |

## Rollback Plan

1. Revert the Prisma migration (or recreate `plazoImplementacion DateTime?`).
2. Revert backend DTO/service changes.
3. Revert frontend modal to the single date input.
4. Re-seed or remove `PlazoImplementacion` rows if needed.

## Dependencies

- None.

## Success Criteria

- [ ] Modal shows catalog select + start date + end date.
- [ ] Saving a plan with a plazo selected stores all three fields correctly.
- [ ] Backend rejects `fechaFinImplementacion <= fechaInicioImplementacion`.
- [ ] Backend rejects missing start or end date when a plazo is selected.
- [ ] List/detail view renders the plazo as `[C] Corto`, `[M] Medio`, or `[L] Largo`.
- [ ] Backend test suite passes after changes.

## Proposal Question Round

The following assumptions are built into this proposal. Please confirm, correct, or skip:

1. Should the `C/M/L` catalog ever be editable by admins, or remain fixed as seeded values?
2. If a plazo is selected but one date is left blank, should the save be blocked entirely or allow a partial save with a warning?
3. Should the list/table view show both dates, only the plazo label, or both?
4. Are there existing reports or exports that reference the old `plazoImplementacion` field?
5. Should the system auto-suggest end dates based on the selected plazo (e.g., Corto = 30 days), or are the dates always manual?
