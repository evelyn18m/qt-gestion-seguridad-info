# Tasks: Autenticación híbrida Keycloak + local

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,000–1,100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: backend (Fases 1–3, ~425 líneas) → PR 2: frontend (Fases 4–5, ~320) → PR 3: tests (Fase 6, ~280) |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + auth local + usuarios CRUD | PR 1 | Base: `feature/hybrid-auth-local-users`; autónomo con tests unit incluidos |
| 2 | Login page, modal set-password, useAuth, navegación | PR 2 | Depende de PR 1 para contrato API; smoke test manual |
| 3 | Integration e2e + cobertura restante | PR 3 | Depende de PR 2; full-stack verification |

## Phase 1: Infraestructura y Schema

- [x] 1.1 Agregar modelo `Usuario` en `backend/prisma/schema.prisma`: id UUID, keycloakSub unique?, username unique, email, passwordHash nullable, primerInicio default true, habilitado default true, roles JSON string, timestamps. Ejecutar `docker compose exec backend npx prisma db push`.
- [x] 1.2 Agregar `JWT_SECRET` (256-bit random) a `backend/.env` y `docker-compose.yml`.
- [x] 1.3 `docker compose exec backend npm install bcrypt passport-local @types/bcrypt @types/passport-local`.

## Phase 2: Backend — Auth local

- [x] 2.1 Crear `backend/src/auth/local.strategy.ts`: passport-local, bcrypt compare contra PrismaService. 401 credenciales inválidas, 403 si `primerInicio: true` (spec: local-auth Escenarios login).
- [x] 2.2 Crear `backend/src/auth/local-jwt.strategy.ts`: passport-jwt HS256 (`JWT_SECRET`), payload con `sub`, `username`, `email`, `roles`, `source: 'local'` (spec: auth-backend Escenario local token).
- [x] 2.3 Modificar `backend/src/auth/auth.guard.ts`: guarda compuesto — intenta "jwt-keycloak" (JWKS), fallback "jwt-local" (HMAC); 401 si ambas fallan (spec: auth-backend Escenarios Keycloak/Local/Invalid).
- [x] 2.4 Crear `backend/src/auth/auth.controller.ts`: `POST /auth/login` (público, emite JWT HS256 + payload usuario), `POST /auth/set-password` (autenticado, bcrypt hash + `primerInicio=false`). 403 si primerInicio al login (spec: auth-backend Requisitos login/set-password).
- [x] 2.5 Crear `backend/src/auth/sync.interceptor.ts`: si `req.user.source === 'keycloak'`, upsert Usuario por `keycloakSub` con email/username/roles del JWT. Nuevo → `primerInicio: true` (spec: local-auth Escenarios sync).
- [x] 2.6 Actualizar `backend/src/auth/auth.module.ts`: registrar LocalStrategy, LocalJwtStrategy, AuthController, SyncInterceptor, PrismaService.

## Phase 3: Backend — Usuarios CRUD local

- [x] 3.1 Reescribir `backend/src/usuarios/usuarios.service.ts`: CRUD Prisma sobre tabla `Usuario`, excluir `passwordHash` vía `select`. Eliminar dependencia de `@keycloak/keycloak-admin-client` (spec: local-usuarios-crud Escenario no admin-client).
- [x] 3.2 Actualizar `backend/src/usuarios/usuarios.controller.ts`: agregar `POST`, `PATCH /:id`, `DELETE /:id`, proteger con `JwtAuthGuard` compuesto (spec: local-usuarios-crud Escenarios CRUD).
- [x] 3.3 Crear/actualizar DTOs en `backend/src/usuarios/dto/`: CreateUsuarioDto (username, email), UpdateUsuarioDto (email, habilitado, roles), sin campo passwordHash.

## Phase 4: Frontend — Tipos y estado

- [x] 4.1 Agregar interfaz `Usuario` en `frontend/types/api.ts`: id, keycloakSub, username, email, primerInicio, habilitado, roles — sin passwordHash (spec: frontend-api-consumption Requisito Usuario Type).
- [x] 4.2 Extender `frontend/composables/useAuth.ts`: `loginLocal(credentials)`, `setPassword(password)`, `primerInicio`, `usuario` (Ref<Usuario\|null>), sesión dual (sessionStorage para JWT local, keycloak-js para OIDC), `logout()` unificado (spec: auth-frontend Requisitos session/logout/loginLocal).
- [x] 4.3 Actualizar `frontend/composables/useApi.ts`: adjuntar `Authorization: Bearer <token>` desde `useAuth().token` sin condicionar fuente (spec: frontend-api-consumption Requisito Auth Header).

## Phase 5: Frontend — UI y navegación

- [x] 5.1 Crear `frontend/pages/login.vue`: formulario local (username+password) + botón "Ingresar con Keycloak", redirigir autenticados a `/` (spec: frontend-navigation Requisito /login; auth-frontend Requisito Dual-Entry).
- [x] 5.2 Crear `frontend/components/SetPasswordModal.vue`: modal si `primerInicio: true`, input password min 8 chars, llama `POST /auth/set-password`, cierra en 200 (spec: auth-frontend Requisito Set-Password Modal).
- [x] 5.3 Modificar `frontend/app.vue`: middleware redirect no autenticados → `/login`, usuarios `primerInicio: true` restringidos hasta set-password (spec: frontend-navigation Requisitos Auth-State-Driven).
- [x] 5.4 Modificar `frontend/layouts/default.vue`: usar `usuario` de `useAuth()` para display en header (spec: frontend-api-consumption Requisito Usuario type).

## Phase 6: Testing

- [x] 6.1 Unit: `LocalStrategy.validate()` — bcrypt compare paths, `AuthController.login/setPassword` — mock AuthService, `LocalJwtStrategy.validate()` — HMAC decode (spec: local-auth Escenarios 1-3; auth-backend login/set-password/local token).
- [x] 6.2 Unit: `AuthGuard` compuesto — JWKS-first + HMAC fallback, `SyncInterceptor` — upsert new/existing (spec: auth-backend Escenarios guard; local-auth Escenarios sync).
- [x] 6.3 Integration e2e: `POST /auth/login` → JWT local → `GET /api/usuarios` acepta token + Keycloak token → sync → usuario creado con `primerInicio: true` (spec: local-auth Escenarios login/sync; auth-backend Escenarios).
- [x] 6.4 Integration e2e: CRUD `/usuarios` — POST 201, GET 200 (sin passwordHash), PATCH 200, DELETE 204 (spec: local-usuarios-crud todos los Escenarios).
- [x] 6.5 Ejecutar `docker compose exec backend npm run test` y `docker compose exec backend npx tsc --noEmit` — todo verde.
