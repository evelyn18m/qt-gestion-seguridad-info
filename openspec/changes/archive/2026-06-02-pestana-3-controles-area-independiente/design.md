# Design: Pestaña 3 — Campo "Controles Area" independiente

## Technical Approach

Full-stack field addition mirroring the existing `controlesImplementados` pattern. Add `controlesArea` to the `DetalleRiesgo` model, DTO, service mapper, frontend types, and Vue UI bindings — exclusive to Tab 3. Tab 2 (`controlesImplementados`) and `ValoracionActivo.controlesArea` (parent-level) are untouched.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add `controlesArea` to `DetalleRiesgo` (per-row) | +1 column, mirrors existing pattern | **Chosen** |
| Reuse `ValoracionActivo.controlesArea` in Tab 3 textarea | Breaks row-based design, parent-level field not per-row | Rejected |

**Rationale**: The existing `ValoracionActivo.controlesArea` is a single field at the parent record level — it cannot hold per-row data for Tab 3's table. Adding a per-row column to `DetalleRiesgo` follows the established `controlesImplementados` pattern exactly.

## Data Flow

```
Tab 3 textarea (v-model="row.controlesArea")
  ──→ syncRowsToDetalles() → props.detallesRiesgo[].controlesArea
    ──→ valoracion.vue save payload → POST /valoraciones → CreateValoracionDto.controlesArea
      ──→ mapDetalleRiesgo() spread → Prisma DetalleRiesgo.controlesArea → MySQL TEXT column
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` L155 | Modify | Add `controlesArea String? @db.Text` after `controlesImplementados` |
| `backend/src/valoraciones/dto/create-valoracion.dto.ts` L105 | Modify | Add `controlesArea?: string` to DetalleRiesgoDto |
| `backend/src/valoraciones/valoraciones.service.ts` L50 | Modify | Spread `controlesArea: d.controlesArea` in `mapDetalleRiesgo` |
| `frontend/types/api.d.ts` L78 | Modify | Add `controlesArea?: string` to DetalleRiesgo interface |
| `frontend/components/ValoracionModal.vue` (6 spots) | Modify | RiskRow, agregarFila, syncRowsToDetalles (×2), loadExistingRows, header, textarea binding |
| `frontend/pages/valoracion.vue` (2 spots) | Modify | Save payload L249, edit load L419 |

## Interfaces / Contracts

```typescript
// Prisma schema addition (line 155)
controlesArea String? @db.Text // per-row controls area (Tab 3 only)

// DTO addition (after line 105)
@IsOptional()
@IsString()
controlesArea?: string;

// Frontend type addition (after line 78)
controlesArea?: string

// RiskRow addition (after line 158)
controlesArea: string
```

`update-valoracion.dto.ts` inherits changes automatically (extends `CreateValoracionDto`).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Backend unit | Existing `valoraciones.service.spec.ts` counts `$transaction` calls | Existing tests pass without modification — they only verify op counts, not field content |
| DB | Schema sync | `docker compose exec backend npx prisma db push` |
| Manual | Tab 2/Tab 3 independence | Write in Tab 3, confirm Tab 2 unaffected; save, reload, confirm persistence |

No new test files required. Build verification via `docker compose exec backend npm run test`.

## Migration / Rollout

Run `docker compose exec backend npx prisma db push` to add the nullable TEXT column. Existing rows get `NULL`, frontend defaults to `''` via `|| ''`. No data migration required.

## Open Questions

None.
