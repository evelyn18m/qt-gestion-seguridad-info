# Delta for local-usuarios-crud

## MODIFIED Requirements

### Requirement: Role Validation

Roles MUST be validated against `['administrador', 'usuario']`. Unknown roles SHALL respond 400.
(Previously: validated against `['administradoregsi', 'usuarioegsi']`)

#### Scenario: Valid role

- GIVEN `roles: ["administrador"]`
- WHEN creating/updating user
- THEN accepted

#### Scenario: Valid usuario role

- GIVEN `roles: ["usuario"]`
- WHEN creating/updating user
- THEN accepted

#### Scenario: Invalid role

- GIVEN `roles: ["superadmin"]`
- WHEN creating/updating user
- THEN 400 listing invalid roles
