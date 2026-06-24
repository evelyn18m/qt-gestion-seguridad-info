# Design: Autenticación híbrida Keycloak + local

## Technical Approach

Extender el `AuthGuard` actual (passport-jwt + jwks-rsa) a un **guarda compuesto** que intente Keycloak JWKS primero y haga fallback a HMAC (`JWT_SECRET`). Agregar `POST /auth/login` (passport-local + bcrypt) y `POST /auth/set-password` en un nuevo `AuthController`. Reemplazar el proxy Keycloak de `UsuariosService` por CRUD sobre tabla `Usuario` (Prisma). En frontend: página `/login` dual-entry, modal set-password, `useAuth` extendido, y navegación condicionada por `primerInicio`.

## Architecture Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Composite guard strategy | A) Custom guard chain; B) Single strategy with switching | **A** | NestJS-passport idiomático: dos `PassportStrategy` ("jwt-keycloak" + "jwt-local"), guard compuesto intenta primero, fallback al segundo. Isolation clara para testing. |
| Local JWT signing | HS256 | **HS256** | Simplicidad: simétrico, sin distribución de claves. `JWT_SECRET` ya es suficiente. RS256 se pospone a Fase 2. |
| Sync interceptor trigger | A) NestJS interceptor; B) Passport callback; C) Guard hook | **A** | Interceptor post-guard: `req.user` ya poblado con `iss` identificable. Misma firma que `AuditInterceptor`. |
| `roles` storage | A) JSON string; B) Join table | **A** | El spec pide roles sincronizados del token Keycloak y no hay queries por rol. JSON string evita migración de join table. |
| Frontend token storage | A) sessionStorage; B) localStorage; C) cookie | **A** | sessionStorage se limpia al cerrar pestaña, evita persistencia cross-session de JWTs locales. Coherente con `onLoad: 'check-sso'` de Keycloak. |
| `passwordHash` exclusion | A) ClassSerializerInterceptor; B) DTO mapping; C) Prisma `select` | **C** | `{ select: { passwordHash: false } }` en queries: explícito, sin reflection, sin riesgo de leak. |

## Data Flow

