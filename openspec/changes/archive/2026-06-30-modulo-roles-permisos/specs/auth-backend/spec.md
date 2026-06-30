# Delta for auth-backend

## ADDED Requirements

### Requirement: RolesGuard as Second APP_GUARD

The `RolesGuard` MUST be registered as the second `APP_GUARD` in `AppModule`, after the composite `AuthGuard`. This ensures `request.user` is populated before role evaluation.

#### Scenario: Guard execution order

- GIVEN a request to a protected mutating endpoint
- WHEN `AuthGuard` populates `request.user` from the JWT
- THEN `RolesGuard` evaluates roles from `request.user.roles`

#### Scenario: Public endpoint skips both guards correctly

- GIVEN `@Public()` endpoint (e.g., `POST /auth/login`)
- WHEN request arrives without a token
- THEN neither guard blocks; request proceeds

### Requirement: First User Bootstrap Role

`bootstrapFirstUser()` MUST create the initial administrator with role `'administrador'`.

#### Scenario: Bootstrap creates admin

- GIVEN no users exist in the database
- WHEN `bootstrapFirstUser()` executes
- THEN user created with `roles: ['administrador']`
