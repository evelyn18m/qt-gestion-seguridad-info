# Specification: Dashboard de Inicio

## Purpose

Define the behavior of the SGSI home page as a live dashboard showing asset and risk summaries using existing report endpoints.

## Requirements

### Requirement: GET /reportes/resumen Feeds KPI Cards

The system SHALL fetch `GET /reportes/resumen` when the user lands on `/` and render three KPI cards from the response.

#### Scenario: Summary data available

- GIVEN the user is authenticated and `/reportes/resumen` returns `{ totalActivos: 10, conRiesgo: 4, sinRiesgo: 6, distribucionRiesgos: { Alto: 1, Medio: 2, Bajo: 1 } }`
- WHEN the user navigates to `/`
- THEN the dashboard displays "Total de Activos: 10", "Activos con Riesgo: 4", and "Activos sin Riesgo: 6"

#### Scenario: Summary data partially missing

- GIVEN the user is authenticated and `/reportes/resumen` returns `{}`
- WHEN the user navigates to `/`
- THEN all KPI cards display `0`

### Requirement: CIA Valuation Donut Charts

The system SHALL fetch `GET /reportes/cia` and render three ApexCharts donut charts for Confidencialidad, Integridad, and Disponibilidad when at least one dimension has a non-zero value.

#### Scenario: CIA data present

- GIVEN `/reportes/cia` returns `{ confidencialidad: { Alto: 2, Medio: 1, Bajo: 0 }, integridad: { Alto: 1, Medio: 1, Bajo: 1 }, disponibilidad: { Alto: 0, Medio: 2, Bajo: 1 } }`
- WHEN the dashboard renders
- THEN three donut charts labeled "Confidencialidad", "Integridad", and "Disponibilidad" appear with Alto, Medio, and Bajo segments

#### Scenario: CIA data empty

- GIVEN `/reportes/cia` returns `{ confidencialidad: { Alto: 0, Medio: 0, Bajo: 0 }, integridad: { Alto: 0, Medio: 0, Bajo: 0 }, disponibilidad: { Alto: 0, Medio: 0, Bajo: 0 } }`
- WHEN the dashboard renders
- THEN the chart area shows the message "No hay datos de valoración CIA."


### Requirement: Threats and Vulnerabilities by Asset Bar Chart

The system SHALL render an ApexCharts horizontal grouped bar chart from `GET /reportes/analisis-riesgo-activos` showing the top 10 assets by unique threats and vulnerabilities.

#### Scenario: Analysis data present

- GIVEN `/reportes/analisis-riesgo-activos` returns two rows for "Servidor Web" with different threats/vulnerabilities
- WHEN the dashboard renders
- THEN a horizontal grouped bar chart labeled "Amenazas y Vulnerabilidades por Activo" shows "Servidor Web" with two series: Amenazas and Vulnerabilidades

#### Scenario: Analysis data empty

- GIVEN `/reportes/analisis-riesgo-activos` returns `[]`
- WHEN the dashboard renders
- THEN the chart area shows the message "No hay amenazas ni vulnerabilidades asociadas a activos."

### Requirement: Loading and Error States

The system SHALL display a loading indicator while fetching and a retryable error message if the critical summary request fails.

#### Scenario: Request in flight

- GIVEN the dashboard is fetching data
- WHEN the user views `/`
- THEN a loading spinner and "Cargando dashboard..." text are visible

#### Scenario: Summary request fails

- GIVEN `/reportes/resumen` returns HTTP 500
- WHEN the dashboard renders
- THEN an error message is shown with a "Reintentar" button
- AND clicking "Reintentar" fetches the data again

### Requirement: Dark Theme Charts

The system SHALL configure every ApexCharts instance with `theme: { mode: 'dark' }`.

#### Scenario: Dashboard renders charts

- GIVEN the dashboard displays charts
- WHEN inspecting chart options
- THEN every chart has `theme.mode` set to `dark`

### Requirement: Sidebar and Other Modules Unchanged

The system SHALL NOT modify `frontend/layouts/default.vue`, create new routes, or change any page other than `frontend/pages/index.vue`.

#### Scenario: User navigates from dashboard

- GIVEN the user is on `/`
- WHEN they open the sidebar or navigate to another existing route
- THEN the sidebar and target page behave exactly as before the change
