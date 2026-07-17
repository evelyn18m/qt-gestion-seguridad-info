# Migration Guide — Database Schema Updates (2026-07-17)

## Summary of Changes

Four new Prisma migrations have been added that extend the database schema for enhanced risk management capabilities:

1. **Add codigo to MacroProceso** — Unique identifier field
2. **Add missing columns to ValoracionActivo & DetalleRiesgo** — Extended threat/vulnerability tracking
3. **Create Riesgo and FuncionarioArea tables** — New entities for risk levels and user-area mapping
4. **Add vulnerabilidadControlId to DetalleRiesgo** — Enhanced control-vulnerability relationships

## When to Apply

These migrations are **automatically applied** when you run:
- ✅ `docker-compose up` (Recommended)
- ✅ `npx prisma migrate deploy` (Manual deployment)

You do **NOT** need to manually run these migrations if using Docker.

---

## Quick Start

### Option 1: Docker (Easiest)
```bash
# From project root
docker-compose up

# Wait for logs:
# ✓ sgsi-mysql started (port 3307)
# ✓ sgsi-keycloak started (port 8080)
# ✓ sgsi-backend started (port 3001) — migrations run automatically
# ✓ sgsi-frontend started (port 3000)
```

### Option 2: Manual with Local MySQL
```bash
cd backend

# Install dependencies (if needed)
npm install

# Apply migrations
npx prisma migrate deploy

# Seed data (optional, creates sample catalogs)
npx prisma db seed

# Start server
npm run start:dev
```

---

## What Changed in the Database

### 1. MacroProceso
```sql
ALTER TABLE `MacroProceso` ADD COLUMN `codigo` VARCHAR(191) NOT NULL DEFAULT '';
```
**Purpose**: Unique identifier for process classification  
**Migration**: `20260609201500_add_codigo_to_macro_proceso`

### 2. Subproceso
```sql
ALTER TABLE `Subproceso` ADD COLUMN `macroProcesoId` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `Subproceso` ADD FOREIGN KEY (`macroProcesoId`) REFERENCES `MacroProceso`(`id`);
```
**Purpose**: Establish explicit relationship between subprocess and parent process  
**Migration**: `20260609201600_add_missing_columns`

### 3. ValoracionActivo (Extended)
New columns added for comprehensive risk tracking:
- `amenazas TEXT NULL` — Threats associated with asset
- `vulnerabilidades TEXT NULL` — Vulnerabilities identified
- `controlesImplementacion TEXT NULL` — Controls in place
- `impacto DOUBLE NULL` — Calculated impact value
- `probabilidadId INTEGER NULL` — Reference to probability level
- `amenazaRiesgoId INTEGER NULL` — Risk from threats
- `vulnerabilidadRiesgoId INTEGER NULL` — Risk from vulnerabilities
- And 8 more related to control evaluation

**Migration**: `20260609201600_add_missing_columns`

