# Design: Corrección de Evaluación de Riesgo en Modal/Form

## Technical Approach

Two-phase fix that eliminates the hardcoded `VA=3` propagating from `mapDetalleRiesgo()` through the entire pipeline. Backend becomes authoritative: `mapDetalleRiesgo()` receives real VA from the parent `ValoracionActivo`'s CIA average. Frontend sends VA in `/calcular` body and removes the overwrite that replaces correct preview values. All frontend helpers unified to 3 levels (BAJO/MEDIO/ALTO).

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Pass VA as parameter to `mapDetalleRiesgo` | +1 query for CIA lookup; clear source of truth | **Chosen**: simple, testable, no schema change |
| Use `ValoracionActivo.impacto` already persisted | Less queries but impact is set by frontend (untrusted) | Rejected: violates backend as source of truth |
| Delete recálculo in backend, trust frontend values | Minimal changes | Rejected: frontend values may have bugs; backend must own calculation |

## Data Flow

```
Frontend (valoracion.vue)                Backend (valoraciones.service.ts)
───────────────────────────              ──────────────────────────────────

Tab 3 preview (correct):
  VA = ciaAverage (impacto catálogo)
  eval = VA × A_nivel × V_nivel
  ──→ displays correct value in modal

Submit flow (after fix):
  1. GET /catalogos/impacto        2. POST/PATCH /valoraciones
  2. For each row with riesgoId:       ├── create(valoracionActivo)
     PATCH /calcular                     │     CIA IDs → impacto.valor → VA
       body: {VA, nivelA, nivelV}        ├── mapDetalleRiesgo(d, ..., va)
     ← response uses real VA             │     calculateRiesgo(va, ...)
  3. No Object.assign overwrite          └── UPDATE ValoracionActivo
  4. POST/PATCH /valoraciones              evaluacionRiesgo = MAX(hijos)
     with correct detail values               nivelRiesgo = MAX(hijos).nivel

Recalcular (existing data fix):
  POST /valoraciones/:id/recalcular
    → $transaction([deleteMany, ...creates])
    → each child recalculated with real VA
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/valoraciones/valoraciones.service.ts` | Modify | `mapDetalleRiesgo` +`va` param; `create`/`update` compute CIA avg from impacto catalog, persist `ValoracionActivo.evaluacionRiesgo`/`nivelRiesgo`; `calcularDetalleRiesgo` fallback to parent VA; new `recalcular()` method |
| `backend/src/valoraciones/valoraciones.controller.ts` | Modify | Add `@Post(':id/recalcular')` endpoint |
| `backend/src/valoraciones/valoraciones.service.spec.ts` | Modify | Update mock impacto lookups; test VA=1.67→eval=1.67×A×V; test recalcular corrects existing rows |
| `frontend/pages/valoracion.vue` | Modify | `submitValoracion` sends `VA: ciaAverage.value` in `/calcular` body; remove `Object.assign` overwrite; `getNivelStyle`/`getMaxNivelIndex`/`getNivelFromIndex` drop "Crítico" |
| `frontend/components/ValoracionModal.vue` | Modify | `calcularNivelRiesgo` → 3 levels: ≤3 BAJO, ≤8 MEDIO, ≤27 ALTO |
| `frontend/components/ValoracionViewModal.vue` | Modify | `getNivelStyle`/`getMaxNivelIndex`/`getNivelFromIndex` drop "Crítico" |

## Interfaces / Contracts

### New: `POST /valoraciones/:id/recalcular`

**Response**: `ValoracionActivo` with enriched `detallesRiesgo` (same shape as `GET /:id`). Recalculates all children with real VA, preserves all input fields (riesgoId, control IDs, amenazaIds, etc.).

### Modified: `PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular`

**Body now includes `VA`** (previously optional, now sent by frontend):
```json
{ "nivelAmenaza": 2, "nivelVulnerabilidad": 3, "VA": 1.67 }
```
Backend fallback: `dto.VA ?? parentVAAvg ?? 3` (was: `dto.VA ?? 3`).

### Backend: `mapDetalleRiesgo` signature

```typescript
private mapDetalleRiesgo(
  d: DetalleRiesgoDto,
  valoracionActivoId: number,
  nivelAmenazaValor?: number,
  nivelVulnerabilidadValor?: number,
  nivelAmenazaControlValor?: number,
  nivelVulnerabilidadControlValor?: number,
  config: Thresholds = DEFAULT_THRESHOLDS,
  va: number,                        // ← NEW: real VA from parent
): Prisma.DetalleRiesgoUncheckedCreateInput
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (backend) | `mapDetalleRiesgo` with VA=1, VA=2, VA=3 | Mock impacto lookups; assert `evaluacionRiesgo = va × A × V` |
| Unit (backend) | `calcularDetalleRiesgo` with and without VA in DTO | Mock parent fetch; assert fallback reads parent CIA |
| Unit (backend) | `create`/`update` persist `ValoracionActivo.evaluacionRiesgo` | Assert `prisma.valoracionActivo.update` called with `evaluacionRiesgo`/`nivelRiesgo` |
| Unit (backend) | `recalcular()` corrects existing data | Create mock child with VA=3 values, assert recreated with VA=real |
| Manual (frontend) | Modal Tab 3 preview matches persisted value | Verify CIA=1 activo shows `evaluacionRiesgo = 1 × A × V` in both modal preview and after save |
| Manual (frontend) | No "Crítico" badge anywhere | Check report page, view modal, and list page |

## Migration / Rollout

- **Existing data**: `POST /valoraciones/:id/recalcular` corrects any `ValoracionActivo` on demand. No automatic migration.
- **Rollback**: Revert commit. Columnas already nullable. Activos edited post-fix correct; non-edited retain inflated VA=3 values (recalcular corrects them).
- **Schema**: No migration needed — `ValoracionActivo.evaluacionRiesgo` (Float?) and `nivelRiesgo` (String?) exist at lines 122-123 of `schema.prisma`.

## Open Questions

None.
