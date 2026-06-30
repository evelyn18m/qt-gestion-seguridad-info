# roles-frontend Specification

## Purpose

Role visibility in the UI: role definitions page, conditional navigation, and `tieneRol()` helper for component-level role checks.

## Requirements

### Requirement: Page /roles Shows Definitions

The system MUST render a page at `/roles` showing available role definitions (`administrador`, `usuario`) and current user role assignments.

#### Scenario: Admin visits /roles

- GIVEN admin user navigates to `/roles`
- WHEN the page loads
- THEN role definitions and assignment status for all users are displayed

#### Scenario: Usuario visits /roles

- GIVEN usuario user navigates to `/roles`
- WHEN the page loads
- THEN their own role assignment is visible (read-only view)

### Requirement: tieneRol() Helper in useAuth()

The `useAuth()` composable MUST expose `tieneRol(rol: string): boolean`. It SHALL return `true` when the current user's normalized roles include the given role.

#### Scenario: Admin has administrador role

- GIVEN user's roles include `'administrador'`
- WHEN `tieneRol('administrador')` is called
- THEN returns `true`

#### Scenario: Usuario lacks administrador role

- GIVEN user's roles are `['usuario']`
- WHEN `tieneRol('administrador')` is called
- THEN returns `false`

#### Scenario: Not authenticated

- GIVEN no authenticated user
- WHEN `tieneRol('administrador')` is called
- THEN returns `false`

### Requirement: Admin-Only Navigation Hidden

Sidebar links for admin-only pages (`/parametrizacion`, `/usuarios`, `/roles`) MUST render conditionally using `v-if="tieneRol('administrador')"`. Usuario users SHALL NOT see these links.

#### Scenario: Usuario sidebar omits admin links

- GIVEN user with role `'usuario'`
- WHEN sidebar renders
- THEN admin-only links (`/parametrizacion`, `/usuarios`, `/roles`) are absent from DOM

#### Scenario: Admin sidebar includes all links

- GIVEN user with role `'administrador'`
- WHEN sidebar renders
- THEN all links including admin-only are present

### Requirement: 403 Graceful Handling

When the API returns 403, the UI SHALL display a user-friendly message instead of a raw error or blank screen.

#### Scenario: Usuario triggers mutation via API

- GIVEN usuario user attempts a mutation endpoint
- WHEN API returns 403
- THEN UI shows "No tenés permisos para realizar esta acción"
