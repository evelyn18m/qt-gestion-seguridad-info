# Archive Report: corregir-auth-oidc

**Change**: corregir-auth-oidc
**Archived**: 2026-05-27
**Mode**: hybrid (Engram + OpenSpec)
**Verify result**: PASS — 16/16 spec scenarios, 10/10 backend tests

---

## Implementation Summary

Replaced insecure password-grant OIDC auth with a secure, production-ready SPA authentication flow:

### Backend
- **NestJS global AuthGuard** (Passport JWT + Keycloak JWKS) protecting all `/api/*` routes — returns 401 on missing/invalid token
- **CORS locked** to `http://localhost:3000`
- **JWKS** from Keycloak for signature validation

### Frontend
- **Nuxt 4 SPA mode** (`ssr: false`) + **`keycloak-js`** with Authorization Code + PKCE S256
- **Public client** (no secret)
- **Session restored on F5** via `check-sso` + `silent-check-sso.html`

### Keycloak
- `publicClient: true`, `directAccessGrantsEnabled: false`, `post.logout.redirect.uris: "+"`

**Key deviation**: `nuxt-oidc-auth` (SSR) replaced by `keycloak-js` (SPA) because Docker networking makes server-side token exchange impossible when Keycloak is only reachable at `localhost:8080` from the host.

---

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| auth-frontend | Created | 2 modified requirements (PKCE flow, session restore), 1 removed (callback route) |
| auth-backend | Created | 3 added requirements (JWT validation, CORS lock, JWKS config) |
| auth-frontend-cors | Created | 1 added requirement (CORS origin lock) |

---

## Archive Contents

- `proposal.md` ✅
- `exploration.md` ✅
- `specs/auth-frontend/spec.md` ✅
- `specs/auth-backend/spec.md` ✅
- `specs/auth-frontend-cors/spec.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (12/13 tasks complete — task 4.5 manual verification)
- `verify-report.md` ✅

---

## Source of Truth Updated

- `openspec/specs/auth-frontend/spec.md`
- `openspec/specs/auth-backend/spec.md`
- `openspec/specs/auth-frontend-cors/spec.md`

---

## Artifacts (Engram Observation IDs)

| Artifact | Observation ID | Topic Key |
|----------|---------------|-----------|
| Exploration | #301 | sdd/corregir-auth-oidc/explore |
| Proposal | #302 | sdd/corregir-auth-oidc/proposal |
| Spec | #303 | sdd/corregir-auth-oidc/spec |
| Design | #304 | sdd/corregir-auth-oidc/design |
| Tasks | #305 | sdd/corregir-auth-oidc/tasks |
| Apply progress | #306 | sdd/corregir-auth-oidc/apply-progress |
| Verify report | #309 | sdd/corregir-auth-oidc/verify-report |
| **This report** | — | `sdd/corregir-auth-oidc/archive-report` |

---

## OpenSpec Path

`openspec/changes/archive/2026-05-27-corregir-auth-oidc/`

---

## Known Issues (from verify report)

- **WARNING**: `realm-export.json` has `clientAuthenticatorType: "client-secret"` alongside `publicClient: true` — conflicting in Keycloak
- **CRITICAL (protocol)**: apply phase lacked TDD Cycle Evidence table — strictly TDD protocol was not followed

---

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
