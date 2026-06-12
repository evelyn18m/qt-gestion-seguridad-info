# Spec: corregir-navegacion-de-frontend

## 1. Overview

### Problem Statement

The Nuxt 4 frontend has three broken navigation issues:

1. **Route conflict**: `pages/catalogos.vue` (standalone CRUD page) coexists with `pages/catalogos/` directory (13 sub-route stubs). Nuxt 4 treats `catalogos.vue` as a parent layout wrapper — but it has no `<NuxtPage>` slot — making all 13 sidebar catalog sub-links render nothing.
2. **Dead route**: `pages/inicio.vue` at `/inicio` is never linked from the sidebar, references non-existent components (`UiCard`, `UiCardContent`), and would crash on render.
3. **Duplicate home**: Both `pages/index.vue` and `pages/inicio.vue` serve the home concept; sidebar "Inicio" links to `/` (index.vue) correctly, but the existence of `inicio.vue` creates ambiguity and dead code.

### Solution Summary

Remove the `pages/catalogos/` sub-route stubs, update the 13 sidebar links to use `/catalogos?tipo=<X>` query params, and delete `pages/inicio.vue`. The canonical home remains `index.vue` at `/`.

### Scope

| In Scope | Out of Scope |
|---|---|
| Fix sidebar catalog links → `/catalogos?tipo=X` | Auth migration to `nuxt-oidc-auth` |
| Remove `pages/catalogos/` stub files | Adding route-level auth guards |
| Delete `pages/inicio.vue` | Removing `client_secret` from frontend code |
| Confirm `index.vue` as canonical home | |
| Verify `catalogos.vue` reads `?tipo` query param | |

---

## 2. Requirements

### Requirement: Catalog Sidebar Links Must Resolve to Rendered Content

The sidebar MUST link to `/catalogos?tipo=<catalog-type>` for all 13 catalog entries. The `/catalogos` route MUST render visible CRUD content.

#### Scenario: User clicks catalog sub-link

- GIVEN the user is authenticated and on any page
- WHEN they click a catalog item in the sidebar (e.g., "Amenazas")
- THEN they navigate to `/catalogos?tipo=amenazas`
- AND `catalogos.vue` renders with that catalog type pre-selected

#### Scenario: Direct URL navigation to catalog sub-type

- GIVEN the user navigates directly to `/catalogos?tipo=vulnerabilidades`
- WHEN the page loads
- THEN `catalogos.vue` MUST pre-select the matching catalog type from the `tipo` query param

#### Scenario: No sub-route stubs exist

- GIVEN the `pages/catalogos/` directory has been removed
- WHEN the user navigates to `/catalogos/amenazas`
- THEN Nuxt MUST return a 404 (no stale route resolves)

---

### Requirement: Home Route Must Be Unambiguous

The application MUST have exactly one home page. `pages/index.vue` SHALL be the canonical home route at `/`.

#### Scenario: Sidebar "Inicio" click

- GIVEN the user is on any page
- WHEN they click "Inicio" in the sidebar
- THEN they navigate to `/`
- AND `index.vue` renders without errors

#### Scenario: Dead route removed

- GIVEN `pages/inicio.vue` has been deleted
- WHEN the user navigates to `/inicio`
- THEN Nuxt MUST return a 404

---

### Requirement: No Broken Component References

The application MUST NOT reference components that are not registered or imported.

#### Scenario: No UiCard errors after fix

- GIVEN `pages/inicio.vue` has been deleted
- WHEN any page in the application loads
- THEN the browser console MUST NOT show component resolution errors for `UiCard`, `UiCardHeader`, `UiCardTitle`, or `UiCardContent`

### Requirement: ReportesTabs Component Includes Four Report Tabs

> **Added by change**: `reporte-evaluacion-riesgo` (2026-06-12)
> **Modified by change**: `reporte-tratamiento-riesgo` (2026-06-12)
> (Previously: Component had three tabs: Valoración → Análisis → Evaluación)

The `ReportesTabs.vue` component MUST include four tabs. The tab order SHALL be: Valoración de Activos → Análisis de Riesgo → Evaluación de Riesgo → Tratamiento de Riesgo.

#### Scenario: Four tab links render

