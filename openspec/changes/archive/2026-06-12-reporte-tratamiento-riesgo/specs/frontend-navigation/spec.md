# Delta for Frontend Navigation

> **Change**: reporte-tratamiento-riesgo
> **Domain**: frontend-navigation

## MODIFIED Requirements

### Requirement: ReportesTabs Component Includes Four Report Tabs

> **Added by change**: `reporte-evaluacion-riesgo` (2026-06-12)
> **Modified by change**: `reporte-tratamiento-riesgo` (2026-06-12)
(Previously: Component had three tabs: Valoración → Análisis → Evaluación)

The `ReportesTabs.vue` component MUST include four tabs. The tab order SHALL be: Valoración de Activos → Análisis de Riesgo → Evaluación de Riesgo → Tratamiento de Riesgo.

#### Scenario: Four tab links render

- GIVEN the user is on any `/reportes/*` page
- WHEN `ReportesTabs.vue` renders
- THEN four `<NuxtLink>` elements are present
- AND the fourth link has `to="/reportes/tratamiento-riesgo"` with text "Tratamiento de Riesgo"

#### Scenario: Active tab highlights correctly

- GIVEN the user is on `/reportes/evaluacion-riesgo`
- WHEN `ReportesTabs` renders
- THEN only the "Evaluación de Riesgo" tab has the `active` class
- AND the other three tabs do NOT have the `active` class

#### Scenario: Fourth tab active highlights correctly

- GIVEN the user is on `/reportes/tratamiento-riesgo`
- WHEN `ReportesTabs` renders
- THEN only the "Tratamiento de Riesgo" tab has the `active` class

#### Scenario: Tab navigation preserves filter state per tab

- GIVEN the user has applied filters on the Valoración page
- WHEN they click "Tratamiento de Riesgo" tab
- THEN they navigate to `/reportes/tratamiento-riesgo`
- AND the Tratamiento page loads with its own default (unfiltered) state
- AND returning to Valoración tab preserves the previous filter state
