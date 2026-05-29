# Exploration: ValoracionModal Tab 3 Row Grouping Fix

## Current State

### How syncRowsToDetalles() works (lines 228-270)

The function iterates over each RiskRow and **flattens** it into separate DetalleRiesgo entries:

```javascript
riskRows.value.forEach(row => {
  row.amenazaIds.forEach(aId => {
    entries.push({ tipo: 'amenaza', catalogoId: Number(aId), ... })
  })
  row.vulnerabilidadIds.forEach(vId => {
    entries.push({ tipo: 'vulnerabilidad', catalogoId: Number(vId), ... })
  })
})
```

**Result**: A RiskRow with 2 amenazas + 2 vulnerabilidades generates **4 separate DetalleRiesgo entries**, each tagged `tipo: 'amenaza'` or `tipo: 'vulnerabilidad'` separately. The grouping context (which amenaza pairs with which vulnerabilidad) is lost.

### Tab 3 table (lines 729-756)

Renders one `<tr>` per `detallesRiesgo` entry — so amenaza and vulnerabilidad from the same RiskRow appear on **separate rows**.

### Tab 2 filter bug (line 678)

```javascript
detallesRiesgo.filter(dd => dd.amenazaIds === row.amenazaIds && dd.vulnerabilidadIds === row.vulnerabilidadIds)
```

`===` compares array **references**, not contents. Since arrays are created via `JSON.parse` or `[...spread]` at different times, this is **always `false`** → filter returns empty for every row. "Riesgo Residual" column always shows "—".

### ControlesImplementados field

- Tab 2: `<textarea v-model="row.controlesImplementados">` (lines 668-673) — already editable per row
- Tab 3: `{{ d.controlesImplementados || '—' }}` (line 754) — **read-only text**, not a textarea

### Controles de Área global textarea

Lines 712-714: `evaluacionForm.controlesArea` — a global textarea at the top of Tab 3. User says this is redundant (controles should be per-row in Tab 2 only).

## Root Causes

1. **Flattening**: `syncRowsToDetalles()` splits one RiskRow into N entries (one per amenaza + one per vulnerabilidad), losing the grouping intent.
2. **Filter**: `===` on arrays always `false` → no DetalleRiesgo entries ever match their source RiskRow in Tab 2.
3. **Tab 3 rendering**: iterates over flat entries, not grouped rows.

## Data Model Check

- `frontend/types/api.d.ts` — DetalleRiesgo already has `amenazaIds[]`, `vulnerabilidadIds[]`, `controlesImplementados` — **no type change needed**
- `backend/prisma/schema.prisma` — DetalleRiesgo model already has `amenazaIds`, `vulnerabilidadIds`, `controlesImplementados` — **no schema change needed**

The data model already supports per-row grouping; only the rendering and sync logic need fixing.

## Affected Areas

- `frontend/components/ValoracionModal.vue` — syncRowsToDetalles(), Tab 2 filter (line 678), Tab 3 table rendering (lines 729-756), evaluacionForm.controlesArea (lines 712-714)
- `frontend/types/api.d.ts` — DetalleRiesgo interface (no change)
- `backend/prisma/schema.prisma` — DetalleRiesgo model (no change)

## Approaches

### Approach A: Restructure Tab 3 to iterate riskRows (Recommended)

- Tab 3 `<tbody>` iterates over `riskRows` directly (like Tab 2 does)
- Each row shows amenaza label(s) AND vulnerabilidad label(s) together
- Per-row nivel selects for amenaza and vulnerabilidad use existing catalog selects
- `controlesImplementados` becomes `<textarea>` in Tab 3
- `syncRowsToDetalles()` simplified to generate one entry per RiskRow (Cartesian product of amenaza×vulnerabilidad per row), not flat per-type entries
- `evaluacionForm.controlesArea` global textarea removed

| Pros | Cons |
|------|------|
| Aligns Tab 2 and Tab 3 to same data source | Backend sync function must be refactored |
| Matches user's "una fila = una combinación" requirement | Tab 3 level selects need separate amenaza/vulnerabilidad nivel per row |
| No schema changes needed | — |
| Cleaner architecture (riskRows is the single source of truth) | — |

**Effort: Medium** — requires changes to Tab 3 rendering loop, sync function, and Tab 2 filter comparison.

### Approach B: Keep flat model, fix filter + group in Tab 3

- `syncRowsToDetalles()` stays but generates one entry per (amenaza, vulnerabilidad) COMBINATION (Cartesian product within each RiskRow)
- Tab 3 filter uses `JSON.stringify(dd.amenazaIds) === JSON.stringify(row.amenazaIds)` for proper comparison
- Tab 3 table still iterates flat entries but groups Threat+Vulnerability pair visually
- Global `controlesArea` removed; per-row `controlesImplementados` as textarea kept

| Pros | Cons |
|------|------|
| Smaller change to syncRowsToDetalles() | Still has flat entries that don't cleanly map to Tab 2's RiskRow model |
| Fixes filter comparison | More complex grouping logic in Tab 3 rendering |
| — | Tab 2 still needs JSON.stringify fix either way |

**Effort: Medium-High** — filter fix is trivial but Tab 3 grouping logic adds complexity.

## Recommendation

**Approach A** — restructure Tab 3 to use `riskRows` as the display model, matching Tab 2's architecture. This aligns Tab 2 and Tab 3 to the same data source and eliminates the flattening mismatch.

Specific changes:
1. Tab 3 iterates `riskRows` instead of `detallesRiesgo`
2. Each row shows amenaza+vulnerabilidad labels together with their respective nivel selects
3. `controlesImplementados` becomes `<textarea>` (read-write, not read-only)
4. Remove `evaluacionForm.controlesArea` global textarea
5. Fix Tab 2 filter to use `JSON.stringify()` comparison
6. `syncRowsToDetalles()` refactored to generate one entry per (amenaza × vulnerabilidad) pair per RiskRow

## Risks

- Backend API may expect flat DetalleRiesgo entries per amenaza/vulnerabilidad — verify how the API serializes/saves
- `loadExistingRows()` (line 273-289) already groups by unique amenazaIds+vulnerabilidadIds sets — works correctly
- Tab 3 `updateEvaluacionDetalle()` updates a single DetalleRiesgo entry — with Approach A it must find/update the correct entry per row+item combination

## Next

Ready for **sdd-propose** to formalize the change scope and approach.