# Archive Report: session-token-expiration

**Change**: session-token-expiration
**Archived**: 2026-06-11
**Mode**: hybrid
**Archive path**: `openspec/changes/archive/2026-06-11-session-token-expiration/`

---

## What Was Implemented

A frontend-only fix to prevent `401 Unauthorized` errors when the Keycloak access token expires while users are filling long forms (e.g., *valoración* creation). The implementation follows the standard Keycloak SPA proactive-refresh pattern.

### New Capabilities
- **session-token-refresh**: Proactive refresh in `useApi` and background refresh in the Keycloak plugin to guarantee a valid token before every API call.
- **session-expiry-warning**: UI countdown and warning before token expiration to reduce data loss.

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `frontend/composables/useApi.ts` | Modified | Calls `keycloak.updateToken(30)` before every `fetch()`. Throws `SessionExpiredError` on refresh failure. |
| `frontend/plugins/keycloak.client.ts` | Modified | Added `setInterval(60s)` that checks `tokenParsed.exp` and calls `updateToken(30)` proactively. Clears interval and logs out on failure. |
| `frontend/composables/useSession.ts` | Created | Reactive composable deriving `secondsRemaining`, `isWarning`, and `isExpired` from `tokenParsed.exp`. Recalculates every second. |
| `frontend/components/SessionWarning.vue` | Created | Fixed-top banner showing countdown and a "Refresh Session" button. |
| `frontend/pages/valoracion.vue` | Modified | Imports `useSession` and `<SessionWarning />`. Handles `SessionExpiredError` with a friendly modal instead of generic `alert()`. |

### Requirement Coverage

| Requirement | Status |
|-------------|--------|
| Proactive Token Refresh in `useApi()` | ✅ Implemented |
| Background Token Refresh | ✅ Implemented |
| Session Expiry Warning UI | ✅ Implemented |
| `useApi()` — Auth-Aware Fetch | ✅ Implemented |
| Keycloak Plugin — Token Refresh | ✅ Implemented |

---

## What Was Verified

- **19 of 23 tasks** are complete (all implementation tasks, Phases 1–3 and 5).
- **All 9 spec scenarios** were verified via static source inspection (frontend has no test runner).
- **No backend files** were modified; zero backend regressions.
- **No critical issues** found.
- **Security requirement verified**: No `localStorage`/`sessionStorage` token persistence was introduced.

---

## What Remains Pending

Four manual tests (Phase 4) require a running Keycloak instance and were not executed during static verification. They must be completed before deploying to production.

| Task | Description | Status |
|------|-------------|--------|
| 4.1 | Proactive refresh prevents 401 — reduce `accessTokenLifespan` to 2 min, open valoración form, wait 3 min, submit | ⏳ Pending |
| 4.2 | Session warning banner appears — with 2-min token life, wait 60s, confirm `SessionWarning` banner shows correct countdown | ⏳ Pending |
| 4.3 | Refresh token expiry path — reduce `ssoSessionIdleTimeout` to 3 min, wait 4 min, submit, verify "Session expired" message | ⏳ Pending |
| 4.4 | Smoke test — login, logout, page refresh, navigate between pages, verify no regressions | ⏳ Pending |

---

## How to Run the Manual Tests

### Prerequisites
Start the full Docker Compose stack:
```bash
docker compose up
```

### 4.1 — Proactive Refresh Prevents 401
1. Open the Keycloak Admin Console at `http://localhost:8080/admin`
   - Log in with `superadmin` / `admin`
   - Select the `quito-turismo` realm
   - Navigate to **Realm Settings → Tokens**
   - Change **Access Token Lifespan** to **2 minutes**
   - Click **Save**
2. Open the app at `http://localhost:3000`, log in, and navigate to **Valoración de Activos**
3. Open the **Nueva Valoración** modal and fill some fields
4. Leave the form open for **3 minutes** (do not interact)
5. Click **Guardar**

**Expected**: The form submits successfully with no `401 Unauthorized` error.

**Revert**: Set **Access Token Lifespan** back to the default (300 seconds) → Save.

---

### 4.2 — Session Warning Banner Appears
1. Follow the same Keycloak setup as 4.1 (Access Token Lifespan = 2 minutes)
2. Log in and open the **Valoración de Activos** page
3. Wait **60 seconds** without interacting
4. Observe the top of the page

**Expected**: An orange banner appears with text similar to:
> "Session expires in 59 seconds — save your work"

The countdown should decrement every second. The banner should remain visible until the token is refreshed or expires.

**Revert**: Same as 4.1.

---

### 4.3 — Refresh Token Expiry Path
1. Start the full stack
2. Open the Keycloak Admin Console at `http://localhost:8080/admin`
   - Log in with `superadmin` / `admin`
   - Select the `quito-turismo` realm
   - Navigate to **Realm Settings → Sessions**
   - Change **SSO Session Idle Timeout** to **3 minutes**
   - Click **Save**
3. Open the app, log in, and navigate to **Valoración de Activos**
4. Open the **Nueva Valoración** modal and fill some fields
5. Leave the page completely idle for **4 minutes** (no clicks, no API calls)
6. Click **Guardar**

**Expected**: A modal appears with:
> "Session Expired — Your session has expired. Please log in again to continue."

Clicking **Log In Again** should redirect the user to the Keycloak login page.

**Revert**: Set **SSO Session Idle Timeout** back to the default (1800 seconds) → Save.

---

### 4.4 — Smoke Test (No Regressions)
1. Start the full stack with default Keycloak settings
2. Open the app at `http://localhost:3000`
3. Log in with a valid user
4. Navigate to **Valoración de Activos**
5. Create a new valoración, save it, then edit it
6. Refresh the browser page (F5)
7. Log out
8. Log in again

**Expected**: All flows work without errors. The session remains valid after page refresh. Logout correctly clears the session. No console errors related to the Keycloak plugin or token refresh.

---

## Risks & Follow-up Actions

| Risk | Mitigation | Owner |
|------|------------|-------|
| Pending manual tests (4.1–4.4) not executed before production | Execute all 4 tests in a running Keycloak environment before deploying. | QA / DevOps |
| Frontend has no automated test runner | All scenarios are verified via static inspection only. Consider adding a frontend test runner (e.g., Vitest) for future changes. | Tech Lead |
| Race conditions with concurrent API calls | Keycloak-js debounces refresh internally; monitor for issues in production. | DevOps |
| Form data loss if user is logged out | Warning UI gives the user a chance to save. Future change may add auto-save to `localStorage`. | Product |

---

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| frontend | Created | Full spec copied from delta (no prior main spec existed) |

**Source of truth updated**: `openspec/specs/frontend/spec.md`

---

## SDD Cycle Status

| Phase | Status |
|-------|--------|
| Proposal | ✅ Complete |
| Spec | ✅ Complete |
| Design | ✅ Complete |
| Tasks | ✅ Complete (implementation tasks) |
| Apply | ✅ Complete |
| Verify | ✅ Complete (static inspection; 4 manual tests pending) |
| Archive | ✅ Complete |

**Verdict**: PASS WITH WARNINGS — Archive approved. The only outstanding items are documented manual tests that require a running Keycloak environment. No critical issues were found.

---

*Report generated by sdd-archive sub-agent*
*Date: 2026-06-11*
