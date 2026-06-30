## Exploration: Módulo Roles con Control de Acceso a Nivel Endpoint

### Current State

**Cómo funciona hoy la autorización**: El sistema tiene autenticación (JWT local + Keycloak OIDC) vía `AuthGuard` como `APP_GUARD` global, pero **no tiene control de acceso basado en roles a nivel endpoint**. Cualquier usuario autenticado puede invocar cualquier endpoint (lectura o escritura).

**Roles actuales**:
- Almacenados como string JSON en `Usuario.roles` (Prisma: `String @default("[]")`). No existe tabla `Rol` ni `Permiso`.
- Los roles viajan en el JWT: locales como `payload.roles`, Keycloak como `realm_access.roles`. El guard los expone en `request.user.roles: string[]`.
- Hay 3 nombres de rol en circulación, con INCONSISTENCIA: `bootstrapFirstUser()` usa `'admin'`, los DTOs (`CreateUsuarioDto`, `UpdateUsuarioDto`) validan `ALLOWED_ROLES = ['administradoregsi', 'usuarioegsi']`, y Keycloak maneja esos mismos nombres.
- Asignación: vía `UsuariosService.create/update` → JSON.stringify + `keycloak.assignClientRoles()`. SyncInterceptor mantiene sincronizados roles Keycloak → DB local.
- Frontend: `usuarios.vue` edita roles con textarea de texto separado por comas. `default.vue` muestra el primer rol en el header.

**Endpoints existentes** y su naturaleza (todos requieren auth, excepto los marcados `@Public()`):

| Módulo | Lectura (GET) | Escritura (POST/PATCH/PUT/DELETE) | Riesgo si no protegido |
|---|---|---|---|
| `auth` | — | `POST login`/`bootstrap` (@Public), `POST set-password` | Medio (set-password es mutación) |
| `usuarios` | `GET /` | `POST /`, `PATCH :id`, `DELETE :id` | **Alto** — CRUD de usuarios |
| `valoraciones` | `GET /`, `GET :id` | `POST /`, `PATCH :id`, `DELETE :id`, `PATCH :id/detalles-riesgo/:detalleId/calcular`, `POST :id/recalcular` | **Alto** — datos core del SGSI |
| `catalogos` | `GET /`, `GET :tipo`, `GET :tipo/:id`, `GET controles-implementar` | `POST :tipo`, `PATCH :tipo/:id`, `DELETE :tipo/:id` + rutas dedicadas `controles-implementar` | **Alto** — catálogos maestros |
| `reportes` | Todos GETs + export endpoints | Ninguno | Bajo (solo lectura) |
| `parametros` | `GET /` | `PUT /` | **Alto** — configuración de niveles de riesgo |
| `audit` | `GET /`, `GET export` | `POST login`, `POST page-visit` | Bajo (logs son append-only) |
| `app` | `GET /` | — | Bajo |

**Decorator `@Public()` existente**: Ya definido en `auth/decorators/public.decorator.ts` con `SetMetadata('isPublic', true)`. El guard actual lo respeta. Patrón análogo para `@Roles()`.

**Stack relevante**: NestJS 11, `Reflector` ya inyectado en `AuthGuard`, `SetMetadata` de `@nestjs/common` ya en uso.

### Affected Areas

