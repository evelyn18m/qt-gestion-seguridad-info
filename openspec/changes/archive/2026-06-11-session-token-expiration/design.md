# Design: Session Token Expiration Fix

## Technical Approach

Implement the standard Keycloak SPA proactive-refresh pattern:
1. Before every API call, guarantee token validity via `keycloak.updateToken(30)`.
2. Run a background interval in the Keycloak plugin to refresh even when the user is idle (no API calls).
3. Surface a session-expiry warning UI with a countdown so users can save work before being logged out.

This maps directly to the proposal's approach: proactive refresh + background refresh + UI warning. Retry-on-401 is explicitly deferred.

## Architecture Decisions

| Decision | Options | Tradeoffs | Rationale |
|----------|---------|-----------|-----------|
| **Proactive refresh in `useApi`** | A) Add `updateToken` before each fetch. B) Retry on 401 after the fact. | A adds ~10-50ms latency per call but prevents 401s entirely. B is more complex and requires distinguishing "expired" from "unauthorized". | Proposal deferred retry-on-401. A is the standard Keycloak SPA pattern and guarantees a valid token at request time. |
| **Background refresh interval** | A) `setInterval` in plugin. B) `onTokenExpired` only. | A refreshes even when user is idle (no API calls). B only fires during active app use, which is the root cause of the bug. | A is necessary because the bug manifests when the user spends minutes on a form without API calls. |
| **Session warning composable** | A) New `useSession.ts`. B) Inline in `valoracion.vue`. | A keeps expiry logic reusable across pages. B duplicates logic and misses other long forms. | A is a single source of truth for token expiry timing and warning state. |
| **Form data preservation** | A) Auto-save to `localStorage`. B) Warning modal + manual save. | A is high effort and risks stale data. B is simple and gives the user agency. | B is within scope and sufficient for the immediate problem. |

## Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  useApi.ts      │────→│ keycloak.update  │────→│  Backend    │
│  apiFetch()     │     │ Token(30)        │     │  API        │
└─────────────────┘     └──────────────────┘     └─────────────┘
         ↑                                              │
         └──────────────────────────────────────────────┘
                           (inject refreshed Bearer token)

┌─────────────────────┐     ┌─────────────────────┐
│ keycloak.client.ts  │───→│ setInterval(60s)    │
│ onTokenExpired      │     │ check exp → update  │
└─────────────────────┘     └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│ useSession.ts       │───→│ valoracion.vue      │
│ tokenParsed.exp     │     │ warning banner +    │
│ countdown ≤ 60s     │     │ countdown modal     │
└─────────────────────┘     └─────────────────────┘
```

## Sequence Diagrams

### Proactive Refresh on API Call

```
User (valoracion.vue)    useApi.ts            Keycloak            Backend
      │                      │                    │                   │
      │──submitValoracion()→│                    │                   │
      │                      │──updateToken(30)──→│                   │
      │                      │                    │──(refresh if needed)
      │                      │←────new token─────│                   │
      │                      │                    │                   │
      │                      │────fetch(Bearer)──────────────────────→│
      │                      │                    │                   │
      │                      │←────200 OK──────────────────────────────│
      │←────success──────────│                    │                   │
```

### Background Refresh (Idle User)

```
keycloak.client.ts       Keycloak
      │                      │
      │─setInterval(60s)     │
      │─check tokenParsed.exp│
      │─if exp - now < 60s   │
      │──updateToken(30)────→│
      │←────new token───────│
      │                      │
