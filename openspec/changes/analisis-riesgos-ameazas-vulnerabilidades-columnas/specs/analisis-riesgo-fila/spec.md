# analisis-riesgo-fila Specification

## Purpose

This capability defines the behavior of a single risk row (DetalleRiesgo) in the analysis phase. Each row represents a distinct risk entry combining one or more threats (amenaza) and/or vulnerabilities (vulnerabilidad) with their own implemented controls (controlesImplementados). A row MUST contain at least one of amenaza or vulnerabilidad — a row with both null is invalid.

## Requirements

### Requirement: Row Data Structure

Each `DetalleRiesgo` row MUST contain:
- `id`: unique identifier (auto-increment)
- `valoracionActivoId`: foreign key to parent `ValoracionActivo`
- `amenazaIds`: JSON array of amenaza catalog IDs (nullable)
- `vulnerabilidadIds`: JSON array of vulnerabilidad catalog IDs (nullable)
- `controlesImplementados`: free text describing controls (nullable) — NEW FIELD
- At least `amenazaIds` OR `vulnerabilidadIds` MUST be non-null and non-empty

#### Scenario: Create row with amenaza only

- GIVEN a new `DetalleRiesgo` row is being created
- WHEN `amenazaIds` is set to a non-empty JSON array AND `vulnerabilidadIds` is null or empty
- THEN the row is created successfully
- AND `controlesImplementados` may be set or null

#### Scenario: Create row with vulnerabilidad only

- GIVEN a new `DetalleRiesgo` row is being created
- WHEN `vulnerabilidadIds` is set to a non-empty JSON array AND `amenazaIds` is null or empty
- THEN the row is created successfully
- AND `controlesImplementados` may be set or null

#### Scenario: Create row with both amenaza and vulnerabilidad

- GIVEN a new `DetalleRiesgo` row is being created
- WHEN both `amenazaIds` and `vulnerabilidadIds` are set to non-empty arrays
- THEN the row is created successfully

#### Scenario: Reject row with neither amenaza nor vulnerabilidad

- GIVEN a new `DetalleRiesgo` row is being created
- WHEN `amenazaIds` is null/empty AND `vulnerabilidadIds` is null/empty
- THEN the system returns a validation error
- AND the row is NOT saved

### Requirement: Row CRUD Operations

The system MUST support creating, reading, updating, and deleting `DetalleRiesgo` rows independently. Each row operation affects only that row; sibling rows are unaffected.

#### Scenario: Create new DetalleRiesgo for existing ValoracionActivo

- GIVEN an existing `ValoracionActivo` with id = 5
- WHEN a POST request is sent with a new row containing amenazaIds, vulnerabilidadIds (at least one non-empty), and controlesImplementados
- THEN a new `DetalleRiesgo` row is created with valoracionActivoId = 5
- AND the row is persisted to the database

#### Scenario: Update existing row

- GIVEN a `DetalleRiesgo` row with id = 10 exists
- WHEN a PATCH request updates only its `controlesImplementados` field
- THEN only the `controlesImplementados` field is changed
- AND amenazaIds and vulnerabilidadIds remain unchanged

#### Scenario: Delete a row

- GIVEN a `DetalleRiesgo` row with id = 10 exists
- WHEN a DELETE request is sent for that row id
- THEN the row is removed from the database
- AND other rows of the same `ValoracionActivo` are unaffected

### Requirement: Data Model — Prisma Schema Change

The `DetalleRiesgo` model in `backend/prisma/schema.prisma` MUST add three fields:
- `amenazaIds String? @db.Text` — stores JSON array of amenaza IDs
- `vulnerabilidadIds String? @db.Text` — stores JSON array of vulnerabilidad IDs
- `controlesImplementados String? @db.Text` — free text for controls specific to this row

The existing `tipo` and `catalogoId` fields are DEPRECATED for Tab 2 rows and will be replaced by the new array-based fields.

#### Scenario: Schema includes new columns

- GIVEN the Prisma schema has been updated with the three new columns on DetalleRiesgo
- WHEN `npx prisma db push` is executed
- THEN the database schema includes `amenazaIds`, `vulnerabilidadIds`, and `controlesImplementados` columns
- AND existing rows have null values until migrated

### Requirement: Backfill Existing Data

Existing `DetalleRiesgo` rows MUST be migrated so that each row's `amenazaIds` or `vulnerabilidadIds` contains its existing `catalogoId` value (as a JSON array), preserving backward compatibility with Tab 3 which still uses `tipo` + `catalogoId`.

#### Scenario: Backfill amenaza rows

- GIVEN existing `DetalleRiesgo` rows where `tipo = "amenaza"` and `catalogoId = 3`
- WHEN the migration script runs
- THEN those rows get `amenazaIds = "[3]"` and `vulnerabilidadIds = null`

#### Scenario: Backfill vulnerabilidad rows

- GIVEN existing `DetalleRiesgo` rows where `tipo = "vulnerabilidad"` and `catalogoId = 7`
- WHEN the migration script runs
- THEN those rows get `vulnerabilidadIds = "[7]"` and `amenazaIds = null

### Requirement: API Payload Structure

The DTOs for `DetalleRiesgo` create and update operations MUST accept:
- `amenazaIds?: string` (JSON array as string)
- `vulnerabilidadIds?: string` (JSON array as string)
- `controlesImplementados?: string`

The service layer MUST parse `amenazaIds` and `vulnerabilidadIds` as JSON and store them as `@db.Text` strings.

#### Scenario: Create DTO validates at-least-one constraint

- GIVEN a create DTO payload where both `amenazaIds` and `vulnerabilidadIds` are null or empty
- WHEN the DTO is validated
- THEN a validation error is raised specifying that at least one of amenaza or vulnerabilidad is required