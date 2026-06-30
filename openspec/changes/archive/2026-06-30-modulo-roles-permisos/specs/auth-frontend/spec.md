# Delta for auth-frontend

## ADDED Requirements

### Requirement: Role Check in useAuth()

The `useAuth()` composable MUST expose `tieneRol(rol: string): boolean` derived from the authenticated user's roles array.

#### Scenario: Admin role detected

- GIVEN user object has `roles: ['administrador']`
- WHEN `tieneRol('administrador')` is called
- THEN returns `true`

#### Scenario: Missing role

- GIVEN user object has `roles: ['usuario']`
- WHEN `tieneRol('administrador')` is called
- THEN returns `false`

#### Scenario: Not authenticated

- GIVEN no authenticated user
- WHEN `tieneRol('administrador')` is called
- THEN returns `false`
