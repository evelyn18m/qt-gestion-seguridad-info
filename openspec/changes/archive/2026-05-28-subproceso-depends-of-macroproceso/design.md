# Design: Subproceso Depends on MacroProceso

## Technical Approach

Add a required FK from `Subproceso` → `MacroProceso` by:
1. Adding `codigo` field to `MacroProceso` (extracted from end of `nombre` via regex `\((\w+)\)$`)
2. Adding required `macroProcesoId` FK to `Subproceso` (resolved by extracting code from start of subprocess name via `^\((\w+)\)`)
3. Using `onDelete: Restrict` to block deletion when child subprocesses exist

## Architecture Decisions

### Decision: Required FK (not optional)

**Choice**: `macroProcesoId` is `Int` (not `Int?`) — required, not nullable.
**Alternatives considered**: Optional FK with empty-string default — rejected because it defeats referential integrity.
**Rationale**: Spec mandates mandatory relationship. DB-level constraint prevents invalid state.

### Decision: Restrict over Cascade

**Choice**: `onDelete: Restrict` on the FK.
**Alternatives considered**: `onDelete: Cascade` — rejected; silently deleting subprocesses on macroproceso deletion is dangerous data loss.
**Rationale**: Block deletion, surface error to user. Explicit is safer than silent.

### Decision: Regex-based code extraction over adding new columns

**Choice**: Parse `codigo` from existing `nombre` fields via regex.
**Alternatives considered**: Modify `catalogos.json` to include explicit code column — rejected; would require re-exporting Excel.
**Rationale**: Leverages existing data format `(CODE) Name`. Single source of truth, no duplication.

## Data Flow

```
catalogos.json
    │
    ├─► seed.ts: extract codigo from end of MacroProceso.nombre
    │         ↕
    │         create MacroProceso { id, nombre, codigo }
    │
    ├─► seed.ts: extract code from start of Subproceso.nombre
    │         lookup MacroProceso by codigo
    │         ↕
    │         create Subproceso { id, nombre, macroProcesoId }
    │
    ▼
MySQL: macroproceso (id, nombre, codigo)
           ▲
           │ 1:N (FK with Restrict)
           │
subproceso (id, nombre, macroProcesoId)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | `MacroProceso.codigo String`; `Subproceso.macroProcesoId Int @relation` |
| `backend/src/catalogos/catalogos.service.ts` | Modify | `FIELD_MAP` for `subproceso` and `macroProceso` |
| `backend/prisma/seed.ts` | Modify | Extract `codigo` (end); resolve FK by code (start) |
| `backend/src/catalogos/dto/create-catalogo.dto.ts` | Modify | Add `macroProcesoId` field for subprocess create |
| `frontend/pages/catalogos.vue` | Modify | Subprocess form: add macroproceso dropdown; list shows `codigo - nombre` |
| `backend/prisma/migrations/` | Create | Migration for FK + codigo column |

## Prisma Schema Diff

```diff
 model MacroProceso {
   id        Int      @id @default(autoincrement())
   nombre    String   @db.Text
+  codigo    String
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt
+  subprocesses Subproceso[]
 }

 model Subproceso {
   id        Int      @id @default(autoincrement())
   nombre    String   @db.Text
+  macroProcesoId Int
+  macroProceso MacroProceso @relation(fields: [macroProcesoId], references: [id], onDelete: Restrict)
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt
 }
```

## Migration Plan

**Name**: `add_macroproceso_codigo_and_subproceso_fk`

**SQL generated**:
```sql
-- 1. Add codigo column (nullable → will be populated by seed)
ALTER TABLE `macroproceso` ADD COLUMN `codigo` VARCHAR(191) NOT NULL;

-- 2. Add FK column + index
ALTER TABLE `subproceso` ADD COLUMN `macroProcesoId` INT NOT NULL;
ALTER TABLE `subproceso` ADD CONSTRAINT `subproceso_macroProcesoId_fkey`
  FOREIGN KEY (`macroProcesoId`) REFERENCES `macroproceso`(`id`)
  ON DELETE RESTRICT;
