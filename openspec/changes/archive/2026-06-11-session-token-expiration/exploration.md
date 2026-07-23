## Exploration: Session token expiration causing 401 during long form submissions

### Current State

The application uses Keycloak as the OIDC SSO provider. The frontend initializes Keycloak with `onLoad: 'check-sso'` and sets an `onTokenExpired` callback that calls `updateToken(30)` to refresh the token 30 seconds before it expires. The `useApi` composable reads the current token value at the time of the API call and sends it as a Bearer token.

The backend uses `@nestjs/passport` with the `jwt` strategy. `passport-jwt` is configured with `ignoreExpiration: false`, which means any token with an expired `exp` claim is rejected with 401.

Keycloak's default access token lifespan is **5 minutes** (can be configured in the realm). If a user takes longer than the token lifetime to fill the form (e.g., creating a new *valoración*), the token expires. The `onTokenExpired` event fires only if the user is actively using the app (and the Keycloak session is still valid). If the refresh token also expires (default 30 min session idle timeout), the user gets logged out or the token refresh fails silently.

### Affected Areas

- `frontend/plugins/keycloak.client.ts` — Keycloak initialization and token refresh logic (`onTokenExpired` only)
- `frontend/composables/useApi.ts` — API call wrapper that reads the token but does not proactively refresh it
- `frontend/pages/valoracion.vue` — The long-form submission that triggers the 401
- `backend/src/auth/jwt.strategy.ts` — JWT validation with `ignoreExpiration: false`
- `backend/src/auth/auth.guard.ts` — Auth guard that throws 401 on invalid/expired token
- `keycloak/realm-export.json` — Keycloak realm configuration where token lifespans are defined

### Approaches

1. **Proactive token refresh before every API call (frontend only)**
   - Before each `fetch()`, call `keycloak.updateToken(minValidity)` to ensure the token is valid.
   - If refresh fails, redirect to login or show a session expired message.
   - Pros: Simple, no backend changes needed, guarantees a valid token at call time.
   - Cons: Adds latency to every API call (Keycloak refresh is async), may cause race conditions if multiple calls happen simultaneously.
   - Effort: Low

2. **Add retry-with-refresh on 401 (frontend + backend awareness)**
   - When `useApi` receives a 401, attempt to refresh the token and retry the request once.
   - If retry fails, propagate the error to the user.
   - Pros: Handles edge cases where token expired between read and send, more robust.
   - Cons: Slightly more complex, could cause infinite loops if not handled carefully, requires distinguishing between "token expired" and "genuinely unauthorized".
   - Effort: Medium

3. **Increase Keycloak access token lifespan (Keycloak config only)**
   - Modify `keycloak/realm-export.json` or Keycloak admin console to increase `accessTokenLifespan` (e.g., 30 minutes or longer).
   - Pros: Zero code changes, immediate fix for the user experience.
   - Cons: Increases security risk (longer-lived tokens are more vulnerable to theft), does not solve the root cause (user could still exceed the limit).
   - Effort: Low

4. **Add a session expiry warning / countdown in the UI (frontend only)**
   - Parse the token expiry (`tokenParsed.exp`) and show a warning or auto-refresh modal before the token expires.
   - Pros: Good UX, gives the user a chance to save work before being logged out.
   - Cons: Does not prevent the 401 if the user ignores the warning, requires additional UI work.
   - Effort: Medium

5. **Combine proactive refresh + retry + warning (comprehensive)**
   - Implement approach #1 (proactive refresh) for all API calls.
   - Add approach #2 (retry on 401) as a safety net.
   - Add approach #4 (UI warning) for transparency.
   - Pros: Most robust and user-friendly solution.
   - Cons: More code to maintain, slightly higher effort.
   - Effort: Medium-High

### Recommendation

**Implement approach #1 (proactive token refresh) as the immediate fix**, and **add approach #4 (UI warning) as a secondary improvement**.

Specifically:
- In `useApi`, before every `fetch()`, call `keycloak.updateToken(30)` (or a configurable minValidity). If the promise resolves, use the new token. If it rejects, throw a clear "Session expired" error.
- Optionally add a `setInterval` in the Keycloak plugin that checks token expiry every 60 seconds and proactively refreshes if the token is about to expire, even if no API calls are made.
- This is the standard pattern for Keycloak + SPA applications and avoids 401s during long form submissions.

### Risks

- **Race conditions with concurrent API calls**: If multiple calls happen simultaneously, `updateToken` may be called multiple times. Keycloak-js handles this internally (it debounces refresh requests), but it's worth testing.
- **Refresh token expiry**: If the user's Keycloak session expires (default 30 min idle), `updateToken` will fail and the user must re-authenticate. The UI should handle this gracefully with a message like "Your session has expired. Please log in again."
- **Backend trust**: Increasing token lifespan (approach #3) reduces security and should be avoided.
- **Form data loss**: If the user is logged out mid-form, any unsaved data is lost. A UI warning (approach #4) mitigates this.

### Ready for Proposal

**Yes.** The exploration is complete and we have a clear recommended path: proactive token refresh in `useApi` and the Keycloak plugin. The next step is `sdd-propose` to create a formal change proposal with scope, rollback plan, and implementation approach.
