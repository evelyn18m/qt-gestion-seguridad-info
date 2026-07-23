# SGSI Technical Documentation

This document describes the technical architecture, stack, deployment, and development workflow for the **SGSI (Sistema de Gestión de Seguridad de la Información)** monorepo. It is intended for developers, DevOps, and technical reviewers. It does not cover end-user functionality.

## Quick start

1. Clone the repository.
2. Ensure Docker and Docker Compose are installed.
3. Run the stack:
   ```bash
   docker compose up -d
   ```
4. Seed the database (only after first start):
   ```bash
   docker compose exec backend npx prisma db seed
   ```
5. Access the services:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001`
   - Keycloak: `http://localhost:8080`
   - Adminer: `http://localhost:8082`

## System overview

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Frontend | Nuxt 4 (Vue 3, SPA) | User interface, OIDC authentication, dashboards, reports |
| Backend | NestJS 11 + Prisma 7.8 | REST API, business logic, risk calculations, exports |
| Database | MySQL 8.0 | Application data (`sgsi_db`) and Keycloak data (`keycloak_db`) |
| Identity | Keycloak 24.0 | OIDC provider, realm `quito-turismo`, public client `sgsi-app` |
| Infrastructure | Docker Compose | Local development and orchestration |

## Repository layout

```
qt-gestion-seguridad-info/
├── backend/                 # NestJS API
│   ├── prisma/             # Schema, migrations, seed
│   ├── src/                # Application modules
│   └── test/               # E2E tests
├── frontend/               # Nuxt 4 SPA
│   ├── pages/              # File-based routing
│   ├── components/         # Vue components
│   ├── composables/        # Auth, API, session helpers
│   ├── plugins/            # Keycloak, charts, audit tracking
│   └── server/api/         # Server-side proxies
├── keycloak/               # Realm export and configuration notes
├── mysql-init/             # Initial DB and user creation
├── docker-compose.yml      # Full stack definition
└── docs/                   # Technical documentation
```

## Infrastructure

### Services (`docker-compose.yml`)

| Service | Image | Host port | Depends on | Notes |
|---------|-------|-----------|------------|-------|
| `mysql` | `mysql:8.0` | `3307:3306` | — | `sgsi_db` + `keycloak_db`; healthcheck enabled |
| `keycloak` | `quay.io/keycloak/keycloak:24.0.0` | `8080:8080` | `mysql` | Imports `keycloak/realm-export.json` |
| `backend` | `node:22-alpine` | `3001:3001` | `mysql` | Mounts `./backend` for hot reload |
| `frontend` | `node:22-alpine` | `3000:3000` | `mysql`, `keycloak` | Mounts `./frontend` for hot reload |
| `adminer` | `adminer` | `8082:8080` | — | MySQL management UI |

### Network and volumes

- Network: `sgsi-network` (bridge).
- Volume: `mysql_data` for MySQL persistence.
- Bind mounts:
  - `./backend` → `/app` (backend hot reload)
  - `./frontend` → `/app` (frontend hot reload)
  - `./keycloak/realm-export.json` → `/opt/keycloak/data/import/realm-export.json` (read-only)
  - `./mysql-init` → `/docker-entrypoint-initdb.d` (initialization)

### MySQL initialization

`mysql-init/init.sql` creates two databases and users:

| Database | User | Password |
|----------|------|----------|
| `sgsi_db` | `sgsi_user` | `sgsi_password` |
| `keycloak_db` | `keycloak_user` | `keycloak_password` |

## Backend

### Stack

| Component | Version / Detail |
|-----------|------------------|
| Node.js | `node:22-alpine` (Docker) |
| NestJS | `^11.0.1` |
| TypeScript | `^5.7.3` |
| Prisma | `^7.8.0` with `@prisma/adapter-mariadb` |
| Database driver | MariaDB adapter over MySQL 8 |
| Authentication | Passport (`passport-jwt`, `passport-local`), `@nestjs/jwt`, `jwks-rsa`, `bcrypt` |
| HTTP client | `@nestjs/axios`, `axios` |
| Excel | `xlsx`, `xlsx-js-style` |
| Testing | Jest `^30.0.0`, `ts-jest`, `supertest` |
| Lint/Format | ESLint 9, Prettier 3 |

