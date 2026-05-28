# Proposal: Fix Frontend Navigation

## Intent

The Nuxt 4 frontend has broken navigation because `pages/catalogos.vue` coexists with `pages/catalogos/` directory — Nuxt treats `.vue` as the parent layout, but it has no `<NuxtPage>`, so 13 sidebar sub-links silently render nothing. Additionally the app has two home pages (`index.vue` + `inicio.vue`), a dead route, and broken component references. Users cannot navigate to any catalog sub-section. This change fixes the routing structure so every sidebar link works.

## Scope

### In Scope
- Fix `catalogos.vue` / `catalogos/` conflict — keep `catalogos.vue` as a standalone CRUD page, remove sub-route stubs, update sidebar links to `/catalogos?tipo=X`
- Resolve home page duplicate — designate `index.vue` as canonical home, delete or repurpose `inicio.vue`
- Fix broken `UiCard` / `UiCardContent` references (remove or replace with existing components)
- Fix sidebar "Inicio" link to point to the correct canonical home route

### Out of Scope
- Auth migration to `nuxt-oidc-auth` (separate change)
- Adding router-level auth middleware
- Removing `client_secret` from frontend code

## Capabilities

### New Capabilities
None

### Modified Capabilities
None

> Pure routing and file-structure fix — no new behavioral requirements, no spec-level changes.

## Approach

1. **Delete** `pages/catalogos/` directory and all stub sub-route files inside it
2. **Keep** `pages/catalogos.vue` — it already contains the CRUD logic; it becomes a standalone route at `/catalogos`
3. **Update sidebar** (`layouts/default.vue`) — replace 13 sub-links with direct `/catalogos?tipo=<X>` query-param links
4. **Delete** `pages/inicio.vue` — dead route, broken components, no inbound links
5. **Verify** `index.vue` renders correctly as home; sidebar "Inicio" already points to `/`
6. **Smoke-test** each sidebar link in dev server

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/pages/catalogos.vue` | Modified | Remove any layout wrapper behavior; stays as CRUD page |
| `frontend/pages/catalogos/` | Removed | Delete all sub-route stub files |
| `frontend/pages/inicio.vue` | Removed | Dead page with broken components |
| `frontend/layouts/default.vue` | Modified | Update 13 catalog sidebar links to query-param pattern |
| `frontend/pages/index.vue` | Verified | Confirm as canonical home — likely no code change |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sidebar links pass `tipo` param but `catalogos.vue` ignores it | Med | Verify `catalogos.vue` reads `$route.query.tipo` before deleting sub-routes |
| `inicio.vue` is linked from somewhere not found in exploration | Low | `grep -r "inicio"` before deletion |
| Deleting `catalogos/` breaks a dynamic import elsewhere | Low | Search for `import.*catalogos/` before deletion |

## Rollback Plan

All changes are file deletions and link text edits. Git revert is sufficient: `git revert HEAD` restores deleted files and reverts sidebar edits instantly.

## Dependencies

- None — this change is self-contained in `frontend/pages/` and `frontend/layouts/`

## Success Criteria

- [ ] Every sidebar link navigates to a visible, rendered page
- [ ] `/catalogos` renders CRUD content regardless of how it's reached
- [ ] No `UiCard` / `UiCardContent` console errors on any page
- [ ] `inicio.vue` route no longer exists (returns 404)
- [ ] `npm run dev` starts without routing warnings
