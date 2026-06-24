# local-usuarios-crud Specification

## Purpose

CRUD management of local `Usuario` records, replacing the read-only Keycloak admin-client proxy.

## Requirements

### Requirement: Full CRUD on /usuarios

The system MUST provide `GET`, `POST`, `PATCH`, and `DELETE` on `/usuarios` operating on the local `Usuario` table. Endpoints MUST be protected by the composite JWT guard. The `passwordHash` field SHALL NOT appear in any response.

#### Scenario: List usuarios

- GIVEN authenticated request
- WHEN `GET /usuarios`
- THEN respond 200 with array of Usuario objects (no passwordHash)

#### Scenario: Create usuario

- GIVEN authenticated request with `{ username, email }`
- WHEN `POST /usuarios`
- THEN Usuario is created, respond 201 with Usuario object

#### Scenario: Update usuario

- GIVEN authenticated request
- WHEN `PATCH /usuarios/:id` with `{ email, habilitado, roles }`
- THEN Usuario is updated, respond 200

#### Scenario: Delete usuario

- GIVEN authenticated request
- WHEN `DELETE /usuarios/:id`
- THEN Usuario is removed, respond 204

### Requirement: Remove Keycloak Admin-Client Dependency

The `UsuariosModule` MUST NOT import or depend on `@keycloak/keycloak-admin-client`. User queries SHALL target the local `Usuario` table exclusively.

#### Scenario: No admin-client import

- GIVEN a developer inspects `src/usuarios/`
- THEN no import from `@keycloak/keycloak-admin-client` exists
