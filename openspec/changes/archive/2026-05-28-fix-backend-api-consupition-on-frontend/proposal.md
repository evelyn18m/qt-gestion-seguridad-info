# Proposal: Fix Backend API Consumption on Frontend

## Intent

The Nuxt 4 frontend makes raw `fetch()` calls directly to `http://localhost:3001` with no abstraction, no auth token forwarding, no shared types, and no caching. This produces six concrete failures: broken containerized deploys (hardcoded URL), unprotected backend endpoints (no Bearer token), silent breakage on API contract changes (`any` typing), missing HTTP error checks (swallowed 4xx/5xx), field name mismatches in payloads, and a request storm on mount (12 simultaneous uncached requests). Fixing these is prerequisite to any reliable deployment outside localhost.

## Scope

### In Scope
- Centralize API base URL via Nuxt `runtimeConfig` + a `useApi()` composable
- Forward Keycloak Bearer token on all API calls via `useAuth().token`
- Add `res.ok` checks to all fetch calls; throw on non-2xx
- Fix `tipoControlId` → `tipoControl` field mapping in `submitValoracion` payload
- Typed API response interfaces (replace `ref<any>` with typed structs)
- Catalog caching: `useCatalog()` composable with in-memory + session cache to kill the 12-request storm

### Out of Scope
- Backend changes (DTOs, controllers, guards) — even if auth gaps are found backend-side
- Nuxt server proxy setup (`/api` routes) — this is a frontend-only URL centralization
- Replacing Keycloak plugin or changing OIDC flow
- Unit/integration tests for frontend (strict TDD is backend-only per config)

## Capabilities

### New Capabilities
- `frontend-api-abstraction`: Centralized API composable with base URL, auth headers, and typed responses. All raw `fetch()` call sites are migrated to `useApi()`.
- `frontend-catalog-cache`: Shared `useCatalog()` composable with per-catalog in-memory cache and session storage, replacing the 12-request `Promise.all` storm.

### Modified Capabilities
- None — no existing spec-level capability requirements change. This is a pure refactor of frontend implementation without backend contract changes.

## Approach

### 1. API base URL via runtimeConfig
Add `runtimeConfig.apiUrl: 'http://localhost:3001'` (default) exposed as `NUXT_PUBLIC_API_URL` env var. Create `frontend/composables/useApi.ts` wrapping `$fetch` with:
```ts
export const useApi = () => {
  const config = useRuntimeConfig()
  const { token } = useAuth()
  return {
    get: <T>(path: string) => fetch(...),  // Authorization: Bearer header
    post: (path, body) => fetch(...),
    patch: (path, body) => fetch(...),
    delete: (path) => fetch(...),
  }
}
```

### 2. Auth token forwarding
All API calls through `useApi()` attach `Authorization: Bearer ${token.value}` unless token is null/undefined. `useAuth().token` already exposes the Keycloak JWT — no plugin changes needed.

### 3. Fix `res.ok` checks
Every `useApi()` method checks `res.ok`, throws descriptive error on non-2xx, and parses JSON. Callers receive typed responses or throw.

### 4. Fix `tipoControlId` → `tipoControl`
In `submitValoracion` `body` construction, rename `tipoControlId: d.tipoControlId` to `tipoControl: d.tipoControlId` in `detallesPayload`. Verify against backend `CreateDetalleRiesgoDto` to confirm field name.

### 5. Typed response interfaces
Define TypeScript interfaces in `frontend/types/api.ts`:
- `CatalogoItem`, `CatalogoTipo`, `ValoracionRow`, `DetalleRiesgoPayload`, `CreateValoracionBody`
Replace all `ref<any>` in `catalogos.vue`, `valoracion.vue`, and `CatalogoManager.vue` with typed refs.

### 6. Catalog caching with `useCatalog()`
```ts
export const useCatalog = () => {
  const cache = new Map<string, { data: any, expiry: number }>()
  const SESSION_KEY = 'sgsi_catalogs'
  // Load from sessionStorage if present and not expired (5 min TTL)
  // Fire fetch per catalogo tipo, store result with 5-min TTL
  // Return { data, loading, error, reload }
}
// In valoracion.vue: replace Promise.all with sequential useCatalog() calls
```
Optionally persist to `sessionStorage` so page reloads don't re-fetch.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/composables/useApi.ts` | New | Centralized fetch wrapper with auth + base URL |
| `frontend/composables/useCatalog.ts` | New | Caching composable for catalog data |
| `frontend/types/api.ts` | New | Shared TypeScript interfaces |
| `frontend/nuxt.config.ts` | Modified | Add `runtimeConfig.apiUrl` + `runtimeConfig.public.apiUrl` |
| `frontend/pages/catalogos.vue` | Modified | Migrate all 5 fetch calls to `useApi()`; add `res.ok`; type refs |
| `frontend/pages/valoracion.vue` | Modified | Fix `tipoControlId` field; replace `Promise.all` with `useCatalog()`; type refs |
| `frontend/components/CatalogoManager.vue` | Modified | Migrate 3 fetch calls to `useApi()`; add `res.ok`; type refs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `tipoControlId` fix mismatches backend expectation | Low/Med | Verify backend `CreateDetalleRiesgoDto` before deploy; has rollback |
| Caching causes stale catalog data | Med | 5-min TTL + explicit `reload()` option in `useCatalog()` |
| Auth token not available at call time | Med | `useApi()` gracefully skips header if `token.value` is null; API still works unauthenticated until backend enforces |
| `Promise.all` replaced with sequential — slower load | Low | Add parallel loading option to `useCatalog()`; measure before changing |

## Rollback Plan

1. Revert `catalogos.vue`, `valoracion.vue`, `CatalogoManager.vue` to original fetch URLs (git diff shows all changes)
2. Remove `useApi.ts`, `useCatalog.ts`, `types/api.ts` from `frontend/composables/`
3. Revert `nuxt.config.ts` to previous state
4. No DB migration needed — frontend-only changes
5. Verify containerized deploy still fails with hardcoded `localhost:3001` (confirms rollback)

## Dependencies

- Keycloak plugin with `useAuth()` composable must remain functional (no changes to auth flow)
- Backend catalogos and valoraciones endpoints must remain at same URL paths (no route changes)
- `NUXT_PUBLIC_API_URL` env var must be injected by Docker Compose at container runtime

## Success Criteria

- [ ] Zero `localhost:3001` string literals remaining in `frontend/` source code
- [ ] All API calls carry `Authorization: Bearer <token>` header (verify in browser DevTools)
- [ ] `selectCatalogo` in `catalogos.vue` throws on `!res.ok` before `res.json()` call
- [ ] `submitValoracion` sends `tipoControl` (not `tipoControlId`) in payload
- [ ] `valoracion.vue` mount fires ≤3 catalog fetches (cache hit on repeat visits within session)
- [ ] All Vue component refs typed with interfaces from `types/api.ts`, no `ref<any>` for API data
- [ ] Docker Compose frontend service works without port forwarding to backend (uses service name via env var)
