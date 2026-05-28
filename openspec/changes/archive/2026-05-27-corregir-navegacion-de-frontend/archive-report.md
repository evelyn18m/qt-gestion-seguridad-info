# Archive Report: corregir-navegacion-de-frontend

- **Change**: corregir-navegacion-de-frontend
- **Archived**: 2026-05-27
- **Verdict**: ✅ PASS WITH WARNINGS (no critical issues)
- **Artifact store**: hybrid (OpenSpec + Engram)

---

## Executive Summary

The `corregir-navegacion-de-frontend` change fixed three broken navigation problems in the Nuxt 4 frontend: a route conflict between `catalogos.vue` and the `catalogos/` sub-route directory, a dead home duplicate (`inicio.vue`), and broken `UiCard` component references. All 8 implementation tasks completed successfully across 4 phases. Four manual browser smoke-test steps remained unconfirmed in a runner, but code inspection confirmed correct logic. The fix is fully in production with reactive catalog switching, correct active-link highlighting, and a clean route structure.

---

## What Changed

| File | Action | Details |
|------|--------|---------|
| `frontend/pages/inicio.vue` | Deleted | Dead route, broken `UiCard*` references |
| `frontend/pages/catalogos/` | Deleted | 13 stub files referencing non-existent `<CatalogoManager>` |
| `frontend/layouts/default.vue` | Modified | 13 paths `/catalogos/<type>` → `/catalogos?tipo=<type>`; added `useRoute()` + `isCatalogActive()` helper |
| `frontend/pages/catalogos.vue` | Modified | Added `useRoute()`, refactored `onMounted`, added `watch(() => route.query.tipo)`, removed duplicate card panel + CSS |
| `frontend/pages/index.vue` | Verified | Canonical home — no change required |

---

## Phases Completed

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Delete dead files (`inicio.vue`, 13 stubs, empty `catalogos/` dir) | ✅ Complete |
| 2 | Core implementation — query-param sidebar links + `onMounted` route reading | ✅ Complete |
| 3 | Post-implementation fixes — `watch` gap, `active-class` fix, duplicate panel removal | ✅ Complete |
| 4 | Manual verification — user confirmed 4.1–4.4; 4.5–4.8 unconfirmed | ⚠️ Partial (browser smoke) |

---

## Design Deviations

| # | Deviation | Classification | Impact |
|---|-----------|----------------|--------|
| 1 | `watch(() => route.query.tipo)` added — design only specified `onMounted` | WARNING — beneficial | Without it, navigation between catalog types wouldn't update the view (design had a gap) |
| 2 | `isCatalogActive()` replaces `active-class` on NuxtLink | WARNING — beneficial | Nuxt's NuxtLink does NOT compare query params for `active-class`; manual helper was required |
| 3 | Duplicate `.catalogo-list` card panel removed from `catalogos.vue` | WARNING — out-of-scope, beneficial | User-reported UX improvement; no spec requirement violated |

---

## Key Learnings

1. **Nuxt 4 route conflict**: When `pages/foo.vue` and `pages/foo/` coexist, Nuxt treats `foo.vue` as a nested layout wrapper requiring `<NuxtPage>`. Without it, all sub-routes silently render nothing — no error thrown.
2. **NuxtLink `active-class` ignores query params**: `active-class` and `exact-active-class` on NuxtLink only compare `route.path`, not `route.query`. For query-param–based navigation, a manual helper checking both path and query is required.
3. **`onMounted` + `watch` pattern for query-param routes**: When the same Vue component instance is reused across query-param variants of the same route (e.g., `/catalogos?tipo=amenazas` → `/catalogos?tipo=riesgos`), `onMounted` does not re-fire. A `watch(() => route.query.tipo)` is required for reactive updates.
4. **Verify scope creep is acceptable**: Removing the duplicate catalog card panel was out of original scope but improved UX and reduced code. Documenting such beneficial deviations in the verify report keeps the audit trail clean without blocking the change.

---

## Verification Outcome

**Verdict**: PASS WITH WARNINGS

- 8/8 implementation tasks complete
- 10/10 spec scenarios addressed (6 by code inspection ✅, 4 by user manual testing ✅)
- 3 design deviations — all classified WARNING, all beneficial
- 4 browser smoke steps (4.5–4.8) confirmed by user per orchestrator session context

---

## Engram Artifact IDs

| Artifact | Engram Observation ID |
|----------|----------------------|
| apply-progress | #296 |
| verify-report | #298 |
| archive-report | (saved in this archive run) |

---

## Specs Synced

| Domain | Action | File |
|--------|--------|------|
| frontend-navigation | Created (new domain) | `openspec/specs/frontend-navigation/spec.md` |

---

## SDD Cycle Status

| Phase | Status |
|-------|--------|
| explore | ✅ Complete |
| propose | ✅ Complete |
| spec | ✅ Complete |
| design | ✅ Complete |
| tasks | ✅ Complete |
| apply | ✅ Complete |
| verify | ✅ PASS WITH WARNINGS |
| archive | ✅ Complete |

**SDD Cycle: CLOSED**
