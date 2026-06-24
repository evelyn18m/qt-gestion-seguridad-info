# Proposal: Autenticación híbrida Keycloak + local

## Intent

Agregar autenticación local (username/password + bcrypt + JWT propio) que coexista con Keycloak OIDC. Al primer login Keycloak, el usuario se sincroniza a una tabla local `Usuario`, configura contraseña, y desde entonces puede loguearse sin depender de Keycloak. El módulo `usuarios` evoluciona de proxy read-only a CRUD completo + sincronización.

## Scope

### In Scope
- Modelo `Usuario` en Prisma: id, keycloakSub, username, email, passwordHash, primerInicio, habilitado, roles, timestamps
- `POST /auth/login` — login local con bcrypt, emite JWT firmado con `JWT_SECRET`
- `POST /auth/set-password` — establece contraseña en primer inicio, marca `primerInicio: false`
- `JwtAuthGuard` compuesto: acepta JWT Keycloak (JWKS) o local (HMAC)
- `UsuariosModule`: CRUD completo sobre tabla local + interceptor de sincronización Keycloak→local
- Frontend: página `/login` (formulario + botón "Ingresar con Keycloak"), modal set-password post-login, `useAuth` extendido

### Out of Scope
- Fase 2: unificar todos los JWT bajo emisión propia del backend
- Refresh tokens para JWT local
- Gestión de roles desde UI local
- Migrar referencias `AuditLog.usuarioId` a IDs locales
- Tests automatizados de frontend

## Capabilities

### New Capabilities
- `local-auth`: login local con bcrypt + JWT propio, guard compuesto, endpoint set-password, interceptor sync Keycloak→local
- `local-usuarios-crud`: CRUD completo de usuarios locales, reemplaza proxy Keycloak read-only actual

### Modified Capabilities
- `auth-backend`: validación JWT extendida a tokens Keycloak (JWKS) Y locales (HMAC)
- `auth-frontend`: entrada dual (local + Keycloak), flujo set-password, detección primerInicio
- `frontend-navigation`: ruta pública `/login`, navegación condicionada por estado auth
- `frontend-api-consumption`: tipo `Usuario` extendido, passwordHash excluido de responses

## Approach

Híbrido pragmático (Fase 1):
1. Nuevo modelo Prisma + migración
2. `LocalStrategy` (passport-local) + endpoints `/auth/login`, `/auth/set-password`
3. Guard compuesto: intenta Keycloak JWKS → fallback a HMAC local
4. Interceptor sync: cada request autenticado con Keycloak upsert `Usuario` por `keycloakSub`
5. `UsuariosModule`: CRUD local, elimina dependencia de `@keycloak/keycloak-admin-client`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | **New** | Modelo `Usuario` |
| `backend/src/auth/` | Modified | LocalStrategy, `/auth/login`, `/auth/set-password`, guard compuesto |
| `backend/src/usuarios/` | Modified | CRUD local + interceptor sync; elimina admin-client |
| `backend/src/app.module.ts` | Modified | Nuevos providers, APP_GUARD condicional |
| `backend/.env` / `docker-compose.yml` | Modified | Variable `JWT_SECRET` |
| `frontend/pages/login.vue` | **New** | Login dual-entry |
| `frontend/components/SetPasswordModal.vue` | **New** | Modal primer inicio |
| `frontend/composables/useAuth.ts` | Modified | Estado dual, flag primerInicio |
| `frontend/layouts/default.vue` | Modified | Adaptar display a modelo local |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dos vectores de validación JWT | Med | Guard compuesto secuencial; strict issuer/audience por tipo |
| Divergencia de roles Keycloak vs local | Med | Sync interceptor refresca roles en cada login Keycloak |
| `JWT_SECRET` filtrado | Low | `.env` gitignored; HS256 con secret 256-bit |
| Ruptura referencias `AuditLog.usuarioId` | Low | Mantener `usuarioId` como string (UUID Keycloak) |

## Rollback Plan

Eliminar modelo `Usuario` (prisma db push), quitar LocalStrategy + endpoints `/auth/login` y `/auth/set-password`, revertir guard a Keycloak-only, restaurar proxy Keycloak en UsuariosModule, eliminar `/login` y modal set-password, restaurar `useAuth` desde git, quitar `JWT_SECRET`. Sin migración irreversible.

## Dependencies

- Keycloak en Docker network (existente)
- Nuevos npm: `bcrypt`, `passport-local`

## Success Criteria

- [ ] `POST /auth/login` con credenciales válidas → JWT; inválidas → 401
- [ ] Usuario Keycloak nuevo → `Usuario` local creado automáticamente con `primerInicio: true`
- [ ] `POST /auth/set-password` → hash bcrypt, `primerInicio: false`
- [ ] `GET /api/*` acepta JWTs Keycloak Y locales
- [ ] `GET/POST/PATCH/DELETE /usuarios` opera sobre tabla local
- [ ] `/login` renderiza formulario + botón Keycloak
- [ ] Modal set-password aparece post-primer-login Keycloak
- [ ] `docker compose exec backend npm run test` → todo verde
- [ ] `docker compose exec backend npx tsc --noEmit` → sin errores