```

### Refresh Token Expired (Failure)

```
User (valoracion.vue)    useApi.ts            Keycloak
      │                      │                    │
      │──submitValoracion()→│                    │
      │                      │──updateToken(30)──→│
      │                      │                    │──(refresh token expired)
      │                      │←────reject───────│
      │                      │                    │
      │←────throw "Session expired"──────────────│
      │                      │                    │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/composables/useApi.ts` | Modify | Call `keycloak.updateToken(30)` before `fetch()`. On rejection, throw a typed `SessionExpiredError`. |
| `frontend/plugins/keycloak.client.ts` | Modify | Add `setInterval(60s)` that checks `tokenParsed.exp` and calls `updateToken(30)` proactively. Keep existing `onTokenExpired`. |
| `frontend/composables/useSession.ts` | Create | Derive `expiresAt`, `secondsRemaining`, and `isWarning` from `keycloak.tokenParsed.exp`. Provide reactive `sessionWarning` state. |
| `frontend/components/SessionWarning.vue` | Create | Banner/modal showing countdown and a "Save & Refresh" button. Accepts `secondsRemaining` prop. |
| `frontend/pages/valoracion.vue` | Modify | Import `useSession` and `<SessionWarning />`. Keep existing `alert` for generic errors, but surface `SessionExpiredError` with a login redirect. |

## Interfaces / Contracts

```typescript
// frontend/composables/useApi.ts
class SessionExpiredError extends Error {
  statusCode = 401
  code = 'SESSION_EXPIRED'
}

// frontend/composables/useSession.ts
interface SessionState {
  secondsRemaining: number | null
  isWarning: boolean        // true when ≤ 60s
  isExpired: boolean         // true when ≤ 0s
}

// frontend/plugins/keycloak.client.ts
// Interval ID stored on the plugin scope so it can be cleaned up on HMR.
let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null
```

## Error Handling

| Scenario | Behavior | User Impact |
|----------|----------|-------------|
| `updateToken` succeeds | Continue with `fetch()` using new token | None |
| `updateToken` fails (refresh token expired) | Throw `SessionExpiredError` | `valoracion.vue` shows "Session expired — log in again" and a login button. Form data stays in reactive state (user can copy/save manually). |
| `fetch()` returns 401 despite refresh | Re-throw as `SessionExpiredError` | Same as above. |
| Background interval fails | Silently catch; next API call will trigger explicit refresh | No visible error unless the user tries to submit after total expiry. |

## UI/UX

- **Global warning**: `SessionWarning` component renders a fixed top banner when `isWarning` is true, showing "Session expires in N seconds — save your work".
- **Countdown**: `useSession` recalculates every second via `setInterval` (or `requestAnimationFrame` if preferred). Uses `tokenParsed.exp` as the canonical expiry time.
- **Auto-save**: Not implemented (out of scope). The warning gives the user a manual chance to save or trigger a refresh by clicking a button that calls `keycloak.updateToken(30)`.
- **Expired state**: If the user ignores the warning and the token expires, any subsequent API call throws `SessionExpiredError`. The UI replaces the generic `alert('Error: ...')` with a friendly modal: "Your session has expired. Please log in again to continue." with a login button.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `useApi` token refresh logic | Frontend has no test runner (per `config.yaml`). Not feasible. |
| Manual | Proactive refresh prevents 401 | Temporarily reduce Keycloak `accessTokenLifespan` to 2 min in realm config. Open valoración form, wait 3 min, submit. Verify no 401. |
| Manual | Session warning appears | Same 2-min lifespan. Open form, wait 60s, confirm warning banner appears with correct countdown. |
| Manual | Refresh token expiry path | Reduce `ssoSessionIdleTimeout` to 3 min. Open form, wait 4 min, submit. Verify "Session expired" message appears. |
| Smoke | No regressions | Log in, log out, page refresh, navigate between pages. All existing flows must work. |

## Migration / Rollout

No migration required. This is a frontend-only change with no backend or database modifications.

## Dependencies

- `keycloak-js` (already present) — `updateToken`, `tokenParsed`, `onTokenExpired`.
- `nuxt-oidc-auth` (already present) — login/logout flow.
- Keycloak realm configuration: `accessTokenLifespan` (default 5 min) and `ssoSessionIdleTimeout` (default 30 min) define the refresh window. No changes needed.

## Open Questions

- [ ] Should we add a `SessionWarning` globally (e.g., in `app.vue`) rather than per-page? Yes — but this design places it in `valoracion.vue` first as the MVP, then extracts to global layout if needed.
- [ ] Is `localStorage` form backup out of scope for a follow-up change? Yes — deferred.
