# Design: Sincronización Bidireccional Keycloak ↔ Usuarios Locales

## Technical Approach

Dos frentes independientes: (1) wirear `SyncInterceptor` ya existente como `APP_INTERCEPTOR` para auto-provisioning en login, (2) nuevo `KeycloakModule` con `KeycloakAdminService` que usa `@nestjs/axios` `HttpModule` para CRUD REST contra la Admin API de Keycloak 24, integrado en `UsuariosService` con patrón best-effort (try/catch + logger.warn, nunca reject).

## Architecture Decisions

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| `@nestjs/axios` HttpModule vs axios manual | HttpModule = injectable, testeable, idiomático NestJS; axios manual = menos boilerplate pero más difícil mockear | **HttpModule** — el proyecto ya sigue patrones NestJS, y el mock de HttpService en tests es trivial |
| Cache en memoria (Map) vs Redis vs sin cache | Sin cache = 2 HTTP calls extra por operación. Redis = sobre-ingeniería para 1 instancia. Map = simple, suficiente para token (TTL ~5min) y client UUID (inmutable). | **Map en servicio** — token cacheado hasta expirar, UUID cacheado indefinidamente |
| Sincronizar roles en create() vs solo en update() | create ya setea `roles: '[]'` localmente. Keycloak sí acepta roles en creación si se asigna post-create. Dos llamadas vs una. | **Dos pasos**: create user → obtener ID → assign client roles. Keycloak no soporta asignar client roles en el payload de creación de usuario |
| Guardar keycloakSub en create() vs buscarlo luego | Guardarlo al crear evita un GET extra. Si Keycloak falla después de crear, el sub se pierde (pero el usuario local existe). | **Guardar inmediatamente** — `prisma.usuario.update({ keycloakSub })` justo tras crear en Keycloak |

## Data Flow

```
┌─ CREATE ──────────────────────────────────────────────┐
│  POST /usuarios {username, email, roles?}              │
│    │                                                    │
│    ├─► Prisma: create usuario (local, password gen)    │
│    │     └─ ret: { usuario, contraseñaGenerada }       │
│    │                                                    │
│    └─► try { KeycloakAdminService.createUser()         │
│         │    POST /admin/realms/quito-turismo/users     │
│         │    body: { username, email, enabled,          │
│         │            credentials:[{type:password,...}] }│
│         │    └─► ret: keycloakUserId (UUID)            │
│         │                                              │
│         ├─► Prisma: update usuario.keycloakSub         │
│         │                                              │
│         └─► if roles: getClientUuid() →                │
│              assignClientRoles(userId, clientUuid,      │
│                                roles)                   │
│       } catch (e) { logger.warn('keycloak sync fail') }│
└────────────────────────────────────────────────────────┘

┌─ UPDATE ──────────────────────────────────────────────┐
│  PATCH /usuarios/:id {email?, habilitado?, roles?}     │
│    │                                                    │
│    ├─► Prisma: update usuario local                    │
│    │                                                    │
│    └─► if usuario.keycloakSub:                          │
│         try {                                           │
│           PUT /admin/realms/quito-turismo/users/{sub}   │
│           body: { email, enabled }                      │
│           if roles: assignClientRoles(sub, roles)       │
│         } catch (e) { logger.warn(...) }                │
└────────────────────────────────────────────────────────┘

┌─ DELETE ──────────────────────────────────────────────┐
│  DELETE /usuarios/:id                                  │
│    │                                                    │
│    ├─► Prisma: delete usuario                          │
│    │                                                    │
│    └─► if usuario.keycloakSub:                          │
│         try { DELETE /admin/realms/.../users/{sub} }    │
│         catch (e) { logger.warn(...) }                  │
└────────────────────────────────────────────────────────┘

┌─ LOGIN (SyncInterceptor — ya existe, solo wirear) ────┐
│  Request → AuthGuard → JwtStrategy.validate()          │
│    │                                                    │
│    └─► APP_INTERCEPTOR: SyncInterceptor                │
│         if user.source === 'keycloak':                  │
│           void prisma.usuario.upsert({                  │
│             where: { keycloakSub },                     │
│             create: {...}, update: {...}                │
│           })                                            │
└────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/auth/auth.module.ts` | Modify | Agregar `{ provide: APP_INTERCEPTOR, useClass: SyncInterceptor }` + importar `APP_INTERCEPTOR` de `@nestjs/core` |
| `backend/src/keycloak/keycloak.module.ts` | Create | `@Global()` module, importa `HttpModule`, exporta `KeycloakAdminService` |
| `backend/src/keycloak/keycloak-admin.service.ts` | Create | `getAdminToken()`, `createUser()`, `findUserByUsername()`, `assignClientRoles()`, `deleteUser()`, `getClientUuid()`. Cache con `Map<string, { token, exp }>`. Config desde `ConfigService` o `process.env`. |
| `backend/src/keycloak/keycloak-admin.service.spec.ts` | Create | Tests unitarios con `HttpService` mockeado |
| `backend/src/usuarios/usuarios.service.ts` | Modify | Inyectar `KeycloakAdminService`. `create()` → sync a KC + guardar `keycloakSub`. `update()` → sync email/habilitado/roles. `delete()` → delete en KC. Todo en try/catch. |
| `backend/src/usuarios/usuarios.service.spec.ts` | Modify | Nuevos tests: create/update/delete con mock de KeycloakAdminService; tests de best-effort (KC falla → operación local OK) |
| `backend/src/usuarios/usuarios.module.ts` | Modify | Importar `KeycloakModule` |
| `backend/src/usuarios/dto/create-usuario.dto.ts` | Modify | Agregar `@IsOptional() @IsString({ each: true }) roles?: string[]` |
| `backend/package.json` | Modify | Agregar `@nestjs/axios` y `axios` en dependencies |

