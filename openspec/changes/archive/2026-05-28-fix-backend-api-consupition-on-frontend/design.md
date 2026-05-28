# Design: Fix Backend API Consumption on Frontend

## Technical Approach

Centralize all backend HTTP communication behind two composables: `useApi()` (auth-aware fetch wrapper) and `useCatalog()` (cached catalog layer). `useApi()` reads the base URL from `runtimeConfig.public.apiUrl`, injects the Keycloak Bearer token via `useAuth().token`, and enforces `res.ok` checks on every call. `useCatalog()` wraps `useApi()` with a per-tipo in-memory cache (5-min TTL) + sessionStorage persistence + request deduplication, replacing the 12-request `Promise.all` storm in `valoracion.vue`. All three Vue files (`valoracion.vue`, `catalogos.vue`, `CatalogoManager.vue`) are migrated to these composables. A new `frontend/types/api.ts` file provides shared TypeScript interfaces replacing all `ref<any>` refs.

## Architecture Decisions

### Decision: Where composables live

**Choice**: `frontend/composables/useApi.ts` and `frontend/composables/useCatalog.ts`
**Alternatives considered**: `frontend/utils/api.ts` (utility fn) | `frontend/plugins/api.ts` (global plugin)
**Rationale**: Nuxt 4 composables auto-imported in `<script setup>` files; `useCatalog()` uses `onMounted` lifecycle, requiring it to be a composable, not a plain utility.

### Decision: Cache layer for `useCatalog()`

**Choice**: In-memory Map + sessionStorage with 5-min TTL
**Alternatives considered**: Pinia store | useState() | no cache
**Rationale**: Pinia adds a dependency with boilerplate; `useState()` is SSR-oriented and sessionStorage gives correct browser tab persistence; in-memory Map allows request deduplication before any async resolution.

### Decision: Auth token retrieval

**Choice**: `useAuth().token` (already exists at `frontend/composables/useAuth.ts`)
**Alternatives considered**: New composable wrapping `$keycloak.token` directly | Keycloak plugin access
**Rationale**: `useAuth()` already exposes `$keycloak.token` as a computed; adding another access point creates duplication and potential drift.

### Decision: `tipoControlId` → `tipoControl` rename scope

**Choice**: Rename field in frontend payload object only; document backend discrepancy
**Alternatives considered**: Change backend DTO field | Leave field name as-is
**Rationale**: Per scope rules, backend DTO changes are out of scope. The spec explicitly requires the rename in the frontend payload. A discrepancy exists: Prisma schema `DetalleRiesgo.tipoControlId` and backend DTO `tipoControlId` both use `tipoControlId` — not `tipoControl` as the spec states. This MUST be clarified before apply (see Open Questions).

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Vue page / component (valoracion.vue, catalogos.vue, etc.) │
└────────────────────────┬────────────────────────────────────┘
                         │ useCatalog('amenazas').data
                         │ useApi().get('/catalogos/amenazas')
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  useCatalog(tipo)                                           │
│  ├─ cache check (memory Map)                               │
│  ├─ sessionStorage check (TTL < 5min)                     │
│  └─ deduplication (pending request Map) ─────────────┐     │
└────────────────────────────────────────────────────────│─────┘
                         │ (cache miss / force reload)         │
                         ▼                                     │
