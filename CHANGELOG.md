# Changelog — SGSI Platform

Todos los cambios significativos en este proyecto están documentados en este archivo.

## [Unreleased]

### Added
- Extended `ValoracionActivo` with fields for threat/vulnerability/control tracking
- New `DetalleRiesgo` table structure with enhanced risk management
- New `Riesgo` table for risk level definitions
- New `FuncionarioArea` table for user-area associations
- PKCE support in Keycloak configuration for enhanced security
- `codigo` field in `MacroProceso` for unique identification

### Changed
- Docker Compose backend startup now includes `prisma generate` and `npm run build`
- Keycloak authentication method changed from `client-jwt` to `client-secret-basic`
- Keycloak `directAccessGrants` now enabled for credential flow
- `Subproceso` now has explicit relationship to `MacroProceso`

### Fixed
- Backend/Keycloak communication: added `localhost:3001` to Keycloak webOrigins

---

## [2026-05-22] — Database Schema Integration

### Added
- Integrated all risk analysis fields into single `ValoracionActivo` record
- Seed data now includes `Funcionario`, `Area`, and `Probabilidad` catalogs
- Real data loading from `documentos/funcionarios.xlsx` (96 funcionarios, 15 áreas)

### Changed
- Risk analysis moved from separate module to tabs within `ValoracionActivo` modal
- Método de Tratamiento changed from fixed select to free-text input

### Removed
- `AnalisisRiesgo` Prisma model and backend module
- Separate `analisis-riesgo.vue` page
- Analysis sidebar menu item

---

## Database Migration History

| Migration ID | Date | Description |
|---|---|---|
| `20260511151121_init_catalogos` | 2026-05-11 | Initial catalog models setup |
| `20260518155816_add_funcionario_area` | 2026-05-18 | Add funcionario and area models |
| `20260522145609_add_valoracion_id_to_analisis_riesgo` | 2026-05-22 | Add valoracion relationship to risk analysis |
| `20260605113000_add_control_catalog_tables` | 2026-06-05 | Add control categorization tables |
| `20260609201500_add_codigo_to_macro_proceso` | 2026-06-09 | Add codigo field to MacroProceso |
| `20260609201600_add_missing_columns` | 2026-06-09 | Extend ValoracionActivo + recreate DetalleRiesgo |
| `20260609201700_add_riesgo_columns` | 2026-06-09 | Create Riesgo and FuncionarioArea tables |
| `20260609201800_add_vulnerabilidad_control_id` | 2026-06-09 | Add vulnerabilidadControlId to DetalleRiesgo |

---

## Deployment Notes

### Version 2026-07-17
- **Status**: ✅ Committed & ready to deploy
- **Branch**: `main` (commit `1d28f10`)
- **Migratable**: Yes (requires MySQL/Keycloak running)
- **Breaking Changes**: None — all changes are additive
- **Data Migration Required**: Yes — run `prisma migrate deploy` or use Docker Compose

### How to Apply
```bash
# Option 1: Docker (automatic)
docker-compose up

# Option 2: Manual
cd backend
npx prisma migrate deploy
npm run start:dev
```

---

## Architecture & Design Decisions

### Extended ValoracionActivo Model
The system consolidates all risk analysis into a single `ValoracionActivo` record rather than using separate tables. This simplifies the data model and ensures atomic updates across the full risk lifecycle (identification → evaluation → treatment).

**Pros**: Single transaction, simplified queries, cleaner API
**Cons**: Wide table, potential for sparse columns

### Keycloak Configuration Changes
- `client-secret-basic`: More standard OAuth2 flow
- PKCE: Protects against authorization code interception (required for public clients)
- Direct access grants: Allows testing and non-browser flows

---

## Known Issues

- [ ] N+1 query optimization needed on ValoracionActivo relationships
- [ ] Validate data consistency across threat/vulnerability/control fields
- [ ] Consider archiving strategy for historical risk assessments

---

## Future Roadmap

- [ ] Multi-tenancy support (multiple organizations)
- [ ] Risk calculation engines (automated evaluation)
- [ ] Reporting & export (PDF/Excel)
- [ ] Audit trail & change tracking
- [ ] Dashboard visualizations
- [ ] API versioning & deprecation strategy

