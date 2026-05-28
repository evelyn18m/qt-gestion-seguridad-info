# Delta for auth-backend

## ADDED Requirements

### Requirement: JWT validation on all API routes

The backend MUST validate JWT access tokens on all `/api/*` routes. Requests without a valid Bearer token SHALL receive a 401 Unauthorized response.

#### Scenario: Request with valid Bearer token

- GIVEN a request includes `Authorization: Bearer <valid_jwt_token>`
- WHEN the request reaches any `/api/*` controller
- THEN the `AuthGuard` MUST validate the JWT signature against Keycloak's JWKS endpoint
- AND extract user identity from the token claims
- AND allow the request to proceed

#### Scenario: Request without Bearer token

- GIVEN a request does not include an `Authorization` header
- WHEN it reaches any `/api/*` controller
- THEN the `AuthGuard` MUST return HTTP 401 with body `{ "statusCode": 401, "message": "Unauthorized" }`

#### Scenario: Request with expired or invalid token

- GIVEN a request includes an expired or malformed JWT
- WHEN the `AuthGuard` attempts validation
- THEN the guard MUST return HTTP 401

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

---

## Metadata

- change: corregir-auth-oidc
- domain: auth-backend
- type: new
- status: ready-for-design