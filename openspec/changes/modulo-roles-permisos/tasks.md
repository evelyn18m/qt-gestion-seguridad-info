# Tasks: Módulo Roles con Control de Acceso a Nivel Endpoint

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550 (backend ~270 + frontend ~280) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Backend (roles guard + decorator + controller protection) → PR 2: Frontend (roles page, nav, useAuth) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend: decorator, guard, DTOs, controller protection, bootstrap role | PR 1 | ~270 lines, full backend TDD suite at end |
| 2 | Frontend: types, useAuth, roles page, nav, usuarios checkboxes | PR 2 | ~280 lines, depends on PR 1 for 403 testing |

## Phase 1: Backend Foundation — Decorator + Guard (TDD)

- [x] 1.1 Create `backend/src/auth/decorators/roles.decorator.ts` — `@Roles(...roles)` via SetMetadata with `ROLES_KEY`
- [x] 1.2 Write `backend/src/auth/roles.guard.spec.ts` — 13+ RED tests: @Public bypass, role match, role mismatch→403, legacy role normalization, missing roles→403, no @Roles→pass
- [x] 1.3 Implement `backend/src/auth/roles.guard.ts` — RolesGuard with `ROLE_MAP`, exported `normalizeRoles()`, respects `IS_PUBLIC_KEY`, throws `ForbiddenException`
- [x] 1.4 Run `docker compose exec backend npm run test -- roles.guard.spec` — all GREEN

## Phase 2: Backend Integration — Wire Guard + Protect Controllers

- [x] 2.1 Register `RolesGuard` as 2nd `APP_GUARD` in `backend/src/app.module.ts` (after AuthGuard)
- [x] 2.2 Export `RolesGuard` from `backend/src/auth/auth.module.ts`
- [x] 2.3 Update `bootstrapFirstUser()` in `backend/src/auth/auth.service.ts` — roles: `'administrador'` instead of `'admin'`
- [x] 2.4 Update `ALLOWED_ROLES` in `backend/src/usuarios/dto/create-usuario.dto.ts` and `update-usuario.dto.ts` — `['administrador','usuario']`
- [x] 2.5 Add `@Roles('administrador')` to POST/PATCH/DELETE in `backend/src/usuarios/usuarios.controller.ts`
- [x] 2.6 Add `@Roles('administrador')` to 6 mutators in `backend/src/catalogos/catalogos.controller.ts`
- [x] 2.7 Add `@Roles('administrador')` to POST/PATCH/calcularDetalleRiesgo/DELETE/recalcular in `backend/src/valoraciones/valoraciones.controller.ts`
- [x] 2.8 Add `@Roles('administrador')` to PUT in `backend/src/parametros/parametros.controller.ts`
- [x] 2.9 Add `@Roles('administrador')` to set-password in `backend/src/auth/auth.controller.ts`

## Phase 3: Frontend Types + Composable

- [x] 3.1 Create `frontend/types/roles.ts` — `ROLES_DISPONIBLES`, `ROLE_LABELS`, `FRONTEND_ROLE_MAP` constants
- [x] 3.2 Add `tieneRol(rol: string): boolean` to `frontend/composables/useAuth.ts` — parses JSON roles, normalizes via FRONTEND_ROLE_MAP, returns boolean

## Phase 4: Frontend UI — Pages + Navigation

- [x] 4.1 Create `frontend/pages/roles.vue` — role definitions table (static) + user-role assignment matrix fetched from `/usuarios`
- [x] 4.2 Refactor `frontend/pages/usuarios.vue` edit modal: replace textarea with checkboxes using `ROLES_DISPONIBLES`
- [x] 4.3 Wrap admin-only nav links (`/parametrizacion`, `/usuarios`, `/roles`) in `v-if="auth.tieneRol('administrador')"` in `frontend/layouts/default.vue`
- [x] 4.4 Add 403 handling: show "No tenés permisos para realizar esta acción" when API returns 403 in components using `useApi()`

## Phase 5: Verification

- [x] 5.1 Run full backend test suite: `docker compose exec backend npm run test`
- [x] 5.2 Run TypeScript check: `docker compose exec backend npx tsc --noEmit`
- [x] 5.3 Verify frontend compiles: `docker compose exec frontend npm run dev` (check for compilation errors)
- [x] 5.4 Manual smoke test: login as administrador → verify all pages, login as usuario → verify 403 on mutating actions + admin links hidden
