# Exploration: corregir-navegacion-de-frontend

## Current State

The Nuxt 4 frontend has a **dual-navigation architecture** with a critical structural conflict: the sidebar in `layouts/default.vue` lists 13 catalog sub-routes (`/catalogos/amenazas`, `/catalogos/vulnerabilidades`, etc.) that have corresponding page files under `pages/catalogos/`, BUT there also exists a `pages/catalogos.vue` flat page that implements all catalog management in a single component with click-based selection (no routing). Additionally, there is a `pages/inicio.vue` page that is never reachable because the sidebar "Inicio" link points to `/` (which renders `pages/index.vue`), creating a dead page. There is also an `inicio.vue` page that references `UiCard` / `UiCardContent` components that do not exist anywhere in the codebase.

Authentication is a custom hand-rolled OIDC flow (`useAuth.ts`) using Keycloak's password grant directly from the browser — NOT using `nuxt-oidc-auth` despite it being installed and configured in `nuxt.config.ts`.

## Affected Areas

- `frontend/pages/index.vue` — root route `/`, currently the landing dashboard (minimal, empty grid)
- `frontend/pages/inicio.vue` — route `/inicio`, DEAD: never linked in sidebar; uses `UiCard` components that don't exist
- `frontend/pages/catalogos.vue` — route `/catalogos`, implements full catalog CRUD as a single-page component; conflicts with sub-routes
- `frontend/pages/catalogos/` — 13 sub-route files (`/catalogos/amenazas`, etc.) that exist as files but are empty stubs or may never render because `catalogos.vue` shadows them in Nuxt 4 routing
- `frontend/layouts/default.vue` — sidebar with 13 sub-links pointing to `/catalogos/*` routes AND a "Inicio" link pointing to `/` (not `/inicio`)
- `frontend/pages/valoracion.vue` — route `/valoracion`, properly linked from sidebar; exists and is functional
- `frontend/composables/useAuth.ts` — custom auth using Keycloak password grant; NOT using nuxt-oidc-auth
- `frontend/nuxt.config.ts` — declares `nuxt-oidc-auth` module with `globalMiddlewareEnabled: false` but it is never used
- `frontend/app.vue` — auth gate: shows login form if `!isLoggedIn`, wraps `<NuxtLayout>/<NuxtPage>` when logged in

## Key Issues Found

### Issue 1 — Route/Page Conflict: `catalogos.vue` vs `catalogos/` directory
In Nuxt 4 file-based routing, having both `pages/catalogos.vue` AND `pages/catalogos/` creates a parent-child layout conflict. `catalogos.vue` acts as a **layout wrapper** for the sub-routes, NOT as a standalone page at `/catalogos`. This means:
- Navigating to `/catalogos` renders `catalogos.vue` (which has the full CRUD logic) but without a `<NuxtPage>` slot — the sub-pages in `catalogos/` are inaccessible
- The 13 sidebar links to `/catalogos/amenazas` etc. navigate to routes that technically exist but render inside a parent that wasn't designed for it

### Issue 2 — Dead Page: `inicio.vue`
`pages/inicio.vue` is never linked from anywhere. The sidebar "Inicio" link points to `/` (index.vue). The `/inicio` route is a dead end. Additionally, `inicio.vue` references `UiCard`, `UiCardHeader`, `UiCardTitle`, `UiCardContent` components which are not registered anywhere — rendering this page would cause component resolution errors.

### Issue 3 — Sidebar Points to Wrong Home Route
The sidebar "Inicio" nav item uses `to="/"` which lands on `index.vue` (minimal empty dashboard). If the intent was to use `inicio.vue` as the home page, the sidebar link is wrong AND `index.vue` and `inicio.vue` are duplicates solving the same purpose.

### Issue 4 — nuxt-oidc-auth Installed But Unused
`nuxt.config.ts` declares `nuxt-oidc-auth` as a module and configures it for Keycloak. However, `useAuth.ts` implements a completely custom password-grant flow calling Keycloak directly from the browser (exposing `client_secret` in frontend code). The OIDC module's middleware is disabled (`globalMiddlewareEnabled: false`). This is both a security issue and dead configuration.

