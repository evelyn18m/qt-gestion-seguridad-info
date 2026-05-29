# Delta: Backend — Per-Row Evaluacion Fields on DetalleRiesgo

## Purpose

Extend `DetalleRiesgo` with `vulnerabilidadRiesgoId Int?` for per-row vulnerabilidad nivel selection in Tab 3, mirroring the existing `riesgoId Int?` for amenaza nivel.

## ADDED Requirements

### Requirement: DetalleRiesgo Schema Has vulnerabilidadRiesgoId Column

The `DetalleRiesgo` Prisma model MUST include `vulnerabilidadRiesgoId Int?` field alongside the existing `riesgoId Int?`. Both fields are nullable — threat and vulnerability levels are independently optional per row.

#### Scenario: New column defined in schema

- GIVEN `backend/prisma/schema.prisma` is read
- WHEN the `DetalleRiesgo` model is examined
- THEN field `vulnerabilidadRiesgoId Int?` is present
- AND field `riesgoId Int?` remains unchanged

### Requirement: DetalleRiesgo TypeScript Interface Updated

The `DetalleRiesgo` interface in `frontend/types/api.d.ts` MUST declare `vulnerabilidadRiesgoId?: number | null` to match the Prisma schema.

#### Scenario: TypeScript interface includes new field

- GIVEN `frontend/types/api.d.ts` is read
- WHEN the `DetalleRiesgo` interface is found
- THEN `vulnerabilidadRiesgoId?: number | null` is declared

### Requirement: Nullable Column in MySQL

The `vulnerabilidadRiesgoId` column in MySQL MUST be nullable (`Int?`). Existing rows without a value default to `NULL`.

#### Scenario: Existing rows have null vulnerabilidadRiesgoId

- GIVEN pre-existing `DetalleRiesgo` records
- WHEN the table is queried
- THEN `vulnerabilidadRiesgoId` is `NULL` for rows created before this migration
- AND `riesgoId` is unaffected

## Out of Scope

- Backend service logic changes for `vulnerabilidadRiesgoId` (calculation already uses amenaza + vulnerabilidad separately; `riesgoId` and `vulnerabilidadRiesgoId` are inputs)
- Tab 2 changes (already has per-row model working)
- Adding `controlesImplementados` editing in Tab 3 (already stored per-row, read-only display is fine)