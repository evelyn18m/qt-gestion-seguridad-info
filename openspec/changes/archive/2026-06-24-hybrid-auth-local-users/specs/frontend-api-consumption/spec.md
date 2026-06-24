# Delta for frontend-api-consumption

## ADDED Requirements

### Requirement: Usuario Type Definition

The system MUST define `Usuario` interface in `frontend/types/api.ts` with fields: `id`, `keycloakSub`, `username`, `email`, `primerInicio`, `habilitado`, `roles`. The `passwordHash` field MUST NOT be present in the type.

#### Scenario: Usuario type used in components

- GIVEN types are defined in `types/api.ts`
- WHEN any component references Usuario data
- THEN the ref type is `Ref<Usuario>` or `Ref<Usuario[]>` (not `Ref<any>`)
- AND `passwordHash` is not accessible in TypeScript

### Requirement: useAuth Extended for Dual Auth

The `useAuth()` composable MUST expose: `loggedIn`, `token`, `usuario` (typed as `Ref<Usuario | null>`), `primerInicio`, `loginLocal(credentials)`, `setPassword(password)`, `logout()`. Token persistence SHALL use sessionStorage for local JWTs.

#### Scenario: loginLocal stores token

- GIVEN `useAuth().loginLocal({ username, password })` is called
- WHEN the backend returns 200 with access_token
- THEN token is stored in sessionStorage and `useAuth().loggedIn` becomes true

#### Scenario: primerInicio flag exposed

- GIVEN Usuario has `primerInicio: true`
- WHEN `useAuth().usuario` is populated
- THEN `useAuth().primerInicio.value` is `true`

### Requirement: Auth Header Compatibility

The `useApi()` composable MUST attach `Authorization: Bearer <token>` from `useAuth().token` regardless of whether the token source is Keycloak or local JWT. No change to existing fetch behavior is required.

#### Scenario: Local JWT attached to API calls

- GIVEN user authenticated with local JWT
- WHEN `useApi().get('/catalogos')` is called
- THEN the Authorization header contains the local JWT token
