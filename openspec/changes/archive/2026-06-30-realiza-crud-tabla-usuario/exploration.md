## Exploration: CRUD Tabla de Usuario

### Current State

**The backend CRUD is already fully implemented.** The frontend only has a read-only listing. Here's the breakdown:

#### Prisma Schema (`backend/prisma/schema.prisma:248-259`)

```prisma
model Usuario {
  id           String   @id @default(uuid())
  keycloakSub  String?  @unique
  username     String   @unique
  email        String   @default("")
  passwordHash String?
  primerInicio Boolean  @default(true)
  habilitado   Boolean  @default(true)
  roles        String   @default("[]")   // JSON stored as string
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- `passwordHash` never exposed in API responses (excluded via Prisma `select`)
- `roles` is a JSON string (e.g. `'["admin","user"]'`), not a proper Prisma JSON type
- No `firstName`/`lastName` fields — user name comes from Keycloak claims at runtime
- `keycloakSub` links to Keycloak identity for auto-sync via `SyncInterceptor`
- No relationship with other tables (AuditLog stores userId as string, not FK)

#### Backend Module (`backend/src/usuarios/`) — **COMPLETE**

| File | Status | Description |
|------|--------|-------------|
| `usuarios.module.ts` | ✅ | Registered in `app.module.ts` |
| `usuarios.controller.ts` | ✅ | Full CRUD: `GET /usuarios`, `POST /usuarios`, `PATCH /usuarios/:id`, `DELETE /usuarios/:id` |
| `usuarios.service.ts` | ✅ | findAll, findOne, create, update, delete (passwordHash excluded) |
| `dto/create-usuario.dto.ts` | ✅ | `{ username, email }` — plain class, **no class-validator decorators** |
| `dto/update-usuario.dto.ts` | ✅ | `{ email?, habilitado?, roles? }` — plain class, **no class-validator decorators** |
| `dto/usuario.dto.ts` | ⚠️ | Exists but **unused** and mismatches actual model (has firstName, lastName, enabled) |
| `usuarios.service.spec.ts` | ✅ | 9 tests (RED/TRIANGULATE pattern) |
| `usuarios.controller.spec.ts` | ✅ | 8 tests |

**Key observations about the backend CRUD:**
- `create()` hardcodes `roles: '[]'` — newly created users get NO roles
- `create()` does NOT set passwordHash — users created via CRUD cannot log in locally (no password)
- `update()` only accepts `email`, `habilitado`, `roles` — cannot change username
- All endpoints are protected by global `AuthGuard` (no `@Public()` decorator)
- No role-based guards — any authenticated user can CRUD any user
- DTOs lack validation decorators (no `class-validator`)

#### Auth Context (`backend/src/auth/`)

- **Global `AuthGuard`** (`app.module.ts` line 25): `{ provide: APP_GUARD, useClass: AuthGuard }`
  - Tries local HMAC token first, then falls back to Keycloak JWKS
  - Any route without `@Public()` requires auth
- **`SyncInterceptor`**: On every request, if user.source === 'keycloak', upserts local `Usuario` record
  - New Keycloak users: `primerInicio: true`, roles from realm_access, no passwordHash
  - Existing Keycloak users: updates username, email, roles (does NOT touch passwordHash/habilitado)
- **`AuthService`**: login (bcrypt), set-password, bootstrapFirstUser (creates first admin)
- **`@Public()` decorator**: Exists but NOT used on any usuario endpoint

#### Frontend (`frontend/pages/usuarios.vue`) — **READ-ONLY**

Current page is a simple data table:
- Fetches `GET /usuarios` via `useApi().apiFetch`
- Displays: Username, Email, "Nombre" (hardcoded "—"), Roles, Estado (Activo/Inactivo)
- Has loading spinner, error state, empty state, retry button
- **NO create/edit/delete UI** — no forms, no modals, no buttons

#### Frontend Navigation

- "Usuarios" nav item exists in `frontend/layouts/default.vue` (between "Parametrización" and "Auditoría")
- Navigates to `/usuarios`

#### Frontend Types (`frontend/types/api.d.ts:210-220`)

```typescript
export interface Usuario {
  id: string;
  keycloakSub: string | null;
  username: string;
  email: string;
  primerInicio: boolean;
  habilitado: boolean;
  roles: string;         // JSON string
  createdAt: string;
  updatedAt: string;
}
```

### Affected Areas

| Area | File | Why Affected |
|------|------|-------------|
| Frontend page | `frontend/pages/usuarios.vue` | **Primary target**: Add create/edit/delete forms and UI controls |
| Frontend types | `frontend/types/api.d.ts` | May need `CreateUsuarioPayload`, `UpdateUsuarioPayload` interfaces |
| Backend DTOs | `backend/src/usuarios/dto/create-usuario.dto.ts` | Add class-validator decorators, consider adding password/roles |
| Backend DTOs | `backend/src/usuarios/dto/update-usuario.dto.ts` | Add class-validator decorators |
| Backend service | `backend/src/usuarios/usuarios.service.ts` | Consider hashing password on create, enabling role assignment |
| Backend controller | `backend/src/usuarios/usuarios.controller.ts` | May add `GET /usuarios/:id` endpoint (findOne not exposed) |
| Prisma schema | `backend/prisma/schema.prisma` | No changes needed (model is complete) |
| Auth | `backend/src/auth/` | No changes needed (global guard already protects /usuarios) |

### Approaches

#### 1. **Frontend-only CRUD UI (Minimal)** ⭐ Recommended

Only add forms to the existing frontend page. Backend stays exactly as-is.

- **Add**: Modal form for create/edit (username, email, habilitado toggle, roles multi-select)
- **Add**: Delete button with confirmation dialog
- **Add**: `useApi().apiFetch` calls for POST/PATCH/DELETE
- **Reuse**: Existing `GET /usuarios` fetch, table layout, loading/error states
- **Backend changes**: NONE — controller already exposes all endpoints
- **Reference pattern**: `frontend/pages/catalogos.vue` (forms, modals, save, delete)
- **Pros**: Fast (1 file changed), no backend risk, all endpoints already exist
- **Cons**: No password management (users created via CRUD can't log in locally), no input validation on frontend, no role-based restrictions
- **Effort**: Low — ~200-300 lines in usuarios.vue

#### 2. **Frontend + Backend Enhancements (Robust)**

Extend approach 1 with backend improvements.

- **Backend**: Add class-validator decorators to DTOs, add `password` field to CreateUsuarioDto (optional, auto-hash), expose `GET /usuarios/:id`, add role validation, add `P2002` error handling
- **Frontend**: Password field in create form, better error handling, role multi-select
- **Pros**: Complete self-service user management, proper validation, users can log in immediately after creation
- **Cons**: More files changed, backend tests need updates, need to handle password securely
- **Effort**: Medium — ~6-8 files, ~400-500 total lines

#### 3. **Full Role-Based Access Control (Enterprise)**

Add role-based guards and admin-only restrictions.

- **Backend**: Create `@Roles('admin')` decorator + `RolesGuard`, protect write endpoints (`POST/PATCH/DELETE`) to admin only, `GET` open to all authenticated
- **Frontend**: Hide create/edit/delete buttons for non-admin users, error handling for 403
- **Pros**: Conventionally secure, follows principle of least privilege
- **Cons**: Adds complexity, requires testing both roles, overkill if all users are admins
- **Effort**: Medium-High — ~10 files

### Recommendation

**Approach 1 (Frontend-only CRUD UI)** for the immediate deliverable, with clear notes about what's not covered:

1. The backend CRUD is 100% complete and tested
2. The frontend only needs forms — the data layer and auth are wired
3. `catalogos.vue` provides a proven reference pattern (modal forms, edit/delete buttons)
4. The "users created via CRUD can't log in" limitation is acceptable for now — users are primarily synced via Keycloak (`SyncInterceptor`)
5. Role-based access can be added in a follow-up if needed

**What the frontend needs (scope):**

1. **Create form** — modal with fields: username (required), email (required)
2. **Edit form** — modal with fields: email, habilitado (toggle/checkbox), roles (text input or multi-select)
3. **Delete button** — with confirmation dialog
4. **Estado toggle** — inline toggle for habilitado (or include in edit form)
5. **Refresh after mutations** — re-fetch list after create/update/delete
6. **Error handling** — show errors from API (409 duplicate, 404 not found, etc.)

### Risks

- **No password on CRUD-created users**: Users created via `POST /usuarios` get `passwordHash: null` and `primerInicio: true`. They can't log in locally. Keycloak-synced users don't have this issue. Consider adding optional password field in follow-up.
- **No input validation on backend**: DTOs are plain TypeScript classes with no class-validator decorators. Invalid data reaches the service layer and fails at Prisma level (with generic 500 errors instead of 400).
- **No role-based restrictions**: Any authenticated user can delete other users. Could be risky if non-admin users exist.
- **Frontend has no test runner**: All UI changes are validated by manual smoke test only (per openspec/config.yaml testing.frontend.runner: none).
- **`UsuarioDto` is unused and misleading**: Has `firstName`, `lastName`, `enabled` fields that don't match the actual Prisma model. Should be aligned or removed.
- **`roles` is a JSON string in Prisma**: The update service serializes with `JSON.stringify()`. Frontend must parse with `JSON.parse()`. Error-prone if not handled consistently.

### Ready for Proposal

**Yes** — the backend is done, the gap is clear (frontend CRUD UI only), scope is well-defined, and there's a proven reference pattern in `catalogos.vue`. The orchestrator should proceed to `sdd-propose` for the `realiza-crud-tabla-usuario` change.
