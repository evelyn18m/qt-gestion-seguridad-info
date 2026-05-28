## Exploration: fix-backend-api-consupition-on-frontend

### Current State

The Nuxt 4 frontend communicates with the NestJS backend exclusively through raw `fetch()` calls scattered across Vue page/component files. There is **no abstraction layer**, no shared types, and no server-side API proxy. All API calls target `http://localhost:3001` directly (hardcoded URL, not environment-driven).

### Affected Areas

- `frontend/pages/catalogos.vue` — Direct `fetch` to catalogos endpoints (GET list, GET one, POST, PATCH, DELETE)
- `frontend/pages/valoracion.vue` — Direct `fetch` to catalogos + valoraciones endpoints; massive Promise.all loading all 12 catalog types simultaneously on mount
- `frontend/components/CatalogoManager.vue` — Duplicated fetch logic identical to catalogos.vue
- `frontend/composables/useAuth.ts` — Keycloak integration only; auth token is NOT forwarded to backend API calls (CORS/auth gap)
- `frontend/nuxt.config.ts` — No proxy config, no env vars for API URL, no runtime config
- `backend/src/catalogos/` — CatalogosController exposes generic CRUD over `/:tipo` and `/:tipo/:id`
- `backend/src/valoraciones/` — ValoracionesController exposes full CRUD for ValoracionActivo with nested DetalleRiesgo

### Key Findings

1. **Hardcoded `localhost:3001`** — No `NUXT_PUBLIC_API_URL`, no `runtimeConfig`, no proxy. Changing the backend port or deploying behind a reverse proxy breaks every call site. Three files affected with 14+ occurrences.

2. **No auth token forwarding** — The Keycloak plugin initializes and stores the JWT in `$keycloak.token`, but `useAuth.ts` only exposes it as a computed for UI use. **Zero API calls send the Bearer token.** The backend has noauth guard on any endpoint — this is a security gap and also prevents proper CORS preflight handling if the backend eventually adds auth.

3. **No shared DTOs or types** — Frontend uses `ref<any[]>` and `ref<any>` everywhere. Backend DTOs (CreateValoracionDto, etc.) are TypeScript classes never exposed to the frontend. Field names are not validated at runtime; mismatches between frontend payload and backend expectations silently fail.

4. **Massive `Promise.all` on valoracion.vue mount** — `loadValoracionData()` fires 12 simultaneous `fetch()` calls to `/catalogos/{tipo}` for each catalog type. No deduplication, no caching, no loading states per-catalog. Every navigation to the valoracion page repeats this.

5. **No error handling on several endpoints** — `loadValoraciones()` (line 339) and `deleteValoracion()` (line 488) swallow errors silently with empty catch blocks. Network failures, 5xx errors, or malformed responses go unnoticed.

6. **`selectCatalogo` in catalogos.vue does NOT check `res.ok`** — Unlike every other fetch in the codebase, line 24-25: `const res = await fetch(...); catalogoItems.value = await res.json()` — if the backend returns 400/404/500, the code proceeds to parse non-JSON error pages or empty bodies.

7. **Backend DTO vs Frontend payload mismatches** — `CreateValoracionDto.tipoControl` is a `number` (the control type ID), but `valoracion.vue` sends it as part of `tratamientoForm` which binds to `d.tipoControlId` (different field name). The `enrich()` service method reads `item.tipoControl` (line 36-40 of valoraciones.service.ts) which it maps to `tipoControl` in the returned object — but the frontend sends `tipoControlId`. This is a field name mismatch.

8. **No API base URL abstraction** — If the backend runs on a different host (e.g., Docker networking with service name `backend` instead of `localhost`), every hardcoded URL breaks. Works in dev, fails in containerized prod.

9. **`valMacroprocesos` loaded but not displayed correctly on edit** — `editValoracion` maps `macroProcesoId` to `analisisForm.macroProceso` as a string (line 447), but the comparison in `macroProcesoName` computed (line 66-69) does `Number(id)` against `valMacroprocesos.value.find`. This works because `m.id` from Prisma is a number and `macroProceso` is stored as string — loose typing hides potential bugs.

10. **No loading state granularity** — `valLoading` covers the entire data load but 12 promises fire at once. If 11 succeed and 1 fails, the error handling sets `valLoading = false` anyway and only `console.error` fires. No per-catalog error state.

### Risks

- **Hardcoded URLs** will break when deploying with Docker Compose if backend service name differs from `localhost`
- **No auth token on API calls** means backend cannot protect endpoints with Keycloak JWT validation
- **Untyped responses** mean frontend can break silently when backend response shape changes
- **Swallowed errors** mean users see no feedback when API calls fail
- **Massive N+1-equivalent on page load** — 12 simultaneous requests every mount with no caching
- **Field name mismatch** (`tipoControlId` vs `tipoControl`) in valoraciones submit may cause incorrect/missing control type associations

### Ready for Proposal

**Yes.** The issues are clear and actionable. The next phase (sdd-propose) should define the scope of the fix: whether it covers only the URL/config problem or also includes auth token forwarding, shared types, caching layer, and error handling improvements.