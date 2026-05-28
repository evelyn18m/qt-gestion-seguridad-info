# Tasks: Fix Backend API Consumption on Frontend

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180–250 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes (tipoControlId mismatch needs clarification)
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation | PR 1 | All files; backend-independent |

## Phase 1: Foundation / Types & Config

- [ ] 1.1 **new** Create `frontend/types/api.ts` with `CatalogoItem`, `CatalogoTipo`, `ValoracionRow`, `DetalleRiesgoPayload`, `CreateValoracionBody` interfaces
- [ ] 1.2 **change** Add `runtimeConfig.public.apiUrl: 'http://localhost:3001'` to `frontend/nuxt.config.ts` (exposed via `NUXT_PUBLIC_API_URL` env var)

## Phase 2: Core Composable Implementation

- [ ] 2.1 **new** Create `frontend/composables/useApi.ts` — auth-aware fetch wrapper: base URL from `runtimeConfig`, Bearer token from `useAuth().token`, `res.ok` enforcement, `get<T>()`, `post<T>()`, `patch<T>()`, `delete<T>()` methods
- [ ] 2.2 **new** Create `frontend/composables/useCatalog.ts` — caching composable: per-tipo in-memory Map + sessionStorage, 5-min TTL, request deduplication, `data`/`loading`/`error` refs, `reload()` method

## Phase 3: Vue Component Migration

- [ ] 3.1 **change** Migrate `frontend/pages/catalogos.vue` — replace all `fetch()` with `useApi()` calls; type refs as `Ref<CatalogoTipo[]>` / `Ref<CatalogoItem[]>`
- [ ] 3.2 **change** Migrate `frontend/pages/valoracion.vue` — replace `Promise.all` storm with `useCatalog()` calls; replace `fetch()` with `useApi()`; type refs as `ValoracionRow[]`, `CreateValoracionBody`; fix `tipoControlId` → `tipoControl` in `detallesPayload` (see open question)
- [ ] 3.3 **change** Migrate `frontend/components/CatalogoManager.vue` — replace all `fetch()` with `useApi()`; type `items` as `Ref<CatalogoItem[]>`

## Phase 4: Verification

- [ ] 4.1 **verify** AC1: `grep -r "localhost:3001" frontend/` returns no matches (no raw backend URL literals)
- [ ] 4.2 **verify** AC2: DevTools Network — all API calls carry `Authorization: Bearer <token>` header
- [ ] 4.3 **verify** AC3: Call an invalid endpoint; confirm `useApi()` throws with descriptive error (status + path)
- [ ] 4.4 **verify** AC6: `npx nuxi typecheck` succeeds with no `ref<any>` for API data
- [ ] 4.5 **verify** AC5: `useCatalog()` — page reload fires ≤3 catalog requests (cache hit on repeat calls)
- [ ] 4.6 **docker-verify** AC7: `docker compose up` — frontend container reaches `http://backend:3001` without port forwarding on frontend

## Open Question (blocks apply)

> **tipoControlId vs tipoControl discrepancy**: Spec AC4 says `submitValoracion` must send `tipoControl` in payload. However, `DetalleRiesgoDto` (backend) uses `tipoControlId`, and Prisma schema has `tipoControlId`. Sending `tipoControl` will create `tipoControlId: undefined` in the DB insert. Resolution required before Phase 3.2 can be implemented correctly.