- **`backend/src/auth/auth.guard.ts`** — Se mantiene como está (auth). Se agrega un segundo guard `RolesGuard` que se ejecuta DESPUÉS.
- **`backend/src/auth/decorators/roles.decorator.ts`** — NUEVO: `@Roles('administrador', 'usuario')` usando `SetMetadata`.
- **`backend/src/auth/roles.guard.ts`** — NUEVO: Guard que lee metadata `ROLES_KEY`, compara con `request.user.roles`.
- **`backend/src/auth/roles.guard.spec.ts`** — NUEVO: Tests RED-GREEN para el guard (TDD).
- **`backend/src/auth/decorators/roles.decorator.spec.ts`** — NUEVO: Tests del decorator.
- **`backend/src/app.module.ts`** — Agregar `RolesGuard` como `APP_GUARD` (orden: `AuthGuard` primero, `RolesGuard` después).
- **`backend/src/auth/auth.module.ts`** — Exportar `RolesGuard` si se define acá (o definir en módulo propio).
- **`backend/src/usuarios/dto/create-usuario.dto.ts`** — Normalizar `ALLOWED_ROLES` vs `'admin'` del bootstrap.
- **`backend/src/usuarios/dto/update-usuario.dto.ts`** — Misma normalización.
- **`backend/src/auth/auth.service.ts`** — `bootstrapFirstUser()` usa `'admin'`; debe unificarse con `'administrador'` o `'administradoregsi'`.
- **`backend/src/usuarios/usuarios.service.ts`** — Posiblemente agregar helper `tieneRol(user, rol)` para consultas.
- **Todos los controllers** — Agregar `@Roles('administrador')` en métodos mutadores (POST, PATCH, PUT, DELETE). Métodos GET pueden no llevar decorator (acceso por defecto para usuario autenticado) o `@Roles('administrador', 'usuario')` explícito.
- **`frontend/pages/roles.vue`** — NUEVO: Página para visualizar y gestionar roles/asignaciones.
- **`frontend/pages/usuarios.vue`** — Refactor: cambiar textarea de roles por selector de roles predefinidos.
- **`frontend/layouts/default.vue`** — Agregar ítem de navegación "Roles" (condicional: solo visible para administrador).
- **`frontend/composables/useAuth.ts`** — Exponer helper `tieneRol(rol)` para control de UI condicional.
- **`frontend/types/api.d.ts`** — Posiblemente agregar tipo `Rol` si se crea tabla.

### Approaches

#### 1. Roles estáticos con `@Roles()` decorator + `RolesGuard` (RECOMENDADO)

Roles hardcodeados (`'administrador'` / `'usuario'`), sin tabla DB nueva. El guard lee `request.user.roles` y lo compara con los roles requeridos por el decorator. Los GET son libres para cualquier usuario autenticado; mutaciones requieren `'administrador'`. Normalizar nombres de rol: `'admin'` → `'administrador'`.

- **Pros**:
  - Sin migraciones de DB (solo normalizar string de bootstrap)
  - Sigue el patrón estándar de NestJS: `@Roles()` + `RolesGuard` (documentado en docs oficiales)
  - Rápido de implementar (~1.5 días backend + 1 día frontend)
  - Se integra limpiamente con el `AuthGuard` existente (2 guards en APP_GUARD, ordenados)
  - Compatible con ambos orígenes de auth (local + Keycloak)
  - Fácil de testear unitariamente (guard puro, sin DB)
- **Cons**:
  - No permite crear nuevos roles dinámicamente sin tocar código
  - Sin granularidad fina (ej: "puede editar catálogos pero no valoraciones")
  - Requiere mantener sincronizados los nombres de rol entre código y Keycloak
- **Effort**: Medium

#### 2. Híbrido — `@Roles()` decorator + tabla `Rol` + tabla `Permiso` en DB

Crear modelos `Rol` (id, nombre) y `Permiso` (id, recurso, accion) en Prisma, con relación muchos-a-muchos. Seed de roles default (`administrador` con todos los permisos, `usuario` con solo `read`). El guard consulta DB para resolver permisos. Frontend con CRUD completo de roles y permisos.

- **Pros**:
  - RBAC completo, extensible, configurable por admin
  - Permisos granulares por módulo/acción (`catalogos:write`, `valoraciones:read`)
  - Roles dinámicos sin tocar código
  - Preparado para crecimiento futuro
- **Cons**:
  - Migración de DB significativa (2 tablas nuevas + tabla pivote `UsuarioRol`)
  - Seed complejo
  - Frontend necesita UI completa de administración de roles/permisos
  - El guard hace consultas DB por request (requiere caching)
  - Esfuerzo alto (~4-5 días backend + 3 días frontend)
  - **Sobre-ingeniería** para el requisito actual ("admin todo, usuario solo lectura")
- **Effort**: High

#### 3. Extender `AuthGuard` existente con verificación inline de roles

En vez de guard separado, modificar `AuthGuard.canActivate()` para que también lea metadata de roles y verifique. Un solo guard hace auth + autorización.

