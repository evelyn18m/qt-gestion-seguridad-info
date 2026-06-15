# Delta for frontend-navigation

## ADDED Requirements

### Requirement: Sidebar Parametrización Link
The sidebar MUST include a `NuxtLink` to `/parametrizacion` between "Valoración de Activos" and "Reportes".

#### Scenario: Parametrización link renders
- GIVEN the sidebar is rendered on any page
- WHEN inspecting the nav items
- THEN a `NuxtLink to="/parametrizacion"` with label "Parametrización" is present between "Valoración de Activos" and "Reportes"

#### Scenario: Active state highlights correctly
- GIVEN the user is on `/parametrizacion`
- WHEN the sidebar renders
- THEN the Parametrización link has the `active` class

#### Scenario: Link navigates correctly
- GIVEN the user is on any page
- WHEN they click the Parametrización sidebar link
- THEN they navigate to `/parametrizacion`
