# Tasks: Keycloak User Sync

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~430-490 (3 new + 6 modified files) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1: KeycloakModule (new isolated code) → PR2: UsuariosService sync + wiring |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | KeycloakModule + AdminService (new files, zero impact on existing) | PR 1 | `backend/src/keycloak/` only; isolated; tests included |
| 2 | UsuariosService sync + module wiring + DTO + interceptor | PR 2 | Modifies existing modules; depends on PR 1 |

## Phase 1: Foundation

- [x] 1.1 Add `@nestjs/axios` + `axios` to `backend/package.json` dependencies
- [x] 1.2 Create `backend/src/keycloak/keycloak.module.ts` — `@Global()`, imports `HttpModule`, exports `KeycloakAdminService`
- [x] 1.3 Create `backend/src/keycloak/keycloak-admin.service.ts` — skeleton `@Injectable()` with `HttpService` + `Logger` injected, empty public methods

## Phase 2: KeycloakAdminService TDD

- [x] 2.1 RED: Create `backend/src/keycloak/keycloak-admin.service.spec.ts` — mock `HttpService` with `jest.fn()`, write failing tests: `getAdminToken()` cache + 401 refresh, `createUser()` returns UUID, `findUserByUsername()` returns user or null, `assignClientRoles()` maps roles via client UUID, `deleteUser()`, `getClientUuid()` cached
- [x] 2.2 GREEN: Implement `KeycloakAdminService` — password grant to master realm, `Map` token cache, user CRUD via REST `POST/GET/DELETE /admin/realms/{realm}/users`, client UUID resolution `/admin/realms/{realm}/clients`, role mapping via `POST/DELETE /admin/realms/{realm}/users/{id}/role-mappings/clients/{clientUuid}`. Env vars: `KEYCLOAK_ADMIN_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD`.
- [x] 2.3 Verify: `docker compose exec backend npm run test -- keycloak-admin` passes

## Phase 3: UsuariosService Sync TDD

- [x] 3.1 RED: Add tests to `backend/src/usuarios/usuarios.service.spec.ts` — mock `KeycloakAdminService`; `create()` calls `createUser` + saves `keycloakSub`; `update()` syncs email/enabled/roles if `keycloakSub` exists; `delete()` calls `deleteUser` if `keycloakSub`; best-effort: KC throws → local op succeeds, 201 returned
- [x] 3.2 GREEN: Implement sync in `backend/src/usuarios/usuarios.service.ts` — inject `KeycloakAdminService` + `Logger`; `create()` → `createUser()` → `prisma.usuario.update({ keycloakSub })` → `assignClientRoles()`, all in try/catch; `update()` → if `keycloakSub`: PUT user + assignRoles in try/catch; `delete()` → if `keycloakSub`: `deleteUser()` in try/catch. Never reject.
- [x] 3.3 Verify: `docker compose exec backend npm run test -- usuarios` passes

## Phase 4: Wiring + DTO + Validation

- [x] 4.1 Wire `SyncInterceptor` as `APP_INTERCEPTOR` in `backend/src/auth/auth.module.ts` — add `{ provide: APP_INTERCEPTOR, useClass: SyncInterceptor }`, import `APP_INTERCEPTOR` from `@nestjs/core`
- [x] 4.2 Import `KeycloakModule` in `backend/src/usuarios/usuarios.module.ts`
- [x] 4.3 Add `@IsOptional() @IsString({ each: true }) roles?: string[]` to `backend/src/usuarios/dto/create-usuario.dto.ts`
- [x] 4.4 Add role validation guard/validator rejecting unknown roles (only `administradoregsi`, `usuarioegsi` allowed) → 400 on invalid

## Phase 5: Final Verification

- [x] 5.1 Full test suite: `docker compose exec backend npm run test` — all specs pass, no regressions
- [x] 5.2 Type check: `docker compose exec backend npx tsc --noEmit` — zero errors in changed files, pre-existing errors in unrelated spec files only