### Project structure

```
backend/src/
├── main.ts                    # Bootstrap: CORS, ValidationPipe, port
├── app.module.ts              # Root module, global guards
├── prisma/
│   └── prisma.service.ts      # PrismaClient with MariaDB adapter
├── auth/                      # Local JWT login, guards, roles, decorators
├── keycloak/                  # Keycloak Admin API synchronization
├── usuarios/                  # User CRUD + Keycloak sync
├── catalogos/                 # Generic catalog endpoints
├── valoraciones/              # Asset valuation, risk details, recalculation
├── plan-tratamiento/          # Treatment plan CRUD
├── reportes/                  # Reports, dashboards, Excel exports
├── parametros/                # Risk thresholds
└── audit/                     # Audit logs, request interceptor, Excel export
```

### Architecture patterns

- **Controllers + Services + Modules**: classic NestJS structure.
- **Global guards**: `AuthGuard` and `RolesGuard` registered as `APP_GUARD` in `app.module.ts`.
- **Global validation**: `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- **Custom decorators**:
  - `@Public()` — skips authentication.
  - `@Roles(...)` — role-based access control.
  - `@CurrentUser()` — extracts `req.user`.
- **Interceptors**:
  - `AuditInterceptor` — logs non-whitelisted requests to `AuditLog`.
  - `SyncInterceptor` — upserts Keycloak-authenticated users into the local `Usuario` table.
- **Soft deletes**: main entities use an `eliminado` boolean flag.
- **Fire-and-forget audit**: services call `void this.auditService.log(...)`.

### Authentication

The backend supports two token sources:

1. **Local JWT (HS256)**
   - `POST /auth/login` validates credentials against the local `Usuario` table (`bcrypt`).
   - `AuthService.generateToken` signs a JWT with `source: 'local'`.
   - `AuthGuard.tryLocal` validates the token with `JWT_SECRET`.

2. **Keycloak (RS256 via JWKS)**
   - `JwtStrategy` uses `KEYCLOAK_JWKS_URI`.
   - Extracts roles from `realm_access` and `resource_access`.
   - `SyncInterceptor` syncs the user into `Usuario` on first Keycloak login.

**Role mapping** (`RolesGuard`):

| Keycloak role | Internal role |
|---------------|---------------|
| `admin` / `administradoregsi` | `administrador` |
| `usuarioegsi` | `usuario` |

### Key API endpoints

| Prefix | Description |
|--------|-------------|
| `POST /auth/login` | Local login (public) |
| `POST /auth/bootstrap` | Create first user if table is empty (public) |
| `POST /auth/set-password` | Authenticated user sets initial password |
| `/usuarios` | User CRUD (admin for writes) |
| `/catalogos/:tipo` | Generic catalog CRUD |
| `/valoraciones` | Asset valuation and risk recalculation |
| `/plan-tratamiento` | Treatment plan CRUD |
| `/parametros` | Risk thresholds |
| `/reportes/*` | Reports and Excel exports |
| `/audit` | Audit logs and export |

### Scripts

```bash
npm run start:dev      # Dev server with watch
npm run build          # Build to dist/
npm run lint           # ESLint --fix
npm run test           # Unit tests
npm run test:e2e       # E2E tests
npx prisma db push     # Sync schema without migration
npx prisma db seed     # Run seed
```

### Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection string |
| `PORT` | Server port (default 3001) |
| `KEYCLOAK_JWKS_URI` | Keycloak JWKS endpoint |
| `KEYCLOAK_ADMIN_URL` | Keycloak Admin API |
| `KEYCLOAK_REALM` | Realm name |
| `KEYCLOAK_ADMIN_USER` | Admin API username |
| `KEYCLOAK_ADMIN_PASSWORD` | Admin API password |
| `JWT_SECRET` | Secret for local JWT signing |

## Frontend

### Stack

| Component | Version |
|-----------|---------|
| Nuxt | `^4.4.4` |
| Vue | `^3.5.33` |
| Vue Router | `^5.0.6` |
| keycloak-js | `^26.2.4` |
| ApexCharts | `^5.15.0` |
| vue3-apexcharts | `^1.11.1` |

### Rendering mode

- `ssr: false` in `nuxt.config.ts` — the app is a client-side SPA.
- No UI component library; custom CSS variables and utility classes.
- No global state management library; auth state lives in `useAuth` composable.
- No test framework or test files currently exist.

### Project structure

```
frontend/
├── app.vue                    # Root app + auth redirect guard
├── nuxt.config.ts             # SSR off, runtime config
├── assets/css/main.css        # Theme variables and base styles
├── layouts/
│   └── default.vue            # Sidebar + top banner
├── pages/                     # File-based routing
│   ├── index.vue              # Dashboard
│   ├── login.vue              # Login page (no layout)
│   ├── catalogos.vue
│   ├── valoracion.vue
│   ├── plan-tratamiento.vue
│   ├── parametrizacion.vue
│   ├── usuarios.vue
│   ├── roles.vue
│   ├── auditoria.vue
│   └── reportes/*             # Report pages
├── components/                # Reusable components
├── composables/               # useApi, useAuth, useCatalog, useSession
├── plugins/                   # Keycloak, ApexCharts, audit tracker
├── middleware/
│   └── auth.global.ts         # Global route guard
├── server/api/                # Server proxies for audit events
└── types/                     # Domain types
```

### Authentication flow

1. `plugins/keycloak.client.ts` initializes `keycloak-js` with:
   - `url: 'http://localhost:8080'`
   - `realm: 'quito-turismo'`
   - `clientId: 'sgsi-app'`
   - `onLoad: 'check-sso'` + `silentCheckSsoRedirectUri` + `pkceMethod: 'S256'`
2. `middleware/auth.global.ts` and `app.vue` redirect unauthenticated users to `/login`.
3. `login.vue` supports both Keycloak login and local JWT login.
4. `useApi` injects the bearer token (Keycloak or local) and refreshes Keycloak tokens before requests.
5. `SessionWarning` and `useSession` display token expiration warnings.

### Communication with backend

- Base URL from `NUXT_PUBLIC_API_BASE` (runtime config).
- `useApi` wraps `fetch` with authentication, token refresh, and typed error handling.
- `server/api/audit/login.post.ts` and `server/api/audit/page-visit.post.ts` proxy audit events to the backend.

### Scripts

```bash
npm run dev        # Dev server on http://localhost:3000
npm run build      # Production build
npm run preview    # Preview production build
npm run generate   # Static generation
```

## Database

### Prisma schema

- Location: `backend/prisma/schema.prisma`
- Datasource: `mysql`, expects `DATABASE_URL` from environment.
- Total models: 22.

### Entity groups

| Group | Models |
|-------|--------|
| Catalogs | `Amenaza`, `Vulnerabilidad`, `Impacto`, `Formato`, `Valoracion`, `TipoActivo`, `Activo`, `TipoDatosPersonales`, `Riesgo`, `TipoControl`, `Probabilidad` |
| Organization | `Area`, `Funcionario`, `MacroProceso`, `Subproceso` |
| Risk management | `ValoracionActivo`, `DetalleRiesgo`, `PlanTratamiento` |
| Controls | `CategoriaControlesImplementar`, `ControlesImplementar` |
| Configuration & audit | `ConfiguracionRiesgo`, `AuditLog`, `Usuario` |

### Key relationships

- `MacroProceso` 1:N `Subproceso`
- `Area` 1:N `Funcionario`
- `ValoracionActivo` 1:N `DetalleRiesgo`
- `Area` 1:N `PlanTratamiento`
- `CategoriaControlesImplementar` 1:N `ControlesImplementar`

Some relationships are stored as JSON arrays (e.g., `custodioId`, `amenazaIds`) rather than formal Prisma relations.

### Seeding

`backend/prisma/seed.ts` populates:
- Catalogs from `catalogos.json`
- Areas and staff from `documentos/Empleado.xlsx`
- Probabilities, treatment options, implementation states, deadlines
- Default local user `admin` / `admin123` with role `administrador`
- Personal data types

`backend/documentos/controles_implementar.sql` inserts 4 control categories and 93 ISO 27002 controls.

## Keycloak

### Realm import

- File: `keycloak/realm-export.json`
- Imported automatically on container start with `--import-realm`.
- After manual changes, re-import via the Keycloak Admin Console.

### Realm configuration

| Setting | Value |
|---------|-------|
| Realm | `quito-turismo` |
| Client | `sgsi-app` |
| Client type | Public client |
| Flow | Authorization Code + PKCE (`S256`) |
| Redirect URIs | `http://localhost:3000/*` |
| Web origins | `http://localhost:3000`, `http://localhost:3001` |

### Roles and users

| Keycloak role | Internal role | Sample user | Password |
|---------------|---------------|-------------|----------|
| `administradoregsi` | `administrador` | `admin` | `admin123` |
| `usuarioegsi` | `usuario` | `user` | `user123` |

Bootstrap admin (from `docker-compose.yml`): `superadmin` / `admin`.

## Development workflow

### Running the stack

```bash
docker compose up -d                    # Start all services
docker compose exec backend npm run start:dev   # Backend dev server
docker compose exec frontend npm run dev        # Frontend dev server
```

### After schema changes

```bash
docker compose exec backend npx prisma db push
```

### Seeding

```bash
docker compose exec backend npx prisma db seed
# Or directly:
docker compose exec backend ts-node prisma/seed.ts
```

### Linting and formatting

```bash
docker compose exec backend npm run lint
docker compose exec backend npm run format
```

## Testing

### Backend

- **Unit tests**: Jest, config inline in `package.json`, matches `src/**/*.spec.ts`.
- **E2E tests**: config in `test/jest-e2e.json`, matches `test/**/*.e2e-spec.ts`.

```bash
npm run test        # Unit tests
npm run test:watch  # Watch mode
npm run test:cov    # Coverage
npm run test:e2e    # E2E tests
```

### Frontend

No test framework or test files currently exist.

## Environment variables summary

### Backend

| Variable | Example value |
|----------|---------------|
| `DATABASE_URL` | `mysql://sgsi_user:sgsi_password@mysql:3306/sgsi_db?allowPublicKeyRetrieval=true` |
| `PORT` | `3001` |
| `KEYCLOAK_JWKS_URI` | `http://keycloak:8080/realms/quito-turismo/protocol/openid-connect/certs` |
| `KEYCLOAK_ADMIN_URL` | `http://keycloak:8080` |
| `KEYCLOAK_REALM` | `quito-turismo` |
| `KEYCLOAK_ADMIN_USER` | `superadmin` |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` |
| `JWT_SECRET` | `<256-bit hex secret>` |

### Frontend

| Variable | Example value |
|----------|---------------|
| `HOST` | `0.0.0.0` |
| `NUXT_PUBLIC_API_BASE` | `http://localhost:3001` |

