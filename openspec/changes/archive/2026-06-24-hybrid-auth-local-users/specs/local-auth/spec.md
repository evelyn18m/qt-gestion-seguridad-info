# local-auth Specification

## Purpose

Local authentication (username/password + bcrypt + JWT/HMAC) coexisting with Keycloak OIDC, with guard composition and Keycloak→local sync.

## Requirements

### Requirement: Local Login with bcrypt + JWT

The system MUST provide `POST /auth/login` accepting `{ username, password }`. The endpoint SHALL verify password via bcrypt against `Usuario.passwordHash` and emit a JWT signed with `JWT_SECRET` (HS256). Invalid credentials MUST return 401.

#### Scenario: Valid credentials

- GIVEN a `Usuario` exists with passwordHash set
- WHEN `POST /auth/login` with correct username and password
- THEN respond 200 with `{ access_token: <jwt>, usuario: { id, username, email, roles } }`

#### Scenario: Invalid credentials

- GIVEN credentials do not match any Usuario
- WHEN `POST /auth/login`
- THEN respond 401 with `{ statusCode: 401, message: "Unauthorized" }`

#### Scenario: Usuario without passwordHash

- GIVEN Usuario exists but `primerInicio` is true (no password set)
- WHEN `POST /auth/login`
- THEN respond 403 with `{ message: "Debe configurar su contraseña" }`

### Requirement: Composite JWT Guard

The `JwtAuthGuard` MUST validate both Keycloak-issued tokens (via JWKS) AND locally-issued tokens (via HMAC/HS256). It SHALL attempt Keycloak JWKS validation first, falling back to local HMAC on failure.

#### Scenario: Keycloak token accepted

- GIVEN a valid Keycloak-issued Bearer token
- WHEN any `/api/*` route is accessed
- THEN guard validates via JWKS, extracts `sub`, and allows request

#### Scenario: Local token accepted

- GIVEN a valid locally-issued Bearer token (HS256, `JWT_SECRET`)
- WHEN Keycloak JWKS validation fails (unknown issuer)
- THEN guard falls back to HMAC validation and allows request if valid

#### Scenario: Invalid token

- GIVEN an expired or malformed token
- WHEN both validation paths fail
- THEN respond 401

### Requirement: Set Password on First Login

The system MUST provide `POST /auth/set-password` accepting `{ password }`. For authenticated users with `primerInicio: true`, it SHALL hash the password with bcrypt (salt rounds 10) and set `primerInicio: false`.

#### Scenario: First password set

- GIVEN authenticated user with `primerInicio: true`
- WHEN `POST /auth/set-password { password }`
- THEN passwordHash is stored, `primerInicio` becomes false, respond 200

#### Scenario: Password already set

- GIVEN authenticated user with `primerInicio: false`
- WHEN `POST /auth/set-password`
- THEN respond 400 with `{ message: "La contraseña ya fue configurada" }`

### Requirement: Keycloak→Local Sync Interceptor

The system MUST intercept authenticated requests with Keycloak tokens and upsert a `Usuario` record by `keycloakSub`, syncing email, username, and roles. New syncs SHALL set `primerInicio: true`.

#### Scenario: First Keycloak login creates Usuario

- GIVEN no Usuario exists for token's `sub` claim
- WHEN a Keycloak-authenticated request is processed
- THEN a Usuario is created with `primerInicio: true`, email, and roles from token claims

#### Scenario: Subsequent Keycloak login updates

- GIVEN Usuario exists for `keycloakSub`
- WHEN Keycloak-authenticated request arrives
- THEN email and roles are refreshed from token claims; `primerInicio` unchanged
