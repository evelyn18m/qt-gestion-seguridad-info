# Design: Reestructurar análisis de riesgos en modo de columnas

## Technical Approach

Replace the flat chip-list UI in Tab 2 with a row-based table where each row contains amenaza(s), vulnerabilidad(s), and controlesImplementados per row. Backend stores amenazaIds and vulnerabilidadIds as JSON arrays on each `DetalleRiesgo` row, with a new `controlesImplementados` field. This decouples amenaza and vulnerabilidad into independent arrays rather than the current `tipo + catalogoId` scalar pattern.

## Architecture Decisions

### Decision: JSON array for amenazaIds/vulnerabilidadIds

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Scalar FK (one per row) | Requires two rows for threat+vuln combo; simple | Rejected — spec requires per-row multi-select |
| JSON array in Text column | Flexible multi-select per row; simple migration path | **Chosen** — aligns with spec `amenazaIds String? @db.Text` |

### Decision: controlesImplementados at row level

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Shared field on ValoracionActivo | Single textarea; breaks per-row model | Rejected |
| Field on DetalleRiesgo | Each row has own controls; aligns with per-row granularity | **Chosen** |

### Decision: Deprecate tipo+catalogoId fields for Tab 2

The existing `tipo` + `catalogoId` fields remain on `DetalleRiesgo` for Tab 3/4 compatibility. Tab 2 uses the new `amenazaIds` + `vulnerabilidadIds` columns only. No data loss for existing Tab 3/4 records.

## Data Flow

```
Frontend (Tab 2 row table)
   │
   ├──[submit]──► API POST /valoraciones
   │                 │
   │                 ├── CreateValoracionActivo
   │                 │
   │                 └── DetalleRiesgo[]  (each row has amenazaIds, vulnerabilidadIds, controlesImplementados)
   │
   └── GET /valoraciones/:id
             │
             ├── Returns ValoracionActivo + detallesRiesgo[]
             │    (detallesRiesgo rows have both old fields + new fields)
             │
             └── Frontend parses amenazaIds/vulnerabilidadIds JSON → row chips
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | Add `amenazaIds String? @db.Text`, `vulnerabilidadIds String? @db.Text`, `controlesImplementados String? @db.Text` to `DetalleRiesgo` |
| `backend/src/valoraciones/dto/create-valoracion.dto.ts` | Modify | Add `amenazaIds`, `vulnerabilidadIds`, `controlesImplementados` to `DetalleRiesgoDto`; add at-least-one validation |
| `backend/src/valoraciones/valoraciones.service.ts` | Modify | Parse JSON arrays when enriching; pass through correctly |
| `frontend/types/api.d.ts` | Modify | Update `DetalleRiesgo` interface with new fields |
| `frontend/components/ValoracionModal.vue` | Modify | Replace Tab 2 chip-lists with row-based table with columns: Amenazas, Vulnerabilidades, Controles Implementados |
| `prisma/seed.ts` (reference) | Comment | Note migration path for existing data |

## Interfaces / Contracts

### Prisma Schema (DetalleRiesgo model)

```prisma
model DetalleRiesgo {
  id                    Int      @id @default(autoincrement())
  valoracionActivoId    Int
  // Existing (Tab 3/4 still uses these)
  tipo                  String   // "amenaza" | "vulnerabilidad" (DEPRECATED for Tab 2)
  catalogoId            Int      // (DEPRECATED for Tab 2)
  riesgoId              Int?
  evaluacionRiesgo      Float?
  nivelRiesgo           String?
  metodoTratamiento     String?  @db.Text
  tipoControlId         Int?
  riesgoControlId       Int?
  evaluacionRiesgoControl Float?
  nivelRiesgoControl    String?
  // New fields for Tab 2 row-based model
  amenazaIds            String?  @db.Text  // JSON array, e.g. "[3, 7]"
  vulnerabilidadIds      String?  @db.Text  // JSON array, e.g. "[5]"
  controlesImplementados String? @db.Text  // per-row controls
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### DetalleRiesgoDto (Create/Update)

```typescript
export class DetalleRiesgoDto {
  id?: number
  // Tab 3/4 legacy
  tipo?: string
  catalogoId?: number
  riesgoId?: number
  evaluacionRiesgo?: number
  nivelRiesgo?: string
  metodoTratamiento?: string
  tipoControlId?: number
  riesgoControlId?: number
  evaluacionRiesgoControl?: number
  nivelRiesgoControl?: string
  // Tab 2 new fields
  amenazaIds?: string           // JSON array as string, e.g. "[3,7]"
  vulnerabilidadIds?: string     // JSON array as string, e.g. "[5]"
  controlesImplementados?: string
}
```

### Validation Rule

Each `DetalleRiesgo` row MUST satisfy: `nonEmpty(amenazaIds) OR nonEmpty(vulnerabilidadIds)`. Empty array `[]` counts as empty.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `DetalleRiesgoDto` validation: rejects 0+0, accepts amenaza-only, vulnerabilidad-only, both | Jest with test cases for each scenario |
| Integration | Full create/update cycle: send row with amenazaIds JSON, retrieve, verify JSON parses correctly | Supertest e2e |
| E2E | Tab 2 row table: add row with amenaza, add row with vulnerabilidad, add row with both, remove row, save | Playwright or manual |

## Migration / Rollout

### Step 1: Schema sync
```bash
docker compose exec backend npx prisma db push
```
New columns added as nullable; existing rows get null.

### Step 2: Data backfill (one-time migration script)
```sql
-- Existing rows where tipo='amenaza': set amenazaIds = JSON_ARRAY(catalogoId)
UPDATE DetalleRiesgo SET amenazaIds = CONCAT('[', catalogoId, ']') WHERE tipo = 'amenaza';
-- Existing rows where tipo='vulnerabilidad': set vulnerabilidadIds = JSON_ARRAY(catalogoId)
UPDATE DetalleRiesgo SET vulnerabilidadIds = CONCAT('[', catalogoId, ']') WHERE tipo = 'vulnerabilidad';
```
Run via `docker compose exec backend mysql -u sgsi_user -p sgsi_db`.

### Step 3: Frontend deploy
New `ValoracionModal.vue` Tab 2 reads `amenazaIds`/`vulnerabilidadIds` JSON and renders per-row chips. Existing `detallesRiesgo` with null new fields still work (show empty row columns).

## Open Questions

- [ ] Should existing `controlesImplementacion` on `ValoracionActivo` be migrated to first `DetalleRiesgo` row, or left as-is with manual migration notice?
- [ ] Tab 3/4 still use `tipo+catalogoId` — confirm they should continue working as-is (rows with old fields only) or also be updated to show amenazaIds/vulnerabilidadIds data?