```
 ┌──────────┐    POST /auth/login      ┌──────────────────┐
 │  /login  │ ─────────────────────────→│  AuthController   │
 │ (local)  │ ←── JWT (HS256) ────────│  ┌──────────────┐ │
 └──────────┘                          │  │LocalStrategy (│ │
                                       │  │ passport-local│ │
 ┌──────────┐  OIDC redirect           │  └──────────────┘ │
 │ Keycloak │ ←────────────────────── │  │LocalJwtStrategy│ │
 │  login   │ ─── code → token ──────→│  │(HMAC/HS256)   │ │
 └──────────┘                          │  └──────────────┘ │
                                       │  ┌──────────────┐ │
     Cada request autenticado ──────→ │  │JwtStrategy    │ │
                                       │  │(JWKS Keycloak)│ │
                                       │  └──────────────┘ │
                                       │       ↓            │
                                       │ AuthGuard(composite)│
                                       │   try JWKS first    │
                                       │   → fallback HMAC   │
                                       │       ↓            │
                                       │ SyncInterceptor     │
                                       │ (upsert Usuario)    │
                                       └──────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | Agregar modelo `Usuario` |
| `backend/src/auth/auth.controller.ts` | **Create** | `POST /auth/login`, `POST /auth/set-password` |
| `backend/src/auth/local.strategy.ts` | **Create** | passport-local: valida username+password con bcrypt |
| `backend/src/auth/local-jwt.strategy.ts` | **Create** | passport-jwt HMAC para tokens locales |
| `backend/src/auth/auth.guard.ts` | Modify | Guarda compuesto: intenta "jwt-keycloak", fallback a "jwt-local" |
| `backend/src/auth/auth.module.ts` | Modify | Registrar nuevas strategies, controller, sync interceptor |
| `backend/src/auth/sync.interceptor.ts` | **Create** | Keycloak→local upsert por `keycloakSub` |
| `backend/src/usuarios/usuarios.service.ts` | Modify | Reemplazar proxy Keycloak por Prisma CRUD |
| `backend/src/usuarios/usuarios.controller.ts` | Modify | Agregar POST, PATCH, DELETE |
| `backend/src/usuarios/dto/*.ts` | Modify | DTOs para crear/actualizar Usuario (sin passwordHash) |
| `backend/.env` / `docker-compose.yml` | Modify | Agregar `JWT_SECRET` |
| `frontend/pages/login.vue` | **Create** | Form local + botón Keycloak |
| `frontend/components/SetPasswordModal.vue` | **Create** | Modal primer inicio |
| `frontend/composables/useAuth.ts` | Modify | `loginLocal()`, `setPassword()`, `primerInicio`, token local |
| `frontend/composables/useApi.ts` | Modify | Soportar token local (sin `updateToken` Keycloak) |
| `frontend/types/api.d.ts` | Modify | Nuevo `Usuario` type; eliminar `passwordHash` |
| `frontend/layouts/default.vue` | Modify | Usar `usuario` de `useAuth()` (modelo local) |
| `frontend/app.vue` | Modify | Redirigir no autenticados a `/login` |

## Interfaces / Contracts

**Prisma — Modelo Usuario**:
```prisma
model Usuario {
  id           String   @id @default(uuid())
  keycloakSub  String?  @unique
  username     String   @unique
  email        String   @default("")
  passwordHash String?  // bcrypt, nullable hasta set-password
  primerInicio Boolean  @default(true)
  habilitado   Boolean  @default(true)
  roles        String   @default("[]") // JSON array
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**POST /auth/login** (público):
```json
// Request: { "username": "string", "password": "string" }
// 200: { "access_token": "<jwt>", "usuario": { id, username, email, roles } }
// 401: { "statusCode": 401, "message": "Unauthorized" }
// 403: { "message": "Debe configurar su contraseña" }  // primerInicio
```

**POST /auth/set-password** (requiere auth):
```json
// Request: { "password": "string" }  // min 8 chars
// 200: { "message": "Contraseña configurada" }
// 400: { "message": "La contraseña ya fue configurada" }
```

**Composite Guard user shape** (req.user):
```ts
interface AuthUser {
  userId: string;    // sub (Keycloak) o id (local)
  username: string;
  email: string;
  roles: string[];
  source: 'keycloak' | 'local';
}
```

**SyncInterceptor trigger condition**: `req.user.source === 'keycloak'`. Lee `sub`, `preferred_username`, `email`, `realm_access.roles` del JWT original (guarda el raw token en request para acceso).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `LocalStrategy.validate()` — bcrypt compare, 401/403 paths | Jest mock de PrismaService |
| Unit | `LocalJwtStrategy.validate()` — HMAC decode, payload extraction | Jest con token firmado inline |
| Unit | `AuthGuard` composite — JWKS-first, HMAC fallback | Mock ambas strategies |
| Unit | `SyncInterceptor` — upsert new/existing, primerInicio flag | Mock Prisma, simulate req.user |
| Unit | `AuthController.login/setPassword` | Mock AuthService |
| Integration | `POST /auth/login` → JWT → `GET /api/*` aceptado | supertest e2e |
| Integration | Keycloak token → sync → `GET /usuarios` devuelve registro local | supertest con JWT Keycloak mock |
| Integration | `CRUD /usuarios` — 201/200/204 respuestas, passwordHash ausente | supertest e2e |

## Migration / Rollout

- **DB**: `prisma db push` — sin migración irreversible (modelo nuevo, no modifica tablas existentes)
- **Env**: Agregar `JWT_SECRET` (256-bit random) en `.env` y `docker-compose.yml`
- **Rollback**: Eliminar modelo `Usuario`, quitar LocalStrategy + endpoints, revertir guard a Keycloak-only, restaurar proxy Keycloak en UsuariosService, borrar `/login` y modal, quitar `JWT_SECRET`. Sin pérdida de datos de negocio.

## Open Questions

- [ ] ¿Rotación de `JWT_SECRET`? Fuera de scope Fase 1, considerar para Fase 2 con RS256.
- [ ] ¿Expiración de tokens locales? Fase 1 sin refresh tokens; definir TTL en Fase 2.
