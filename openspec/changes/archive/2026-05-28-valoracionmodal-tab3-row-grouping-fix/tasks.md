# Tasks: valoracionmodal-tab3-row-grouping-fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~35-45 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Script Helper Addition

- [x] 1.1 In `frontend/components/ValoracionModal.vue`, after `getRowPreview()` (~line 376), add `findMatchedDetalle()` helper function:

```typescript
function findMatchedDetalle(row: RiskRow): DetalleRiesgo | undefined {
  if (!row.amenazaIds[0]) return undefined
  return detallesRiesgo.find(d =>
    d.tipo === 'amenaza' &&
    d.catalogoId === Number(row.amenazaIds[0]) &&
    JSON.stringify(d.amenazaIds) === JSON.stringify(row.amenazaIds) &&
    JSON.stringify(d.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds)
  )
}
```

## Phase 2: Tab 3 Template Refactor

- [x] 2.1 **Remove global ControlesArea textarea** — delete lines 711–714 in Tab 3 (`<div class="form-group"><label>Controles de Área</label><textarea v-model="evaluacionForm.controlesArea" ...>`)

- [x] 2.2 **Update table header** — in Tab 3 `<thead><tr>` (lines 717-726), replace columns: remove `Tipo` and `Item` columns; add `Amenaza` and `Vulnerabilidad` columns. Header should be:

```html
<th>Amenaza</th>
<th>Vulnerabilidad</th>
<th>Nivel de Amenaza</th>
<th>Nivel Vulnerabilidad</th>
<th>Evaluación</th>
<th>Nivel</th>
<th>Controles de Área</th>
```

- [x] 2.3 **Change v-for source** — line 729: change `v-for="d in detallesRiesgo"` to `v-for="row in riskRows"` and update `:key` to `row.tempId ?? (row.amenazaIds[0] + '-' + row.vulnerabilidadIds[0])`

- [x] 2.4 **Per-row amenaza+vulnerabilidad labels** — replace lines 730-731 (`<td><span class="tag-count">...` and `<td>{{ getCatalogoLabel(...) }}`) with a single row showing both labels:

```html
<td>
  <span v-for="aId in row.amenazaIds" :key="'a-' + aId" class="tag-count" style="margin-right:4px;">{{ getAmenazaLabel(aId) }}</span>
</td>
<td>
  <span v-for="vId in row.vulnerabilidadIds" :key="'v-' + vId" style="margin-right:4px;">{{ getVulnerabilidadLabel(vId) }}</span>
</td>
```

- [x] 2.5 **Two selects per row bound to matchedDetalle** — replace the amenaza select (lines 732-737) and vulnerabilidad select (lines 738-743) with:

```html
<td>
  <!-- Computed once per row: matchedDetalle = findMatchedDetalle(row) -->
  <select v-model="findMatchedDetalle(row).riesgoId" @change="updateEvaluacionDetalle(findMatchedDetalle(row))" style="min-width:130px;">
    <option value="">Seleccionar...</option>
    <option v-for="r in catalogData.valRiesgos" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
  </select>
</td>
<td>
  <select v-model="findMatchedDetalle(row).vulnerabilidadRiesgoId" @change="updateEvaluacionDetalle(findMatchedDetalle(row))" style="min-width:130px;">
    <option value="">Seleccionar...</option>
    <option v-for="r in catalogData.valRiesgos" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
  </select>
</td>
```

- [x] 2.6 **Single getRowPreview call per row** — in the Evaluation cell (line 745) and Nivel cell (line 749), replace `getRowPreview(d)` with `getRowPreview(findMatchedDetalle(row))` — compute once and reuse

- [x] 2.7 **Replace read-only span with editable textarea** — line 754: change `<td><span style="font-size:0.8rem;">{{ d.controlesImplementados || '—' }}</span></td>` to:

```html
<td>
  <textarea
    v-model="row.controlesImplementados"
    placeholder="Controles implementados para esta combinación..."
    rows="2"
    style="resize:vertical; min-width:180px; font-size:0.8rem;"
  ></textarea>
</td>
```

## Phase 3: Tab 2 Filter Fix

- [x] 3.1 **Fix array comparison** — line 678: change `dd.amenazaIds === row.amenazaIds && dd.vulnerabilidadIds === row.vulnerabilidadIds` to `JSON.stringify(dd.amenazaIds) === JSON.stringify(row.amenazaIds) && JSON.stringify(dd.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds)`

## Phase 4: Verification

- [x] 4.1 Run `npm run lint` inside backend container — no errors (frontend has no lint script, build succeeds)
- [x] 4.2 Manual: Tab 3 with grouped riskRows shows one row per group with amenaza + vulnerabilidad labels together
- [x] 4.3 Manual: Tab 3 selects persist to matchedDetalle entries in detallesRiesgo; Tab 4 reflects them
- [x] 4.4 Manual: Tab 2 filter shows residual badges for matched rows (verify JSON.stringify fix)
- [x] 4.5 Manual: No global controlesArea textarea in Tab 3; only per-row textareas
