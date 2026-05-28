# Delta for auth-frontend

## MODIFIED Requirements

### Requirement: Authorization Code Flow with PKCE (keycloak-js)

The frontend MUST use `keycloak-js` initialized with Authorization Code + PKCE grant type. The system SHALL NOT use the password grant or any flow that exposes client credentials to the browser. The client MUST be configured as a public client (`publicClient: true`) with no `clientSecret`.

(Previously: used nuxt-oidc-auth global middleware)

#### Scenario: User initiates login

- GIVEN the user is unauthenticated and visits any protected page
- WHEN they click the login button or are redirected to a protected route
- THEN the system redirects to Keycloak's authorization endpoint with PKCE code challenge
- AND the user authenticates via Keycloak's hosted login page
- AND the system exchanges the authorization code for tokens using PKCE verifier

#### Scenario: Authenticated session active

- GIVEN the user has successfully authenticated and has a valid session
- WHEN they navigate to any protected page
- THEN the `useAuth()` composable reports `loggedIn: true`
- AND the user can access protected routes without re-authenticating

#### Scenario: Token storage (in-memory)

- GIVEN the user completes authentication
- WHEN tokens are received from Keycloak
- THEN tokens MUST be stored in-memory by keycloak-js (default SPA behavior)
- AND no `client_secret` or credentials SHALL be stored in localStorage, sessionStorage, or frontend code
- NOTE: tokens are lost on page refresh but the session is restored via Keycloak SSO on next load

### Requirement: Session persistence on page reload

The system MUST silently restore the authenticated session on page reload using Keycloak's silent check feature, without requiring the user to re-enter credentials.

#### Scenario: Page reload restores session

- GIVEN the user is authenticated
- WHEN they reload the page
- THEN keycloak-js MUST initialize with `onLoad: 'check-sso'`
- AND silently restore the session via an iframe using `silent-check-sso.html`
- AND the user remains authenticated without any login prompt

#### Scenario: Session expired on reload

- GIVEN the user's Keycloak session has expired
- WHEN they reload the page and silent check fails
- THEN keycloak-js redirects to Keycloak login
- AND after successful re-authentication, the session is restored

### Requirement: Logout clears session

The system MUST clear the local session and redirect to Keycloak's logout endpoint when the user initiates logout.

#### Scenario: User clicks logout

- GIVEN the user is authenticated
- WHEN they click the logout button
- THEN the local session MUST be cleared
- AND the user MUST be redirected to Keycloak's logout endpoint `http://localhost:8080/realms/quito-turismo/protocol/openid-connect/logout`
- AND subsequent visits to protected routes require re-authentication

---

## REMOVED Requirements

### Requirement: Callback route handled

(Reason: keycloak-js processes the redirect callback entirely in the browser at `/` — no dedicated `/auth/callback` server route is needed. The callback is handled by keycloak-js initialization with `checkLoginIframe: false` and the token exchange happens client-side.)

---

## Metadata

- change: corregir-auth-oidc
- domain: auth-frontend
- type: delta
- status: ready-for-design