# Design: Módulo Usuarios (Keycloak Read-Only)

## Technical Approach

Proxy the Keycloak Admin REST API from the NestJS backend using Node 22's native `fetch()`. No additional npm dependency. The service authenticates via `POST /realms/{realm}/protocol/openid-connect/token` (password grant) on first request and caches the token. On 401, it re-authenticates and retries once. Users include realm roles via `?briefRepresentation=false`.

## Architecture Decisions

### Decision 1: Direct fetch vs Keycloak Admin Client

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `@keycloak/keycloak-admin-client` | Official, typed; ESM-only — requires `import()` hacks in CJS NestJS build (tsconfig `module: nodenext` + no `"type": "module"` → emits `require()` → runtime `ERR_REQUIRE_ESM`) | Rejected |
| Direct `fetch()` to Keycloak REST API | Zero deps, full control, Node 22 native, trivial mock for tests, proposal explicitly lists this as fallback | **Chosen** |

**Rationale**: The backend `tsconfig.json` uses `module: nodenext` without `"type": "module"` in `package.json`. TypeScript emits `require()` calls. The admin client package is ESM-only — would fail at runtime. Dynamic `import()` workarounds add fragility. Direct `fetch()` is 30 lines and provably correct across environments.

### Decision 2: Token lifecycle

**Choice**: Authenticate lazily on first `findAll()` call, cache token in memory. On 401 response from Keycloak, re-authenticate and retry once.
**Alternatives**: Per-request auth (adds latency), cron refresh (over-engineered for internal tool with <20 users).
**Rationale**: Retry-on-401 handles token expiry cleanly without complexity. Single mutable token cache is sufficient for this read-only proxy.

### Decision 3: Roles inclusion

**Choice**: Pass `?briefRepresentation=false` to Keycloak `GET /admin/realms/{realm}/users` — includes `realmRoles[]` in each user representation.
**Alternatives**: N+1 per-user role-mapping calls (slow), omit roles (loss of important data).
**Rationale**: Single request, complete data. <20 users — payload size is negligible.

## Data Flow

```
Frontend (usuarios.vue) ──useApi()──▶ Backend GET /usuarios
                                          │
                                 UsuariosController
                                          │
                                 UsuariosService.findAll()
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │ 1. Auth (if no token or 401)              │
                    │    POST /realms/quito-turismo/protocol/   │
                    │         openid-connect/token              │
                    │ 2. Fetch users                            │
                    │    GET /admin/realms/quito-turismo/       │
                    │        users?briefRepresentation=false    │
                    └─────────────────────┬─────────────────────┘
                                          │
                              Map → UsuarioDto[]
                              (id, username, email,
                               firstName, lastName,
                               enabled, realmRoles)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/usuarios/dto/usuario.dto.ts` | Create | `UsuarioDto` class — id, username, email, firstName, lastName, enabled, roles |
| `backend/src/usuarios/usuarios.service.ts` | Create | `findAll()` — fetch users from Keycloak REST API, token auth + retry |
| `backend/src/usuarios/usuarios.controller.ts` | Create | `@Controller('usuarios')`, `@Get()` returns `UsuarioDto[]` |
| `backend/src/usuarios/usuarios.module.ts` | Create | Feature module (non-global), registers controller + service |
| `backend/src/usuarios/usuarios.service.spec.ts` | Create | Unit tests mocking `global.fetch` |
| `backend/src/app.module.ts` | Modify | Add `UsuariosModule` to `imports` array |
| `docker-compose.yml` | Modify | Add 4 `KEYCLOAK_ADMIN_*` env vars to `backend` service |
| `frontend/pages/usuarios.vue` | Create | Table: Usuario, Email, Nombre, Roles, Estado + loading/error/empty states |
| `frontend/layouts/default.vue` | Modify | Insert "Usuarios" `<NuxtLink>` between Parametrización and Auditoría |
| `frontend/types/api.d.ts` | Modify | Add `Usuario` interface |

## Interfaces / Contracts

```typescript
// backend/src/usuarios/dto/usuario.dto.ts
export class UsuarioDto {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  roles: string[];
}

// frontend/types/api.d.ts (addition)
export interface Usuario {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  roles: string[];
}
```

## Error Handling Matrix

| Scenario | HTTP | Behavior |
|----------|------|----------|
| Keycloak unreachable | 502 Bad Gateway | Catch `fetch` network error, log, throw `HttpException(502, 'Keycloak no disponible')` |
| Admin auth fails | 500 Internal Server Error | Log the failure reason, throw `HttpException(500, 'Error de autenticación con Keycloak')` |
| Token expired → 401 on users fetch | Retry once | Re-authenticate, retry `findAll()`; if still 401 → 500 |
| Empty realm (0 users) | 200 OK | Return `[]` |
| Unauthenticated request | 401 Unauthorized | Handled by existing `APP_GUARD` (AuthGuard) |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Service — successful fetch, 401 retry, network error, empty realm, auth failure | `jest.fn()` mock of `global.fetch`, `Test.createTestingModule` following existing `audit.service.spec.ts` pattern |
| Unit | Controller — returns service result, delegates to service | Mock `UsuariosService`, verify `@Get()` handler |
| Frontend | Page renders loading/error/empty/data states | Manual smoke test (no frontend test runner configured) |

## Migration / Rollout

No migration required. Rollback: remove `UsuariosModule` from `app.module.ts`, delete `backend/src/usuarios/`, remove sidebar link + page from frontend, remove env vars from docker-compose.

## Open Questions

None — all technical decisions resolved.
