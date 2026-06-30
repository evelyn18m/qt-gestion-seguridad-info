# Proposal: Módulo Roles con Control de Acceso a Nivel Endpoint

## Intent

No existe control de acceso basado en roles. Cualquier usuario autenticado puede ejecutar cualquier endpoint (lectura y escritura). Esto implica riesgo de que un usuario estándar modifique datos sensibles (valoraciones, catálogos, parámetros, usuarios). Se necesita que solo administradores ejecuten mutaciones y que la UI oculte opciones no autorizadas.

## Scope

### In Scope
- Decorator `@Roles()` + `RolesGuard` separado (patrón NestJS estándar)
- Normalizar nombres de rol: `'admin'`/`'administradoregsi'` → `'administrador'`, `'usuarioegsi'` → `'usuario'`
- Mapper backward-compat en guard para usuarios con roles viejos
- Proteger endpoints mutadores (POST/PATCH/PUT/DELETE) con `@Roles('administrador')` en todos los módulos
- Respetar `@Public()` en `RolesGuard` (no bloquear login/bootstrap)
- Frontend: nueva página `/roles` (definiciones y asignaciones)
- Frontend: refactorizar selector de roles en `/usuarios` (textarea → checkboxes/multi-select)
- Frontend: `useAuth()` expone helper `tieneRol(rol)`
- Frontend: navegación condicional (ocultar enlaces admin para `usuario`)
- Tests TDD: guard, decorator, y tests de auth actualizados
- Actualizar `bootstrapFirstUser()` a `'administrador'`

### Out of Scope
- Roles dinámicos (sin tabla Rol/Permiso en DB)
- Granularidad fina por módulo/acción
- Gestión de roles en Keycloak
- E2E tests con Keycloak

## Capabilities

### New Capabilities
- `roles-backend`: `@Roles()` decorator y `RolesGuard` para control de acceso a endpoints. Role mapper backward-compat.
- `roles-frontend`: Página `/roles`, navegación condicional por rol, `tieneRol()` en `useAuth()`.

### Modified Capabilities
- `local-usuarios-crud`: `ALLOWED_ROLES` cambia de `['administradoregsi','usuarioegsi']` a `['administrador','usuario']`. Role validation actualizada.
- `auth-backend`: `RolesGuard` como segundo `APP_GUARD`; `bootstrapFirstUser()` usa `'administrador'`.
- `auth-frontend`: `useAuth()` expone `tieneRol(rol)`.
- `frontend-navigation`: Links de sidebar condicionales por rol (admin-only).
- `usuarios-crud-frontend`: Selector de roles cambia de textarea a checkboxes/multi-select con roles predefinidos.

## Approach

Approach 1 — Roles estáticos con `@Roles()` decorator + `RolesGuard` separado. Sin migraciones DB, sin tablas nuevas. El guard usa `Reflector` (mismo patrón que `@Public()`) y compara `request.user.roles` con los roles requeridos. Orden de guards: `AuthGuard` primero (puebla `request.user`), `RolesGuard` después. Mapper: `{ 'admin':'administrador', 'administradoregsi':'administrador', 'usuarioegsi':'usuario' }`. Endpoints GET sin decorator (acceso para cualquier autenticado). Mutaciones requieren `@Roles('administrador')`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/auth/decorators/roles.decorator.ts` | New | `@Roles()` via `SetMetadata` |
| `backend/src/auth/roles.guard.ts` | New | Lee metadata, compara roles, respeta `@Public()` |
| `backend/src/auth/roles.guard.spec.ts` | New | Tests TDD del guard |
| `backend/src/auth/auth.service.ts` | Modified | `bootstrapFirstUser()` → `'administrador'` |
| `backend/src/app.module.ts` | Modified | Registrar `RolesGuard` como `APP_GUARD` |
| `backend/src/*/dto/` (usuarios) | Modified | `ALLOWED_ROLES` normalizado |
| `backend/src/*/*.controller.ts` | Modified | `@Roles('administrador')` en mutadores |
| `frontend/pages/roles.vue` | New | Vista de definiciones y asignaciones de roles |
| `frontend/pages/usuarios.vue` | Modified | Selector de roles con checkboxes |
| `frontend/layouts/default.vue` | Modified | Navegación condicional por rol |
| `frontend/composables/useAuth.ts` | Modified | Helper `tieneRol(rol)` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Orden de guards invertido → `request.user` indefinido | Low | Orden explícito en `APP_GUARD`: AuthGuard antes de RolesGuard |
| `@Public()` endpoints bloqueados | Medium | `RolesGuard` verifica `IS_PUBLIC_KEY` antes de evaluar roles |
| Usuarios existentes con roles viejos rechazados | Medium | Mapper backward-compat en guard; normalizar bootstrap |
| UI muestra opciones que dan 403 | Low | Navegación condicional + `tieneRol()` en layouts |

## Rollback Plan

1. Remover `RolesGuard` del array `APP_GUARD` en `app.module.ts`
2. Eliminar `roles.decorator.ts`, `roles.guard.ts` y sus tests
3. Revertir `ALLOWED_ROLES` y `bootstrapFirstUser()` a valores anteriores
4. Revertir frontend: restaurar textarea en `/usuarios`, eliminar página `/roles`, eliminar imports de `tieneRol()`

## Dependencies

Ninguna. Usa infraestructura existente (`Reflector`, `SetMetadata`, `AuthGuard`).

## Success Criteria

- [ ] Usuario sin rol `'administrador'` recibe 403 en POST/PATCH/PUT/DELETE
- [ ] GET endpoints accesibles para cualquier usuario autenticado
- [ ] `POST /auth/login` y `POST /auth/bootstrap` no bloqueados (`@Public()` respetado)
- [ ] `bootstrapFirstUser()` crea admin con rol `'administrador'`
- [ ] Frontend: links de admin ocultos para usuario estándar
- [ ] Frontend: selector de roles usa checkboxes con roles predefinidos
- [ ] Tests: 13 casos mínimo para `RolesGuard` (TDD)
