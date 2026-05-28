# Design: Fix Frontend Navigation

## Technical Approach

Replace the broken `pages/catalogos/` sub-route architecture with a flat query-param model: sidebar links point to `/catalogos?tipo=<X>`, `catalogos.vue` reads `route.query.tipo` on mount and auto-selects the matching catalog. Delete all stubs and the dead `inicio.vue`. No structural refactor — the existing CRUD logic in `catalogos.vue` is preserved entirely.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep sub-routes, add `<NuxtPage>` to `catalogos.vue` | Medium refactor; each sub-route still renders nothing unless CRUD is duplicated per page | ❌ Rejected |
| Query-param on `/catalogos?tipo=X` | URL reflects selected catalog; back-button works per selection; zero structural change to CRUD logic | ✅ Chosen |
| Hash navigation (`/catalogos#amenazas`) | No routing, browser history doesn't track catalog changes | ❌ Rejected |

**Rationale**: The CRUD engine in `catalogos.vue` already uses `selectCatalogo(tipo)` to switch content. Feeding it from `route.query.tipo` instead of a click event is a 3-line change. No logic moves, no new components, no new files.

## Data Flow

```
Sidebar NuxtLink :to="/catalogos?tipo=amenazas"
    │
    ▼
Router navigates to /catalogos?tipo=amenazas
    │
    ▼
catalogos.vue — onMounted()
    ├── loadCatalogoTipos()  (existing — fetches catalog list from API)
    └── if route.query.tipo → find match in catalogoTipos → selectCatalogo(match)
                                                            │
                                                            ▼
                                                    renders CRUD table
```

**Without `?tipo`**: `onMounted` only calls `loadCatalogoTipos()`. Welcome banner + catalog list render (existing behavior — no change).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/pages/catalogos.vue` | Modify | Add `useRoute()` + `watchEffect` / `onMounted` hook to read `route.query.tipo` and call `selectCatalogo` after tipos are loaded |
| `frontend/layouts/default.vue` | Modify | Change `catalogos` array: replace `path: '/catalogos/<type>'` → `path: '/catalogos?tipo=<type>'` for all 13 entries |
| `frontend/pages/catalogos/amenazas.vue` | Delete | Stub — references non-existent `<CatalogoManager>` |
| `frontend/pages/catalogos/vulnerabilidades.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/impactos.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/formatos.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/subprocesos.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/macroprocesos.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/tipos-activo.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/valoraciones.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/funcionarios.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/areas.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/tipos-control.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/riesgos.vue` | Delete | Same pattern |
| `frontend/pages/catalogos/probabilidades.vue` | Delete | Same pattern |
| `frontend/pages/inicio.vue` | Delete | Dead route — never linked, references non-existent `UiCard*` components |

## Interfaces / Contracts

**`catalogos.vue` — query param integration** (addition to existing `onMounted`):

```ts
// Add at top of <script setup>
const route = useRoute()

// Replace current onMounted with:
onMounted(async () => {
  await loadCatalogoTipos()
  const tipo = route.query.tipo as string
  if (tipo) {
    const match = catalogoTipos.value.find((t: any) => t.tipo === tipo)
    if (match) selectCatalogo(match)
  }
})
```

**`layouts/default.vue` — catalogos array** (path values only change):

```ts
// Before:
{ path: '/catalogos/amenazas', label: 'Amenazas' }

// After:
{ path: '/catalogos?tipo=amenazas', label: 'Amenazas' }
// (same pattern for all 13 entries)
```

The `NuxtLink :to="c.path"` binding in the template is unchanged — it already handles string paths.

**`active-class` consideration**: `NuxtLink` with `active-class="active"` will correctly mark the sub-item active when the full path including query param matches. No template changes needed in the submenu loop.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual (browser) | Each of 13 sidebar links renders correct CRUD content | Click each link, verify URL and rendered table |
| Manual (browser) | Direct URL `/catalogos?tipo=vulnerabilidades` pre-selects catalog | Navigate directly, confirm table appears |
| Manual (browser) | `/inicio` and `/catalogos/amenazas` return 404 | Direct URL in browser |
| Manual (console) | Zero component resolution errors | DevTools console after visiting each page |
| Manual (terminal) | Dev server starts without routing warnings | `docker compose exec frontend npm run dev` |

No automated test runner exists in the frontend — manual verification only.

## Migration / Rollout

No migration required. All changes are file deletions and in-place edits. Rollback: `git revert HEAD`.

## Open Questions

None — all three open questions from the spec are resolved:
- `catalogos.vue` does NOT read `route.query.tipo` → add ~5 lines in `onMounted` (designed above)
- All 13 stub files confirmed empty (reference non-existent `<CatalogoManager>`) → safe to delete
- No `?tipo` param → shows welcome banner + list (existing behavior, no change needed)