### Keycloak

| Variable | Example value |
|----------|---------------|
| `KC_BOOTSTRAP_ADMIN_USERNAME` | `superadmin` |
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | `admin` |
| `KC_DB` | `mysql` |
| `KC_DB_URL` | `jdbc:mysql://mysql:3306/keycloak_db?useSSL=false&allowPublicKeyRetrieval=true` |
| `KC_DB_USERNAME` | `keycloak_user` |
| `KC_DB_PASSWORD` | `keycloak_password` |
| `KC_HOSTNAME_STRICT` | `false` |
| `KC_HTTP_ENABLED` | `true` |

## Service ports

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | `http://localhost:3000` | Nuxt SPA |
| Backend | `http://localhost:3001` | NestJS API |
| Keycloak | `http://localhost:8080` | OIDC provider and admin console |
| Adminer | `http://localhost:8082` | MySQL management UI |

## Common issues

### "Column does not exist" after schema changes

Run Prisma db push from the backend container:

```bash
docker compose exec backend npx prisma db push
```

### Keycloak not reachable from backend

Inside Docker, the backend resolves Keycloak as `http://keycloak:8080`. The host uses `http://localhost:8080`. Ensure `KEYCLOAK_JWKS_URI` uses the Docker network name.

### Frontend cannot call backend

Verify `NUXT_PUBLIC_API_BASE` is set to `http://localhost:3001` (or the reachable backend URL).

## Next steps

- For API details, inspect the controllers under `backend/src/`.
- For UI routes, inspect the files under `frontend/pages/`.
- For Keycloak changes, modify `keycloak/realm-export.json` and re-import via the Admin Console.
- For database changes, update `backend/prisma/schema.prisma` and run `npx prisma db push`.
