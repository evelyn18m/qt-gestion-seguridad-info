# keycloak-admin-service Specification

## Purpose

Infrastructure module providing Keycloak 24 REST Admin API communication: admin authentication (password grant), user CRUD, client-level role mapping for `sgsi-app`, token and client UUID caching.

## Requirements

### Requirement: Admin Token Acquisition

The system MUST obtain an admin access token via Keycloak password grant against the master realm. Tokens SHALL be cached and reused until expiration (or 401). On 401, the cache MUST be invalidated and a new token obtained.

#### Scenario: Token obtained and cached

- GIVEN `KC_ADMIN_CLIENT_ID` and `KC_ADMIN_CLIENT_SECRET` env vars
- WHEN admin token is first requested
- THEN a token is fetched from Keycloak and cached

#### Scenario: Token refreshed on 401

- GIVEN a cached token that has expired
- WHEN a Keycloak API call returns 401
- THEN the cache is cleared and a new token is obtained

### Requirement: User CRUD in Keycloak

The system MUST provide create, find-by-username, and delete operations against the Keycloak Users API. Created users SHALL have email, username, enabled, and credentials set. The `keycloakSub` (UUID) from Keycloak's response MUST be returned.

#### Scenario: Create user in Keycloak

- GIVEN valid admin token
- WHEN `createUser({ username, email, password })` is called
- THEN user is created and their UUID is returned

#### Scenario: Find user by username

- GIVEN valid admin token
- WHEN `findUserByUsername("existing-user")` is called
- THEN the Keycloak user representation is returned, or null if not found

#### Scenario: Delete user from Keycloak

- GIVEN valid admin token and user's `keycloakSub`
- WHEN `deleteUser(keycloakSub)` is called
- THEN user is deleted from Keycloak

### Requirement: Client Role Assignment

The system MUST assign and remove client-level roles for the `sgsi-app` client. Role names SHALL be validated against known values before assignment.

#### Scenario: Assign client roles

- GIVEN valid admin token, user UUID, and client UUID
- WHEN `assignClientRoles(userId, clientId, ["administradoregsi"])` is called
- THEN the user receives the client role in `sgsi-app`

#### Scenario: Replace client roles

- GIVEN user has existing client roles
- WHEN assigning an updated role list
- THEN only the specified roles remain; others are removed

### Requirement: Client UUID Resolution

The system MUST resolve the `sgsi-app` client UUID from Keycloak and cache it. If resolution fails, operations requiring the client UUID SHALL fail gracefully.

#### Scenario: Client UUID cached

- GIVEN valid admin token
- WHEN `getClientUuid()` is called
- THEN the `sgsi-app` client UUID is returned and cached for subsequent calls
