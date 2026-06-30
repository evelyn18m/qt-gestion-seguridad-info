# Auth Backend — JWT Validation + CORS + Local Auth

## Metadata
- change: hybrid-auth-local-users
- domain: auth-backend
- type: spec
- status: active
- previous_changes: corregir-auth-oidc

---

## MODIFIED Requirements

### Requirement: JWT validation on all API routes

The backend MUST validate JWT access tokens on all `/api/*` routes. The guard SHALL accept BOTH Keycloak-issued tokens (validated via JWKS endpoint) AND locally-issued tokens (validated via HMAC with `JWT_SECRET`). Keycloak validation MUST be attempted first; local HMAC validation SHALL serve as fallback. Requests without a valid Bearer token of either type SHALL receive 401.

(Previously: only Keycloak JWKS tokens were accepted; no local JWT support)

#### Scenario: Request with valid Keycloak Bearer token

- GIVEN a request includes `Authorization: Bearer <valid_keycloak_jwt>`
- WHEN the request reaches any `/api/*` controller
- THEN the guard MUST validate the JWT signature against Keycloak's JWKS endpoint
- AND extract user identity from the token claims
- AND allow the request to proceed

#### Scenario: Request with valid local Bearer token

- GIVEN a request includes `Authorization: Bearer <valid_local_jwt>`
- WHEN Keycloak JWKS validation returns invalid
- THEN the guard MUST fall back to HMAC validation using `JWT_SECRET`
- AND if valid, extract user identity and allow the request to proceed

#### Scenario: Request without Bearer token

- GIVEN a request does not include an `Authorization` header
- WHEN it reaches any `/api/*` controller
- THEN the guard MUST return HTTP 401 with body `{ "statusCode": 401, "message": "Unauthorized" }`

#### Scenario: Request with expired or invalid token

- GIVEN a request includes an expired or malformed JWT
- WHEN both Keycloak and local validation fail
- THEN the guard MUST return HTTP 401

## ADDED Requirements

### Requirement: CORS restricted to frontend origin

The backend MUST restrict CORS to `http://localhost:3000` exclusively. Requests from any other origin SHALL be rejected.

#### Scenario: Frontend makes API request

- GIVEN the frontend at `http://localhost:3000` makes an API request to `http://localhost:3001/api/*`
- WHEN the request includes valid credentials
- THEN CORS headers MUST allow the request

#### Scenario: Unknown origin requests

- GIVEN a request originates from `http://malicious-site.com`
- WHEN it reaches the backend
- THEN the response MUST NOT include CORS allow headers for that origin

### Requirement: JWKS endpoint configuration

The backend MUST fetch and cache Keycloak's public keys from the JWKS endpoint for JWT signature validation.

#### Scenario: JWT signature validation

- GIVEN a request with a valid Bearer token
- WHEN the `AuthGuard` validates the token
- THEN the guard MUST verify the signature using keys from `http://localhost:8080/realms/quito-turismo/protocol/openid-connect/certs`
- AND MUST NOT accept tokens signed with unknown keys

### Requirement: POST /auth/login — Local Authentication

The backend MUST expose `POST /auth/login` as a public endpoint accepting `{ username, password }`. It SHALL validate credentials via bcrypt and return a locally-signed JWT (HS256, `JWT_SECRET`). Users with `primerInicio: true` MUST receive 403.

#### Scenario: Successful local login

- GIVEN Usuario exists with valid passwordHash
- WHEN `POST /auth/login { username, password }`
- THEN respond 200 with `{ access_token }` and user payload

#### Scenario: Failed local login

- GIVEN invalid credentials
- WHEN `POST /auth/login`
- THEN respond 401

### Requirement: POST /auth/set-password — First Password Setup

The backend MUST expose `POST /auth/set-password` requiring authentication. For users with `primerInicio: true`, it SHALL hash the provided password (bcrypt, 10 rounds) and set `primerInicio: false`.

#### Scenario: First password set

- GIVEN authenticated user with `primerInicio: true`
- WHEN `POST /auth/set-password { password }`
- THEN passwordHash stored, primerInicio set to false, respond 200

#### Scenario: Already configured

- GIVEN authenticated user with `primerInicio: false`
- WHEN `POST /auth/set-password`
- THEN respond 400

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