- GIVEN the user is on any `/reportes/*` page
- WHEN `ReportesTabs.vue` renders
- THEN four `<NuxtLink>` elements are present
- AND the fourth link has `to="/reportes/tratamiento-riesgo"` with text "Tratamiento de Riesgo"

#### Scenario: Active tab highlights correctly

- GIVEN the user is on `/reportes/evaluacion-riesgo`
- WHEN `ReportesTabs` renders
- THEN only the "Evaluación de Riesgo" tab has the `active` class
- AND the other three tabs do NOT have the `active` class

#### Scenario: Fourth tab active highlights correctly

- GIVEN the user is on `/reportes/tratamiento-riesgo`
- WHEN `ReportesTabs` renders
- THEN only the "Tratamiento de Riesgo" tab has the `active` class

#### Scenario: Tab navigation preserves filter state per tab

- GIVEN the user has applied filters on the Valoración page
- WHEN they click "Tratamiento de Riesgo" tab
- THEN they navigate to `/reportes/tratamiento-riesgo`
- AND the Tratamiento page loads with its own default (unfiltered) state
- AND returning to Valoración tab preserves the previous filter state

---

## 3. Expected Behavior After Fix

| Navigation Action | Before Fix | After Fix |
|---|---|---|
| Click "Amenazas" in sidebar | Navigates to `/catalogos/amenazas` — renders blank | Navigates to `/catalogos?tipo=amenazas` — CRUD renders |
| Click "Inicio" in sidebar | Navigates to `/` — renders `index.vue` | Same — no change needed |
| Direct URL `/inicio` | Renders broken `inicio.vue` (or crash) | Returns 404 |
| Direct URL `/catalogos/amenazas` | May render blank or conflict | Returns 404 |
| Direct URL `/catalogos?tipo=amenazas` | N/A (link didn't exist) | Renders `catalogos.vue` with type pre-selected |

**Sidebar collapse behavior**: The catalog sub-menu group in the sidebar MUST still expand/collapse as before. The nav items change their `to` attribute only — the accordion behavior is unchanged.

---

## 4. Files & Changes

| File | Action | Description |
|---|---|---|
| `frontend/pages/catalogos/` | **Deleted** | Remove all 13 sub-route stub files and the directory |
| `frontend/pages/inicio.vue` | **Deleted** | Dead page with broken component references |
| `frontend/layouts/default.vue` | **Modified** | Update `catalogos` array: change `path: '/catalogos/<type>'` → `path: '/catalogos?tipo=<type>'` for all 13 entries |
| `frontend/pages/catalogos.vue` | **Modified** | Add `useRoute()` to read `route.query.tipo` and auto-select matching catalog on mount |
| `frontend/pages/index.vue` | **Verified** | Confirm renders correctly as home — no code change expected |

---

## 5. Verification

Manual steps to verify the fix:

1. Start dev server: `docker compose exec frontend npm run dev`
2. Log in and confirm home page `/` renders without errors
3. Click each of the 13 catalog sidebar links — confirm each navigates to `/catalogos?tipo=<X>` and renders CRUD content
4. Confirm the selected catalog type matches the sidebar item clicked
5. Navigate directly to `/inicio` — confirm 404
6. Navigate directly to `/catalogos/amenazas` — confirm 404
7. Open browser DevTools console — confirm zero component resolution errors
8. Confirm `npm run dev` starts without routing warnings in the terminal

---

## 6. Open Questions

| # | Question | Impact | Owner |
|---|---|---|---|
| 1 | Does `catalogos.vue` currently read `route.query.tipo`? If not, must it be added? | High — without it, sidebar link target is correct but auto-select won't work | Developer |
| 2 | Are any of the 13 `pages/catalogos/` stub files non-empty? Exploration noted they are likely stubs, but this must be confirmed before deletion. | Med — if any have real content, it must be preserved | Developer |
| 3 | Should `/catalogos` (no `?tipo` param) show all catalogs or the first one? | Low — UX only, does not block the fix | Designer/PO |

---

## Metadata

- **change**: corregir-navegacion-de-frontend
- **type**: routing/structural fix
- **domains**: frontend-navigation
- **spec-type**: new (no existing navigation spec)
- **status**: ready-for-design
