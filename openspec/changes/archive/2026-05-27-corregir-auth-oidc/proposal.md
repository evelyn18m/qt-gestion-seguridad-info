# Proposal: corregir-auth-oidc

## Intent

Fix broken OIDC authentication: the frontend uses an insecure password-grant flow with an exposed client secret, and the backend has zero API protection. Goal is a secure OIDC authorization code + PKCE flow where all credentials stay server-side and every API endpoint validates JWTs.

## Scope

### In Scope
- Replace custom `useAuth` composable (password grant) with authorization code + PKCE flow using `nuxt-oidc-auth`
- Add JWT validation guards to all backend API endpoints
- Lock CORS to frontend origin only
- Fix Keycloak redirect URI inconsistency

### Out of Scope
- Keycloak realm configuration (beyond redirect URIs)
- User management or roles beyond session identity
- Multi-realm support

## Capabilities

### New Capabilities
- `auth-frontend`: Secure OIDC login via authorization code + PKCE (nuxt-oidc-auth properly enabled)
- `auth-backend`: JWT validation guard protecting all API routes
- `auth-frontend-cors`: CORS restricted to `http://localhost:3000`

### Modified Capabilities
- None

## Approach

**Frontend**: Enable `nuxt-oidc-auth` global middleware, remove `useAuth.ts`, rely on the module's built-in login/logout/callback flow — `Authorization Code + PKCE` is the only grant type the module supports by design.

**Backend**: Add `jwt` strategy using Keycloak's JWKS endpoint (`/realms/quito-turismo/protocol/openid-connect/certs`). Add `AuthGuard` to all controllers. Set CORS allowed origin to `http://localhost:3000`.

**Keycloak**: Align redirect URIs in `realm-export.json` — use either `http://localhost:3000/*` or `http://localhost:3000/` consistently (remove trailing slash inconsistency).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/composables/useAuth.ts` | Removed | Password grant composable deleted |
| `frontend/nuxt.config.ts` | Modified | Enable `globalMiddlewareEnabled: true`, configure nuxt-oidc-auth properly |
| `frontend/app.vue` | Modified | Use `$auth` from nuxt-oidc-auth instead of custom composable |
| `frontend/pages/callback.vue` | New | OIDC callback handler page (required by nuxt-oidc-auth) |
| `backend/src/main.ts` | Modified | CORS restricted, JwtModule registered |
| `backend/src/auth/` | New | JwtStrategy, AuthGuard, token extraction middleware |
| `keycloak/realm-export.json` | Modified | Fix redirect URI consistency |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Keycloak unreachable during migration | Low | Use Docker health checks; rollback frontend to custom auth temporarily |
| Breaking existing API consumers | Med | Versioned endpoint prefix `/api/v1/`; test with Postman first |
| PKCE flow different from expected UX | Med | Verify login UX against existing users before go-live |

## Rollback Plan

1. Revert `nuxt.config.ts` — set `globalMiddlewareEnabled: false`
2. Restore `composables/useAuth.ts` from git
3. Revert backend CORS to `app.enableCors()` with no config
4. Remove `auth/` dir from backend

## Dependencies

- Keycloak must be reachable at `http://localhost:8080`
- Client ID and realm must exist in Keycloak

## Success Criteria

- [ ] User can log in via Keycloak authorization page (not password grant)
- [ ] JWT stored in HTTP-only cookie or secure storage — no client_secret in any file
- [ ] All backend `/api/*` routes return 401 without valid Bearer token
- [ ] CORS blocked for any origin other than `http://localhost:3000`
- [ ] Logout clears session and redirects to Keycloak logout endpoint
