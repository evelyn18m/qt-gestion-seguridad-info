# roles-backend Specification

## Purpose

Endpoint-level role-based access control via `@Roles()` decorator and `RolesGuard`. Normalizes legacy role names for backward compatibility.

## Requirements

### Requirement: @Roles() Decorator

The system MUST provide a `@Roles(...roles: string[])` decorator using `SetMetadata` with key `ROLES_KEY`. Controllers SHALL apply it to handlers to declare required roles.

#### Scenario: Decorator sets metadata

- GIVEN a handler annotated with `@Roles('administrador')`
- WHEN the handler's metadata is read via `Reflector`
- THEN `ROLES_KEY` metadata equals `['administrador']`

### Requirement: RolesGuard Enforces Access

The `RolesGuard` MUST read handler metadata via `Reflector`, compare against `request.user.roles`, and allow or reject. It SHALL skip when no `@Roles()` metadata is set on the handler (open endpoints like GET).

#### Scenario: User has required role

- GIVEN `request.user.roles = ['administrador']` and handler requires `@Roles('administrador')`
- WHEN the guard executes
- THEN request proceeds (returns `true`)

#### Scenario: User lacks required role

- GIVEN `request.user.roles = ['usuario']` and handler requires `@Roles('administrador')`
- WHEN the guard executes
- THEN responds 403 Forbidden

#### Scenario: No roles on handler (open)

- GIVEN handler has no `@Roles()` decorator
- WHEN the guard executes
- THEN request proceeds (returns `true`)

### Requirement: @Public() Respected

`RolesGuard` MUST check `IS_PUBLIC_KEY` metadata before evaluating roles. Public endpoints SHALL never be blocked.

#### Scenario: Public endpoint bypasses role check

- GIVEN handler has `@Public()` decorator
- WHEN the guard executes
- THEN request proceeds without evaluating roles

### Requirement: Role Mapper Normalization

The guard MUST normalize legacy role names before comparison: `'admin'` → `'administrador'`, `'administradoregsi'` → `'administrador'`, `'usuarioegsi'` → `'usuario'`.

#### Scenario: Legacy admin role normalized

- GIVEN `request.user.roles = ['administradoregsi']` and handler requires `'administrador'`
- WHEN guard compares roles
- THEN normalization matches and request proceeds

#### Scenario: Legacy usuario role normalized

- GIVEN `request.user.roles = ['usuarioegsi']` and handler requires `'usuario'`
- WHEN guard compares roles
- THEN normalization matches and request proceeds

### Requirement: Mutating Endpoints Restricted

All POST/PATCH/PUT/DELETE handlers MUST have `@Roles('administrador')`. Any non-admin authenticated user SHALL receive 403.

#### Scenario: Admin creates resource

- GIVEN admin user, handler with `@Roles('administrador')`
- WHEN `POST /usuarios`
- THEN 201 Created

#### Scenario: Usuario attempts mutation

- GIVEN usuario user, handler with `@Roles('administrador')`
- WHEN `POST /usuarios`
- THEN 403 Forbidden

### Requirement: Missing Roles Edge Case

When `request.user` exists but `request.user.roles` is undefined or null, the guard SHALL return 403.

#### Scenario: User without roles property

- GIVEN `request.user.roles` is undefined, handler requires any role
- WHEN guard executes
- THEN 403 Forbidden
