# Delta Specs for modulo-usuarios

## usuarios-keycloak (NEW)

### Purpose

Backend endpoint that proxies the Keycloak Admin REST API to expose realm users via `GET /usuarios`.

### Requirements

#### Requirement: List Realm Users via Keycloak Admin API

El endpoint `GET /usuarios` MUST consultar la Keycloak Admin API (`GET /admin/realms/{realm}/users`) usando credenciales admin de variables de entorno. La respuesta MUST ser un array JSON plano con: id, username, email, firstName, lastName, realmRoles (string[]), enabled (boolean).

##### Scenario: Keycloak returns users successfully

- GIVEN Keycloak Admin API responde con lista de usuarios del realm `quito-turismo`
- WHEN el frontend llama `GET /usuarios`
- THEN el backend retorna status 200 con array de objetos `{id, username, email, firstName, lastName, realmRoles, enabled}`
- AND cada usuario tiene al menos username y enabled

##### Scenario: Keycloak realm sin usuarios

- GIVEN el realm Keycloak no tiene usuarios registrados
- WHEN `GET /usuarios` es llamado
- THEN el endpoint retorna 200 con array vacío `[]`

##### Scenario: Keycloak Admin API inalcanzable

- GIVEN el contenedor Keycloak está caído o no responde
- WHEN `GET /usuarios` es llamado
- THEN el endpoint MUST retornar 502 Bad Gateway con mensaje de error descriptivo
- AND el mensaje incluye la causa raíz (connection refused / timeout)

##### Scenario: Token admin expirado durante la request

- GIVEN el token de admin de Keycloak expiró entre requests
- WHEN el backend intenta llamar a la Admin API y recibe 401
- THEN el service MUST reautenticarse con las credenciales admin y reintentar UNA vez
- AND si el reintento falla, retorna 502

---

## usuarios-page (NEW)

### Purpose

Página frontend en `/usuarios` con tabla de solo lectura que muestra usuarios del realm Keycloak.

### Requirements

#### Requirement: User Data Table Rendering

La página MUST mostrar una tabla HTML con columnas: Username, Email, Nombre (firstName lastName), Roles, Estado. Estado MUST mostrar "Activo" si enabled=true o "Inactivo" si enabled=false.

##### Scenario: Tabla con usuarios cargados

- GIVEN el backend retorna lista de usuarios
- WHEN la página `/usuarios` monta
- THEN la tabla renderiza una fila por usuario con las 5 columnas
- AND los roles se muestran unidos por coma
- AND el estado muestra badge visual (verde Activo / rojo Inactivo)

##### Scenario: Realm sin usuarios

- GIVEN el backend retorna array vacío
- WHEN la página carga
- THEN la tabla muestra mensaje "No se encontraron usuarios" sin filas

#### Requirement: API Consumption Pattern

La página MUST usar `useApi().get<Usuario[]>('/usuarios')` en `onMounted`. MUST mostrar indicador de carga mientras la request está en vuelo y manejar errores sin crashear.

##### Scenario: Carga exitosa

- GIVEN el usuario navega a `/usuarios`
- WHEN `onMounted` dispara la request
- THEN se muestra spinner/loader durante la carga
- AND al completar, la tabla reemplaza el loader

##### Scenario: Error de API

- GIVEN el backend retorna 502 (Keycloak caído)
- WHEN la página intenta cargar usuarios
- THEN se muestra mensaje de error descriptivo
- AND la página NO crashea (error boundary captura la excepción)

---

## Delta for frontend-navigation

### ADDED Requirements

#### Requirement: Sidebar Usuarios Link

El sidebar MUST incluir un `NuxtLink to="/usuarios"` con label "Usuarios", posicionado entre "Parametrización" y "Auditoría". El link MUST cerrar el sidebar en mobile (`@click="closeSidebar"`).

##### Scenario: Link renders in correct position

- GIVEN el sidebar se renderiza en cualquier página
- WHEN se inspeccionan los nav items
- THEN existe un `NuxtLink to="/usuarios"` con texto "Usuarios"
- AND está ubicado después del link de "Parametrización" y antes del link de "Auditoría"

##### Scenario: Active state on /usuarios route

- GIVEN el usuario está en `/usuarios`
- WHEN el sidebar renderiza
- THEN el link "Usuarios" tiene la clase `active`
- AND los demás links no tienen la clase `active`

##### Scenario: Click navigates to /usuarios

- GIVEN el usuario está en cualquier página
- WHEN hace click en "Usuarios" del sidebar
- THEN navega a `/usuarios`
- AND en mobile el sidebar se cierra automáticamente

---

## Delta for frontend-api-consumption

### ADDED Requirements

#### Requirement: Usuario Interface in api.d.ts

`frontend/types/api.d.ts` MUST exportar la interfaz `Usuario` con campos: `id: string`, `username: string`, `email?: string`, `firstName?: string`, `lastName?: string`, `realmRoles: string[]`, `enabled: boolean`. Ningún componente MAY usar `any` para datos de usuario.

##### Scenario: TypeScript compilation with Usuario

- GIVEN la interfaz `Usuario` está definida en `api.d.ts`
- WHEN `usuarios.vue` usa `ref<Usuario[]>([])` y llama `useApi().get<Usuario[]>('/usuarios')`
- THEN `npx tsc --noEmit` compila sin errores de tipos
- AND no hay usos de `any` en el contexto de datos de usuario

##### Scenario: Import and reuse across components

- GIVEN `Usuario` está exportado desde `api.d.ts`
- WHEN otro componente futuro necesita el tipo
- THEN puede importarlo con `import type { Usuario } from '~/types/api'`
