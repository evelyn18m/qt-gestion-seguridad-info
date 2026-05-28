## Exploration: corregir-auth-oidc

### Current Auth Architecture

**Frontend**: Nuxt 4 with `nuxt-oidc-auth` module + custom `useAuth` composable

**Backend**: NestJS 11 — NO authentication guards, NO JWT validation

**Infrastructure**: Keycloak 24 on port 8080, realm "quito-turismo"

---

### Current State

The frontend has TWO conflicting auth mechanisms:

1. **`nuxt-oidc-auth` module** (`nuxt.config.ts`):
   - Configured with Keycloak provider
   - `middleware.globalMiddlewareEnabled: false` — auth module is effectively DISABLED
   - Not being used at all

2. **Custom `useAuth` composable** (`composables/useAuth.ts`):
   - Uses Resource Owner Password Credential grant (password flow)
   - Direct Keycloak token endpoint call with client_secret exposed in frontend
   - JWT stored in `useState` (Nuxt server-side compatible)
   - Parses JWT payload for user data

**Backend auth** (`main.ts`, `app.module.ts`):
- `app.enableCors()` with no arguments — wide open
- Zero auth guards, zero JWT validation
- No Passport, no `@nestjs/jwt`, no Keycloak validation

---

### Affected Areas

- `frontend/nuxt.config.ts` — OIDC module misconfigured (middleware disabled)
- `frontend/composables/useAuth.ts` — Custom password grant flow (insecure)
- `frontend/app.vue` — Custom login form, not using OIDC module
- `frontend/layouts/default.vue` — Displays user info from custom JWT parsing
- `backend/src/main.ts` — CORS wide open, no auth
- `keycloak/realm-export.json` — Redirect URI config inconsistency (trailing slashes)

---

### Key Issues

| Issue | Severity | Root Cause |
|-------|----------|------------|
| nuxt-oidc-auth module disabled | High | `globalMiddlewareEnabled: false` |
| Password grant flow in SPA | High | Not using authorization code + PKCE |
| Client secret exposed in frontend | High | `useAuth.ts` line 18 |
| No backend JWT validation | Critical | No auth guards or middleware |
| CORS completely open | High | `app.enableCors()` no args |
| Keycloak webOrigins mismatch | Medium | `"http://localhost:3000"` vs `"http://localhost:3000/*"` |

---

### Root Cause Analysis

The project attempted to use `nuxt-oidc-auth` but fell back to a custom password-grant implementation because:
1. The module's global middleware was disabled
2. No auth pages were created to handle the OIDC callback flow
3. The custom composable was quicker to implement

This creates a security issue: client credentials are in frontend code and user credentials go directly to the app rather than through Keycloak's secure login page.

---

### Fix Requirements

1. **Frontend**: Either properly configure nuxt-oidc-auth OR use authorization code + PKCE flow
2. **Backend**: Add JWT validation (extract Bearer token, validate against Keycloak JWKS)
3. **CORS**: Restrict to frontend origin only
4. **Keycloak**: Fix redirect URI consistency

---

### Ready for Proposal
Yes. The fix should implement proper OIDC authorization code flow with PKCE for frontend, and add JWT validation guards to backend API endpoints.