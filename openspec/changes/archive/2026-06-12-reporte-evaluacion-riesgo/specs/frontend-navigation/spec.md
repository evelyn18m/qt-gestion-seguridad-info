# Delta for frontend-navigation

## MODIFIED Requirements

### Requirement: ReportesTabs Component Includes Evaluación de Riesgo Tab

(Previously: ReportesTabs had 2 tabs — "Valoración de Activos" and "Análisis de Riesgo")

The `ReportesTabs.vue` component MUST include a third tab labeled "Evaluación de Riesgo" linking to `/reportes/evaluacion-riesgo`. The tab order SHALL be: Valoración de Activos → Análisis de Riesgo → Evaluación de Riesgo.

#### Scenario: Third tab renders in component

- GIVEN the user is on any `/reportes/*` page
- WHEN `ReportesTabs.vue` renders
- THEN three `<NuxtLink>` elements are present
- AND the third link has `to="/reportes/evaluacion-riesgo"` with text "Evaluación de Riesgo"

#### Scenario: Active tab highlights correctly

- GIVEN the user is on `/reportes/evaluacion-riesgo`
- WHEN `ReportesTabs` renders
- THEN only the "Evaluación de Riesgo" tab has the `active` class
- AND the other two tabs do NOT have the `active` class

#### Scenario: Tab navigation preserves filter state per tab

- GIVEN the user has applied filters on the Valoración page
- WHEN they click "Evaluación de Riesgo" tab
- THEN they navigate to `/reportes/evaluacion-riesgo`
- AND the Evaluación page loads with its own default (unfiltered) state
- AND returning to Valoración tab preserves the previous filter state
