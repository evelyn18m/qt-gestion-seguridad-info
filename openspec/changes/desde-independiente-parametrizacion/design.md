# Design: Independently Editable "Desde" Values in Parametrization Thresholds

## Technical Approach

Expand `ConfiguracionRiesgo` from 7 shared threshold fields (`*Max` only) to 16 independent fields (9 new `*Desde` + 1 new `*Max`). Each UI range row gets its own `desdeKey` and `hastaKey` — no field sharing, no null keys, no hardcoded constants. Validation moves from "ascending max chains" to per-range (`desde < max`) + cross-range (`maxN < desdeN+1`) checks. The `calculo-riesgo` classifier remains unchanged — it reads only the 7 `*Max` upper bounds; "desde" fields are pure UI/editability concerns.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| DB fields count | 9 new vs 7 new (share `*Max` as row N+1's desde) | 9 new = denormalized but truly independent. 7 new = fewer columns but still coupled. | **9 new** — independent editability is the whole point |
| Defaults | Prisma `@default()` vs service-layer defaults only | Prisma defaults handle new rows and `db push` column add. Service defaults handle the "no config exists yet" path. | **Both** — Prisma `@default` for column add, service `create` defaults for completeness |
| Cross-range validation location | Class-level DTO decorator vs service method | Class-level `@Validate` is incompatible with NestJS legacy decorators (exploration confirmed). Service validation is explicit, testable, and works. | **Service method** — reuse existing `updateConfiguracion` pattern, don't fight NestJS decorator model |
| Frontend desde keys | Independent `desdeKey` per row vs shared keys + helper logic | Independent keys eliminate `getDesdeValue`/`setDesdeValue` null-branching complexity. Every cell is `<input>` — simpler template. | **Independent keys** — one `desdeKey` and `hastaKey` per range, all non-null |

## Data Flow

```
Frontend umbralCards             PUT /parametros                MySQL
┌─────────────────────┐         ┌──────────────────┐         ┌────────────────┐
│ Riesgo Bajo  1..cfg │         │ UpdateParametroDto│         │Configuracion   │
│  desde: cfg.bajoDesd│──16fld──→  @IsInt @Min @Max ├──16fld──→ Riesgo (1 row)│
│  hasta: cfg.bajoMax │         │  per-range valid. │         │ 16 threshold   │
│ Riesgo Medio cfg..cfg│        │  cross-range val. │         │ fields total   │
│  desde: cfg.medioDes│         └──────────────────┘         └────────────────┘
│  hasta: cfg.medioMax│
│ ...                 │         GET /parametros
│ Residual Inaceptable│←16fld──── returns full config
│  desde: cfg.inaDesde│
│  hasta: cfg.inaMax  │
└─────────────────────┘
                                    ┌──────────────────────┐
                                    │ calculo-riesgo.svc   │
                                    │ Reads ONLY *Max (7)  │
                                    │ evaluacion ≤ bajoMax │
                                    │    → BAJO            │
                                    │ evaluacion ≤ medioMax│
                                    │    → MEDIO           │
                                    │ otherwise → ALTO     │
                                    └──────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` L196-207 | Modify | Add 9 fields: 6 `*Desde` (riesgo/control) + 2 residual desde + `residualInaceptableMax`. All `Int @default()` |
| `backend/src/parametros/dto/update-parametro.dto.ts` | Modify | Add 9 fields with `@IsInt() @Min(1) @Max(27)`. Keep `IsRangoConsistenteConstraint` unused (not attached to class) |
| `backend/src/parametros/parametros.service.ts` | Modify | `getConfiguracion()`: add 9 defaults to `create()`. `updateConfiguracion()`: add per-range + cross-range validation for all 7 ranges |
| `backend/src/parametros/parametros.service.spec.ts` | Modify | Expand `mockConfigRow` with 9 new fields. Add tests for per-range `desde<max` and cross-range `maxN<desdeN+1` |
| `frontend/pages/parametrizacion.vue` | Modify | `DEFAULTS`: add 9 fields. `umbralCards`: 16 independent `desdeKey`/`hastaKey` (no null). `validateRanges()`: per-range + cross-range checks. Remove `getDesdeValue`/`setDesdeValue` |
| `frontend/types/api.d.ts` L222-231 | Modify | Add 9 fields to `ConfiguracionRiesgo` interface |
| `backend/src/valoraciones/calculo-riesgo.service.ts` | **No change** | Uses only `*Max` fields — unaffected |
| `backend/src/valoraciones/valoraciones.service.ts` | **No change** | Maps existing 7 fields to `Thresholds` — unaffected |
| `backend/src/parametros/parametros.controller.ts` | **No change** | Endpoints unchanged |
| `backend/prisma/seed.ts` | **No change** | Prisma defaults suffice |

## Interfaces / Contracts

### New Prisma fields (9 new — model goes from 7 to 16 threshold fields)

```prisma
// Riesgo: +3 desde fields
riesgoBajoDesde     Int @default(1)
riesgoMedioDesde    Int @default(3)
riesgoAltoDesde     Int @default(9)

// Control: +3 desde fields
controlBajoDesde    Int @default(1)
controlMedioDesde   Int @default(3)
controlAltoDesde    Int @default(9)

// Residual: +2 desde + 1 max
residualAceptableDesde   Int @default(1)
residualInaceptableDesde Int @default(3)
residualInaceptableMax   Int @default(27)
```

### DTO expansion pattern (all 9 new fields follow this)

```typescript
@IsInt() @Min(1) @Max(27)
riesgoBajoDesde: number;
// ... 8 more identical decorators ...
```

### Frontend CardRango simplification

```typescript
interface CardRango {
  desdeKey: keyof ConfiguracionRiesgo   // was `| null` — now always set
  hastaKey: keyof ConfiguracionRiesgo   // was `| null` — now always set
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — service | `getConfiguracion` includes all 16 fields in `create()` defaults | Assert `create` called with all 16 fields |
| Unit — service | `updateConfiguracion` rejects `desde >= max` per range (7 ranges × 1 test each = 7 tests) | `rejects.toThrow(BadRequestException)` |
| Unit — service | `updateConfiguracion` rejects `maxN >= desdeN+1` cross-range (6 gaps × 1 test = 6 tests) | `rejects.toThrow(BadRequestException)` |
| Unit — service | `updateConfiguracion` accepts valid config with all 16 fields | Assert update called, returns updated row |
| Structural | `calculo-riesgo` still works with extended config (extra fields ignored) | Existing tests pass unchanged |
| Frontend | Not tested — no test runner configured for frontend | Manual verification |

## Migration / Rollout

1. Stop backend: `docker compose stop backend`
2. Run `docker compose exec backend npx prisma db push` — adds 9 columns with defaults, existing row keeps old values
3. Deploy new backend + frontend
4. **Rollback**: revert commit, `db push` with old schema. Extra columns harmless but droppable. Old 7 fields never modified.

## Open Questions

- None — scope is well-defined, all affected areas identified, risks low
