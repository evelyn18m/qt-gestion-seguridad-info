# Tasks: Módulo Usuarios (Keycloak Read-Only)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~410 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Foundation

- [ ] 1.1 Create `backend/src/usuarios/dto/usuario.dto.ts` — `UsuarioDto` class with id, username, email, firstName, lastName, enabled, roles: string[]
- [ ] 1.2 Create `backend/src/usuarios/usuarios.module.ts` — non-global feature module registering UsuariosService + UsuariosController
- [ ] 1.3 Add `Usuario` interface to `frontend/types/api.d.ts` — id, username, email, firstName, lastName, enabled, roles
- [ ] 1.4 Add `KEYCLOAK_ADMIN_URL`, `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD`, `KEYCLOAK_REALM` to `docker-compose.yml` backend env vars

## Phase 2: Core Implementation

- [ ] 2.1 Create `backend/src/usuarios/usuarios.service.ts` — `findAll()` with native `fetch()`: lazy token auth (POST password grant), users fetch (`GET /admin/realms/{realm}/users?briefRepresentation=false`), retry-on-401, error mapping (502 unreachable, 500 auth failure, 200+[] empty realm)
- [ ] 2.2 Create `backend/src/usuarios/usuarios.controller.ts` — `@Controller('usuarios')`, `@Get()` delegates to service, returns `UsuarioDto[]` (protected by existing `APP_GUARD`)

## Phase 3: Integration

- [ ] 3.1 Import `UsuariosModule` in `backend/src/app.module.ts` imports array
- [ ] 3.2 Insert "Usuarios" `<NuxtLink to="/usuarios">` in `frontend/layouts/default.vue` sidebar between Parametrización (L119) and Auditoría (L120), with `active-class="active"` + `@click="closeSidebar"`
- [ ] 3.3 Create `frontend/pages/usuarios.vue` — table (Username, Email, Nombre, Roles comma-joined, Estado badge), `useApi().get<Usuario[]>('/usuarios')` in `onMounted`, loading spinner, error message, empty state "No se encontraron usuarios"

## Phase 4: Testing

- [ ] 4.1 Create `backend/src/usuarios/usuarios.service.spec.ts` — mock `global.fetch` via `jest.fn()`, scenarios: successful fetch, 401 → retry succeeds, 401 → retry fails → 500, network error → 502, auth failure → 500, empty realm → 200+[]
- [ ] 4.2 Create `backend/src/usuarios/usuarios.controller.spec.ts` — mock UsuariosService, verify `findAll()` delegates and returns DTO array
- [ ] 4.3 Smoke test: `docker compose exec backend npm run test` passes + navigate `/usuarios` in browser → all states render

## Dependency Graph

```
1.1 ─┬─▶ 2.1 ──▶ 2.2 ──▶ 3.1
1.2 ─┘                      │
1.3 ──────────▶ 3.3 ◀──────┘
1.4 ──▶ 2.1           3.2 (independent — insert between existing sidebar links)

4.1 depends on 2.1
4.2 depends on 2.2
4.3 depends on all
```

## Implementation Order

1. **Phase 1** (1.1∥1.2∥1.3∥1.4) — parallel, no cross-dependencies
2. **Phase 2** (2.1 → 2.2) — sequential, controller depends on service
3. **Phase 3** (3.1 → 3.2∥3.3) — wire module, then sidebar+page in parallel
4. **Phase 4** (4.1∥4.2 → 4.3) — tests parallel, then smoke

## Parallelization Opportunities

| Group | Tasks | Reason |
|-------|-------|--------|
| P1 | 1.1, 1.2, 1.3, 1.4 | All create independent artifacts |
| P2 | 3.2, 3.3 | Sidebar link + page are independent of backend wiring (3.1 done) |
| P3 | 4.1, 4.2 | Service spec and controller spec are independent |
