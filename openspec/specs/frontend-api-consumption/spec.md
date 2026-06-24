# Delta for frontend-api-consumption

## ADDED Requirements

### Requirement: `useApi()` Composable Provides Typed, Auth-Aware Fetch

The system MUST provide a `useApi()` composable that wraps all backend HTTP calls. The composable MUST:
- Read base URL from `useRuntimeConfig().public.apiUrl`
- Attach `Authorization: Bearer <token>` header from `useAuth().token` when token is not null
- Return typed responses and throw on non-2xx HTTP status
- Provide `get<T>()`, `post<T>()`, `patch<T>()`, `delete<T>()` methods

#### Scenario: Authenticated GET request

- GIVEN user is authenticated with a valid Keycloak token
- WHEN `useApi().get<T>('/catalogos')` is called
- THEN the request is sent to `<baseUrl>/catalogos`
- AND `Authorization: Bearer <token>` header is attached
- AND response is parsed as JSON and returned as type T
- AND if response status is non-2xx, an error is thrown with the status text

#### Scenario: Unauthenticated request gracefully skips token

- GIVEN `useAuth().token.value` is null or undefined
- WHEN `useApi().get('/catalogos')` is called
- THEN the Authorization header is NOT sent
- AND the request proceeds without auth header

#### Scenario: HTTP error throws descriptive error

- GIVEN the backend returns HTTP 404
- WHEN `useApi().get('/nonexistent')` is called
- THEN an error MUST be thrown with message containing "404"
- AND the error message MUST include the endpoint path

#### Scenario: POST sends JSON body with auth

- GIVEN user is authenticated
- WHEN `useApi().post('/valoraciones', { nombreActivo: 'Test' })` is called
- THEN the request is sent as POST with `Content-Type: application/json`
- AND body is JSON-serialized
- AND Authorization header is attached

---

### Requirement: `useCatalog()` Composable Provides Cached Catalog Data

The system MUST provide a `useCatalog()` composable that fetches and caches catalog data. The composable MUST:
- Cache responses per catalog `tipo` with a 5-minute TTL
- Store cached data in `sessionStorage` for page reload persistence
- Deduplicate concurrent requests for the same catalog tipo
- Provide `data`, `loading`, `error` refs and a `reload()` method

#### Scenario: First fetch populates cache

- GIVEN no cached data exists for "amenazas"
- WHEN `useCatalog('amenazas')` is called
- THEN a fetch is made to `/catalogos/amenazas`
- AND `loading.value` is true during the request
- AND on success, `data.value` is populated and `loading.value` becomes false
- AND the result is stored in sessionStorage with expiry timestamp

#### Scenario: Cache hit avoids network request

- GIVEN "amenazas" catalog was fetched within the last 5 minutes
- WHEN `useCatalog('amenazas')` is called again in the same session
- THEN NO network request is made
- AND `data.value` returns cached data immediately
- AND `loading.value` remains false

#### Scenario: Concurrent requests deduplicated

- GIVEN "amenazas" catalog is currently being fetched (loading = true)
- WHEN `useCatalog('amenazas')` is called a second time before the first completes
- THEN only ONE network request is made
- AND both callers receive the same resolved data

#### Scenario: Expired cache triggers refetch

- GIVEN "amenazas" catalog cache has expired (older than 5 minutes)
- WHEN `useCatalog('amenazas')` is called
- THEN a new network request is made
- AND the new data replaces the expired cache

#### Scenario: Explicit reload bypasses cache

- GIVEN "amenazas" has cached data
- WHEN `useCatalog('amenazas').reload()` is called
- THEN a fresh network request is made regardless of cache age
- AND the cache is updated with new data

---

### Requirement: Typed API Response Interfaces

The system MUST define TypeScript interfaces for all API responses in `frontend/types/api.ts`. The interfaces MUST include:
- `CatalogoItem`, `CatalogoTipo`, `ValoracionRow`, `DetalleRiesgoPayload`, `CreateValoracionBody`

No component MAY use `ref<any>` or `ref<unknown>` for API response data.

#### Scenario: catalogos.vue uses typed refs

- GIVEN the types are defined in `types/api.ts`
- WHEN `catalogos.vue` fetches catalog data
- THEN the ref type is `Ref<CatalogoItem[]>` not `Ref<any>`
- AND the data is cast to the correct type

