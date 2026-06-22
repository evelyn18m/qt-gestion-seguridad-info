# parametrizacion-page Specification

## Purpose

Editable thresholds page at `/parametrizacion` where users configure risk classification boundaries (Bajo, Medio, Alto, Inaceptable) for Riesgo, Control, and Riesgo Residual dimensions.

## Requirements

### Requirement: Page Route

The system MUST render `parametrizacion.vue` at route `/parametrizacion`.

#### Scenario: Navigate to parametrizacion page

- GIVEN an authenticated user
- WHEN they navigate to `/parametrizacion`
- THEN the editable thresholds form page renders

### Requirement: Data Loading

The page MUST call `GET /parametros` via `useApi().apiFetch()` on mount to load current `ConfiguracionRiesgo` and populate all inputs.

#### Scenario: Successful data load

- GIVEN the page mounts
- WHEN the API returns `ConfiguracionRiesgo` with current thresholds
- THEN all "Desde" and "Hasta" inputs are populated with current values

#### Scenario: Loading state

- GIVEN the page mounts and data is being fetched
- WHEN the API call is in flight
- THEN a loading indicator is visible and form is disabled

#### Scenario: Session expired

- GIVEN the API call fails with HTTP 401 (SessionExpiredError)
- WHEN the error is caught
- THEN the session-expired modal is shown

#### Scenario: Network error

- GIVEN the API call fails with a non-401 error
- WHEN the error is caught
- THEN an error message is displayed with a "Reintentar" button that re-triggers the fetch

### Requirement: Editable Thresholds with Desde/Hasta Inputs

All 7 threshold rows across 3 cards SHALL render editable "Desde" and "Hasta" numeric inputs. Rows for Alto (riesgoAltoMax, controlAltoMax) and Riesgo Residual Inaceptable SHALL NOT be locked.

#### Scenario: Alto row editable

- GIVEN user views "Nivel de Riesgo" card
- WHEN inspecting the "Alto" row
- THEN both "Desde" and "Hasta" inputs are editable

#### Scenario: All ranges have Desde input

- GIVEN any threshold row across 3 cards
- WHEN row renders
- THEN "Desde" input is present and accepts numeric values

### Requirement: Frontend Range Continuity Validation

Frontend SHALL validate: (a) Desde < Hasta per row, (b) consecutive ranges are contiguous (row[n].Hasta = row[n+1].Desde - 1). Violations SHALL show red border on affected inputs and disable save button.

#### Scenario: Overlap detected

- GIVEN Bajo.Hasta=4 and Medio.Desde=3
- WHEN user edits either field
- THEN both inputs show red border, save disabled

#### Scenario: Gap detected

- GIVEN Bajo.Hasta=3 and Medio.Desde=5
- WHEN validation runs
- THEN inputs show red border, save disabled

#### Scenario: Valid contiguous ranges

- GIVEN Bajo(1-3), Medio(4-9), Alto(10-27)
- WHEN all inputs populated
- THEN no validation errors, save button enabled

### Requirement: Save Thresholds via PUT

Page SHALL call PUT /parametros on save. On 200, SHALL show success feedback. On 4xx, SHALL display backend error. Loading state SHALL disable form during request.

#### Scenario: Successful save

- GIVEN valid modified thresholds
- WHEN user clicks "Guardar"
- THEN PUT /parametros is called; success confirmation appears

#### Scenario: Backend validation error

- GIVEN backend returns 400
- WHEN save completes
- THEN error message displayed; form remains editable