┌─────────────────────────────────────────────────────────────┐
│  useApi()                                                  │
│  ├─ useRuntimeConfig().public.apiUrl  → base URL           │
│  ├─ useAuth().token                 → Bearer <token>       │
│  └─ fetch() with res.ok enforcement                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  NestJS Backend       │
              │  (http://backend:3001)│
              └──────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/composables/useApi.ts` | Create | Auth-aware fetch wrapper; base URL from runtimeConfig |
| `frontend/composables/useCatalog.ts` | Create | Caching composable; 5-min TTL + sessionStorage + dedup |
| `frontend/types/api.ts` | Create | Shared TypeScript interfaces: `CatalogoItem`, `CatalogoTipo`, `ValoracionRow`, `DetalleRiesgoPayload`, `CreateValoracionBody` |
| `frontend/nuxt.config.ts` | Modify | Add `runtimeConfig.public.apiUrl` with default `'http://localhost:3001'` |
| `frontend/pages/valoracion.vue` | Modify | Replace 12-request Promise.all with `useCatalog()`; replace raw fetch with `useApi()`; fix `tipoControlId` → `tipoControl` in `detallesPayload` (line ~366); type all refs |
| `frontend/pages/catalogos.vue` | Modify | Replace all `fetch()` calls with `useApi()`; add res.ok enforcement on `selectCatalogo`; type refs |
| `frontend/components/CatalogoManager.vue` | Modify | Replace all `fetch()` calls with `useApi()`; add res.ok enforcement; type refs |

## Interfaces / Contracts

```typescript
// frontend/types/api.ts

export interface CatalogoItem {
  id: number
  [key: string]: string | number | boolean | null
}

export interface CatalogoTipo {
  id: number
  tipo: string
  modelo: string
}

export interface DetalleRiesgoPayload {
  id?: number
  tipo: 'amenaza' | 'vulnerabilidad'
  catalogoId: number
  riesgoId: number | null
  evaluacionRiesgo: number | null
  nivelRiesgo: string | null
  metodoTratamiento: string | null
  tipoControl: number | null   // renamed from tipoControlId per spec
  riesgoControlId: number | null
  evaluacionRiesgoControl: number | null
  nivelRiesgoControl: string | null
}

export interface ValoracionRow {
  id: number
  nombreActivo: string
  macroProcesoId: number
  // ... all fields from backend enrichment
}

export interface CreateValoracionBody {
  nombreActivo: string
  tipoActivoId: number
  // ... all fields matching backend CreateValoracionDto
  detallesRiesgo: DetalleRiesgoPayload[]
}
```

## Implementation Sketch: `useApi()`

```typescript
// frontend/composables/useApi.ts

export const useApi = () => {
  const config = useRuntimeConfig()
  const { token } = useAuth()

  const baseUrl = config.public.apiUrl as string

  async function request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }

    const url = `${baseUrl}${path}`
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} — ${res.statusText} [${path}]`)
    }

    return res.json() as Promise<T>
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  }
}
```

## Implementation Sketch: `useCatalog()`

```typescript
// frontend/composables/useCatalog.ts

interface CacheEntry<T> {
  data: T
  expiry: number // Unix ms
}

const memoryCache = new Map<string, CacheEntry<unknown>>()
const pendingRequests = new Map<string, Promise<unknown>>()
const TTL_MS = 5 * 60 * 1000

export const useCatalog = <T = unknown>(tipo: string) => {
  const api = useApi()
  const data = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref('')

  function getSession(key: string): CacheEntry<T> | null {
    try {
      const raw = sessionStorage.getItem(key)
      if (!raw) return null
      const parsed = JSON.parse(raw) as CacheEntry<T>
      return parsed
    } catch {
      return null
    }
  }

  function setSession(key: string, entry: CacheEntry<T>) {
    sessionStorage.setItem(key, JSON.stringify(entry))
  }

  async function fetchCatalog(force = false) {
    const cacheKey = `catalog:${tipo}`
    const now = Date.now()

    // 1. Memory cache hit
    const memEntry = memoryCache.get(cacheKey) as CacheEntry<T> | undefined
    if (!force && memEntry && now < memEntry.expiry) {
      data.value = memEntry.data
      return
    }

    // 2. SessionStorage cache hit
    const sesEntry = getSession(cacheKey)
    if (!force && sesEntry && now < sesEntry.expiry) {
      data.value = sesEntry.data
      memoryCache.set(cacheKey, sesEntry)
      return
    }

    // 3. Deduplicate concurrent requests
    const existing = pendingRequests.get(cacheKey)
    if (existing) {
      data.value = await existing as T[]
      return
    }

    // 4. Fetch
    const promise = api.get<T[]>(`/catalogos/${tipo}`)
      .then((result) => {
        const entry: CacheEntry<T> = { data: result, expiry: now + TTL_MS }
        memoryCache.set(cacheKey, entry as CacheEntry<unknown>)
        setSession(cacheKey, entry)
        return result
      })
      .finally(() => {
        pendingRequests.delete(cacheKey)
      })

    pendingRequests.set(cacheKey, promise as Promise<unknown>)
    loading.value = true
    error.value = ''

    try {
      data.value = await promise
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    reload: () => fetchCatalog(true),
    // initial fetch on first call
    ...(() => { fetchCatalog(); return {} })(),
  }
}
```

## Integration Migration Plan

