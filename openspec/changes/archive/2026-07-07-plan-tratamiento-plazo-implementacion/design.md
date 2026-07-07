# Design: Plazo de implementación en Plan de Tratamiento

## Technical Approach

Replace the single `plazoImplementacion` date column with a normalized `PlazoImplementacion` catalog plus two date columns. The backend accepts ISO date strings (`YYYY-MM-DD`) from HTML5 `type="date"` inputs, validates that start/end are present and ordered when a plazo is selected, and stores them as Prisma `DateTime`. The catalog is code-seeded, read-only in the admin UI, and exposed through the existing `/catalogos` generic endpoint.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|---|---|---|---|
| Catalog shape | `codigo`+`nombre` vs single `nombre` | Need `[C] Corto` display; single field would require parsing | Two columns: `codigo` (C/M/L) and `nombre` |
| Date storage | `DateTime` vs `String` | `DateTime` enables ordering/validation; string avoids TZ | `DateTime?` with ISO input via `@IsDateString()` |
| Old column | Drop vs migrate data | Table is empty in current env; migration simpler | Drop `plazoImplementacion` |
| Validation location | DTO only vs service | DTO handles format; cross-field rules need service | DTO format + service cross-field validation |
| Migration tool | `migrate dev` vs `db push` | Project uses migration history | `npx prisma migrate dev --name add_plazo_implementacion_catalog` |

## Data Flow

```
Modal (plazo select + 2 date inputs)
        ↓ ISO strings
Frontend useApi → POST/PATCH /plan-tratamiento
        ↓
class-validator @IsDateString
        ↓
PlanTratamientoService.toPrismaData()
        ↓ new Date() + cross-field checks
Prisma → MySQL (plazoImplementacionId, fechaInicio, fechaFin)
        ↑
/catalogos/plazos-implementacion (generic findAll)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add `PlazoImplementacion`; drop `PlanTratamiento.plazoImplementacion`; add FK + two date columns |
| `backend/prisma/migrations/2026...add_plazo_implementacion_catalog/migration.sql` | Create | Drop old column, create catalog table, add columns/foreign key |
| `backend/prisma/seed-plan-tratamiento.ts` | Modify | Add `seedPlazosImplementacion` with upserts |
| `backend/prisma/seed.ts` | Modify | Call `seedPlazosImplementacion` |
| `backend/prisma/seed-plan-tratamiento.spec.ts` | Modify | Add test for plazo seed |
| `backend/src/catalogos/catalogos.service.ts` | Modify | Register `plazos-implementacion` in `TIPO_MAP`/`FIELD_MAP` |
| `backend/src/plan-tratamiento/dto/create-plan-tratamiento.dto.ts` | Modify | Replace date field with `plazoImplementacionId?`, `fechaInicioImplementacion?`, `fechaFinImplementacion?` |
| `backend/src/plan-tratamiento/plan-tratamiento.service.ts` | Modify | Update include, toPrismaData, add validation |
| `backend/src/plan-tratamiento/plan-tratamiento.service.spec.ts` | Create | Unit tests for validation and mapping |
| `frontend/types/api.d.ts` | Modify | Add `PlazoImplementacion` interface; update `PlanTratamiento` |
| `frontend/pages/plan-tratamiento.vue` | Modify | Replace date input with select + two date inputs |
| `frontend/pages/catalogos.vue` | Modify | Preload `plazos-implementacion` |

## Interfaces / Contracts

```typescript
// backend/prisma/schema.prisma
model PlazoImplementacion {
  id     Int     @id @default(autoincrement())
  codigo String  @unique // C, M, L
  nombre String  @db.Text // Corto, Medio, Largo
  planes PlanTratamiento[]
}

model PlanTratamiento {
  // ... existing fields ...
  plazoImplementacionId     Int?
  fechaInicioImplementacion DateTime?
  fechaFinImplementacion    DateTime?
  plazoImplementacion       PlazoImplementacion? @relation(fields: [plazoImplementacionId], references: [id], onDelete: Restrict)
}

// backend DTO
@IsOptional() @IsInt() plazoImplementacionId?: number;
@IsOptional() @IsDateString() fechaInicioImplementacion?: string;
@IsOptional() @IsDateString() fechaFinImplementacion?: string;
```

Display helper: `` [`${codigo}`] ${nombre} ``.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `seedPlazosImplementacion` upserts C/M/L without duplicates | Extend `seed-plan-tratamiento.spec.ts` |
| Unit | Service cross-field validation | New `plan-tratamiento.service.spec.ts` with mocked Prisma |
| Unit | DTO accepts ISO dates, rejects invalid strings | `class-validator` via plain object + validate |
| Integration | End-to-end create/update flow | Optional e2e if time allows |
| Frontend | Modal validation and display | Manual smoke test |

## Migration / Rollout

1. Apply schema change and generate migration.
2. Run migration in target environment only after confirming `PlanTratamiento` row count is zero (or backing up existing `plazoImplementacion` values).
3. Seed new catalog via `ts-node prisma/seed.ts` or dedicated script.
4. Deploy backend, then frontend.

Rollback: revert migration SQL to restore `plazoImplementacion`; revert DTO/service; revert frontend modal.

## Open Questions

- None; all product assumptions confirmed.
