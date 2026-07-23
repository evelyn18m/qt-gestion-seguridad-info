# Tasks: Session Token Expiration Fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200–300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full frontend token refresh + warning UI | PR 1 | Single cohesive frontend change; no backend impact |

---

## Phase 1: Foundation — Proactive Token Refresh

- [x] 1.1 Create `SessionExpiredError` class in `frontend/composables/useApi.ts` with `statusCode: 401` and `code: 'SESSION_EXPIRED'`
- [x] 1.2 Modify `useApi.ts` to call `keycloak.updateToken(30)` before every `fetch()` and use the refreshed token
- [x] 1.3 Add catch block in `useApi.ts` so `updateToken` rejection throws `SessionExpiredError` instead of sending the request
- [x] 1.4 Verify `useApi.ts` still injects `Bearer` header and preserves all other existing behavior (GET, POST, PUT, DELETE)

## Phase 2: Core Implementation — Background Refresh & Session Warning

- [x] 2.1 Add `setInterval` (≤ 60s) in `frontend/plugins/keycloak.client.ts` that checks `keycloak.tokenParsed.exp` and calls `updateToken(30)` proactively
- [x] 2.2 Store interval ID in plugin scope and clear it on cleanup/HMR to prevent memory leaks
- [x] 2.3 On background refresh failure, clear the interval and redirect the user to login
- [x] 2.4 Create `frontend/composables/useSession.ts` with reactive `SessionState` (`secondsRemaining`, `isWarning`, `isExpired`) derived from `keycloak.tokenParsed.exp`
- [x] 2.5 Add a 1-second recalculation timer in `useSession.ts` to update the countdown
- [x] 2.6 Create `frontend/components/SessionWarning.vue` banner showing countdown and a "Refresh Session" button
- [x] 2.7 Wire `SessionWarning.vue` to `useSession` props and emit `refresh` event that calls `keycloak.updateToken(30)`

## Phase 3: Integration — Wire into UI

- [x] 3.1 Import `useSession` and `<SessionWarning />` into `frontend/pages/valoracion.vue`
- [x] 3.2 Handle `SessionExpiredError` in `valoracion.vue` by replacing generic `alert()` with a friendly modal: "Session expired — please log in again"
- [x] 3.3 Ensure form data remains in reactive state when session expires so the user can copy/save manually
- [x] 3.4 Verify `onTokenExpired` callback in `keycloak.client.ts` still works alongside the new interval

## Phase 4: Testing & Verification

- [ ] 4.1 Manual test: temporarily reduce Keycloak `accessTokenLifespan` to 2 min, open valoración form, wait 3 min, submit — verify no 401
- [ ] 4.2 Manual test: with 2-min token life, wait 60s, confirm `SessionWarning` banner appears with correct countdown
- [ ] 4.3 Manual test: reduce `ssoSessionIdleTimeout` to 3 min, wait 4 min, submit — verify "Session expired" message appears
- [ ] 4.4 Smoke test: login, logout, page refresh, navigate between pages — verify no regressions

## Phase 5: Cleanup

- [x] 5.1 Remove any temporary debug logs or `console.log` statements added during implementation
- [x] 5.2 Update inline comments in `useApi.ts` and `keycloak.client.ts` explaining the refresh logic
- [x] 5.3 Verify no `localStorage` or `sessionStorage` token persistence was introduced (security requirement)
- [x] 5.4 Mark all tasks as complete in this file
