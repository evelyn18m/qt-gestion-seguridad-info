# Proposal: Módulo Usuarios (Keycloak Read-Only)

## Intent

No existe tabla de usuarios en la BD — la identidad vive en Keycloak. Este módulo expone una vista read-only de los usuarios del realm `quito-turismo` consultando la Keycloak Admin API desde el backend, con una página en el frontend que muestra tabla de usuarios y una entrada nueva en la navegación lateral ("Usuarios").

## Scope

### In Scope
- **Backend**: Nuevo `UsuariosModule` (controller + service) con endpoint `GET /usuarios` que consume la Keycloak Admin REST API
- **Frontend**: Página `pages/usuarios.vue` con tabla de usuarios (username, email, nombre, roles, enabled)
- **Navegación**: Link "Usuarios" en sidebar entre "Parametrización" y "Auditoría"
- **Tipado**: Interfaz `Usuario` en `frontend/types/api.d.ts`
- **Configuración**: Variables de entorno `KEYCLOAK_ADMIN_URL`, `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD`, `KEYCLOAK_REALM` en `docker-compose.yml`
- **Testing**: Unit test del service con mock de Keycloak admin client

### Out of Scope
- CRUD de usuarios (crear, editar, eliminar, habilitar/deshabilitar)
- Sincronización de usuarios a tabla Prisma (futuro)
- Historial de actividad por usuario (futuro)
- Paginación server-side (>100 usuarios — futuro)
- Asignación de roles desde la UI

## Capabilities

### New Capabilities
- `usuarios-keycloak`: Endpoint `GET /usuarios` que hace proxy a Keycloak Admin API (`GET /admin/realms/{realm}/users`), retorna lista de usuarios con username, email, firstName, lastName, roles, enabled
- `usuarios-page`: Página frontend con tabla de usuarios usando `useApi()`, columnas: Username, Email, Nombre, Roles, Estado (Activo/Inactivo)

### Modified Capabilities
- `frontend-navigation`: Agregar entrada "Usuarios" al sidebar con ruta `/usuarios`, entre "Parametrización" y "Auditoría"
- `frontend-api-consumption`: Agregar interfaz `Usuario` en `api.d.ts`

## Approach

**Backend**: Nuevo `UsuariosModule` siguiendo el patrón NestJS del proyecto — `nest g resource usuarios`. `UsuariosService` encapsula `@keycloak/keycloak-admin-client` (oficial Keycloak JS adapter). Admin credentials vienen de variables de entorno inyectadas vía `ConfigService`. `UsuariosController` expone `GET /usuarios` con el DTO de respuesta plano.

**Frontend**: `pages/usuarios.vue` con tabla HTML estándar, `onMounted` llama `useApi().get<Usuario[]>('/usuarios')`. Sin librería de tabla externa.

**Red**: El backend ya alcanza `http://keycloak:8080` (JWKS URI usa mismo host). Admin API usa la misma red Docker — sin cambios de red.

**Seguridad**: Credenciales admin en variables de entorno del contenedor backend (no en código). El archivo `.env` ya está en `.gitignore`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/usuarios/` | **New** | Módulo NestJS: module, controller, service, DTO, spec |
| `backend/src/app.module.ts` | Modified | Importar `UsuariosModule` |
| `backend/package.json` | Modified | Agregar `@keycloak/keycloak-admin-client` |
| `docker-compose.yml` | Modified | Agregar 4 variables `KEYCLOAK_ADMIN_*` al servicio backend |
| `frontend/pages/usuarios.vue` | **New** | Página con tabla de usuarios |
| `frontend/layouts/default.vue` | Modified | Agregar link "Usuarios" en sidebar |
| `frontend/types/api.d.ts` | Modified | Agregar interfaz `Usuario` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Keycloak admin credentials expuestos en docker-compose.yml | Low | `.env` + `.gitignore`; credenciales ya son de desarrollo |
| `@keycloak/keycloak-admin-client` incompatible con Node 22 | Low | Verificar instalación en contenedor; migrar a `fetch` directo si falla |
| Keycloak Admin API no disponible | Low | Mismo contenedor Keycloak que ya funciona; health check previo |
| Muchos usuarios (>100) degradan UI sin paginación | Low | Volumen SGSI esperado <20 usuarios; paginación server-side futura |

## Rollback Plan

Eliminar carpeta `backend/src/usuarios/`, remover import de `app.module.ts`, quitar `@keycloak/keycloak-admin-client` de `package.json`, eliminar `pages/usuarios.vue`, remover link del sidebar y variables de entorno. Sin migración de BD — rollback limpio.

## Dependencies

- Keycloak corriendo en el mismo Docker network (ya está — puerto 8080)
- `superadmin`/`admin` credentials existentes en docker-compose
- `@keycloak/keycloak-admin-client` instalable vía npm

## Success Criteria

- [ ] `GET /usuarios` retorna JSON con lista de usuarios del realm Keycloak (no hardcodeado)
- [ ] Cada usuario incluye: username, email, firstName, lastName, roles (realm), enabled
- [ ] Página `/usuarios` renderiza tabla con todas las columnas sin errores de consola
- [ ] Link "Usuarios" en sidebar navega a `/usuarios` y se resalta en estado activo
- [ ] Link posicionado entre "Parametrización" y "Auditoría"
- [ ] `docker compose exec backend npm run test` pasa (unit test de UsuariosService con mock)
- [ ] Tipos TypeScript (`Usuario`) exportados desde `api.d.ts` y usados sin `any`
