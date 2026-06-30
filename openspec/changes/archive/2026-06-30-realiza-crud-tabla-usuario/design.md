# Design: CRUD Tabla de Usuario (Backend + Frontend)

## Technical Approach

Modify `UsuariosService.create()` in-place to generate a random bcrypt-hashed password and return a compound response `{ usuario, contraseñaGenerada }`. Build full CRUD modals in `usuarios.vue` mirroring the proven `catalogos.vue` modal pattern. Backend update/delete endpoints are already complete — no backend controller changes except adjusting the controller spec for the new return shape on `POST`.

## Architecture Decisions

| Decision | Option A (Chosen) | Option B (Rejected) | Rationale |
|----------|------------------|---------------------|-----------|
| Where to generate password | `UsuariosService.create()` in-place | New `POST /usuarios/generate-credentials` endpoint | In-place keeps the API surface minimal. DTO unchanged (`username`, `email`). Only response shape changes. Avoids separate endpoint that a client must call after create. |
| Password generation | `crypto.randomBytes(16).toString('hex')` — 32-char hex | `Math.random().toString(36)` or external lib `generate-password` | `crypto` is Node native. 32-char hex provides ~128 bits entropy. Same pattern used across NestJS ecosystem. |
| Where to import bcrypt | `usuarios.service.ts` (service layer) | Controller exposing hash as DTO field | Service layer is where `AuthService` already hashes. Controller stays thin — delegates and returns. `passwordHash` never reaches controller. |
| Response contract | `{ usuario: Usuario, contraseñaGenerada: string }` | `Usuario & { contraseñaGenerada: string }` (flat) | Composite object separates permanent data from one-time secret. Prevents accidental serialization of plaintext in later reuse. |
| Frontend modal pattern | Reuse `catalogos.vue` style (`.modal-overlay`, `.modal-card`, `.modal-header`/`body`/`footer`) | New UI library modals | Consistent UX across pages. Zero new dependencies. Proven with 500+ lines of working code. |

## Data Flow

```
Frontend modal ──POST──→ Controller.create(dto)
  username+email              │
                              ↓
                        Service.create(dto)
                              │
                    crypto.randomBytes(16)
                              │
                         bcrypt.hash(pw,10)
                              │
                    prisma.usuario.create({
                      username, email,
                      passwordHash, primerInicio:true,
                      roles:'[]'
                    })
                              │
           { usuario: {...}, contraseñaGenerada: "a1b2..." }
                              │
Controller returns ────────→ Frontend modal banner
                               copy button (navigator.clipboard)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/usuarios/usuarios.service.ts` | Modify | Import `crypto`, `bcrypt`. `create()` generates password, hashes, returns `{ usuario, contraseñaGenerada }`. ~20 lines added before Prisma call. |
| `backend/src/usuarios/usuarios.service.spec.ts` | Modify | Add 4 tests (RED password generation, RED bcrypt hash, TRIANGULATE uniqueness, TRIANGULATE duplicate P2002). Update existing RED create test for new response shape. |
| `backend/src/usuarios/usuarios.controller.spec.ts` | Modify | Update POST test to expect `{ usuario, contraseñaGenerada }` shape. |
| `frontend/pages/usuarios.vue` | Modify | Add create modal (username, email, password banner), edit modal (email, habilitado toggle, roles), delete confirm modal, "Acciones" column with edit/delete buttons, toolbar with "+ Nuevo". ~250 lines added. |
| `frontend/types/api.d.ts` | Modify | Add `CreateUsuarioResponse` interface: `{ usuario: Usuario; contraseñaGenerada: string }`. |

## Interfaces / Contracts

```typescript
// New response type for POST /usuarios
export interface CreateUsuarioResponse {
  usuario: Usuario;
  contraseñaGenerada: string;
}
```

`CreateUsuarioDto` (unchanged): `{ username: string; email: string }`. Validation stays in frontend (required fields, email format regex).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (service) | `create()` returns `{ usuario, contraseñaGenerada }` | Mock Prisma create. Expect `passwordHash` field in Prisma call, `primerInicio: true`. Verify returned `usuario` excludes `passwordHash`. |
| Unit (service) | Generated password is valid bcrypt hash | Call `bcrypt.compare(contraseñaGenerada, transmittedHash)` from spy on Prisma create. Assert `true`. |
| Unit (service) | Two creates produce different passwords | Call `create()` twice, assert `contraseñaGenerada` differs. |
| Unit (service) | Duplicate username still throws P2002 | Existing TRIANGULATE test updated to still reject (no regression). |
| Unit (controller) | POST delegates and returns compound shape | Mock service returning `{ usuario, contraseñaGenerada }`. Assert controller passes through. |
| Smoke (frontend) | CRUD cycle: create → see password → edit email → delete | Manual. Document steps in verify phase. |

## Migration / Rollout

No migration required. No DB schema changes. Users created before this change maintain `passwordHash: null` (can't log in locally — unchanged behavior). Rollback via `git checkout` on the 4 modified files.

## Open Questions

- [ ] Should `findAll()`/`findOne()` also show whether a user has `passwordHash` set (e.g., `hasLocalPassword: boolean`)? Resolved: No — out of scope.
- [ ] Should delete cascade to AuditLog? Resolved: No — AuditLog stores `userId` as string (not FK), so admins can still see deleted user's actions.
