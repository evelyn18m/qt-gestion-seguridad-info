# Proposal: Independently Editable "Desde" Values in Parametrization Thresholds

## Intent

Currently `ConfiguracionRiesgo` has 7 `*Max` fields that serve double duty — row N's "Hasta" is also row N+1's "Desde". Three "Desde" cells are hardcoded to 1 (Bajo, ControlBajo, Aceptable). The "Inaceptable.Hasta" is hardcoded to 27. Users cannot independently set lower bounds. This change makes every "Desde" independently editable by adding 9 dedicated DB fields, decoupling ranges completely.

## Scope

### In Scope
- Add 9 `*Desde` fields + 1 `*Max` field to Prisma schema (16 threshold fields total)
- Update `UpdateParametroDto` with new fields and cross-range validation
- Update `ParametrosService` defaults, getConfiguracion(), and updateConfiguracion() validation
- Rework `umbralCards` computed in `parametrizacion.vue` — independent `desdeKey`/`hastaKey` per range
- Update `ConfiguracionRiesgo` TypeScript interface in `frontend/types/api.d.ts`
- Update backend unit tests (`parametros.service.spec.ts`) for new fields and validations
- Run `db push` after schema change

### Out of Scope
- Changes to `calculo-riesgo.service.ts` (uses only upper bounds, unaffected)
- Frontend tests (no test runner configured)
- Recalculation of existing valoraciones

## Capabilities

### Modified Capabilities
- **parametrizacion-page**: Requirements change — 16 fields replace 7 shared fields. Each "Desde" input bound to its own DB field. Frontend continuity validation expands to check `Desde < Hasta` within each range and `HastaN < DesdeN+1` across ranges (no overlap, gaps allowed).
- **calculo-riesgo**: "Backend Range Validation on Update" requirement changes — new checks: `desde < max` per range, cross-range `maxN < desdeN+1` (no overlap). Core `calculateRiesgo()` unchanged.

## Approach

**DB**: Add 9 fields (`riesgoBajoDesde`…`residualInaceptableMax`) with `@default` values mirroring current implicit defaults. `db push` adds columns with defaults — no data loss.

**Backend**: Expand DTO with 9 `@IsInt() @Min(1) @Max(27)` fields. Add validation in service: per-range `desde < max` + cross-range `maxN < desdeN+1`. Create defaults include new fields.

**Frontend**: `umbralCards` gets 16 distinct `desdeKey`/`hastaKey` entries (no `null` keys). `validateRanges()` adds per-range and cross-range checks. `DEFAULTS` object gains 9 fields. `GET`/`PUT` payloads transparently include new fields (TS structural typing).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` L196-207 | Modified | Add 9 fields with defaults |
| `backend/src/parametros/dto/update-parametro.dto.ts` | Modified | Add 9 fields + cross-range validator |
| `backend/src/parametros/parametros.service.ts` | Modified | Defaults, create, validation logic |
| `backend/src/parametros/parametros.service.spec.ts` | Modified | mockConfigRow + new validation tests |
| `frontend/pages/parametrizacion.vue` | Modified | umbralCards, validateRanges, DEFAULTS |
| `frontend/types/api.d.ts` L222-231 | Modified | Add 9 fields to interface |
| `backend/src/valoraciones/calculo-riesgo.service.ts` | **Not affected** | Uses only upper bounds |
| `backend/src/valoraciones/valoraciones.service.ts` | **Not affected** | Maps existing fields only |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Prisma `db push` fails on column add | Low | Defaults defined; existing row keeps old values |
| Frontend type mismatch (16 vs 7 fields) | Low | TS structural typing — extra fields ignored silently |
| User configures overlapping ranges | Low | Backend + frontend validation catch this |
| calculo-riesgo breaks with gaps in ranges | Low | Classifier uses only `max` bounds; gaps are display-only |

## Rollback Plan

Revert commit. Run `docker compose exec backend npx prisma db push` with the old schema (7 fields). No data loss — old 7 fields untouched by rollback. Extra columns in DB are harmless if left but can be dropped manually.

## Dependencies

- Docker Compose running (backend, mysql)
- `db push` accessible via `docker compose exec backend npx prisma db push`

## Success Criteria

- [ ] All 16 threshold fields in `ConfiguracionRiesgo` respond to `GET /parametros`
- [ ] `PUT /parametros` accepts and validates all 16 fields
- [ ] Backend rejects `desde >= max` per range (400)
- [ ] Backend rejects overlapping cross-range values (400)
- [ ] Frontend "Desde" inputs for rows Bajo, ControlBajo, Aceptable are editable (no longer hardcoded)
- [ ] Frontend "Hasta" input for Inaceptable is editable (no longer hardcoded to 27)
- [ ] Frontend shows red borders on invalid ranges, disables save
- [ ] `calculo-riesgo` classification unchanged with default thresholds
- [ ] Backend unit tests pass: `docker compose exec backend npm run test`
