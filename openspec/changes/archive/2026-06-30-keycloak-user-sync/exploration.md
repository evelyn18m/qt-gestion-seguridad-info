## Exploration: Sincronización Bidireccional Keycloak ↔ Usuarios Locales

### Current State

#### Autenticación híbrida — ya implementada
El sistema soporta **dos fuentes de autenticación** que coexisten:

1. **Keycloak OIDC** (provider externo) — los tokens emitidos por Keycloak (`quito-turismo` realm, client `sgsi-app`) se validan vía JWKS (`jwks-rsa`). El `AuthGuard` compuesto intenta primero validación HMAC local (rápida, sin red) y luego hace fallback a Keycloak JWKS. Cuando el token es Keycloak, `req.user.source === 'keycloak'` y contiene `userId` (sub), `username`, `email`, `roles` (desde `realm_access.roles`), y `keycloakSub`.

2. **Local JWT** (HS256) — login con `POST /auth/login`, bcrypt contra `Usuario.passwordHash`. `req.user.source === 'local'`.

Rutas protegidas por `AuthGuard` global (`APP_GUARD` en `app.module.ts`). Rutas públicas marcadas con `@Public()`.

#### Modelo Usuario (Prisma)
```prisma
model Usuario {
  id           String   @id @default(uuid())
  keycloakSub  String?  @unique     // sub del token Keycloak — nullable
  username     String   @unique
  email        String   @default("")
  passwordHash String?              // null para usuarios Keycloak-only
  primerInicio Boolean  @default(true)
  habilitado   Boolean  @default(true)
  roles        String   @default("[]")  // JSON string, ej: '["admin","user"]'
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```
- `keycloakSub` es nullable porque usuarios creados localmente no tienen vinculo con Keycloak.
- `roles` es un JSON string (decisión de diseño previa para evitar tabla de join, documentada en el design de hybrid-auth).
- No hay campos `firstName` / `lastName` — solo se guarda `username` y `email`.

