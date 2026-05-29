# Design: valoracionmodal-tab3-per-row-nivel

## Technical Approach

Replace Tab 3's broken global selects (lines 705–720 driving a single `previewRiesgo`) with per-row dual selects and per-row inline previews — mirroring the row-based pattern already working in Tab 2. Schema adds `vulnerabilidadRiesgoId Int?` to `DetalleRiesgo` alongside the existing `riesgoId`.

## Architecture Decisions

### Decision: Add `vulnerabilidadRiesgoId` to `DetalleRiesgo`, not to `ValoracionActivo`

**Choice**: Add `vulnerabilidadRiesgoId Int?` column to `DetalleRiesgo` (per-row level).
**Alternatives considered**: Adding at parent `ValoracionActivo` level and joining at save time.
**Rationale**: `riesgoId` (amenaza nivel) already lives per-row on `DetalleRiesgo`. Adding `vulnerabilidadRiesgoId` at the same level keeps symmetry — each row has independent amenaza + vulnerabilidad nivel selects. Parent-level storage would force a global select model.

### Decision: Per-row preview via inline computed, not a shared helper

**Choice**: Each row calls `localCalculateRiesgo(ciaAverage, getValorRiesgo(d.riesgoId), getValorRiesgo(d.vulnerabilidadRiesgoId))` directly in template.
**Alternatives considered**: A `rowPreview(d)` helper computed per-row, a `Map<rowId, PreviewRiesgo>` stored in local state.
**Rationale**: `localCalculateRiesgo` already exists. Inline call in template is the simplest and matches Tab 2 patterns. No extra reactive state needed.

### Decision: `db push` over migration for additive column

**Choice**: `npx prisma db push` to apply the new nullable column.
**Alternatives considered**: Full `migrate dev` with migration file.
**Rationale**: Additive only — no data loss possible. `db push` is faster and survives repeated runs. MySQL/MariaDB migration history adds unnecessary complexity for a nullable column addition.

## Data Flow

```
Tab 3 table row
    │
    ├── d.riesgoId ──→ getValorRiesgo(d.riesgoId) ──┐
    │                                               │
    ├── d.vulnerabilidadRiesgoId ──→ getValorRiesgo(d.vulnerabilidadRiesgoId) ──┐
    │                                                               │
    └── ciaAverage (shared) ◀────────────────────────────────────────┘
                          │
                          ▼
              localCalculateRiesgo(va, amenaza, vulnerabilidad)
                          │
                          ▼
              { evaluacionRiesgo, nivelRiesgo }  ← displayed inline in row
```

```
Backend save (existing flow unchanged)
    detallesRiesgo[].riesgoId          → stored (already existed)
    detallesRiesgo[].vulnerabilidadRiesgoId → stored (NEW column)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modify | Add `vulnerabilidadRiesgoId Int?` to `DetalleRiesgo` model |
| `frontend/types/api.d.ts` | Modify | Add `vulnerabilidadRiesgoId?: number \| null` to `DetalleRiesgo` interface |
| `frontend/components/ValoracionModal.vue` | Modify | Remove global selects lines 706–720; add per-row `vulnerabilidadRiesgoId` select; replace global `previewRiesgo` per row with per-row inline calculation; add read-only `controlesImplementados` column to Tab 3 table |

### `schema.prisma` diff (conceptual)

```prisma
model DetalleRiesgo {
  id                    Int      @id @default(autoincrement())
  valoracionActivoId    Int
  tipo                  String
  catalogoId            Int
  riesgoId              Int?     // existing — amenaza nivel
  vulnerabilidadRiesgoId Int?    // NEW — vulnerabilidad nivel
  evaluacionRiesgo      Float?
  nivelRiesgo           String?
  // ... rest unchanged
}
```

### `api.d.ts` diff (conceptual)

```typescript
export interface DetalleRiesgo {
  id?: number
  tipo: 'amenaza' | 'vulnerabilidad'
  catalogoId: number
  riesgoId?: number | string | null
  vulnerabilidadRiesgoId?: number | null  // NEW
  evaluacionRiesgo?: number
  nivelRiesgo?: string
  // ... rest unchanged
  controlesImplementados?: string
}
```

### `ValoracionModal.vue` Tab 3 changes

**Remove** (lines ~706–720):
```html
<!-- DELETE global selects block -->
<div class="val-grid" style="grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1rem;">
  <div class="form-group">
    <label>Nivel de Amenaza</label>
    <select v-model="evaluacionForm.amenazaRiesgoId">...</select>
  </div>
  <div class="form-group">
    <label>Nivel de Vulnerabilidad</label>
    <select v-model="evaluacionForm.vulnerabilidadRiesgoId">...</select>
  </div>
