# Delta for frontend-navigation

## ADDED Requirements

### Requirement: Role-Conditional Sidebar Items

Sidebar links for admin-only pages (`/parametrizacion`, `/usuarios`, `/roles`) MUST render only when `tieneRol('administrador')` returns `true`. Links for all-authenticated pages (`/`, `/catalogos`, `/valoracion`, `/reportes`) SHALL render for any authenticated user.

#### Scenario: Admin sees all links

- GIVEN user with role `'administrador'`
- WHEN sidebar renders
- THEN all links including Parametrización, Usuarios, and Roles are visible

#### Scenario: Usuario hides admin links

- GIVEN user with role `'usuario'`
- WHEN sidebar renders
- THEN Parametrización, Usuarios, and Roles links are absent from DOM

#### Scenario: All-authenticated links always visible

- GIVEN authenticated user with any role
- WHEN sidebar renders
- THEN Inicio, Catálogos, Valoración, and Reportes links are present

## MODIFIED Requirements

### Requirement: Sidebar Parametrización Link

The sidebar MUST include a `NuxtLink` to `/parametrizacion` between "Valoración de Activos" and "Reportes". This link SHALL render conditionally — visible only to users with role `'administrador'`.
(Previously: rendered unconditionally for all authenticated users)

#### Scenario: Parametrización link renders for admin

- GIVEN the sidebar is rendered, user has role `'administrador'`
- WHEN inspecting nav items
- THEN a `NuxtLink to="/parametrizacion"` with label "Parametrización" is present between "Valoración de Activos" and "Reportes"

#### Scenario: Parametrización link hidden for usuario

- GIVEN the sidebar is rendered, user has role `'usuario'`
- WHEN inspecting nav items
- THEN no Parametrización link is present

#### Scenario: Active state highlights correctly

- GIVEN the user is on `/parametrizacion`
- WHEN the sidebar renders
- THEN the Parametrización link has the `active` class

#### Scenario: Link navigates correctly

- GIVEN the user is on any page
- WHEN they click the Parametrización sidebar link
- THEN they navigate to `/parametrizacion`