- **Pros**:
  - Menos archivos que crear
  - Configuración DI más simple (un solo APP_GUARD)
- **Cons**:
  - **Viola Single Responsibility**: el guard mezcla autenticación con autorización
  - Más difícil de testear en aislamiento (tests actuales del AuthGuard se complican)
  - No es el patrón recomendado por NestJS (docs sugieren guards separados)
  - `AuthGuard` actual ya es complejo (composite local + Keycloak), agregarle roles lo empeora
- **Effort**: Low-Medium

### Recommendation

**Approach 1 — Roles estáticos con `@Roles()` decorator + `RolesGuard` separado.**

Justificación:
1. El requisito del usuario es claro y acotado: "administrador puede ver y modificar, usuario solo ver". No pide granularidad fina ni roles dinámicos.
2. El patrón de guard separado es el estándar de NestJS y mantiene el código testeable y con responsabilidades claras.
3. La implementación es económica y no requiere migraciones de DB (el esquema actual ya soporta roles como string array).
4. Si en el futuro se necesita RBAC completo (Approach 2), el decorator `@Roles()` ya estaría en todos los controllers — solo habría que cambiar la implementación interna del guard para consultar DB en vez de comparar strings. La migración sería incremental, no un rewrite.
5. **IMPORTANTE**: Primero normalizar los nombres de rol. Hoy hay 3 strings distintos: `'admin'` (bootstrap), `'administradoregsi'` (Keycloak/DTOs), `'usuarioegsi'` (Keycloak/DTOs). Unificar a `'administrador'` y `'usuario'` para el guard, manteniendo compatibilidad con Keycloak mediante un mapper.

**Plan de normalización de roles**:
- `bootstrapFirstUser()`: cambiar `['admin']` → `['administrador']`
- `ALLOWED_ROLES` en DTOs: cambiar `['administradoregsi', 'usuarioegsi']` → `['administrador', 'usuario']`
- Agregar mapper en el guard: `'administradoregsi'` → `'administrador'`, `'usuarioegsi'` → `'usuario'` (para no romper usuarios existentes con roles viejos en Keycloak o DB)

### Risks

- **Inconsistencia de nombres de rol**: Los usuarios existentes pueden tener `'administradoregsi'` o `'usuarioegsi'` en su `Usuario.roles` (JSON string) o en Keycloak. El guard debe aceptar ambos sets de nombres (viejo y nuevo) durante la transición. Mitigación: mapper en el guard.
- **Keycloak ↔ Local drift**: Si un admin cambia roles en Keycloak pero no en la DB local (o viceversa), puede haber inconsistencia. El `SyncInterceptor` actual solo sincroniza Keycloak → local. Mitigación: documentar que la fuente de verdad para roles es la DB local (el backend la controla vía `UsuariosService`).
- **Regresión en endpoints públicos**: `@Public()` debe seguir funcionando. `RolesGuard` debe respetar `IS_PUBLIC_KEY` igual que `AuthGuard`. Si no, `POST /auth/login` y `POST /auth/bootstrap` fallarían.
- **Orden de guards**: NestJS ejecuta guards en orden de registro. `AuthGuard` DEBE ejecutarse antes que `RolesGuard` para que `request.user` esté poblado. Si se invierte el orden, `RolesGuard` verá `request.user === undefined` y rechazará todas las requests.
- **Frontend autorización visual**: El menú lateral debe ocultar opciones de escritura para usuarios sin permisos. Si solo se protege el backend, usuarios con rol `'usuario'` verán botones que al clickear darán 403. Esto es UX pobre.

### Ready for Proposal

**Sí** — El análisis es completo. Se recomienda proceder con Approach 1. El proposal debe detallar:

1. Normalización de nombres de rol (mapper de compatibilidad)
2. Implementación del `@Roles()` decorator y `RolesGuard`
3. Lista exhaustiva de endpoints a proteger (qué métodos requieren qué rol)
4. Plan de migración para usuarios existentes
5. Frontend: página `/roles` (vista de roles y asignación), refactor de `usuarios.vue`, navegación condicional
6. Plan de testing TDD para el guard y decorator
