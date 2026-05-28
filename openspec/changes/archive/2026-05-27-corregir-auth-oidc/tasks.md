# Tasks: corregir-auth-oidc

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~420–480 (backend auth + frontend auth + Keycloak config) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend) → PR 2 (Keycloak + frontend) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend JWT auth (AuthModule, JwtStrategy, AuthGuard, CORS lock) | PR 1 → main | All backend auth; tests included |
| 2 | Keycloak config update + Frontend OIDC auth (nuxt-oidc-auth, callback, remove useAuth) | PR 2 → main | Keycloak JSON + frontend wiring |

## Phase 1: Backend — JWT Auth Infrastructure

- [ ] 1.1 Create `backend/src/auth/jwt.strategy.ts` — Passport Strategy with Keycloak JWKS (`http://localhost:8080/realms/quito-turismo/protocol/openid-connect/certs`); extract `sub`, `preferred_username`, `email`, `realm_access.roles`
- [ ] 1.2 Create `backend/src/auth/auth.guard.ts` — `@UseGuards(AuthGuard)` on all `/*` routes; return `{ statusCode: 401, message: "Unauthorized" }` on missing/invalid Bearer token
- [ ] 1.3 Create `backend/src/auth/auth.module.ts` — NestJS module wiring `JwtStrategy` and `AuthGuard`; export `AUTH_GUARD` token
- [ ] 1.4 Modify `backend/src/main.ts` — Import `AuthModule`; replace `app.enableCors()` with `app.enableCors({ origin: 'http://localhost:3000', credentials: true })`
- [ ] 1.5 Write unit tests `backend/src/auth/jwt.strategy.spec.ts` — mock Keycloak JWKS response; verify token validation, claim extraction, strategy name
- [ ] 1.6 Write unit tests `backend/src/auth/auth.guard.spec.ts` — valid Bearer → passes; missing/invalid/expired → 401

## Phase 2: Backend — Global AuthGuard Application

- [ ] 2.1 Apply `@UseGuards(AuthGuard)` to `backend/src/app.module.ts` `APP_GUARD` so all `/api/*` routes are protected by default
- [ ] 2.2 Verify all existing API controllers (e.g., `ValoracionesController`) are covered by the global guard with no explicit `@Auth()` needed
- [ ] 2.3 Run `docker compose exec backend npm run test` — all tests pass
- [ ] 2.4 Run `docker compose exec backend npm run lint` — no errors

## Phase 3: Keycloak Configuration

- [x] 3.1 Modify `keycloak/realm-export.json` — set `directAccessGrantsEnabled: false` in the `sgsi-app` client
- [x] 3.2 Align `post.logout.redirect.uris` to `["http://localhost:3000/*"]` in the `sgsi-app` client
- [x] 3.3 Document the manual import step in the `keycloak/README.md` (or create one if missing) so the operator knows to re-import after backend PR merges

## Phase 4: Frontend — OIDC Authorization Code + PKCE

- [x] 4.1 Modify `frontend/nuxt.config.ts` — add `nuxt-oidc-auth` module; set `globalMiddlewareEnabled: true`; configure `keycloak` provider with `clientId: 'sgsi-app'`, `redirectUri: 'http://localhost:3000/auth/callback'`, `responseType: 'code'`
- [x] 4.2 Create `frontend/pages/auth/callback.vue` — required by `nuxt-oidc-auth` to handle Keycloak's redirect with auth code
- [x] 4.3 Modify `frontend/app.vue` — replace `useAuth` composable form with `$auth` composable; use `$auth.isAuthenticated`, `$auth.login()`, `$auth.logout()`
- [x] 4.4 Delete `frontend/composables/useAuth.ts` — password-grant composable is obsolete
- [ ] 4.5 Verify login/logout cycle manually: unauthenticated user → redirected to Keycloak → returns with code → HTTP-only cookie set → `$auth.isAuthenticated === true`

## Phase 5: End-to-End Verification

- [ ] 5.1 Run `docker compose exec backend npm run test` — all unit tests pass including auth guard tests
- [ ] 5.2 Run `docker compose exec backend npm run test:e2e` — all e2e tests pass
- [ ] 5.3 Manual smoke: login at `http://localhost:3000` → Keycloak → return → call `http://localhost:3001/api/valoraciones` → 200 with data (cookie sent automatically)
- [ ] 5.4 Manual smoke: request to `http://localhost:3001/api/*` without Bearer token → 401 `{ "statusCode": 401, "message": "Unauthorized" }`