#### SyncInterceptor — EXISTE PERO NO ESTÁ ACTIVO
**Descubrimiento crítico**: `SyncInterceptor` (`backend/src/auth/sync.interceptor.ts`) está definido, tiene tests (4 specs que pasan), pero **NO está registrado como `APP_INTERCEPTOR`**. Solo figura como provider en `AuthModule` sin el token `APP_INTERCEPTOR`. Esto significa que **el auto-provisioning de usuarios Keycloak (requisito #3) NO está funcionando actualmente**.

Comparar con `AuditInterceptor` que SÍ está correctamente registrado:
- `audit.module.ts`: `{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }` ✅
- `auth.module.ts`: `SyncInterceptor` (sin `APP_INTERCEPTOR`) ❌

#### Creación de usuarios (backend)
- `POST /usuarios` → `UsuariosService.create()` genera password aleatorio (16 bytes hex), hashea con bcrypt (10 rounds), crea registro local con `roles: '[]'`, `primerInicio: true`, `passwordHash` seteado, `keycloakSub: null`.
- Retorna `{ usuario, contraseñaGenerada }`.
- **NO crea el usuario en Keycloak**.

#### Actualización de usuarios (backend)
- `PATCH /usuarios/:id` → `UsuariosService.update()` solo actualiza `email`, `habilitado`, `roles` en DB local.
- **NO sincroniza cambios con Keycloak**.
- El campo `roles` se recibe como `string[]` en el DTO y se guarda como `JSON.stringify()`.

#### Eliminación de usuarios (backend)
- `DELETE /usuarios/:id` → borra solo de DB local.
- **NO elimina el usuario de Keycloak**.

#### Keycloak Admin — configuración lista
Variables de entorno YA configuradas (`.env` y `docker-compose.yml`):
```
KEYCLOAK_ADMIN_URL=http://keycloak:8080
KEYCLOAK_REALM=quito-turismo
KEYCLOAK_ADMIN_USER=superadmin
KEYCLOAK_ADMIN_PASSWORD=admin
```

El Keycloak container (`quay.io/keycloak/keycloak:24.0.0`) corre en modo `start-dev --import-realm`, cargando `keycloak/realm-export.json`.

#### Roles en Keycloak (estructura actual)
Los roles del sistema son **CLIENT-LEVEL** en el client `sgsi-app`:
```json
{
  "roles": {
    "client": {
      "sgsi-app": [
        { "name": "administradoregsi" },
        { "name": "usuarioegsi" }
      ]
    }
  }
}
```

Los usuarios en Keycloak tienen `clientRoles.sgsi-app` con arrays de strings. **No hay realm roles definidos**. Esto es importante porque la API de role-mapping debe apuntar a endpoints de cliente, no de realm.

#### Frontend — página Usuarios
`frontend/pages/usuarios.vue` (915 líneas): tabla con columnas Username, Email, Roles, Estado, Acciones. Modales para crear (con contraseña generada), editar (email, habilitado, roles como texto separado por comas), y eliminar con confirmación. Sin cambios necesarios para el sync — los modales ya muestran roles y la creación ya muestra la contraseña generada.

#### Dependencias npm — SIN keycloak-admin-client
El `backend/package.json` NO tiene ningún paquete de Keycloak. Solo tiene `jwks-rsa` (para validación de tokens), `passport-jwt`, `passport-local`, `bcrypt`, `@nestjs/jwt`. Tampoco tiene `@nestjs/axios` ni `axios` para hacer HTTP calls al Admin REST API de Keycloak.

El frontend SÍ tiene `keycloak-js` para OIDC client-side.

### Affected Areas

- **`backend/src/auth/sync.interceptor.ts`** — WIRING: registrarlo como `APP_INTERCEPTOR` para activar el auto-provisioning (requisito #3). Actualmente existe pero no se ejecuta.
- **`backend/src/auth/auth.module.ts`** — cambiar `SyncInterceptor` de provider simple a `APP_INTERCEPTOR`, y exportarlo.
- **`backend/src/usuarios/usuarios.service.ts`** — CORE: extender `create()`, `update()`, `delete()` para sincronizar con Keycloak via un nuevo servicio.
- **`backend/src/usuarios/usuarios.module.ts`** — importar el nuevo módulo/servicio de Keycloak.
- **`backend/src/keycloak/` (NUEVO)** — nuevo módulo NestJS: `KeycloakAdminService` que encapsula la comunicación con Keycloak Admin REST API. Responsabilidades:
  - Obtener admin token (password grant contra master realm)
  - Crear usuario en Keycloak (`POST /admin/realms/{realm}/users`)
  - Buscar usuario por username (`GET /admin/realms/{realm}/users?username=...`)
  - Obtener UUID del client `sgsi-app` (`GET /admin/realms/{realm}/clients?clientId=sgsi-app`)
  - Asignar/revocar client roles (`POST/DELETE /admin/realms/{realm}/users/{id}/role-mappings/clients/{clientUuid}`)
  - Eliminar usuario (`DELETE /admin/realms/{realm}/users/{id}`)
  - Cache del admin token y client UUID para evitar llamadas repetidas
- **`backend/package.json`** — agregar dependencia HTTP (`@nestjs/axios` + `axios`, o usar `fetch` nativo de Node 22). Alternativa: `@keycloak/keycloak-admin-client`.
- **`backend/.env`** — ya contiene todas las variables necesarias. Sin cambios.
- **`backend/src/usuarios/dto/create-usuario.dto.ts`** — posiblemente extender con `roles?: string[]` opcional para permitir asignar roles al crear.
- **`backend/src/usuarios/usuarios.service.spec.ts`** — extender tests para cubrir la sincronización con Keycloak (mocks del KeycloakAdminService).
- **`backend/src/auth/sync.interceptor.spec.ts`** — tests existentes cubren upsert local. Agregar test de integración para verificar que el interceptor está activo (APP_INTERCEPTOR).
- **`keycloak/realm-export.json`** — considerar si `sgsi-app` necesita `serviceAccountsEnabled: true` para usar client credentials grant en vez de password grant del admin.
- **`frontend/pages/usuarios.vue`** — sin cambios necesarios. El modal de creación ya muestra la contraseña generada (que ahora también se setea en Keycloak). El modal de edición ya permite modificar roles.

### Approaches

#### 1. KeycloakAdminService + NestJS HttpModule + Wire SyncInterceptor (Recomendado)
Crear un `KeycloakModule` con `KeycloakAdminService` que use `HttpModule` (`@nestjs/axios`) para hacer llamadas REST directas al Admin API de Keycloak. Wirear el `SyncInterceptor` existente como `APP_INTERCEPTOR`. Extender `UsuariosService` para llamar al `KeycloakAdminService` en create/update/delete.

- **Pros**:
  - Sin dependencia externa pesada — `@nestjs/axios` es ligero y idiomático para NestJS
  - Control total sobre los endpoints y manejo de errores
  - El `SyncInterceptor` ya está escrito y testeado — solo falta wirearlo
  - Reusa las variables de entorno existentes
  - Fácil de testear con mocks de `HttpService`
- **Cons**:
  - Hay que implementar el flujo de auth (obtener admin token, refrescarlo)
  - Manejo manual de la API REST (aunque son ~5 endpoints)
  - Hay que cachear el client UUID de `sgsi-app`
- **Effort**: Medium (~400-500 líneas en ~6-8 archivos)

#### 2. @keycloak/keycloak-admin-client Library
Usar el paquete oficial `@keycloak/keycloak-admin-client` que provee una API tipada para todas las operaciones admin.

- **Pros**:
  - API tipada, menos código boilerplate
  - Manejo automático de auth token (refresh, expiry)
  - Métodos como `users.create()`, `users.addClientRoleMappings()` ya implementados
- **Cons**:
  - Dependencia externa adicional (~200KB)
  - La API puede cambiar entre versiones de Keycloak
  - El paquete `@keycloak/keycloak-admin-client` es relativamente nuevo y puede tener menos madurez que llamadas REST directas
  - Hay que verificar compatibilidad con Keycloak 24 (el paquete en npm puede apuntar a versiones más nuevas)
  - Overkill para ~5 endpoints que necesitamos
- **Effort**: Medium (~300-350 líneas en ~5-6 archivos)

#### 3. Event-Driven con NestJS EventEmitter (Desacoplado)
Emitir eventos desde `UsuariosService` (`usuario.creado`, `usuario.actualizado`, `usuario.eliminado`) y tener un `KeycloakSyncListener` separado que reacciona a esos eventos para sincronizar con Keycloak.

- **Pros**:
  - Totalmente desacoplado — `UsuariosService` no conoce Keycloak
  - Fácil de deshabilitar el sync (no registrar el listener)
  - Escalable a otros sistemas en el futuro
- **Cons**:
  - Más complejo — dos módulos nuevos, eventos, listeners
  - El manejo de errores es más difícil (¿qué pasa si el evento falla?)
  - La consistencia transaccional es más compleja (DB local ok pero Keycloak falló)
  - No es necesario para este scope — solo hay un consumidor
- **Effort**: Medium-High (~550-650 líneas en ~8-10 archivos)

### Recommendation

**Approach 1 — KeycloakAdminService + HttpModule + Wire SyncInterceptor**

Razones:
1. **El SyncInterceptor ya existe y tiene tests** — es un bug que no esté wireado. Arreglarlo es **1 línea de código** (`{ provide: APP_INTERCEPTOR, useClass: SyncInterceptor }` en `auth.module.ts`). Esto resuelve el requisito #3 inmediatamente.
2. **Mínima dependencia** — `@nestjs/axios` ya es parte del ecosistema NestJS estándar. No necesitamos un paquete externo de Keycloak que puede tener problemas de compatibilidad.
3. **Control total** — solo necesitamos ~5 endpoints REST. El código será simple, mantenible y fácil de testear.
4. **Las variables de entorno ya están** — `KEYCLOAK_ADMIN_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD` ya configuradas.
5. **Coherencia con la arquitectura existente** — DDD ligero con servicios que contienen lógica de negocio. El `KeycloakAdminService` es un servicio de infraestructura que encapsula la comunicación externa.

#### Plan de implementación sugerido:
1. **Paso 1 (Wire SyncInterceptor)**: Registrar `SyncInterceptor` como `APP_INTERCEPTOR` en `auth.module.ts`. Esto activa el auto-provisioning (#3). Escribir test e2e o de integración.
2. **Paso 2 (KeycloakModule + KeycloakAdminService)**: Crear `backend/src/keycloak/` con módulo, servicio y tests. Implementar: `getAdminToken()`, `createUser()`, `findUserByUsername()`, `getClientUuid()`, `assignClientRoles()`, `deleteUser()`.
3. **Paso 3 (Integrar en UsuariosService)**: Extender `create()` para crear en Keycloak y guardar el `keycloakSub` retornado. Extender `update()` para sincronizar roles/email/habilitado. Extender `delete()` para eliminar de Keycloak.
4. **Paso 4 (Manejo de edge cases)**: Keycloak caído → graceful degradation. Username ya existe en KC → error 409 amigable. Roles inválidos → validación.

### Risks

- **Keycloak no disponible**: Si el servicio de Keycloak está caído, las operaciones CRUD de usuarios fallarían si hacemos el sync de forma síncrona. **Mitigación**: el sync a Keycloak debe ser best-effort — si falla, loguear warning pero no rejectear la operación local. El `SyncInterceptor` ya usa este patrón (fire-and-forget, catch silencioso).
- **Inconsistencia de datos**: Si el create en DB local funciona pero el create en Keycloak falla, el usuario existe localmente sin `keycloakSub`. **Mitigación**: guardar el `keycloakSub` solo después de crear exitosamente en Keycloak. Si Keycloak falla, el usuario igual existe (con `keycloakSub: null`) y puede loguearse localmente con la contraseña generada.
- **Conflictos de username**: El `username` debe ser único tanto en DB local (unique constraint) como en Keycloak (unique por realm). **Mitigación**: si Keycloak retorna 409 (conflict), devolver un error claro al frontend indicando que el username ya existe.
- **Roles inconsistentes entre sistemas**: Los roles se guardan como JSON string en DB local pero como client roles en Keycloak. Los nombres deben coincidir exactamente. Actualmente los roles en Keycloak son `administradoregsi` y `usuarioegsi`, pero en el frontend se ingresan como texto libre separado por comas. **Mitigación**: validar que los roles existen en Keycloak antes de asignarlos, o usar un dropdown en el frontend con los roles disponibles.
- **Service account permissions**: El admin user `superadmin` tiene acceso total, pero usar sus credenciales para operaciones rutinarias no es ideal. **Mitigación a futuro**: habilitar `serviceAccountsEnabled: true` en `sgsi-app` y usar client credentials grant con scopes limitados. Para esta fase, el admin user es aceptable en entorno dev.
- **SyncInterceptor en cada request**: Una vez wireado, el interceptor hará un `upsert` a la DB en CADA request autenticado por Keycloak (no solo en login). Esto es un overhead de DB innecesario. **Mitigación**: considerar limitar el sync solo a ciertas rutas (ej. solo en el primer request después del login, usando una flag en el token o un timestamp de último sync). Para esta fase, el overhead es mínimo (un upsert con unique key es O(log n)).
- **firstName/lastName no existen en el modelo**: Keycloak soporta `firstName` y `lastName` pero nuestro modelo `Usuario` no. Si se quiere mostrar nombres en el futuro, habría que migrar. Por ahora no es necesario para el sync.

### Keycloak Admin REST API — Endpoints necesarios (Keycloak 24)

| Operación | Método | Endpoint | Body |
|-----------|--------|----------|------|
| Obtener admin token | POST | `/realms/master/protocol/openid-connect/token` | `grant_type=password&client_id=admin-cli&username=superadmin&password=admin` |
| Crear usuario | POST | `/admin/realms/quito-turismo/users` | `{ username, email, enabled: true, credentials: [{type:"password", value:"...", temporary:false}] }` |
| Buscar usuario por username | GET | `/admin/realms/quito-turismo/users?username={username}&exact=true` | — |
| Obtener client UUID | GET | `/admin/realms/quito-turismo/clients?clientId=sgsi-app` | — |
| Asignar client roles | POST | `/admin/realms/quito-turismo/users/{userId}/role-mappings/clients/{clientUuid}` | `[{id:"role-uuid", name:"administradoregsi"}]` |
| Obtener client roles | GET | `/admin/realms/quito-turismo/clients/{clientUuid}/roles` | — |
| Eliminar usuario | DELETE | `/admin/realms/quito-turismo/users/{userId}` | — |
| Actualizar usuario | PUT | `/admin/realms/quito-turismo/users/{userId}` | `{ email, enabled }` |

### Ready for Proposal

**Yes** — el scope está bien definido, las dependencias son mínimas, la arquitectura es clara y el mayor riesgo (SyncInterceptor no wireado) es un bug trivial de arreglar. La exploración identificó exactamente qué archivos modificar, qué endpoints de Keycloak usar, y qué edge cases manejar.
