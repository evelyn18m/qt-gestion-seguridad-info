# Tasks: Fix Frontend Navigation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80–100 (2 edits + 14 deletes + post-implementation fixes) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All navigation fixes | PR 1 | Deletions + edits + post-implementation fixes + manual verification |

---

## Phase 1: Cleanup — Delete Dead Files

- [x] 1.1 Delete `frontend/pages/inicio.vue` — dead home page with broken `UiCard*` references
- [x] 1.2 Delete all 13 stubs in `frontend/pages/catalogos/`: `amenazas.vue`, `vulnerabilidades.vue`, `impactos.vue`, `formatos.vue`, `subprocesos.vue`, `macroprocesos.vue`, `tipos-activo.vue`, `valoraciones.vue`, `funcionarios.vue`, `areas.vue`, `tipos-control.vue`, `riesgos.vue`, `probabilidades.vue`
- [x] 1.3 Remove the now-empty `frontend/pages/catalogos/` directory

## Phase 2: Core Implementation

- [x] 2.1 Edit `frontend/layouts/default.vue` — update the `catalogos` array: replace all 13 `path: '/catalogos/<type>'` entries with `path: '/catalogos?tipo=<type>'`
- [x] 2.2 Edit `frontend/pages/catalogos.vue` — add `const route = useRoute()` and update `onMounted` + `watch(() => route.query.tipo)` to auto-select catalog from query param on mount AND on subsequent navigation

## Phase 3: Post-Implementation Fixes (discovered during verification)

- [x] 3.1 Fix `watch` gap — `onMounted` only runs once; added `watch(() => route.query.tipo, checkTipoFromRoute)` so sidebar link clicks update the view reactively
- [x] 3.2 Fix active-class on sidebar sub-items — `NuxtLink active-class` only compares path, not query params; replaced with manual `isCatalogActive(path)` function in `default.vue` that checks both `route.path === '/catalogos'` AND `route.query.tipo === tipo`
- [x] 3.3 Add `const route = useRoute()` to `default.vue` for `isCatalogActive()` to work
- [x] 3.4 Remove duplicate catalog panel — `catalogos.vue` had an internal card list duplicating the sidebar; removed `.catalogo-list` div, `.catalogos-layout` wrapper, and all related CSS; content now fills full width

## Phase 4: Verification (manual — confirmed by user)

- [x] 4.1 Sidebar links work — URL changes to `/catalogos?tipo=<X>` and CRUD table renders for each
- [x] 4.2 Reactive navigation — clicking different sidebar links switches the catalog view without page reload
- [x] 4.3 Active link — only the currently selected catalog sub-item is highlighted in the sidebar
- [x] 4.4 No duplicate navigation — catalog card panel removed, sidebar is the sole navigation for catalogs
- [ ] 4.5 Direct URL `/catalogos?tipo=vulnerabilidades` — pre-selects catalog on load (not explicitly verified)
- [ ] 4.6 `/inicio` returns 404 (not explicitly verified)
- [ ] 4.7 `/catalogos/amenazas` returns 404 (not explicitly verified)
- [ ] 4.8 Zero `UiCard` console errors (not explicitly verified)