### Issue 5 — No Route Guards
After login, there are no route-level guards. Any unauthenticated user who bypasses the `app.vue` `v-if` guard (e.g., direct URL navigation, SSR inconsistency) would see pages without auth. The `isLoggedIn` check only lives in `app.vue`'s template — it's not enforced at the router level.

### Issue 6 — `catalogos/` Sub-Pages Are Stubs or Empty
The 13 files under `pages/catalogos/` likely exist but their content is unknown. Given the CRUD logic is in `catalogos.vue`, these are probably empty or minimally populated.

## Approaches

### Option A — Fix routing: consolidate to single `/catalogos` route (remove sub-routes)
Remove the `pages/catalogos/` directory entirely. Change sidebar sub-links to use anchor/hash navigation or section-switching within the single `catalogos.vue` component.
- Pros: Minimal change, preserves working CRUD in `catalogos.vue`, no routing conflicts
- Cons: URLs don't reflect selected catalog, back-button doesn't work per catalog
- Effort: Low

### Option B — Fix routing: migrate CRUD to proper sub-route pages
Keep `pages/catalogos/` sub-routes and add a `<NuxtPage>` slot or restructure `catalogos.vue` as a proper layout parent. Move CRUD logic into each sub-page (or a shared component).
- Pros: Clean Nuxt 4 routing, deep-linkable URLs per catalog
- Cons: Significant refactor, 13 pages need CRUD wiring
- Effort: High

### Option C — Hybrid: `catalogos.vue` as parent layout with `<NuxtPage>`, content in sub-routes
Restructure `catalogos.vue` to be a layout that renders the catalog list on the left sidebar and uses `<NuxtPage>` for the right panel. Each sub-route handles its items.
- Pros: Proper Nuxt 4 pattern, URLs work, reuses existing list component
- Cons: Medium complexity, requires restructuring `catalogos.vue`
- Effort: Medium

## Recommendation

**Option A** is the correct minimal fix for "corregir-navegacion-de-frontend":
1. Remove (or keep but not link) `pages/catalogos/` stub files — sidebar links should point to `/catalogos` with query param `?tipo=amenazas`
2. Fix the "Inicio" link: decide between `index.vue` and `inicio.vue` as the real home. Delete the unused one. Fix `inicio.vue`'s broken component references.
3. Document (but do not fix in this change) the `nuxt-oidc-auth` / custom auth issue — that's a separate security concern.

If clean URL-per-catalog is desired, Option C is the right long-term approach but is a separate, bigger change.

## Risks

- `pages/catalogos/` sub-route files may have content that would be lost if removed — must inspect all 13 before deleting
- The `nuxt-oidc-auth` module is installed but misconfigured; touching auth while fixing navigation could break login
- `inicio.vue` uses `UiCard` components — fixing the dead link requires either registering those components or rewriting the page
- No test runner in frontend means changes cannot be verified via automated tests

## Ready for Proposal

Yes — scope is clear. Recommend scoping the change to:
1. Fix the catalogos routing conflict (Option A: sidebar links → `/catalogos?tipo=X` OR remove sub-route files)
2. Resolve the `index.vue` vs `inicio.vue` duplicate (pick one, delete the other)
3. Fix broken `UiCard` components in `inicio.vue` (if kept)
4. Leave `nuxt-oidc-auth` / auth security as a separate change

---

## Metadata
- **status**: success
- **files_reviewed**: frontend/app.vue, frontend/nuxt.config.ts, frontend/layouts/default.vue, frontend/pages/index.vue, frontend/pages/inicio.vue, frontend/pages/catalogos.vue, frontend/pages/catalogos/ (13 files listed), frontend/pages/valoracion.vue, frontend/composables/useAuth.ts
- **skill_resolution**: paths-injected (read /home/bryan/.config/opencode/skills/sdd-explore/SKILL.md directly)
