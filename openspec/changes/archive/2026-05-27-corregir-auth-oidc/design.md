# Design: corregir-auth-oidc

## Technical Approach

Replace the insecure password-grant `useAuth` composable with a browser-based OIDC flow using `keycloak-js` (public client, PKCE S256), and add JWT validation to all backend API routes via Keycloak's JWKS endpoint. The frontend runs as an SPA (`ssr: false`) so all auth traffic stays in the browser — avoiding the Docker dual-URL problem that makes server-side token exchange with `nuxt-oidc-auth` impossible in this setup.

## Architecture Decisions

### Decision: SSR mode (SPA vs SSR + nuxt-oidc-auth)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| SSR + nuxt-oidc-auth | Token exchange runs in Nitro (server-side); Nitro in Docker can't reach Keycloak at `localhost:8080`; using `keycloak:8080` works server-side but fails for browser redirects — unsolvable without额外 DNS config | Rejected |
| SPA + keycloak-js | All auth runs in the browser; browser always uses `localhost:8080`; no dual-URL problem; public client (no secret) | **Selected** |

**Rationale**: Docker networking makes `localhost` inside a container refer to the container itself, not Keycloak. SSR mode would require Nitro to call Keycloak at a different host than the browser — which breaks redirect URIs. SPA mode sidesteps this entirely by keeping every auth call in the browser.

### Decision: Keycloak client type (public, no secret)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Confidential client + secret | Secret stays server-side in Nitro; works with PKCE | Rejected (incompatible with SPA) |
| Public client (no secret) | No secret to leak; PKCE S256 compensates for the lack of secret; standard for browser-based apps | **Selected** |

**Rationale**: In SPA mode there is no safe place for a client secret. Keycloak's `sgsi-app` client is configured as `publicClient: true`. PKCE S256 provides equivalent security for public clients.

### Decision: Token storage (in-memory, not persistent)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| HTTP-only cookies | Secure against XSS; requires SSR; automatic with nuxt-oidc-auth | Rejected (SSR incompatible) |
| localStorage | Persistent across tabs/sessions; exposed to XSS | Rejected |
| In-memory (keycloak-js default) | Tokens lost on tab close; not accessible from JS outside keycloak instance | **Selected** |

**Rationale**: `keycloak-js` stores tokens in memory by default. Session is restored on reload via `onLoad: 'check-sso'` + `silentCheckSsoRedirectUri` pointing to `/silent-check-sso.html` — a static iframe page that bounces back to the parent. Tokens are lost on tab close (acceptable trade-off for a dev environment).

### Decision: No dedicated callback page

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `pages/callback.vue` (nuxt-oidc-auth) | Server route intercepts `?code=...` query params; more complex setup | Rejected |
| Browser-native `keycloak.init()` | `keycloak.init()` is called on every page load; it intercepts `?code=...&state=...` params directly; no extra page needed | **Selected** |

**Rationale**: `keycloak-js` handles the entire authorization code redirect in the browser. There is no Nitro server route to intercept it, so no callback page is needed.

## Data Flow

```
Browser                     Keycloak                     Backend
   │                           │                            │
   ├─── keycloak.login() ──────►│                            │
   │◄─── redirect (PKCE) ───────│                            │
   │                           │                            │
   ├─── User logs in ──────────►│                            │
   │◄─── callback + code ───────│                            │
   │                           │                            │
   ├─── keycloak.init()        │                            │
   │    processes code ──────────►│                          │
   │◄─── tokens (in memory) ───│                            │
   │                           │                            │
   ├─── GET /api/valoraciones ──│── Bearer <token> ────────►│
   │                           │ ── verify via JWKS ───────►│
   │◄─── 200 + data ───────────│◄────────────────────────────│

F5 / reload:
   ├─── keycloak.init(check-sso)                           │
   │◄─── iframe → silent-check-sso.html ───────────────────│
   │◄─── session restored (if still valid)                 │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/nuxt.config.ts` | Modify | `ssr: false`; no `nuxt-oidc-auth` module |
| `frontend/plugins/keycloak.client.ts` | Create | Initializes keycloak-js with `check-sso`, PKCE S256; provides `$keycloak` and `$kcLoggedIn` |
| `frontend/composables/useAuth.ts` | Rewrite | Wraps `$keycloak`: `loggedIn`, `user` (tokenParsed), `token`, `login()`, `logout()` |
| `frontend/app.vue` | Modify | Replace `useOidcAuth()` → `useAuth()`; `loggedIn.value` check |
| `frontend/layouts/default.vue` | Modify | Replace `useOidcAuth()` → `useAuth()`; `user.name` / `user.preferred_username` (flat tokenParsed) |
| `frontend/public/silent-check-sso.html` | Create | Static iframe page for silent SSO check (parent.postMessage pattern) |
| `backend/src/auth/jwt.strategy.ts` | Create | Passport JWT + Keycloak JWKS (unchanged from original design) |
| `backend/src/auth/auth.guard.ts` | Create | 401 on invalid/missing Bearer token (unchanged) |
| `backend/src/auth/auth.module.ts` | Create | NestJS module wiring (unchanged) |
| `backend/src/main.ts` | Modify | `AuthModule` + CORS locked to `http://localhost:3000` (unchanged) |
| `keycloak/realm-export.json` | Modify | `publicClient: true`; `directAccessGrantsEnabled: false`; `post.logout.redirect.uris: "+"` |

## Interfaces / Contracts

### Backend AuthGuard response (all `/api/*` routes)

```json
{ "statusCode": 401, "message": "Unauthorized" }
```

### JWT claim extraction (KeycloakTokenParsed)

```typescript
interface KeycloakTokenParsed {
  sub: string;
  preferred_username: string;
  name?: string;
  email?: string;
  realm_access: { roles: string[] };
  // ... other Keycloak claims
}
```

### keycloak-js init config

```typescript
const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'quito-turismo',
  clientId: 'sgsi-app',
})

await keycloak.init({
  onLoad: 'check-sso',
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
  pkceMethod: 'S256',
})
```

### useAuth composable shape

```typescript
const { loggedIn, user, token, login, logout } = useAuth()
// user: KeycloakTokenParsed | undefined
// token: string | undefined
// loggedIn: Ref<boolean>
```

### Keycloak JWKS endpoint

```
GET http://localhost:8080/realms/quito-turismo/protocol/openid-connect/certs
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `JwtStrategy` token validation, `AuthGuard` bypass scenarios | Jest + mock of JWKS response |
| Integration | Protected route with valid/invalid Bearer token | Supertest with JWT fixtures |
| E2E | Full login flow, JWT-proteced API call, tab-close/re-open session loss | Manual smoke test |

**Backend test command**: `docker compose exec backend npm run test`
**E2E test command**: `docker compose exec backend npm run test:e2e`

## Migration / Rollout

No data migration required. Phased rollout:

1. **Phase 1 — Backend** (lowest risk): Add `AuthModule`, `JwtStrategy`, `AuthGuard`, lock CORS. Deploy backend first.
2. **Phase 2 — Keycloak**: Update `sgsi-app` client to `publicClient: true`, set `directAccessGrantsEnabled: false`, import via admin UI or `--import-realm` flag.
3. **Phase 3 — Frontend**: Deploy SPA with `ssr: false`, `keycloak.client.ts` plugin, `useAuth` composable, `silent-check-sso.html`.

Rollback: restore old `useAuth` composable (password grant), re-enable CORS. Each phase independently reversible.

## Open Questions

None — all decisions resolved during implementation.
