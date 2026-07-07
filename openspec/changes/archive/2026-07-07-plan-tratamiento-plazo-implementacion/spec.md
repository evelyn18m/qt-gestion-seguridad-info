# Specification: Plazo de implementación en Plan de Tratamiento

## Purpose

Replace the single `plazoImplementacion` date field with a fixed catalog (`[C] Corto`, `[M] Medio`, `[L] Largo`) plus editable start and end dates.

## Data Model

### Requirement: PlazoImplementacion catalog

The system MUST provide a `PlazoImplementacion` catalog seeded with `C/Corto`, `M/Medio`, and `L/Largo`.

#### Scenario: Seed is idempotent

- GIVEN a seeded database
- WHEN the seed routine re-runs
- THEN the catalog still contains exactly the three rows

### Requirement: PlanTratamiento fields

The system MUST store `plazoImplementacionId`, `fechaInicioImplementacion`, and `fechaFinImplementacion` on `PlanTratamiento`, and MUST drop the legacy `plazoImplementacion` column.

#### Scenario: Create with new fields

- GIVEN a valid DTO with the three new timeframe fields
- WHEN the plan is created
- THEN the row stores them and has no legacy date value

## API Contract

### Requirement: DTO fields

`CreatePlanTratamientoDto` and `UpdatePlanTratamientoDto` MUST accept `plazoImplementacionId` as optional integer and the two dates as optional ISO date strings.

#### Scenario: Valid request

- GIVEN ISO date strings for start and end
- WHEN the request is validated
- THEN it reaches the service

#### Scenario: Invalid date rejected

- GIVEN `fechaFinImplementacion` is `"not-a-date"`
- WHEN the request is validated
- THEN the API returns `400 Bad Request`

### Requirement: Backend validation

The service MUST reject a plan when a plazo is selected but either date is missing, or when the end date is not strictly after the start date.

#### Scenario: Missing date with plazo

- GIVEN `plazoImplementacionId` is set and `fechaInicioImplementacion` is empty
- WHEN the plan is saved
- THEN a `BadRequestException` is thrown

#### Scenario: Equal dates

- GIVEN start and end are the same day
- WHEN the plan is saved
- THEN a `BadRequestException` is thrown

#### Scenario: Empty timeframe

- GIVEN none of the three fields are populated
- WHEN the plan is saved
- THEN all three are stored as null

## UI/UX

### Requirement: Modal fields

The modal MUST show a `Plazo de Implementación` catalog select plus `Fecha de inicio` and `Fecha de fin` `type="date"` inputs.

#### Scenario: Create modal opens

- GIVEN the user clicks Nuevo
- WHEN the modal opens
- THEN the select is unselected and date inputs are empty

#### Scenario: Edit modal loads values

- GIVEN a plan with plazo `C` and dates
- WHEN the edit modal opens
- THEN `[C] Corto` and the stored dates are displayed

### Requirement: Display format

The system MUST render a selected plazo as `[C] Corto`, `[M] Medio`, or `[L] Largo`.

#### Scenario: List view

- GIVEN a plan linked to plazo `M`
- WHEN it appears in the list
- THEN it shows `[M] Medio`

### Requirement: Frontend validation

The modal MUST block submission when a plazo is selected but dates are missing, or when the end date is not after the start date.

#### Scenario: Missing end date

- GIVEN a plazo is selected and `Fecha de fin` is empty
- WHEN the user clicks Guardar
- THEN no request is sent and a validation message is shown

## Catalog & Seed

### Requirement: Catalog registration

The system MUST register `plazos-implementacion` in the generic `/catalogos` service and preload it in the frontend.

#### Scenario: Fetch catalog

- GIVEN the frontend calls `/catalogos/plazos-implementacion`
- WHEN the backend handles the request
- THEN it returns the three rows ordered by `id`

### Requirement: Idempotent seed

The system MUST seed `PlazoImplementacion` idempotently alongside other Plan de Tratamiento catalogs.

#### Scenario: Seed on existing rows

- GIVEN the three rows already exist
- WHEN the seed runs
- THEN no duplicates are created
