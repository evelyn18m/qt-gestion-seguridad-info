# Proposal: Keycloak User Sync

## Intent

Sincronización bidireccional usuarios locales ↔ Keycloak. Bug crítico: `SyncInterceptor` existe con tests pero nunca fue wireado como `APP_INTERCEPTOR` — el auto-provisioning (login Keycloak → crear local) está inactivo.

## Scope

### In Scope
- Wirear `SyncInterceptor` como `APP_INTERCEPTOR` (1 línea — activa auto-provisioning)
- Nuevo `KeycloakModule` con `KeycloakAdminService` (`@nestjs/axios` + Keycloak 24 REST API)
- `UsuariosService.create()` → crear también en Keycloak, guardar `keycloakSub`
- `UsuariosService.update()` → sincronizar roles/email/habilitado a Keycloak
- `UsuariosService.delete()` → eliminar de Keycloak
- Best-effort: operaciones locales no fallan si Keycloak no responde
- Validación de roles contra lista conocida: `administradoregsi`, `usuarioegsi`

### Out of Scope
- Sincronización inversa (cambios en Keycloak → local)
- Migración de usuarios existentes
- Soporte firstName/lastName (modelo local no los tiene)
- Service accounts (usar credenciales admin existentes)
- Cambios en frontend (modales ya soportan roles y contraseña generada)

## Capabilities

### New Capabilities
- `keycloak-admin-service`: Módulo de infraestructura — auth admin (password grant), CRUD usuarios, role-mapping a nivel cliente (`sgsi-app`), cache de token y client UUID.

### Modified Capabilities
- `local-usuarios-crud`: CRUD ahora dispara sync a Keycloak vía `KeycloakAdminService`. El requerimiento "Remove Keycloak Admin-Client Dependency" se reemplaza: la dependencia de `@keycloak/keycloak-admin-client` sigue eliminada, pero se agrega comunicación REST vía `@nestjs/axios`. Contraseña generada en `create()` se setea también en Keycloak.
- `local-auth`: Requerimiento "Keycloak→Local Sync Interceptor" ya especificado pero NO implementado. Se corrige wireando `SyncInterceptor` como `APP_INTERCEPTOR`.

## Approach

1. **Wire fix**: `{ provide: APP_INTERCEPTOR, useClass: SyncInterceptor }` en `auth.module.ts`.
2. **KeycloakModule** (`backend/src/keycloak/`): `KeycloakAdminService` — `getAdminToken()` (password grant → master realm), `createUser()`, `findUserByUsername()`, `assignClientRoles()`, `deleteUser()`, `getClientUuid()`. Token + UUID cacheados.
3. **UsuariosService**: `create` → POST Keycloak + guarda `keycloakSub`. `update` → PUT/POST Keycloak (email, enabled, roles). `delete` → DELETE Keycloak. Todo en try/catch + `logger.warn` (no reject).
4. **Roles**: validar contra `['administradoregsi', 'usuarioegsi']` antes de asignar; mapeo `string[]` ↔ client roles.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/auth/auth.module.ts` | Modified | Wire SyncInterceptor (APP_INTERCEPTOR) |
| `backend/src/keycloak/` | New | KeycloakModule, KeycloakAdminService, tests |
| `backend/src/usuarios/usuarios.service.ts` | Modified | create/update/delete → sync a Keycloak |
| `backend/src/usuarios/usuarios.module.ts` | Modified | Importar KeycloakModule |
| `backend/src/usuarios/dto/` | Modified | create-usuario.dto: agregar `roles?: string[]` |
| `backend/package.json` | Modified | Agregar @nestjs/axios, axios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Keycloak caído bloquea operaciones locales | Low | try/catch + log warning; operación local siempre commitea |
| Username duplicado entre sistemas | Med | Pre-check `findUserByUsername()`; 409 si existe |
| Roles inválidos enviados a Keycloak | Med | Validar contra lista conocida; 400 si rol desconocido |
| Overhead SyncInterceptor por request | Low | Upsert con unique key es O(log n); insignificante |

## Rollback Plan

Remover `APP_INTERCEPTOR` de `auth.module.ts` → vuelve a provider simple. Remover `KeycloakModule` import de `usuarios.module.ts`. Revertir `UsuariosService` a versiones pre-sync. Opcional: `npm uninstall @nestjs/axios axios`.

## Dependencies

- `@nestjs/axios` + `axios` (nuevas dependencias npm)
- Keycloak 24 corriendo (ya en docker-compose)
- Variables de entorno ya configuradas

## Success Criteria

- [ ] SyncInterceptor activo: login Keycloak → usuario creado/actualizado localmente
- [ ] `POST /usuarios` crea usuario en Keycloak con `keycloakSub` guardado
- [ ] `PATCH /usuarios/:id` sincroniza roles/email/habilitado a Keycloak
- [ ] `DELETE /usuarios/:id` elimina de Keycloak
- [ ] Keycloak caído no bloquea CRUD local (best-effort)
- [ ] Tests unitarios: KeycloakAdminService con HttpService mockeado
- [ ] Tests UsuariosService cubren integración con KeycloakAdminService
- [ ] `docker compose exec backend npm run test` pasa completo