#### Scenario: valoracion.vue uses typed refs

- GIVEN the types are defined in `types/api.ts`
- WHEN `valoracion.vue` fetches valoracion data
- THEN the ref types match `ValoracionRow` and `CreateValoracionBody`

---

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

---

## MODIFIED Requirements

### Requirement: `runtimeConfig` Exposes API Base URL

(Previously: No API URL configuration; hardcoded `localhost:3001` in fetch calls)

The `nuxt.config.ts` MUST expose `runtimeConfig.public.apiUrl` with a default of `'http://localhost:3001'`. This value MUST be injectable via `NUXT_PUBLIC_API_URL` environment variable at container runtime.

#### Scenario: Docker Compose injects API URL

- GIVEN `docker-compose.yml` sets `NUXT_PUBLIC_API_URL=http://backend:3001`
- WHEN the frontend container starts
- THEN `useRuntimeConfig().public.apiUrl` returns `'http://backend:3001'`
- AND `useApi()` uses this as the base URL

#### Scenario: Dev server uses localhost default

- GIVEN no `NUXT_PUBLIC_API_URL` env var is set (development)
- WHEN `useRuntimeConfig().public.apiUrl` is accessed
- THEN it returns `'http://localhost:3001'`

---

### Requirement: `submitValoracion` Sends `tipoControl` Field

(Previously: submitted `tipoControlId` in `detallesPayload`, causing backend mismatch)

The `submitValoracion` function in `valoracion.vue` MUST send `tipoControl: d.tipoControlId` (renamed from `tipoControlId`) in each `DetalleRiesgoPayload` object.

#### Scenario: Submit sends correct field name

- GIVEN user has filled the valoracion form with a control type selected
- WHEN `submitValoracion` is called
- THEN each detail object in `detallesPayload` has `tipoControl: <number>` (not `tipoControlId`)
- AND the backend receives the correct field name per `CreateDetalleRiesgoDto`

---

## REMOVED Requirements

### Requirement: Raw `fetch` Calls in Vue Components

(Reason: All fetch calls migrated to `useApi()` composable with centralized auth, error handling, and base URL)

The `catalogos.vue`, `valoracion.vue`, and `CatalogoManager.vue` components MUST NOT contain raw `fetch()` calls to `http://localhost:3001`. All HTTP communication MUST route through `useApi()`.

#### Scenario: No raw fetch remaining

- GIVEN a developer searches for `fetch(` in `frontend/pages/` and `frontend/components/`
- THEN no matches contain the hardcoded backend URL
- AND all fetch calls use `useApi()` methods

---

## Files Affected

| File | Action | Summary |
|------|--------|---------|
| `frontend/composables/useApi.ts` | **NEW** | Centralized fetch wrapper with auth + base URL |
| `frontend/composables/useCatalog.ts` | **NEW** | Caching composable for catalog data |
| `frontend/types/api.ts` | **NEW** | Shared TypeScript interfaces |
| `frontend/nuxt.config.ts` | **Modified** | Add `runtimeConfig.public.apiUrl` |
| `frontend/pages/catalogos.vue` | **Modified** | Migrate all fetch to `useApi()`; type refs |
| `frontend/pages/valoracion.vue` | **Modified** | Fix `tipoControl` field; replace `Promise.all` with `useCatalog()`; type refs |
| `frontend/components/CatalogoManager.vue` | **Modified** | Migrate fetch to `useApi()`; type refs |

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| AC1 | Zero `localhost:3001` string literals in frontend source | `grep -r "localhost:3001" frontend/` returns no matches |
| AC2 | All API calls carry `Authorization: Bearer <token>` | DevTools Network tab shows header on requests |
| AC3 | `res.ok` check throws on non-2xx | Unit test or manual test with 404 endpoint |
| AC4 | `submitValoracion` sends `tipoControl` not `tipoControlId` | Inspect network payload in DevTools |
| AC5 | `useCatalog()` caches; repeat calls ≤3 requests | Network tab shows single fetch per tipo on page load |
| AC6 | All API response refs typed, no `ref<any>` | TypeScript compilation succeeds with strict types |
| AC7 | Docker Compose works without port forwarding | `docker compose up` frontend reaches backend via service name |
