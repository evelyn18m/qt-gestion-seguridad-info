# Auth Frontend — Dual Auth (Keycloak + Local)

## Metadata
- change: hybrid-auth-local-users
- domain: auth-frontend
- type: spec
- status: active
- previous_changes: corregir-auth-oidc

---

## MODIFIED Requirements

### Requirement: Authorization Code Flow with PKCE (keycloak-js)

The frontend MUST use `keycloak-js` initialized with Authorization Code + PKCE grant type. The system SHALL NOT use the password grant. The client MUST be a public client with no `clientSecret`.

(Previously: login was Keycloak-only via `keycloak-js`)

#### Scenario: User initiates Keycloak login

- GIVEN the user is unauthenticated on `/login`
- WHEN they click "Ingresar con Keycloak"
- THEN the system redirects to Keycloak's authorization endpoint with PKCE
- AND on return, `keycloak-js` exchanges the code for tokens

#### Scenario: Authenticated session active

- GIVEN the user has authenticated (Keycloak or local)
- WHEN they navigate to any protected page
- THEN `useAuth()` reports `loggedIn: true`

### Requirement: Session persistence on page reload

The system MUST silently restore the authenticated session on page reload. For Keycloak sessions, use `onLoad: 'check-sso'`. For local sessions, the JWT SHALL be stored in sessionStorage and restored on reload.

(Previously: only Keycloak session restoration existed)

#### Scenario: Page reload restores Keycloak session

- GIVEN user authenticated via Keycloak
- WHEN they reload the page
- THEN keycloak-js restores session via `check-sso`

#### Scenario: Page reload restores local session

- GIVEN user authenticated via local login (JWT in sessionStorage)
- WHEN they reload the page
- THEN `useAuth()` reads token from sessionStorage and restores `loggedIn: true` without re-login

### Requirement: Logout clears session

The system MUST clear the session on logout. For Keycloak: redirect to Keycloak logout endpoint. For local: clear sessionStorage token.

(Previously: only Keycloak logout existed)

#### Scenario: Keycloak user logs out

- GIVEN authenticated via Keycloak
- WHEN logout is triggered
- THEN local state cleared; redirected to Keycloak logout endpoint

#### Scenario: Local user logs out

- GIVEN authenticated via local JWT
- WHEN logout is triggered
- THEN sessionStorage token cleared; redirected to `/login`

## ADDED Requirements

### Requirement: Dual-Entry Login Page

The `/login` page MUST render a local login form (username + password) AND a "Ingresar con Keycloak" button. Local login SHALL call `POST /auth/login` and store the returned JWT.

#### Scenario: Local login success

- GIVEN user fills username and password
- WHEN they submit the local login form
- THEN `POST /auth/login` is called; on 200, JWT is stored and user is redirected to `/`

#### Scenario: Local login failure

- GIVEN invalid credentials
- WHEN form is submitted
- THEN error message is displayed; user remains on `/login`

### Requirement: Set-Password Modal on First Keycloak Login

After first Keycloak login, the system MUST detect `primerInicio: true` on the synced Usuario and render a `SetPasswordModal`. The modal SHALL call `POST /auth/set-password` and close on success.

#### Scenario: Modal appears after first Keycloak login

- GIVEN new Keycloak user logs in (no local Usuario exists)
- WHEN sync interceptor creates Usuario with `primerInicio: true`
- THEN `SetPasswordModal` renders automatically
- AND protected routes are inaccessible until password is set

#### Scenario: Modal submitted successfully

- GIVEN `SetPasswordModal` is open
- WHEN user enters and confirms password (min 8 chars)
- THEN `POST /auth/set-password` is called; modal closes on 200

### Requirement: Role Check in useAuth()

The `useAuth()` composable MUST expose `tieneRol(rol: string): boolean` derived from the authenticated user's roles array.

#### Scenario: Admin role detected

- GIVEN user object has `roles: ['administrador']`
- WHEN `tieneRol('administrador')` is called
- THEN returns `true`

#### Scenario: Missing role

- GIVEN user object has `roles: ['usuario']`
- WHEN `tieneRol('administrador')` is called
- THEN returns `false`

#### Scenario: Not authenticated

- GIVEN no authenticated user
- WHEN `tieneRol('administrador')` is called
- THEN returns `false`

## REMOVED Requirements

### Requirement: Callback route handled

(Reason: keycloak-js processes the redirect callback entirely in the browser at `/` — no dedicated `/auth/callback` server route is needed. The callback is handled by keycloak-js initialization with `checkLoginIframe: false` and the token exchange happens client-side.)
