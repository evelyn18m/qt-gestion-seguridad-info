# Delta for Frontend — Session Token Expiration

## ADDED Requirements

### Requirement: Proactive Token Refresh in `useApi()`

Before every API call, `useApi()` MUST call `keycloak.updateToken(30)`. If refreshed, the new token MUST be used. If refresh fails, a "Session expired" error with statusCode 401 MUST be thrown.

#### Scenario: Token refreshed before API call

- GIVEN token expires within 30 seconds
- WHEN `useApi().apiFetch()` is called
- THEN `keycloak.updateToken(30)` is invoked
- AND the request uses the refreshed token

#### Scenario: Refresh token expired

- GIVEN the session has expired
- WHEN `useApi().apiFetch()` is called
- THEN `updateToken(30)` rejects
- AND an error "Session expired" with statusCode 401 is thrown

### Requirement: Background Token Refresh

The Keycloak plugin MUST register a `setInterval` (≤ 60s) that checks `tokenParsed.exp` and calls `updateToken(30)` proactively. On failure, the interval MUST be cleared and the user redirected to login.

#### Scenario: Idle user refresh

- GIVEN the user is idle and token expires within 30s
- WHEN the interval fires
- THEN `updateToken(30)` is called silently
- AND the session remains valid

#### Scenario: Background refresh fails

- GIVEN the session has expired
- WHEN the interval attempts `updateToken(30)`
- THEN the interval is cleared
- AND the user is redirected to login

### Requirement: Session Expiry Warning UI

The system MUST display a warning when the token expires within 60s. A `useSession()` composable SHOULD provide this logic.

#### Scenario: Warning displayed

- GIVEN the user is on a long form
- AND token expires in 45s
- WHEN the system detects imminent expiry
- THEN a warning banner shows the remaining time

#### Scenario: User refreshes session

- GIVEN the warning is visible
- WHEN the user clicks refresh
- THEN `updateToken(30)` is called
- AND the warning is hidden

## MODIFIED Requirements

### Requirement: `useApi()` Composable — Auth-Aware Fetch

(Previously: did not refresh token before API calls; used stale token causing 401 on long forms)

The composable MUST call `keycloak.updateToken(30)` before every request. All other behaviors remain unchanged.

#### Scenario: GET with near-expired token

- GIVEN token expires in 20s
- WHEN `useApi().get('/catalogos')` is called
- THEN `updateToken(30)` is called first
- AND the request uses the new token

#### Scenario: POST with expired session

- GIVEN the refresh token is invalid
- WHEN `useApi().post('/valoraciones', payload)` is called
- THEN `updateToken` rejects
- AND an error is thrown; the request is not sent

### Requirement: Keycloak Plugin — Token Refresh

(Previously: only reactive `onTokenExpired` callback; no proactive background refresh)

The plugin MUST add a periodic background refresh interval (≤ 60s) in addition to the existing `onTokenExpired` handler.

#### Scenario: Background refresh keeps session alive

- GIVEN the user is idle
- AND token is near expiry
- WHEN the interval fires
- THEN `updateToken(30)` is called
- AND the session stays active

## Non-Functional Requirements

- **Refresh Latency**: Token refresh SHOULD complete within 500ms. UI MUST NOT block > 1s.
- **Concurrent Safety**: Concurrent API calls near expiry MUST be handled by Keycloak-js internal debouncing. No additional debouncing required unless race conditions are observed.

## Security Considerations

- Tokens MUST remain in-memory only. No localStorage/sessionStorage/cookie persistence.
- On refresh token expiry, the session MUST be cleared and user redirected to login.
- Failed refresh MUST NOT be retried more than once.

## Error Handling

- **401 from expired token**: Show "Session expired. Please log in again." Preserve form state in component refs.
- **Refresh token expiry**: Clear session, redirect to login, show the same message.
