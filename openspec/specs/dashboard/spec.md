# Delta Spec: Drill-down en gráficos del dashboard

## ADDED Requirements

### Requirement: Dashboard chart drill-down opens inline detail panel

The system MUST open an inline expandable panel when the user clicks a dashboard chart segment or bar. The panel MUST reuse the `mapa-calor.vue` pattern. Only one panel MAY be open at a time.

#### Scenario: Click CIA segment opens filtered asset panel

- GIVEN the Valoración CIA chart is rendered
- WHEN the user clicks a segment
- THEN a panel opens listing assets filtered by the selected CIA dimension and level

#### Scenario: Click risk-level segment opens filtered asset panel

- GIVEN the Nivel de Riesgo donut is rendered
- WHEN the user clicks a segment
- THEN a panel opens listing assets with that risk level

#### Scenario: Click bar opens asset threats/vulnerabilities panel

- GIVEN the Amenazas y vulnerabilidades por activo bar chart is rendered
- WHEN the user clicks a bar
- THEN a panel opens showing rows for the selected asset

#### Scenario: New click closes previous panel

- GIVEN a drill-down panel is open
- WHEN the user clicks another chart data point
- THEN the previous panel closes and the new panel opens

#### Scenario: Invalid clicks are ignored

- GIVEN the user clicks a legend, label, or empty area
- WHEN the click payload lacks a valid data point
- THEN no panel opens

#### Scenario: Panel is scrollable without sorting/pagination

- GIVEN a panel has more rows than its viewport
- THEN the panel body scrolls vertically
- AND sorting and pagination are out of scope

## MODIFIED Requirements

### Requirement: GET /reportes/valoracion-activos supports optional CIA filters

The system MUST accept optional `dimension` and `nivel` query params on `GET /reportes/valoracion-activos` and return only matching assets.
(Previously: endpoint returned the full list.)

| Param | Allowed values |
|---|---|
| dimension | confidencialidad, integridad, disponibilidad |
| nivel | Muy Alto, Alto, Medio, Bajo, Muy Bajo |

#### Scenario: Filter by dimension and level

- GIVEN assets have varying CIA levels
- WHEN `GET /reportes/valoracion-activos?dimension=confidencialidad&nivel=Alto` is called
- THEN only assets with confidencialidad = Alto are returned

#### Scenario: Omitting filters preserves full list

- GIVEN CIA valuations exist
- WHEN the endpoint is called without filters
- THEN all assets are returned

#### Scenario: No matching assets returns empty list

- GIVEN no asset matches the filters
- WHEN called with those filters
- THEN the response is an empty list

### Requirement: GET /reportes/riesgos-por-activo supports optional nivelRiesgo filter

The system MUST accept an optional `nivelRiesgo` query param on `GET /reportes/riesgos-por-activo` and return only matching assets.
(Previously: endpoint returned all assets.)

#### Scenario: Filter by risk level

- GIVEN assets have different risk levels
- WHEN `GET /reportes/riesgos-por-activo?nivelRiesgo=Medio` is called
- THEN only assets with risk level Medio are returned

#### Scenario: Omitting filter preserves full list

- GIVEN risk levels exist
- WHEN the endpoint is called without filter
- THEN all assets are returned

#### Scenario: No matching risk level returns empty list

- GIVEN no asset has the risk level
- WHEN called with that filter
- THEN the response is an empty list

### Requirement: Backend filters are covered by tests

The system MUST add tests in `reportes.service.spec.ts` and `reportes.controller.spec.ts` covering new query params and empty results.
(Previously: tests did not cover these filters.)

#### Scenario: Service test applies CIA filter

- GIVEN mixed CIA assets exist
- WHEN called with `dimension=integridad` and `nivel=Medio`
- THEN it returns only matching assets

#### Scenario: Controller test forwards query params

- GIVEN the controller exposes the endpoints
- WHEN a request has the new query params
- THEN it forwards them to the service

#### Scenario: Risk-level test covers empty results

- GIVEN no asset matches the `nivelRiesgo`
- WHEN invoked with that filter
- THEN the result is an empty array
