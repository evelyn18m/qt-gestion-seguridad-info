# Archive Report: fix-backend-api-consupition-on-frontend

**Status**: ✅ COMPLETE
**Archived**: 2026-05-28
**Change**: fix-backend-api-consupition-on-frontend
**Mode**: Hybrid (OpenSpec + Engram)

---

## Executive Summary

Fixed backend API consumption on the Nuxt 4 frontend by centralizing all HTTP communication through two composables: `useApi()` (auth-aware fetch wrapper with Bearer token forwarding and res.ok enforcement) and `useCatalog()` (5-min TTL sessionStorage cache replacing the 12-request Promise.all storm). Created typed interfaces in `frontend/types/api.ts`, migrated all three Vue files to the new composables, and configured Docker Compose with `NUXT_PUBLIC_API_BASE` env var. Verification passed all 7 acceptance criteria. Change delivered in 2 commits and merged as PR #8.

---

## Spec vs Implementation: Deviations

| Spec Item | Planned | Actual | Reason |
|-----------|---------|--------|--------|
| `runtimeConfig.public.apiUrl` default `'http://localhost:3001'` | nuxt.config.ts uses `NUXT_PUBLIC_API_URL` env var defaulting to `'http://localhost:3001'` | `nuxt.config.ts` uses `NUXT_PUBLIC_API_BASE` env var defaulting to `''` (empty string); docker-compose provides `http://localhost:3001` | User correction — env var name change + empty default |
| `useCatalog()` sessionStorage cache | sessionStorage cache per design sketch | sessionStorage cache REMOVED entirely; only in-memory Map + pending request dedup | User request — simplified cache approach |
| Comma-separated catalog types (e.g., "amenazas,vulnerabilidades") | Backend handles multi-tipo requests | Handled client-side by calling `useCatalog()` per tipo in sequence | Backend unchanged (out of scope) |
| `tipoControlId` → `tipoControl` field rename | Rename field in `detallesPayload` from `tipoControlId` to `tipoControl` | No change needed — backend DTO and Prisma schema both use `tipoControlId`, not `tipoControl` | Spec error corrected during implementation — field name was correct as-is |

---

## Out-of-Scope Items Added During Apply

| Item | Reason Added |
|------|-------------|
| `KEYCLOAK_JWKS_URI` env var in docker-compose.yml | Auth fix required for Keycloak token validation; discovered during auth debugging |

---

## Deliverables

| File | Action | Status |
|------|--------|--------|
| `frontend/composables/useApi.ts` | NEW | ✅ 41 lines, Bearer + res.ok + typed |
| `frontend/composables/useCatalog.ts` | NEW | ✅ 72 lines (sessionStorage removed per user request) |
| `frontend/types/api.d.ts` | NEW | ✅ 67 lines, correct types |
| `frontend/nuxt.config.ts` | Modified | ✅ `runtimeConfig.public.apiBase` via `NUXT_PUBLIC_API_BASE` |
| `frontend/pages/catalogos.vue` | Modified | ✅ All 5 fetch calls replaced |
| `frontend/pages/valoracion.vue` | Modified | ✅ Promise.all → useCatalog, typed refs, apiFetch |
| `frontend/components/CatalogoManager.vue` | Modified | ✅ All 4 fetch calls replaced |
| `docker-compose.yml` | Modified | ✅ `NUXT_PUBLIC_API_BASE=http://localhost:3001` + `KEYCLOAK_JWKS_URI` |

---

## PR Information

| Field | Value |
|-------|-------|
| Branch | `fix/backend-api-consumption-on-frontend` |
| Base | `feat/auth-backend` |
| PR Number | #8 |
| Label | `type:bug` |
| Commits | 2 |

### Commit History

| Hash | Message |
|------|---------|
| `93e9355` | fix(keycloak): add KEYCLOAK_JWKS_URI env var |
| `0277466` | fix(frontend): centralize API consumption with typed composables |

---

## Verification Results

| AC | Criterion | Result |
|----|-----------|--------|
| AC1 | Zero `localhost:3001` in frontend source | ✅ PASS |
| AC2 | Bearer token in Authorization header | ✅ PASS |
| AC3 | Non-2xx throws descriptive error | ✅ PASS |
| AC4 | `tipoControlId` field correct (no change needed) | ✅ PASS |
| AC5 | `useCatalog()` cache ≤3 requests per session | ✅ PASS |
| AC6 | Zero `ref<any>` in migrated files | ✅ PASS |
| AC7 | Docker Compose URL injection | ✅ PASS |

**Overall**: ✅ PASS — All 7 criteria verified.

---

## Artifact Observation IDs (Engram Traceability)

The change artifacts are stored in OpenSpec at `openspec/changes/archive/2026-05-28-fix-backend-api-consupition-on-frontend/` and the merged spec is at `openspec/specs/frontend-api-consumption/spec.md`. No Engram observation IDs were created for this change — all artifacts live in OpenSpec per the `both` mode configuration.

---

## SDD Cycle Complete

The change has been fully planned (proposal ✅), specified (spec ✅), designed (design ✅), implemented (apply ✅), verified (verify ✅), and archived (archive ✅). Ready for the next change.

**Next recommended**: None — change closed.