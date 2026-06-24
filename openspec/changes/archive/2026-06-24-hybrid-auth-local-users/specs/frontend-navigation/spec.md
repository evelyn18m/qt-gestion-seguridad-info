# Delta for frontend-navigation

## ADDED Requirements

### Requirement: Public /login Route

The application MUST serve `/login` as a public route (no auth required). It SHALL render the dual-entry login page (local form + Keycloak button) and redirect authenticated users to `/`.

#### Scenario: Unauthenticated user visits /login

- GIVEN user is not authenticated
- WHEN they navigate to `/login`
- THEN the login page renders without redirecting to Keycloak

#### Scenario: Authenticated user visits /login

- GIVEN user is authenticated
- WHEN they navigate to `/login`
- THEN they are redirected to `/`

### Requirement: Auth-State-Driven Navigation

Protected routes MUST redirect unauthenticated users to `/login`. Users with `primerInicio: true` (post-Keycloak-sync, no password set) SHALL be restricted to the `SetPasswordModal` and MUST NOT access protected content.

#### Scenario: Unauthenticated access to protected route

- GIVEN user is not authenticated
- WHEN they navigate to any protected route (e.g., `/valoracion`)
- THEN they are redirected to `/login`

#### Scenario: primerInicio user restricted

- GIVEN authenticated user with `primerInicio: true`
- WHEN they navigate to any protected route
- THEN `SetPasswordModal` is shown; underlying page content is inaccessible until password is set

#### Scenario: primerInicio resolved

- GIVEN user was `primerInicio: true` and has set password via modal
- WHEN `primerInicio` becomes false
- THEN protected routes become accessible normally