### `catalogos.vue`
- `loadCatalogoTipos()`: replace `fetch('http://localhost:3001/catalogos')` with `useApi().get<CatalogoTipo[]>('/catalogos')`
- `selectCatalogo()`: replace `fetch(.../catalogos/${tipo})` with `useApi().get<CatalogoItem[]>(...)`; add res.ok check (already has one on line 13 — confirm it's preserved)
- `saveCatalogoItem()`: replace all `fetch()` with `useApi().post/patch/delete()`; the existing `if (!res.ok)` on line 101 is removed (now handled inside `useApi`)
- `deleteCatalogoItem()`: replace `fetch()` with `useApi().delete()`
- Type `catalogoTipos` as `Ref<CatalogoTipo[]>`, `catalogoItems` as `Ref<CatalogoItem[]>`

### `valoracion.vue`
- `loadValoracionData()`: replace `Promise.all(tipos.map(t => fetch(...)))` with individual `useCatalog(tipo).data` assignments. Each `valXXX.value = results[N]` becomes `valXXX.value = catalogData.value`
- `submitValoracion()`: replace all `fetch()` with `useApi().post/patch()`; the res.ok check on line 407 is now in `useApi`
- `loadValoraciones()`: replace `fetch('http://localhost:3001/valoraciones')` with `useApi().get<ValoracionRow[]>('/valoraciones')`
- `deleteValoracion()`: replace `fetch(... DELETE)` with `useApi().delete()`
- **tipoControl fix**: In `detallesPayload` construction (line 366), rename `tipoControlId: d.tipoControlId` → `tipoControl: d.tipoControlId` (field name in the JS object literal)
- All `ref<any[]>` catalog refs typed as `Ref<CatalogoItem[]>`

### `CatalogoManager.vue`
- `loadItems()`: replace `fetch()` with `useApi().get<CatalogoItem[]>()`
- `saveItem()`: replace `fetch()` with `useApi().post/patch()`
- `deleteItem()`: replace `fetch()` with `useApi().delete()`
- Type `items` as `Ref<CatalogoItem[]>`

## Error Handling Strategy

- `useApi()` throws on every non-2xx response with `HTTP {status} — {statusText} [{path}]`
- Callers catch via try/catch (existing pattern in all three files — no change needed to error flow)
- `useCatalog()` surfaces fetch errors in `error` ref; components display via existing `error` UI
- `selectCatalogo()` in `catalogos.vue` already has try/catch — error display preserved
- Token null/undefined: `useApi()` skips `Authorization` header gracefully (no throw)

## Rollback Plan

1. Revert `nuxt.config.ts` to remove `runtimeConfig` block
2. Delete `frontend/composables/useApi.ts`, `frontend/composables/useCatalog.ts`, `frontend/types/api.ts`
3. Restore original `fetch('http://localhost:3001/...')` URLs in all three Vue files
4. Restore `tipoControlId` field name in `detallesPayload` (valoracion.vue line 366)
5. No DB migration required

## Testing Strategy

| Layer | What | Approach |
|-------|------|---------|
| Unit | `useApi()` token injection, res.ok throw | Vitest unit test (no frontend runner currently — see gap) |
| Integration | `useCatalog()` cache hit/miss, TTL expiry, dedup | Manual: network tab shows ≤3 requests on valoracion mount |
| E2E | Full flow: login → load catalog → submit valoracion | Docker smoke test with Keycloak |
| Acceptance | AC1: `grep -r "localhost:3001" frontend/` | Zero matches |

**Frontend testing gap**: Per `openspec/config.yaml`, no frontend test runner exists (`runner: none`). Strict TDD is backend-only. Frontend testing is manual verification only.

## Open Questions

- [ ] **`tipoControlId` vs `tipoControl` discrepancy**: The spec says to rename to `tipoControl`, but backend `DetalleRiesgoDto` line 9 has `tipoControlId`, Prisma schema line 143 has `tipoControlId`, and the service spreads `...d` directly. If we send `tipoControl` in the payload, the Prisma insert will create a column named `tipoControlId` with value undefined/null. Clarification required: should the backend DTO also be changed to use `tipoControl` (out of scope per current spec)? Or is the spec field name wrong?
- [ ] `useCatalog()` returns `{ data, loading, error, reload }` but the initial fetch fires during composable construction — callers assign returned refs directly. Verify this works correctly with Nuxt's `readonly()` wrapping.
