# Delta for frontend-navigation

## MODIFIED Requirements

### Requirement: ReportesTabs Component Includes Five Report Tabs

> **Added by change**: `reporte-evaluacion-riesgo` (2026-06-12)
> **Modified by change**: `reporte-tratamiento-riesgo` (2026-06-12)
> **Modified by change**: `heatmap-frontend` (2026-06-15)
> (Previously: Component had four tabs: Valoración → Análisis → Evaluación → Tratamiento)

The `ReportesTabs.vue` component MUST include five tabs. The tab order SHALL be: Valoración de Activos → Análisis de Riesgo → Evaluación de Riesgo → Tratamiento de Riesgo → Mapa de Calor.

#### Scenario: Five tab links render

- GIVEN the user is on any `/reportes/*` page
- WHEN `ReportesTabs.vue` renders
- THEN five `<NuxtLink>` elements are present
- AND the fifth link has `to="/reportes/mapa-calor"` with text "Mapa de Calor"

#### Scenario: Active tab highlights correctly

- GIVEN the user is on `/reportes/evaluacion-riesgo`
- WHEN `ReportesTabs` renders
- THEN only the "Evaluación de Riesgo" tab has the `active` class
- AND the other four tabs do NOT have the `active` class

#### Scenario: Fourth tab active highlights correctly

- GIVEN the user is on `/reportes/tratamiento-riesgo`
- WHEN `ReportesTabs` renders
- THEN only the "Tratamiento de Riesgo" tab has the `active` class

#### Scenario: Fifth tab active highlights correctly

- GIVEN the user is on `/reportes/mapa-calor`
- WHEN `ReportesTabs` renders
- THEN only the "Mapa de Calor" tab has the `active` class

#### Scenario: Tab navigation preserves filter state per tab

- GIVEN the user has applied filters on the Valoración page
- WHEN they click "Mapa de Calor" tab
- THEN they navigate to `/reportes/mapa-calor`
- AND the heatmap page loads with its own default (unfiltered) state
- AND returning to Valoración tab preserves the previous filter state
