# Delta: Tab 3 Row Grouping Fix

## Purpose

Fix Tab 3 to iterate over `riskRows` (grouped by amenaza+vulnerabilidad) instead of `detallesRiesgo` (flattened). Make `controlesImplementados` editable. Remove global `controlesArea`. Fix Tab 2 filter array comparison using `JSON.stringify`.

## MODIFIED Requirements

### Requirement: Per-Row Dual Selects Render in Tab 3

Each Tab 3 table row MUST render two `<select>` elements side by side: one bound to `d.riesgoId` (amenaza nivel) and one bound to `d.vulnerabilidadRiesgoId` (vulnerabilidad nivel). Selects are independent per row — no shared state.
(Previously: Tab 3 iterated over `detallesRiesgo` (flattened); same amenaza/vulnerabilidad appeared on separate rows)

#### Scenario: Two selects per row in Tab 3 — grouped (correct)

- GIVEN `riskRows` has one entry with `amenazaIds = [2]` and `vulnerabilidadIds = [1]`
- WHEN Tab 3 renders
- THEN a single row shows amenaza label + vulnerabilidad label together
- AND row has `<select v-model="matchedDetalle.riesgoId">` AND `<select v-model="matchedDetalle.vulnerabilidadRiesgoId">`
- AND `amenazaIds` and `vulnerabilidadIds` from same group appear on ONE row, not two

#### Scenario: Select options populated from catalog riesgos

- GIVEN `catalogData.riesgos` contains entries with `id` and `valorRiesgo`
- WHEN a row select renders
- THEN each `<option>` has `value = riesgo.id` and label from `riesgo.nombre`
- AND `getValorRiesgo(riesgoId)` returns the associated `valorRiesgo` for calculation

### Requirement: Per-Row Controles de Área Editable

The `controlesImplementados` field of each `riskRow` entry MUST be displayed as an editable `<textarea v-model="row.controlesImplementados">`. Tab 3 provides direct editing per row.
(Previously: `controlesImplementados` displayed as read-only `<span>`)

#### Scenario: ControlesImplementados is editable textarea

- GIVEN a riskRow has `controlesImplementados = ""`
- WHEN Tab 3 renders that row
- THEN a `<textarea v-model="row.controlesImplementados">` is present
- AND user can type into it without readonly attribute
- AND changes bind to `row.controlesImplementados`

#### Scenario: Existing controles text loads into textarea

- GIVEN a riskRow has `controlesImplementados = "3 controles: firewall, IDS, backup"`
- WHEN Tab 3 renders that row
- THEN the textarea contains that text value
- AND the textarea is editable

## ADDED Requirements

### Requirement: Tab 3 Iterates Over riskRows (Grouped)

The Tab 3 `<tbody>` MUST iterate over `riskRows` as the display source. Each row displays `row.amenazaIds` labels + `row.vulnerabilidadIds` labels together, with per-row selects and editable controles.
(Previously: Tab 3 iterated over `detallesRiesgo` (flattened via `syncRowsToDetalles`); each amenaza/vulnerabilidad appeared on separate rows)

#### Scenario: One row per riskRow group

- GIVEN `detallesRiesgo` has 3 entries: (amenazaId=2, vulnId=1), (amenazaId=3, vulnId=1), (amenazaId=2, vulnId=2)
- AND these form 2 riskRows: {amenazaIds:[2], vulnerabilidadIds:[1]} and {amenazaIds:[3], vulnerabilidadIds:[1,2]}
- WHEN Tab 3 renders
- THEN 2 rows appear
- AND row 1 shows amenaza label for id=2 + vulnerabilidad label for id=1
- AND row 2 shows amenaza label for id=3 + vulnerabilidad labels for id=1 AND id=2

#### Scenario: riskRows empty shows no rows

- GIVEN `riskRows` is empty
- WHEN Tab 3 renders
- THEN `<tbody>` contains no `<tr>` elements
- AND no select or textarea elements appear

### Requirement: Global ControlesArea Removed From Tab 3

Tab 3 MUST NOT have a global `controlesArea` textarea. The per-row `controlesImplementados` textarea is the only controles field.
(Previously: global `evaluacionForm.controlesArea` textarea existed at Tab 3 level)

#### Scenario: Tab 3 has no global controles textarea

- GIVEN the global `controlesArea` textarea has been removed from Tab 3 template
- WHEN Tab 3 renders
- THEN NO textarea exists outside the per-row iteration
- AND only per-row `controlesImplementados` textareas are present

### Requirement: Tab 2 Filter Uses JSON.stringify for Array Comparison

The Tab 2 filter that matches `detalleRiesgo` entries to `riskRows` MUST use `JSON.stringify` comparison for `amenazaIds` and `vulnerabilidadIds` arrays instead of `===` reference comparison.
(Previously: `===` comparison always failed for arrays due to reference inequality)

#### Scenario: Filter matches by array content, not reference

- GIVEN a `dd` entry in `detallesRiesgo` with `amenazaIds = [2,3]` and `vulnerabilidadIds = [1]`
- AND a `row` in `riskRows` with matching arrays
- WHEN the Tab 2 filter evaluates `JSON.stringify(dd.amenazaIds) === JSON.stringify(row.amenazaIds)`
- THEN the comparison returns `true`
- AND the row displays the residual badge

#### Scenario: Filter correctly distinguishes different array combinations

- GIVEN `dd` has `amenazaIds = [2]` and `row` has `amenazaIds = [3]`
- WHEN `JSON.stringify([2]) === JSON.stringify([3])`
- THEN result is `false`
- AND the filter correctly excludes non-matching entries

## REMOVED Requirements

### Requirement: Per-Row Controles de Área Read-Only Display

(Reason: This requirement stated that `controlesImplementados` was read-only. The behavior is replaced by editable textarea — the new requirement "Per-Row Controles de Área Editable" supersedes this.)

### Requirement: Tab 3 Iteration Over detallesRiesgo (Flattened)

(Reason: This requirement stated Tab 3 iterates over `detallesRiesgo` (flattened). Grouped iteration over `riskRows` replaces it — the new requirement "Tab 3 Iterates Over riskRows (Grouped)" supersedes this.)

## Out of Scope

- Backend schema changes
- Tab 4 modifications
- Adding new calculation logic
