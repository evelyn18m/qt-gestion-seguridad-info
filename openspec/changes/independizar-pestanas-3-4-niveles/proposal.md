# Proposal: Make Tab 3 and Tab 4 Risk Levels Independent

## Intent

Tab 3 (Evaluación de Riesgo — inherent risk) and Tab 4 (Tratamiento de Riesgo — residual risk after controls) currently share the same DB fields (`riesgoId`, `vulnerabilidadRiesgoId`) for threat and vulnerability level dropdowns. Selecting a level in one tab overwrites the other. Tab 3/4 must use separate columns so inherent and residual risk assessments are independent.

## Scope

### In Scope
- Add `vulnerabilidadControlId Int?` to Prisma `DetalleRiesgo` model + `db push`
- Add `vulnerabilidadControlId` to backend `DetalleRiesgoDto`, `mapDetalleRiesgo()`, frontend `DetalleRiesgo` type
- Change Tab 4 Nivel Amenaza binding from `riesgoId` → `riesgoControlId` (DB column already exists)
- Change Tab 4 Nivel Vulnerabilidad binding from `vulnerabilidadRiesgoId` → new `vulnerabilidadControlId`
- Update `syncRowsToDetalles()` to preserve and initialize all control fields
- Update `updateControlDetalleRow()` to calculate Tab 4 risk using control-specific fields

### Out of Scope
- Backend `/calcular` endpoint (already accepts `nivelAmenazaControl`/`nivelVulnerabilidadControl`)
- Tab 3 behavior (unchanged — keeps `riesgoId`/`vulnerabilidadRiesgoId` for inherent risk)
- `findMatchedDetalle()` matching logic (unchanged — matches by `catalogoId`/`amenazaIds`/`vulnerabilidadIds`)
- Tab 2 changes

## Capabilities

### New Capabilities
None — data model separation fix, not a new feature.

### Modified Capabilities
- `valoracion-modal`: Tab 4 dropdowns bind to control-specific fields (`riesgoControlId`, `vulnerabilidadControlId`) instead of sharing Tab 3's inherent risk fields. Residual risk calculation uses new control-level values.

## Approach

Minimal schema extension + binding redirect. The DB already has `riesgoControlId` — Tab 4 wasn't using it. Add the missing `vulnerabilidadControlId` counterpart, then redirect Tab 4 template bindings.

| Concept | Tab 3 (Inherente) | Tab 4 (Residual) |
|---------|------------------|---------------------|
| Nivel Amenaza | `riesgoId` | `riesgoControlId` (exists) |
| Nivel Vulnerabilidad | `vulnerabilidadRiesgoId` | `vulnerabilidadControlId` (NEW) |
| Evaluación | `evaluacionRiesgo` | `evaluacionRiesgoControl` (exists) |
| Nivel | `nivelRiesgo` | `nivelRiesgoControl` (exists) |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modified | Add `vulnerabilidadControlId Int?` to `DetalleRiesgo` |
| `backend/src/valoraciones/dto/create-valoracion.dto.ts` | Modified | Add `vulnerabilidadControlId` to `DetalleRiesgoDto` |
| `backend/src/valoraciones/valoraciones.service.ts` | Modified | Map `vulnerabilidadControlId` in `mapDetalleRiesgo()` |
| `frontend/types/api.d.ts` | Modified | Add `vulnerabilidadControlId` to `DetalleRiesgo` interface |
| `frontend/components/ValoracionModal.vue` | Modified | Tab 4 bindings L988/L1000, `syncRowsToDetalles()` L235-286, `updateControlDetalleRow()` L531-537 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tab 4 data mixes with Tab 3 (dropdowns were writing to shared fields) | High | Additive: `vulnerabilidadControlId` starts `NULL`; existing `riesgoControlId`/`evaluacionRiesgoControl`/`nivelRiesgoControl` preserved |
| `syncRowsToDetalles()` wipes control values on Tab 2 edits | Medium | Preserve `riesgoControlId` + `vulnerabilidadControlId` from previous entries via lookup map |

## Rollback Plan

Revert Tab 4 bindings to `riesgoId`/`vulnerabilidadRiesgoId`. Drop `vulnerabilidadControlId` column via new migration. No data loss — control-specific values are only written after this change goes live.

## Dependencies

- Prisma `db push` must run after schema change

## Success Criteria

- [ ] Selecting Nivel Amenaza in Tab 4 does not change Tab 3's value
- [ ] Selecting Nivel Vulnerabilidad in Tab 4 does not change Tab 3's value
- [ ] Tab 4 residual risk calculation uses `riesgoControlId` + `vulnerabilidadControlId`
- [ ] `syncRowsToDetalles()` preserves control field values across Tab 2 edits
- [ ] Backend Jest tests pass (`docker compose exec backend npm run test`)