</div>
```

**Replace** table body row (lines ~733–752):
```html
<tr v-for="d in detallesRiesgo" :key="d.tipo + d.catalogoId">
  <td><span class="tag-count">{{ d.tipo === 'amenaza' ? 'A' : 'V' }}</span></td>
  <td>{{ getCatalogoLabel(d.tipo, d.catalogoId) }}</td>
  <td><!-- existing amenaza select -->
    <select v-model="d.riesgoId" @change="updateEvaluacionDetalle(d)" style="min-width:130px;">
      <option value="">Seleccionar...</option>
      <option v-for="r in catalogData.valRiesgos" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
    </select>
  </td>
  <td><!-- NEW vulnerabilidad select (same pattern as riesgoId select, filtered for vulnerabilidad) -->
    <select v-model="d.vulnerabilidadRiesgoId" @change="updateEvaluacionDetalle(d)" style="min-width:130px;">
      <option value="">Seleccionar...</option>
      <option v-for="r in catalogData.valRiesgos.filter(...)" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
    </select>
  </td>
  <td><!-- per-row inline preview (replaces shared previewRiesgo) -->
    <span v-if="localCalculateRiesgo(ciaAverage, getValorRiesgo(d.riesgoId), getValorRiesgo(d.vulnerabilidadRiesgoId)).evaluacionRiesgo > 0">
      {{ localCalculateRiesgo(ciaAverage, getValorRiesgo(d.riesgoId), getValorRiesgo(d.vulnerabilidadRiesgoId)).evaluacionRiesgo.toFixed(2) }}
    </span>
    <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
  </td>
  <td><!-- per-row nivel badge -->
    <span v-if="localCalculateRiesgo(...).nivelRiesgo" class="nivel-badge" ...>{{ localCalculateRiesgo(...).nivelRiesgo }}</span>
    <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
  </td>
  <td><!-- read-only controlesImplementados — no v-model -->
    <span style="font-size:0.8rem;">{{ d.controlesImplementados || '—' }}</span>
  </td>
</tr>
```

> **Note**: To avoid triple invocation of `localCalculateRiesgo` per row (eval + nivel + badge), extract the result once using a `v-bind:key` reactive pattern or a minimal inline computed. Exact optimization left to apply phase.

## Interfaces / Contracts

**Prisma model** (`DetalleRiesgo`):
```
vulnerabilidadRiesgoId Int?   — nullable; NULL for pre-existing rows (backward compat)
```

**TypeScript interface** (`DetalleRiesgo` in `api.d.ts`):
```
vulnerabilidadRiesgoId?: number | null
```

**No new API endpoints required** — save flow unchanged; `detallesRiesgo` array is submitted as-is to existing save handlers.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `localCalculateRiesgo` with null/invalid inputs | Direct Jest test of function |
| Integration | Tab 3 table rows each compute independently | Manual test in browser |
| E2E | Full Tab 3 flow: select amenaza, vulnerabilidad per row, preview display | Playwright test |
| Build | Frontend builds (`docker compose exec frontend npm run build`) | After each change |

## Migration / Rollout

**Steps:**
1. Add `vulnerabilidadRiesgoId Int?` to `schema.prisma`
2. `docker compose exec backend npx prisma db push` — applies column as nullable, no data loss
3. Add `vulnerabilidadRiesgoId?: number | null` to `api.d.ts`
4. Update `ValoracionModal.vue` Tab 3 template
5. `docker compose exec frontend npm run build`
6. Verify: edit an existing record — rows show with null `vulnerabilidadRiesgoId` (renders as empty select, shows `—`)

**Backward compat for null `vulnerabilidadRiesgoId`:** `getValorRiesgo(null/undefined)` returns `0`, `localCalculateRiesgo` returns `{ evaluacionRiesgo: 0, nivelRiesgo: '' }`, template shows `—`. Graceful degradation — no broken UI state.

## Open Questions

- [ ] Should the existing global `evaluacionForm.amenazaRiesgoId` and `evaluacionForm.vulnerabilidadRiesgoId` fields be removed from the `EvaluacionFormData` interface entirely, or kept for future use?
- [ ] Tab 3 table header row (lines 724–730) needs a "Nivel Vulnerabilidad" column header added — confirm column position relative to existing "Nivel de Riesgo" header.
- [ ] The `controlesArea` textarea at line 702 (`evaluacionForm.controlesArea`) — is this deliberately global and kept, or is it unused and should be removed?
