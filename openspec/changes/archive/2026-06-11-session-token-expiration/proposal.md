# Proposal: Session Token Expiration Fix

## Intent

Users filling long forms (e.g., creating a *valoración*) get **401 Unauthorized** when the Keycloak access token expires (default 5 minutes) before submission. The `onTokenExpired` callback only fires during active app use, and `useApi` reads the token at call time without refreshing it. This causes data loss and a poor UX when the token is stale.

## Scope

### In Scope
- Proactive token refresh in `useApi` before every API call
- Background token refresh in the Keycloak client plugin
- UI session warning when the token is about to expire
- Graceful error handling when the refresh token is also expired

### Out of Scope
- Increasing Keycloak access token lifespan (security risk)
- Retry-on-401 logic (deferred to a later change if needed)
- Backend changes to token validation logic

## Capabilities

### New Capabilities
- `session-token-refresh`: Proactive refresh in `useApi` and Keycloak plugin to guarantee a valid token before every API call
- `session-expiry-warning`: UI countdown and warning before token expiration to reduce data loss

### Modified Capabilities
- None

## Approach

Implement the standard Keycloak SPA pattern:
1. In `useApi.ts`, before each `fetch()`, call `keycloak.updateToken(30)`. If successful, use the refreshed token; if it fails, throw a clear "Session expired" error.
2. In `keycloak.client.ts`, add a `setInterval` (e.g., 60s) that checks `tokenParsed.exp` and calls `updateToken` proactively, even if no API calls are in flight.
3. In `valoracion.vue` (or a global session composable), show a warning when the token is within 60 seconds of expiry, allowing the user to save or refresh.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/composables/useApi.ts` | Modified | Add `updateToken` call before every API request |
| `frontend/plugins/keycloak.client.ts` | Modified | Add periodic proactive token refresh interval |
| `frontend/pages/valoracion.vue` | Modified | Add session expiry warning UI |
| `frontend/composables/useSession.ts` | New | Shared session expiry warning logic |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Race conditions with concurrent API calls | Low | Keycloak-js debounces refresh internally; test with throttled network |
| Refresh token expired (session idle timeout) | Med | Catch `updateToken` failure and show a login redirect message |
| UI latency from async token refresh | Low | Use `updateToken` with short `minValidity` (30s); it's typically fast |
| Form data loss if user is logged out | Med | UI warning gives the user a chance to save before expiry |

## Rollback Plan

1. Revert the changes in `useApi.ts` and `keycloak.client.ts` to the previous commit.
2. If the new `useSession.ts` composable causes issues, remove its import from `valoracion.vue`.
3. No backend or database changes are involved, so no migration or data rollback is needed.

## Dependencies

- None. This is a frontend-only change using existing `keycloak-js` and `nuxt-oidc-auth` setup.

## Success Criteria

- [ ] A user can leave a *valoración* form open for 10+ minutes and submit without a 401 error.
- [ ] The UI shows a warning when the session is about to expire (≤ 60 seconds).
- [ ] If the refresh token is expired, the user sees a clear "Session expired — please log in again" message.
- [ ] No regressions in existing authentication flows (login, logout, page refresh).
