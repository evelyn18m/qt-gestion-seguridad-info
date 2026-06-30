# Design: Módulo Roles con Control de Acceso a Nivel Endpoint

## Technical Approach

Static roles via `@Roles()` SetMetadata decorator + `RolesGuard` (pattern identical to existing `@Public()`). AuthGuard populates `request.user.roles` first; RolesGuard checks second. Role mapper normalizes legacy names (`admin`, `administradoregsi` → `administrador`; `usuarioegsi` → `usuario`). No DB migrations. Frontend exposes `tieneRol()` in `useAuth()`, conditional nav in layout, checkbox-based role selector in `/usuarios`.

## Architecture Decisions

### Decision 1: Guard location — in `auth/` directory

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `auth/` alongside AuthGuard | Shares module, follows existing pattern | ✅ Chosen |
| New `roles/` module | Isolated but overkill for guard+decorator only | Rejected |

**Rationale**: AuthGuard and Public decorator already live in `auth/`. Two files (decorator + guard + spec) don't justify a module.

### Decision 2: Role mapper — constant in guard file, exported

**Choice**: Inline `ROLE_MAP` constant + exported `normalizeRoles()` pure function in `roles.guard.ts`.
**Rationale**: Single file for guard logic — no extra import for simple key-value map. Exported function allows frontend mirroring and pure unit testing.

### Decision 3: Decorator signature — rest params

**Choice**: `@Roles(...roles: string[])` — e.g., `@Roles('administrador')`.
**Alternatives**: `@Roles(['administrador'])` — array param less ergonomic.
**Rationale**: Matches NestJS convention. Single-role usage is clean; multi-role expansion works naturally.

### Decision 4: APP_GUARD order — positional in `providers` array

**Choice**: Register `RolesGuard` after `AuthGuard` in `app.module.ts` providers.
**Rationale**: NestJS iterates `APP_GUARD` providers in declaration order. AuthGuard first → populates `request.user` → RolesGuard runs second. No custom ordering logic needed.

### Decision 5: 403 response — standard `ForbiddenException`

**Choice**: NestJS `ForbiddenException` from `@nestjs/common`.
**Rationale**: Standard HTTP 403, consistent with project conventions. Frontend `useApi()` already handles non-2xx responses generically.

### Decision 6: Frontend role constants — `frontend/types/roles.ts`

**Choice**: Dedicated constants file with `ROLES_DISPONIBLES` and role labels.
**Rationale**: Single source of truth for Vue pages, layouts, and composables. Mirrors backend `ROLE_MAP` keys.

### Decision 7: Endpoint `/roles` — read-only user-role overview

**Choice**: GET-only page showing static role definitions + user-role assignment matrix (fetched from `/usuarios`).
**Rationale**: No DB table → no CRUD needed. Provides visibility without write endpoints.

## Data Flow

```
Request → AuthGuard (sets request.user) → RolesGuard (checks roles) → Controller
              │                                    │
              │ @Public()? → pass                  │ @Public()? → pass
              │ else → verify JWT, set user         │ else → read @Roles() metadata
              │        { userId, roles, ... }       │ → normalizeRoles(user.roles)
              │                                    │ → intersect(userRoles, required)
              │                                    │ → match? pass : 403
              ▼                                    ▼
         Controller handler
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/auth/decorators/roles.decorator.ts` | Create | `@Roles()` via SetMetadata |
| `backend/src/auth/roles.guard.ts` | Create | RolesGuard with ROLE_MAP, respects @Public() |
| `backend/src/auth/roles.guard.spec.ts` | Create | 13+ TDD test cases |
| `backend/src/app.module.ts` | Modify | Add RolesGuard as 2nd APP_GUARD |
| `backend/src/auth/auth.service.ts` | Modify | bootstrapFirstUser → `'administrador'` |
| `backend/src/usuarios/dto/create-usuario.dto.ts` | Modify | ALLOWED_ROLES normalized |
| `backend/src/usuarios/dto/update-usuario.dto.ts` | Modify | ALLOWED_ROLES normalized |
| `backend/src/usuarios/usuarios.controller.ts` | Modify | `@Roles('administrador')` on POST/PATCH/DELETE |
| `backend/src/catalogos/catalogos.controller.ts` | Modify | `@Roles('administrador')` on 6 mutators |
| `backend/src/valoraciones/valoraciones.controller.ts` | Modify | `@Roles('administrador')` on 5 mutators |
| `backend/src/parametros/parametros.controller.ts` | Modify | `@Roles('administrador')` on PUT |
| `backend/src/auth/auth.controller.ts` | Modify | `@Roles('administrador')` on set-password |
| `frontend/types/roles.ts` | Create | ROLES_DISPONIBLES, ROLE_LABELS constants |
| `frontend/pages/roles.vue` | Create | Role definitions + user-role table |
| `frontend/composables/useAuth.ts` | Modify | Add `tieneRol(rol: string): boolean` |
| `frontend/pages/usuarios.vue` | Modify | Textarea → checkboxes for role editing |
| `frontend/layouts/default.vue` | Modify | v-if tieneRol on admin links |

## Interfaces / Contracts

```ts
// roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// roles.guard.ts (core logic)
export const ROLE_MAP: Record<string, string> = {
  admin: 'administrador', administradoregsi: 'administrador',
  usuarioegsi: 'usuario',
};
export function normalizeRoles(roles: string[]): string[] {
  return [...new Set(roles.map(r => ROLE_MAP[r] || r))];
}

// Frontend: useAuth.ts
function tieneRol(rol: string): boolean {
  const parsed = JSON.parse(usuario.value?.roles || '[]');
  return parsed.map(r => FRONTEND_ROLE_MAP[r] || r).includes(rol);
}
```

### Guard activation logic (pseudocode)

```
canActivate(context):
  1. isPublic = reflector.get(IS_PUBLIC_KEY, handler | class)
  2. if isPublic → return true
  3. requiredRoles = reflector.get(ROLES_KEY, handler | class)
  4. if !requiredRoles → return true  (GET endpoints — any auth)
  5. userRoles = normalizeRoles(request.user.roles)
  6. if intersect(userRoles, requiredRoles) is empty → throw ForbiddenException
  7. return true
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `normalizeRoles()` | Table-driven: legacy→normalized, unknown→passthrough, dedup |
| Unit | `RolesGuard.canActivate()` | Mock Reflector + ExecutionContext; test: @Public bypass, no @Roles bypass, role match, mismatch→403, legacy mapped |
| Unit | `@Roles()` decorator | Verify SetMetadata sets ROLES_KEY correctly |
| Integration | Protected endpoints | Supertest: admin token→200, user token→403 on mutators, GET→200 both |
| Integration | @Public() endpoints respected | Login/bootstrap→200 without auth header |

## Migration / Rollout

No DB migration. Rollback: remove `RolesGuard` from `APP_GUARD`, delete `roles.decorator.ts`, `roles.guard.ts`, `roles.guard.spec.ts`, revert ALLOWED_ROLES and `bootstrapFirstUser()` → `'admin'`. Legacy role names work via mapper during transition.

## Open Questions

None — all decisions resolved.
