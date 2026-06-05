# Design: Make Tab 3 and Tab 4 Risk Levels Independent

## Technical Approach

Minimal schema extension + binding redirect. Add `vulnerabilidadControlId` as the vulnerability counterpart to existing `riesgoControlId`, then redirect Tab 4 template bindings from shared `riesgoId`/`vulnerabilidadRiesgoId` to independent `riesgoControlId`/`vulnerabilidadControlId`. Update backend `create()`/`update()` to perform separate Riesgo catalog lookups for control-level valors, passing them as `nivelAmenazaControl`/`nivelVulnerabilidadControl` to `calculateRiesgo()` for independent residual risk computation.

## Architecture Decisions

### Decision: Riesgo catalog lookup needed for control IDs

**Choice**: `riesgoControlId` and `vulnerabilidadControlId` reference the same `Riesgo` table as `riesgoId`. Backend must do independent `prisma.riesgo.findUnique()` lookups in `create()`/`update()`.
**Rationale**: `calculateRiesgo(va, amenaza, vuln, amenazaControl, vulnControl)` accepts optional control params. Currently `mapDetalleRiesgo` calls it with only inherent risk valors — both inherent AND residual results are computed from the same inputs. This is the root cause of Tab 3/4 sharing. Control IDs must be resolved to `.valor` independently.

### Decision: Keep `/calcular` endpoint unchanged, update frontend caller

**Choice**: Backend `/calcular` already accepts `nivelAmenazaControl`/`nivelVulnerabilidadControl`. Only `valoracion.vue`'s caller must add those params.
**Rationale**: The endpoint contract is correct; the frontend just doesn't pass the control-level numbers. Add lookup logic in `valoracion.vue` analogous to existing `nivelAmenaza`/`nivelVulnerabilidad` lookup.

### Decision: Preservation via Map in `syncRowsToDetalles()`

**Choice**: Build a `prevMap` keyed by `${tipo}:${catalogoId}:${amenazaIds}:${vulnerabilidadIds}` to restore `riesgoControlId`/`vulnerabilidadControlId` from previous entries.
**Rationale**: Exploration confirmed this function discards ALL field values on Tab 2 edits. Must preserve control fields to avoid data loss. Existing approach (prevMap pattern) already documented in exploration.

## Data Flow

```
Tab 4 dropdown ──→ d.riesgoControlId / d.vulnerabilidadControlId
                        │
Frontend (local): catalogData.valRiesgos.find(id) → .valor → calcularEvaluacionRiesgo()
                        │
Backend (persist): prisma.riesgo.findUnique(id) → .valor → calculateRiesgo(3, a, v, ca, cv)
                                                                     │
                                                evaluacionRiesgoControl (INDEPENDENT)
                                                nivelRiesgoControl
                                                riesgoResidual
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | Add `vulnerabilidadControlId Int?` after L149 |
| `backend/src/valoraciones/dto/create-valoracion.dto.ts` | Modify | Add `vulnerabilidadControlId?: number` to `DetalleRiesgoDto` after `riesgoControlId` |
| `backend/src/valoraciones/valoraciones.service.ts` | Modify | `create()`/`update()`: add control ID lookups. `mapDetalleRiesgo()`: spread `vulnerabilidadControlId`, pass control valors to `calculateRiesgo()` |
| `frontend/types/api.d.ts` | Modify | Add `vulnerabilidadControlId?: number \| null` to `DetalleRiesgo` after L86 |
| `frontend/components/ValoracionModal.vue` | Modify | L988: `riesgoId` → `riesgoControlId`. L1000: `vulnerabilidadRiesgoId` → `vulnerabilidadControlId`. L235-286: preserve both control IDs. L534: use control fields in calc |
| `frontend/pages/valoracion.vue` | Modify | Add `nivelAmenazaControl`/`nivelVulnerabilidadControl` lookup + pass to `/calcular` body |

## Backend Changes (detailed)

### DTO addition
```typescript
@IsOptional()
@IsNumber()
vulnerabilidadControlId?: number;
```
After `riesgoControlId` (L88). Appears ONLY in `DetalleRiesgoDto` (not `CreateValoracionDto` — per-row only).

### Service: `mapDetalleRiesgo()` signature change
Add params `nivelAmenazaControlValor?: number`, `nivelVulnerabilidadControlValor?: number`. Spread `vulnerabilidadControlId`. Call:
```typescript
const riesgo = calculateRiesgo(3, nivelAmenaza, nivelVulnerabilidad, nivelAmenazaControlValor, nivelVulnerabilidadControlValor);
```
Control fields (`evaluacionRiesgoControl`, etc.) are now computed from independent control valors.

### Service: `create()`/`update()` additional lookups
After existing `riesgoId`/`vulnerabilidadRiesgoId` lookups, add parallel blocks for `riesgoControlId`/`vulnerabilidadControlId`:
```typescript
const riesgoControlResults = await Promise.all(
  detallesRiesgo.map(d => d.riesgoControlId != null
    ? this.prisma.riesgo.findUnique({ where: { id: d.riesgoControlId } })
    : Promise.resolve(null))
);
// same for vulnerabilidadControlId
```

## Frontend Changes (detailed)

### `syncRowsToDetalles()` preservation
Add `vulnerabilidadControlId: undefined` to entry objects. Build `prevMap` keyed by `${e.tipo}:${e.catalogoId}:${JSON.stringify(e.amenazaIds)}:${JSON.stringify(e.vulnerabilidadIds)}`. When creating new entries, copy `riesgoControlId`/`vulnerabilidadControlId` from prevMap match.

### `updateControlDetalleRow()` L534
Change `calcularEvaluacionRiesgo(d.riesgoId, d.vulnerabilidadRiesgoId)` to use `d.riesgoControlId`/`d.vulnerabilidadControlId`.

### Tab 4 template
- L988: `findMatchedDetalle(row)!.riesgoId` → `findMatchedDetalle(row)!.riesgoControlId`
- L1000: `findMatchedDetalle(row)!.vulnerabilidadRiesgoId` → `findMatchedDetalle(row)!.vulnerabilidadControlId`

### `valoracion.vue` calcular payload
Add lookup for control IDs (analogous to existing L306-315), then extend body:
```typescript
body: JSON.stringify({ nivelAmenaza, nivelVulnerabilidad, nivelAmenazaControl, nivelVulnerabilidadControl })
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Backend unit: DTO | `DetalleRiesgoDto` validates `vulnerabilidadControlId` as known optional number | Jest `validateSync` with whitelist+forbidNonWhitelisted |
| Backend unit: Service | `create()` with control IDs calls `mapDetalleRiesgo` with control valors, `calculateRiesgo` receives them | Mock Prisma, assert `detalleRiesgo.create` data |
| Backend unit: Service | `mapDetalleRiesgo` spreads `vulnerabilidadControlId` | TDD RED→GREEN pattern |
| Frontend | Manual smoke: select Tab 4 dropdowns, switch to Tab 3, verify values independent; edit Tab 2 rows, verify control fields preserved | Manual |

## Migration

```bash
docker compose exec backend npx prisma db push
```
No data migration needed — new column starts NULL, no existing data references it.

## Rollback

1. Revert Tab 4 template bindings to `riesgoId`/`vulnerabilidadRiesgoId`
2. Revert `updateControlDetalleRow` to use `d.riesgoId`/`d.vulnerabilidadRiesgoId`
3. Revert backend `create()`/`update()` to remove control lookups
4. Drop `vulnerabilidadControlId` column via `prisma db push` after removing from schema
