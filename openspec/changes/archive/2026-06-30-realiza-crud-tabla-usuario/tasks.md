# Tasks: CRUD Tabla de Usuario (Backend + Frontend)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~310 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (under budget) |
| Delivery strategy | single-pr |
| Chain strategy | N/A |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend password gen + tests | PR 1 | Self-contained: service spec, controller spec, service impl |
| 2 | Frontend CRUD modals | PR 1 | Depends on Unit 1 response shape; same PR, single commit |

## Phase 1: Backend — Password Generation (RED → GREEN → REFACTOR)

- [x] 1.1 RED: `usuarios.service.spec.ts` — add test: `create()` returns `{ usuario, contraseñaGenerada }`
- [x] 1.2 RED: `usuarios.service.spec.ts` — add test: contraseñaGenerada bcrypt-verifiable against stored `passwordHash`
- [x] 1.3 RED: `usuarios.service.spec.ts` — add test: two create() calls produce different contraseñaGenerada
- [x] 1.4 RED: `usuarios.controller.spec.ts` — update POST test to expect `{ usuario, contraseñaGenerada }` shape
- [x] 1.5 GREEN: `usuarios.service.ts` — import `crypto`+`bcrypt`; in `create()`: `randomBytes(16)→hex`, `bcrypt.hash(10)`, set `primerInicio:true`, return `{ usuario, contraseñaGenerada }`
- [x] 1.6 REFACTOR: run `npm run test`, `npm run lint`, `npx tsc --noEmit`; verify all 4 new tests pass

## Phase 2: Frontend — CRUD UI

- [x] 2.1 `api.d.ts` — add `CreateUsuarioResponse: { usuario: Usuario; contraseñaGenerada: string }`
- [x] 2.2 `usuarios.vue` — add "+ Nuevo" toolbar button and "Acciones" column (edit/delete icons per row)
- [x] 2.3 `usuarios.vue` — build create modal: username + email fields, password banner (contraseñaGenerada) with `navigator.clipboard` copy button, submit disabled when fields empty
- [x] 2.4 `usuarios.vue` — build edit modal: email text, habilitado checkbox, roles textarea; `PATCH /usuarios/:id`
- [x] 2.5 `usuarios.vue` — build delete confirmation dialog; `DELETE /usuarios/:id` on confirm, no-op on cancel
- [x] 2.6 `usuarios.vue` — wire `fetchUsuarios()` after every create/edit/delete success

## Phase 3: Verification

- [x] 3.1 Run backend test suite: `docker compose exec backend npm run test`
- [x] 3.2 Run TypeScript check: `docker compose exec backend npx tsc --noEmit`
- [x] 3.3 Manual smoke: create user → copy password → edit email → delete; verify table auto-refreshes
