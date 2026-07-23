# Exploration: Local User Management with Keycloak as Supplementary Auth

## Current State

### Identity Model
- **No local `User` table exists** in `prisma/schema.prisma`. The database has zero persistence of user identity.
- `AuditLog` stores `usuarioId` (Keycloak `sub`) and `usuario` (Keycloak `preferred_username`) as **loose strings**.
- `ValoracionActivo` stores `createdBy` / `updatedBy` as usernames from the JWT — again, no FK to any user entity.

### Authentication Flow
- **Backend**: `AuthModule` uses `passport-jwt` with `jwks-rsa` to validate **Keycloak-issued tokens only**. `JwtStrategy` fetches the public key from Keycloak's JWKS endpoint. `AuthGuard` is registered as `APP_GUARD`, protecting every route.
- **Frontend**: `keycloak-js` plugin initializes with `check-sso`, PKCE (`S256`), silent refresh, and a 60-second proactive token refresh interval. `useApi()` injects the Keycloak `Bearer` token into every request.
- **User Context**: `CurrentUser` decorator extracts `{ userId, username, email, roles }` from the validated JWT payload. This shape is hardcoded across the app.

### Existing User Management
- `UsuariosModule` (`backend/src/usuarios/`) is a **read-only proxy** to the Keycloak Admin REST API. It authenticates with admin credentials via password grant, fetches realm users, and maps them to `UsuarioDto`.
- Frontend `pages/usuarios.vue` renders a table of Keycloak users. There is no local CRUD.
- The `modulo-usuarios` SDD change (completed) explicitly scoped out "sincronización de usuarios a tabla Prisma" as future work.

### Infrastructure
- Keycloak container (`quay.io/keycloak/keycloak:24.0.0`) runs on port 8080 with realm `quito-turismo` and client `sgsi-app`.
- Backend environment variables (`KEYCLOAK_JWKS_URI`, `KEYCLOAK_ADMIN_URL`, etc.) are wired in `docker-compose.yml`.
- **No password-hashing library** (bcrypt, argon2) is present in `backend/package.json`.
- **No local JWT issuance logic** exists; the backend only *validates* tokens.

---

## Affected Areas

| Path | Impact | Why |
|------|--------|-----|
| `prisma/schema.prisma` | **High** | Must add a `User` model with local credentials, Keycloak linkage, and audit relations. |
| `backend/src/auth/` | **Critical** | Must support *two* token sources (Keycloak JWT and locally-issued JWT) plus a new local login strategy. |
| `backend/src/usuarios/` | **High** | Read-only Keycloak proxy is insufficient; must evolve into local user CRUD + sync. |
| `frontend/plugins/keycloak.client.ts` | **High** | Needs post-login hook to detect first-time users and redirect to password-setup flow. |
| `frontend/composables/useAuth.ts` | **Medium** | Must abstract user identity regardless of whether login came from Keycloak or local form. |
| `frontend/composables/useApi.ts` | **Medium** | Must source the Bearer token from either Keycloak or local auth storage. |
| `backend/src/audit/` | **Medium** | `AuditLog.usuarioId` currently stores Keycloak `sub`. Needs strategy for local-user IDs. |
| `docker-compose.yml` | **Low** | New env vars required (local JWT secret, bcrypt cost, etc.). |

---

## Approaches

### 1. Minimal Hybrid (Recommended)
**Description**: Keep Keycloak OIDC as a login method, but treat the local `User` table as the canonical identity. On first Keycloak login, the backend validates the Keycloak JWT, creates a local `User` record (linked via `keycloakSub`), and if `passwordHash` is absent, flags the session so the frontend prompts for a password. A separate username/password login endpoint issues its own local JWTs. The global `AuthGuard` is extended to accept both Keycloak and local tokens.

- **Pros**:
  - Aligns exactly with the requirement: "Keycloak login will be supplementary."
  - Local users become the source of truth for application-level permissions and audit trails.
  - Existing Keycloak users can migrate seamlessly on next login.
  - Minimal changes to frontend routing (just add a "set password" page/modal).
- **Cons**:
  - The backend must maintain two JWT validation paths (Keycloak JWKS + local secret).
  - Risk of identity drift if Keycloak attributes (email, username) change after local record creation.
  - Increases security surface area (local password storage liability).
- **Effort**: **High** (touches auth core, schema, frontend plugin, and user module).

### 2. Local-First with Keycloak as Identity Bridge
**Description**: The local `User` table is the *only* source of truth. Keycloak login is treated as an OAuth "link" flow. The user must first exist locally (created by an admin or self-registration), then they can "link" their Keycloak account. No automatic provisioning.