## Interfaces / Contracts

```typescript
// KeycloakAdminService — firma pública
interface IKeycloakAdminService {
  getAdminToken(): Promise<string>;                          // cached, password grant → master
  createUser(dto: CreateKeycloakUserDto): Promise<string>;   // ret: keycloak user UUID
  findUserByUsername(username: string): Promise<KeycloakUser | null>;
  assignClientRoles(userId: string, roles: string[]): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  getClientUuid(): Promise<string>;                          // cached, busca sgsi-app
}

// DTO interno (no expuesto en API)
interface CreateKeycloakUserDto {
  username: string;
  email: string;
  enabled: boolean;
  credentials: [{ type: 'password'; value: string; temporary: boolean }];
}
```

No hay cambios en el modelo Prisma — `keycloakSub` ya es `String? @unique`.

## Testing Strategy

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| Unit — KeycloakAdminService | Token caching, create/find/delete/assignRoles con HttpService mockeado, errores HTTP (401, 409, 503) | `Test.createTestingModule` + `HttpService` mock con `{ get, post, delete }` jest.fn() retornando `of(axiosResponse)` |
| Unit — UsuariosService | create → llama KC + guarda sub; update/delete → llama KC si keycloakSub existe; KC caído → operación local completa sin reject | Mock `KeycloakAdminService` con jest.fn(); verificar llamadas con `toHaveBeenCalledWith`; simular reject para probar best-effort |
| Unit — SyncInterceptor | Ya existen 4 tests (create, update, skip-local, no-roles) — deben seguir pasando tras wirear | Sin cambios requeridos |
| Integración | End-to-end: POST /usuarios → verificar usuario en Keycloak vía admin API | Manual o e2e spec con supertest + keycloak real (requiere Docker Compose corriendo) |

## Migration / Rollout

Sin migración de datos. Los usuarios existentes con `keycloakSub: null` no se sincronizan en update/delete (el servicio chequea `if usuario.keycloakSub`). Rollback: remover `APP_INTERCEPTOR` de `auth.module.ts`, remover `KeycloakModule` de `usuarios.module.ts`, revertir `UsuariosService` a versión pre-sync.

## Open Questions

- [ ] ¿La contraseña generada en `create()` debe ser `temporary: true` en Keycloak (forzar cambio en primer login) o `temporary: false`? El modelo local ya usa `primerInicio: true` como flag semántico — mantener `temporary: false` en KC para consistencia.
- [ ] ¿Manejar 409 Conflict en `createUser()` (username duplicado en Keycloak)? Propuesta: catch + `logger.warn`, no reject — el usuario local ya existe. Si el admin quiere sync posterior, el update lo corregirá.