### 4. DetalleRiesgo (Recreated)
Table reconstructed with enhanced structure:
```sql
CREATE TABLE `DetalleRiesgo` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `valoracionActivoId` INTEGER NOT NULL,
  `tipo` VARCHAR(191) NOT NULL,
  `catalogoId` INTEGER NOT NULL,
  `amenazaIds` TEXT NULL,
  `vulnerabilidadIds` TEXT NULL,
  `controlesImplementados` TEXT NULL,
  `controlesImplementarId` INTEGER NULL,  -- FK to ControlesImplementar
  `riesgoResidual` VARCHAR(191) NULL,
  /* ... + more fields for risk evaluation ... */
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Purpose**: Detailed risk information per asset per vulnerability/threat  
**Migration**: `20260609201600_add_missing_columns`

### 5. Riesgo (New Table)
```sql
CREATE TABLE `Riesgo` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tipo` VARCHAR(191) NOT NULL,        -- e.g., "Alto", "Medio", "Bajo"
  `nivel` VARCHAR(191) NOT NULL,       -- Risk classification
  `valor` INTEGER NOT NULL,            -- Numeric value for comparison
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Purpose**: Catalog of risk levels used across the system  
**Migration**: `20260609201700_add_riesgo_columns`

### 6. FuncionarioArea (New Table)
```sql
CREATE TABLE `FuncionarioArea` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `funcionarioId` INTEGER NOT NULL,    -- FK to Funcionario
  `areaId` INTEGER NOT NULL,           -- FK to Area
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`funcionarioId`) REFERENCES `Funcionario`(`id`),
  FOREIGN KEY (`areaId`) REFERENCES `Area`(`id`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Purpose**: Map users to areas for access control and responsibility assignment  
**Migration**: `20260609201700_add_riesgo_columns`

### 7. DetalleRiesgo (Additional Column)
```sql
ALTER TABLE `DetalleRiesgo` ADD COLUMN `vulnerabilidadControlId` INTEGER NULL;
```

**Purpose**: Track which control addresses which vulnerability  
**Migration**: `20260609201800_add_vulnerabilidad_control_id`

---

## Configuration Changes

### docker-compose.yml
```yaml
# Backend service command changed from:
command: sh -c "npm install && npm run start:dev"

# To:
command: sh -c "npm install && npx prisma generate && npm run build && npm start"
```
**Reason**: Ensure Prisma client is generated and build is optimized before running production mode

### keycloak/realm-export.json
```json
{
  "clientAuthenticatorType": "client-secret-basic",     // was: client-jwt
  "directAccessGrantsEnabled": true,                    // was: false
  "webOrigins": ["http://localhost:3000", "http://localhost:3001"],
  "attributes": {
    "pkce.code.challenge.method": "S256"               // new: PKCE support
  }
}
```
**Reason**: Improved OAuth2 compliance and PKCE security for public clients

---

## Testing the Migration

After applying migrations, verify with:

```bash
cd backend

# Check migration status
npx prisma migrate status

# Test connection to database
npx prisma db execute --stdin < <(echo "SELECT 1 as test;")

# Or use Prisma Studio to browse data
npx prisma studio  # Opens http://localhost:5555
```

---

## Rollback (if needed)

⚠️ **Warning**: Rollback is destructive. Use only in development.

```bash
# List all migrations
npx prisma migrate status

# Rollback last migration
npx prisma migrate resolve --rolled-back 20260609201800_add_vulnerabilidad_control_id

# Then reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset
```

---

## Data Consistency Notes

After migration, consider:

1. **Seed default Riesgo levels** if not already done:
   ```bash
   npx prisma db seed
   ```

2. **Backfill FuncionarioArea** with user-area assignments (if available)

3. **Verify DetalleRiesgo integrity** — data was preserved during table recreation

4. **Test ValoracionActivo queries** with new extended fields in your UI

---

## Support & Troubleshooting

### Issue: Migration fails with "resource busy"
```
EBUSY: resource busy or locked
```
**Solution**: Ensure no other processes are using the database
```bash
# Check running MySQL processes
lsof | grep mysql

# Or use Docker:
docker-compose down
docker-compose up
```

### Issue: "The datasource.url property is required"
**Solution**: Set `DATABASE_URL` environment variable
```bash
# For Docker: automatically set in compose file
# For local: create .env file in backend/
# DATABASE_URL=mysql://sgsi_user:sgsi_password@localhost:3306/sgsi_db?allowPublicKeyRetrieval=true
```

### Issue: Foreign key constraint errors during migration
**Solution**: This is expected if data has referential integrity issues. Check logs and:
```bash
npx prisma migrate resolve --rolled-back <migration-id>
npx prisma db execute --stdin < cleanup_script.sql  # Fix data issues
npx prisma migrate deploy  # Re-run
```

---

## Deployment Checklist

- [x] Code committed to git (commit `1d28f10`)
- [x] All migrations staged in `backend/prisma/migrations/`
- [x] Docker Compose updated
- [x] Keycloak configuration updated
- [ ] Run migrations on target environment
- [ ] Verify with Prisma Studio
- [ ] Test full risk workflow end-to-end
- [ ] Update API documentation (if exposed)
- [ ] Notify team of schema changes

---

**Last Updated**: 2026-07-17  
**Migration Files**: `backend/prisma/migrations/2026060920*`  
**Status**: ✅ Ready for deployment