- **Pros**:
  - Strictest data ownership; no surprise user creation.
  - Simpler token handling (only local JWTs ever hit the API).
- **Cons**:
  - Contradicts the requirement to create local users automatically on Keycloak login.
  - Poor UX: admins must pre-create every user before they can use SSO.
- **Effort**: **Medium** (simpler auth, but requires admin invitation flow).

### 3. Shadow Read-Only Local Table (Rejected)
**Description**: Create a local `User` table that mirrors Keycloak users but do not add local password auth. This was essentially the "future work" scoped out of `modulo-usuarios`.

- **Pros**: Very low effort.
- **Cons**: Does not satisfy the "log in directly with username/password later" requirement.
- **Effort**: **Low**.

---

## Recommendation

**Adopt Approach 1 (Minimal Hybrid)**.

Rationale: It is the only option that satisfies all stated requirements without forcing a pre-provisioning admin workflow. The primary risk — dual JWT validation — is manageable by refactoring `AuthModule` into a multi-strategy setup (e.g., `PassportModule` with both `jwt-keycloak` and `jwt-local` strategies, or a unified custom guard that attempts validation in sequence).

---

## Risks

1. **Dual JWT Trust Model (Critical)**  
   The global `APP_GUARD` currently trusts only Keycloak-signed JWTs. Extending it to also trust locally-signed JWTs introduces key-management risk. A compromised local JWT secret grants full API access. Mitigation: use a strong random secret, rotate it via env vars, and keep token expiry short.

2. **User ID Semantic Shift (High)**  
   `AuditLog.usuarioId` stores Keycloak `sub` (a UUID string). Local users would typically have an auto-increment integer ID. Unifying these is non-trivial. Options:
   - Make the local `User.id` a UUID (string) to match Keycloak `sub`.
   - Keep `AuditLog.usuarioId` as a string and store the local user's string representation.
   - Add a separate `localUserId` FK column.
   **Recommendation**: Use UUID/string primary keys for the local `User` table to maintain backward compatibility with existing audit logs.

3. **Password Security Liability (High)**  
   Storing local passwords means assuming responsibility for hashing, salting, breach response, and policy enforcement (complexity, rotation). The project currently has zero infrastructure for this. Mitigation: add `bcrypt` (or `argon2`) and enforce OWASP password guidelines at the API layer.

4. **Keycloak Attribute Drift (Medium)**  
   If a user changes their email or username in Keycloak, the local record could become stale. The sync logic must decide whether to overwrite local data (destructive) or keep it independent.

5. **Frontend Token Source Complexity (Medium)**  
   `useApi()` and `useAuth()` are tightly coupled to `keycloak-js`. Abstracting them to support a local token (e.g., stored in `localStorage` or an http-only cookie) requires careful design to avoid security issues (XSS if using `localStorage`).

6. **Schema Migration & Data Loss (Low)**  
   Adding a `User` table is a greenfield migration, but existing audit strings cannot be back-linked automatically.

---

## Open Questions

1. **Local User ID Type**: Should `User.id` be a UUID/string (to match Keycloak `sub`) or an auto-increment integer? This impacts the entire audit trail.
2. **Token Shape**: Should the local JWT payload mirror the current `JwtPayload` interface (`sub`, `preferred_username`, `realm_access.roles`) to minimize downstream changes, or introduce a cleaner local schema?
3. **Password Setup UX**: Should first-time Keycloak users be redirected to a dedicated `/set-password` page, or shown a modal overlay on their first local route?
4. **Role Source of Truth**: Keycloak currently supplies `realm_access.roles`. If local users log in without Keycloak, where do their roles come from? Should roles be duplicated in the local `User` table?
5. **Keycloak Write-Back**: When a user sets a local password, should the system also create/update their credentials in Keycloak (to keep SSO working with the same password), or keep the two credential stores completely separate?
6. **Existing Keycloak-Only Users**: How should the system handle users who already exist in Keycloak but have no local record? (Approach 1 handles this via JIT provisioning on next login.)

---

## Ready for Proposal

**Yes** — but with a caveat. The scope is large enough that it should be formalized in an `sdd-propose` phase before writing specs. The proposal must explicitly resolve:
- The User ID type decision (UUID vs integer).
- The role source-of-truth decision.
- The JWT secret/key management plan.
- A rollback strategy (remove `User` table and revert to Keycloak-only auth).

**Next recommended SDD phase**: `sdd-propose`.
