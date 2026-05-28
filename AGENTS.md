# qt-gestion-seguridad-info — SGSI Monorepo

## Stack
- **Backend**: NestJS 11 + Prisma 7.8 + MySQL (MariaDB driver)
- **Frontend**: Nuxt 4 with OIDC auth (Keycloak)
- **Infra**: Docker Compose (MySQL, Keycloak, backend, frontend)

## Quick commands

All services run via Docker Compose. Exec into containers with:
```bash
docker compose exec <service> <command>
```

### Backend
```bash
docker compose exec backend npm run start:dev   # Dev server (port 3001)
docker compose exec backend npm run build       # Build to dist/
docker compose exec backend npm run test        # Unit tests
docker compose exec backend npm run lint        # ESLint --fix
docker compose exec backend npx prisma db push  # Sync schema after changes
docker compose exec backend npx prisma migrate dev --name <migration_name>
docker compose exec backend ts-node prisma/seed.ts
```

### Frontend
```bash
docker compose exec frontend npm run dev   # Nuxt dev server (port 3000)
```

## Common error: "column does not exist"
After modifying `prisma/schema.prisma`, always run from inside the backend container:
```bash
docker compose exec backend npx prisma db push
```
The Prisma schema and DB can drift apart — `db push` syncs without migration history.

## Architecture
```
/backend               # NestJS API (port 3001)
  /prisma/schema.prisma
  /src/valoraciones/   # ValoracionActivo, DetalleRiesgo modules
  /src/catalogos/      # Seed logic
/frontend              # Nuxt 4 app (port 3000)
  /pages/              # Route pages
  /server/             # Server middleware / API proxies
/keycloak              # OIDC provider (port 8080)
/docker-compose.yml    # Full stack definition
```

## DB credentials (from compose)
- Host: `localhost:3306` (or `mysql` container)
- Database: `sgsi_db`
- User: `sgsi_user` / `sgsi_password`