```

**Seed fix-up**: Run seed BEFORE migration (populate `codigo` for existing MacroProcesos). Existing Subproceso rows get `macroProcesoId` via manual edit or re-seed after migration. Migration will fail if existing subprocesses lack valid `macroProcesoId` — this is intentional guardrails.

**Rollback**: `prisma migrate reset` or manual down migration. `codigo` column is NOT nullable — revert requires fixing orphaned subprocesses first.

## CatalogosService FIELD_MAP

```typescript
const FIELD_MAP: Record<string, readonly string[]> = {
  // ...existing...
  subproceso: ['nombre', 'macroProcesoId'],
  macroProceso: ['nombre', 'codigo'],
  // ...
}
```

The `macroProcesoId` field is passed as `Int` from the DTO. No special transformation needed — Prisma accepts the value directly.

## Seeder Changes

**MacroProceso**: extract `codigo` from end of `nombre`
```typescript
const codigoMatch = m['Proceso Macro'].match(/\((\w+)\)$/);
const codigo = codigoMatch ? codigoMatch[1] : '';
await prisma.macroProceso.create({ data: { nombre: m['Proceso Macro'], codigo } });
```

**Subproceso**: extract code from start, lookup MacroProceso by `codigo`
```typescript
// Build codigo → id map first (after MacroProcesos seeded)
const macroMap = new Map<string, number>();
// ... populate from seeded MacroProcesos ...

const codeMatch = s['Subproceso'].match(/^\((\w+)\)/);
const codigo = codeMatch ? codeMatch[1] : '';
const macroProcesoId = macroMap.get(codigo);
if (!macroProcesoId) throw new Error(`MacroProceso not found for code: ${codigo}`);
await prisma.subproceso.create({ data: { nombre: s['Subproceso'], macroProcesoId } });
```

**Order**: MacroProcesos MUST be seeded before Subprocesos (dependency). This is already the case in `seed.ts` — no reordering needed.

## Frontend Changes

**Subprocess form** (`catalogos.vue`):
1. Add reactive `macroprocesos` list ref
2. In `openCreateForm`/`openEditForm`, when tipo is `subprocesos`, fetch macroprocesos into the list
3. In `getFormFields()`, add `macroProcesoId` as a field for subprocess
4. Render a `<select>` for `macroProcesoId` in the modal with options: `codigo + " - " + nombre`
5. Mark the select as `required`

**Subprocess list**: Column `macroProcesoId` will render as `macroProceso.codigo + " - " + macroProceso.nombre` via the existing table rendering logic — the relation is automatically included in `findMany`.

```typescript
// In form field rendering (getFormFields adds 'macroProcesoId'):
// Add special case in template:
// <select v-if="field === 'macroProcesoId'" v-model="catalogoFormData[field]">
//   <option value="">Seleccionar MacroProceso...</option>
//   <option v-for="mp in macroprocesos" :key="mp.id" :value="mp.id">
//     {{ mp.codigo }} - {{ mp.nombre }}
//   </option>
// </select>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `codigo` extraction regex | `describe('MacroProceso codigo extraction')` — test `\((\w+)\)$` against known names |
| Unit | FK resolution in seeder | Mock Prisma, verify `macroProcesoId` assigned correctly from code map |
| Integration | `onDelete: Restrict` blocks deletion | Create subprocess with macroproceso, attempt delete, expect error |
| Integration | FK required on create | Attempt subprocess create without `macroProcesoId`, expect validation error |

**TDD flow**: Write tests FIRST, confirm they fail, implement, confirm they pass.

```typescript
// catalogos.service.spec.ts
describe('subproceso macroProcesoId required', () => {
  it('should reject subprocess without macroProcesoId', async () => {
    await expect(service.create('subprocesos', { nombre: 'Test' }))
      .rejects.toThrow();
  });
});
```

## Migration / Rollout

1. Run seed first (populates `codigo` for existing MacroProcesos)
2. Create migration: `docker compose exec backend npx prisma migrate dev --name add_macroproceso_codigo_and_subproceso_fk`
3. Run seed again (assigns `macroProcesoId` to existing subprocesses)
4. Apply frontend changes
5. Run tests: `docker compose exec backend npm run test`

## Open Questions

- [ ] Do existing subprocess names in `catalogos.json` all follow `(CODE) Name` pattern? Verify before migration — if any don't, seed will fail.
- [ ] Should the frontend allow changing `macroProcesoId` on existing subprocesses, or is it set-once? (Spec implies set-once via seed pattern, but no explicit requirement.)