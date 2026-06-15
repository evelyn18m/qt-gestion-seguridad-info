# parametrizacion-page Specification

## Purpose

Read-only consolidated data table at `/parametrizacion` displaying all assets with 4 risk dimensions: CIA, Riesgo, Riesgo con Control, and Riesgo Residual.

## Requirements

### Requirement: Page Route
The system MUST render `parametrizacion.vue` at route `/parametrizacion`.

#### Scenario: Navigate to parametrizacion page
- GIVEN an authenticated user
- WHEN they navigate to `/parametrizacion`
- THEN the consolidated data table page renders

### Requirement: Data Fetching
The page MUST call `GET /valoraciones` via `useApi().apiFetch()` on mount and handle all states.

#### Scenario: Successful data load
- GIVEN the page mounts
- WHEN the API returns `ValoracionActivo[]`
- THEN a table renders with one row per asset showing all 4 risk dimensions

#### Scenario: Loading state
- GIVEN the page mounts and data is being fetched
- WHEN the API call is in flight
- THEN a loading indicator is visible

#### Scenario: Empty data
- GIVEN the API returns an empty array
- WHEN the response is received
- THEN a message "No hay valoraciones registradas" is displayed

#### Scenario: Session expired
- GIVEN the API call fails with HTTP 401 (SessionExpiredError)
- WHEN the error is caught
- THEN the session-expired modal is shown

#### Scenario: Network error
- GIVEN the API call fails with a non-401 error
- WHEN the error is caught
- THEN an error message is displayed with a "Reintentar" button that re-triggers the fetch

### Requirement: CIA Columns
The table MUST show confidencialidad, integridad, and disponibilidad per asset using the Impacto object's `nivel` field.

#### Scenario: CIA levels display
- GIVEN a loaded asset with `confidencialidad: { nivel: "Alto" }`, `integridad: { nivel: "Medio" }`, `disponibilidad: { nivel: "Bajo" }`
- WHEN the table row renders
- THEN C column shows "Alto" badge (orange), I shows "Medio" badge (yellow), D shows "Bajo" badge (green)

### Requirement: Risk Level Column
The table MUST derive Nivel Riesgo from `detallesRiesgo[]` by taking the maximum `nivelRiesgo` across all rows.

#### Scenario: Multiple detail rows
- GIVEN detallesRiesgo has rows with nivelRiesgo "Bajo" and "Alto"
- WHEN the column is computed
- THEN the badge shows "Alto" (orange)

#### Scenario: No detail rows
- GIVEN detallesRiesgo is empty or undefined
- WHEN the column is computed
- THEN the cell shows "Sin evaluación"

### Requirement: Control Risk Column
The table MUST derive Nivel Riesgo Control from `detallesRiesgo[]` by taking the maximum `nivelRiesgoControl` across all rows.

#### Scenario: Multiple detail rows with control risk
- GIVEN detallesRiesgo has rows with nivelRiesgoControl "Medio" and "Bajo"
- WHEN the column is computed
- THEN the badge shows "Medio" (yellow)

### Requirement: Residual Risk Column
The table MUST derive Riesgo Residual from `detallesRiesgo[]` using worst-of logic: INACEPTABLE if any row has `riesgoResidual === 'INACEPTABLE'`, else ACEPTABLE.

#### Scenario: Mixed residuals
- GIVEN detallesRiesgo rows with riesgoResidual "ACEPTABLE", "ACEPTABLE", "INACEPTABLE"
- WHEN the column is computed
- THEN the badge shows "INACEPTABLE" (red)

#### Scenario: All acceptable
- GIVEN detallesRiesgo rows all have riesgoResidual "ACEPTABLE"
- WHEN the column is computed
- THEN the badge shows "ACEPTABLE" (green)

### Requirement: Color Coding
Risk level badges MUST use `getNivelStyle()` pattern: BAJO/ACEPTABLE=green (#16a34a), MEDIO=yellow (#ca8a04), ALTO=orange (#ea580c), CRITICO/INACEPTABLE=red (#dc2626).

#### Scenario: Badge color consistency
- GIVEN any risk level value
- WHEN a badge renders
- THEN its colors match `getNivelStyle()` output

### Requirement: Read-Only
The page MUST NOT include edit buttons, forms, or any mutation controls.

#### Scenario: No interactive controls
- GIVEN the page is rendered
- WHEN inspecting the DOM
- THEN no edit, delete, or create buttons are present
