# Archive Report: CRUD Tabla de Usuario

**Change**: realiza un crud a la tabla de usuario.
**Archived**: 2026-06-30
**Artifact store**: hybrid (engram + openspec)
**Engram observation IDs**: 324, 325, 328, 327, 329, 330, 332

---

## Phase Artifacts (Engram)

| Artifact | Observation ID | Topic Key |
|----------|---------------|-----------|
| Explore | #324 | sdd/realiza-crud-tabla-usuario/explore |
| Proposal | #325 | sdd/realiza-crud-tabla-usuario/proposal |
| Spec (delta) | #328 | sdd/realiza-crud-tabla-usuario/spec |
| Design | #327 | sdd/realiza un crud a la tabla de usuario./design |
| Tasks | #329 | sdd/realiza un crud a la tabla de usuario./tasks |
| Apply Progress | #330 | sdd/realiza un crud a la tabla de usuario./apply-progress |
| Verify Report | #332 | sdd/realiza un crud a la tabla de usuario./verify-report |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| local-usuarios-crud | Modified | 1 requirement MODIFIED (Full CRUD on /usuarios): added password generation, bcrypt hashing, compound response `{ usuario, contraseñaGenerada }`. 6 scenarios updated. |
| usuarios-crud-frontend | Created | NEW domain spec with 4 requirements (Create with password display, Edit fields, Delete with confirmation, List refresh after mutation), 8 scenarios |

## Archive Contents

```
openspec/changes/archive/2026-06-30-realiza-crud-tabla-usuario/
├── exploration.md        ✅
├── proposal.md           ✅
├── design.md             ✅
├── tasks.md              ✅ (12/12 tasks complete)
├── verify-report.md      ✅
├── archive-report.md     ✅
└── specs/
    ├── local-usuarios-crud/
    │   └── spec.md       ✅ (delta)
    └── usuarios-crud-frontend/
        └── spec.md       ✅ (delta)
```

## Source of Truth Updated

The following main specs now reflect the new behavior:

- `openspec/specs/local-usuarios-crud/spec.md` — Full CRUD requirement updated with password generation + bcrypt hashing
- `openspec/specs/usuarios-crud-frontend/spec.md` — New domain spec with 4 CRUD UI requirements

## Final Files Modified

| File | What changed |
|------|-------------|
| `backend/src/usuarios/usuarios.service.ts` | create() generates random 32-char hex password, bcrypt hash, returns { usuario, contraseñaGenerada } |
| `backend/src/usuarios/usuarios.service.spec.ts` | 4 new tests (password gen, bcrypt verify, uniqueness, P2002 regression) |
| `backend/src/usuarios/usuarios.controller.spec.ts` | Updated for compound response shape |
| `backend/src/usuarios/dto/create-usuario.dto.ts` | Added @IsString, @IsNotEmpty, @IsEmail decorators |
| `backend/src/usuarios/dto/update-usuario.dto.ts` | Added @IsOptional, @IsEmail, @IsBoolean, @IsString({each}) decorators |
| `frontend/composables/useApi.ts` | Handle 204 No Content (prevent JSON parse error on DELETE) |
| `frontend/pages/usuarios.vue` | Create/edit/delete modals, password banner with copy button, toolbar, auto-refresh |
| `frontend/types/api.d.ts` | CreateUsuarioResponse interface |

## Bugs Found & Fixed During Smoke Test

1. **DELETE 404 loop**: apiFetch crashed on 204 No Content (res.json() on empty body) → modal didn't close, list didn't refresh
2. **POST 400**: CreateUsuarioDto lacked class-validator decorators → ValidationPipe rejected all properties
3. **PATCH 400**: UpdateUsuarioDto same issue

## Verification Summary

- **Backend tests**: 308/308 passing, 23 suites green
- **TypeScript**: Zero new errors (backend + frontend)
- **Lint**: Clean on usuarios/ module
- **Smoke test**: PASSED — full CRUD cycle verified in browser
- **Spec compliance**: 6/6 backend COMPLIANT, 8/8 frontend COMPLIANT

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
