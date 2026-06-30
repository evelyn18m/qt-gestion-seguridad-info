# Delta for local-usuarios-crud

## ADDED Requirements

### Requirement: Keycloak Sync on Create

`POST /usuarios` MUST also create the user in Keycloak via `KeycloakAdminService`, store the UUID as `keycloakSub`, and set the generated password as the Keycloak credential. Keycloak unavailability SHALL NOT block the local create.

#### Scenario: Created in both systems

- GIVEN `{ username, email }`
- WHEN `POST /usuarios`
- THEN local user created, Keycloak user created, `keycloakSub` saved

#### Scenario: Keycloak unavailable

- GIVEN Keycloak unreachable
- WHEN `POST /usuarios`
- THEN local user created, `keycloakSub: null`, warning logged, 201

### Requirement: Keycloak Sync on Update

`PATCH /usuarios/:id` MUST sync `email`, `habilitado`, and `roles` to Keycloak. Null `keycloakSub` SHALL skip the sync.

#### Scenario: Update synced

- GIVEN Usuario with `keycloakSub`
- WHEN `PATCH /usuarios/:id` with `{ email, roles }`
- THEN local record and Keycloak fields updated

#### Scenario: Keycloak unavailable

- GIVEN Keycloak unreachable
- WHEN `PATCH /usuarios/:id`
- THEN local record updated, warning logged

### Requirement: Keycloak Sync on Delete

`DELETE /usuarios/:id` MUST delete the Keycloak user. Null `keycloakSub` SHALL skip deletion.

#### Scenario: Deleted from both

- GIVEN Usuario with `keycloakSub`
- WHEN `DELETE /usuarios/:id`
- THEN local record and Keycloak user deleted

### Requirement: Best-Effort Keycloak Integration

Keycloak failures SHALL log WARN but MUST NOT reject HTTP requests. Local data integrity always takes precedence.

#### Scenario: Sync fails gracefully

- GIVEN Keycloak down
- WHEN any CRUD operation runs
- THEN local operation succeeds, WARN logged

### Requirement: Role Validation

Roles MUST be validated against `['administradoregsi', 'usuarioegsi']`. Unknown roles SHALL respond 400.

#### Scenario: Valid role

- GIVEN `roles: ["administradoregsi"]`
- WHEN creating/updating user
- THEN accepted

#### Scenario: Invalid role

- GIVEN `roles: ["superadmin"]`
- WHEN creating/updating user
- THEN 400 listing invalid roles

## MODIFIED Requirements

### Requirement: Full CRUD on /usuarios

The system MUST provide `GET`, `POST`, `PATCH`, and `DELETE` on `/usuarios` (composite JWT guard). `passwordHash` SHALL NOT appear in responses. On `POST`, MUST generate 32-char hex password, bcrypt-hash it (10 rounds), set `primerInicio: true`, create user in Keycloak, store `keycloakSub`, return `{ usuario, contraseñaGenerada }`. (Previously: no Keycloak sync; keycloakSub not saved)

#### Scenario: Create with generated password and Keycloak sync

- GIVEN `{ username, email }`
- WHEN `POST /usuarios`
- THEN user created with `passwordHash`, `primerInicio: true`, `keycloakSub`
- AND response 201 with `{ usuario: { ..., keycloakSub }, contraseñaGenerada }`

#### Scenario: List usuarios

- GIVEN authenticated request
- WHEN `GET /usuarios`
- THEN respond 200 with Usuario array (no passwordHash)

#### Scenario: Generated password is bcrypt-verifiable

- GIVEN `POST /usuarios` returning `contraseñaGenerada`
- WHEN comparing against stored `passwordHash` via `bcrypt.compare`
- THEN comparison succeeds

#### Scenario: passwordHash never returned by GET

- GIVEN created usuario
- WHEN `GET /usuarios` or `GET /usuarios/:id`
- THEN response SHALL NOT contain `passwordHash`

#### Scenario: Update usuario

- GIVEN authenticated request
- WHEN `PATCH /usuarios/:id` with `{ email, habilitado, roles }`
- THEN Usuario updated, respond 200

#### Scenario: Delete usuario

- GIVEN authenticated request
- WHEN `DELETE /usuarios/:id`
- THEN Usuario removed, respond 204

### Requirement: Remove Keycloak Admin-Client Dependency

`UsuariosModule` MUST NOT depend on `@keycloak/keycloak-admin-client`. Keycloak communication SHALL use REST via `KeycloakAdminService` (`@nestjs/axios`). (Previously: only prohibited admin-client; no REST dependency)

#### Scenario: No admin-client import

- GIVEN inspect `src/usuarios/`
- THEN no `@keycloak/keycloak-admin-client` import

#### Scenario: REST via KeycloakAdminService

- GIVEN UsuariosModule loaded
- THEN `KeycloakAdminService` injected; all Keycloak ops use REST
