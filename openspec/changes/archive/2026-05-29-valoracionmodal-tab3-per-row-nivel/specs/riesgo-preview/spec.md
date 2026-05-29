# Delta: Frontend — Per-Row Risk Preview in Tab 3

## Purpose

Replace Tab 3's broken global selects and single shared `previewRiesgo` with per-row dual selects (`d.riesgoId` + `d.vulnerabilidadRiesgoId`) and per-row inline `evaluacionRiesgo`/`nivelRiesgo` computed via `localCalculateRiesgo`.

## ADDED Requirements

### Requirement: Per-Row Dual Selects Render

Each Tab 3 table row MUST render two `<select>` elements side by side: one bound to `d.riesgoId` (amenaza nivel) and one bound to `d.vulnerabilidadRiesgoId` (vulnerabilidad nivel). Selects are independent per row — no shared state.

#### Scenario: Two selects per row in Tab 3

- GIVEN `detallesRiesgo` has 2 entries
- WHEN Tab 3 renders
- THEN row 0 has `<select v-model="detallesRiesgo[0].riesgoId">` and `<select v-model="detallesRiesgo[0].vulnerabilidadRiesgoId">`
- AND row 1 has `<select v-model="detallesRiesgo[1].riesgoId">` and `<select v-model="detallesRiesgo[1].vulnerabilidadRiesgoId">`
- AND row 0 selects do not affect row 1 values

#### Scenario: Select options populated from catalog riesgos

- GIVEN `catalogData.riesgos` contains entries with `id` and `valorRiesgo`
- WHEN a row select renders
- THEN each `<option>` has `value = riesgo.id` and label from `riesgo.nombre`
- AND `getValorRiesgo(riesgoId)` returns the associated `valorRiesgo` for calculation

### Requirement: Per-Row Preview Calculation

Each row MUST compute `evaluacionRiesgo` and `nivelRiesgo` via `localCalculateRiesgo(ciaAverage, getValorRiesgo(d.riesgoId), getValorRiesgo(d.vulnerabilidadRiesgoId))` and display them inline in the row, replacing any global preview.

#### Scenario: Preview updates on riesgoId change

- GIVEN a row with `d.riesgoId = 1`, `d.vulnerabilidadRiesgoId = 2`, `ciaAverage = 3`
- WHEN user changes `d.riesgoId` to option with `valorRiesgo = 2`
- THEN `localCalculateRiesgo(3, 2, 2)` is called
- AND the row's inline `evaluacionRiesgo` and `nivelRiesgo` update to reflect the new calculation

#### Scenario: Preview updates on vulnerabilidadRiesgoId change

- GIVEN a row with `d.riesgoId = 2`, `d.vulnerabilidadRiesgoId = null`, `ciaAverage = 3`
- WHEN user selects `d.vulnerabilidadRiesgoId = 2` (valorRiesgo = 2)
- THEN `localCalculateRiesgo(3, 2, 2)` is called
- AND the row's inline `evaluacionRiesgo` and `nivelRiesgo` update

#### Scenario: Both null shows placeholder

- GIVEN a row with `d.riesgoId = null` and `d.vulnerabilidadRiesgoId = null`
- WHEN `localCalculateRiesgo` is called with null values
- THEN the row shows `—` for both `evaluacionRiesgo` and `nivelRiesgo`
- AND no error is thrown

### Requirement: Per-Row Controles de Área Read-Only Display

The `controlesImplementados` field of each `DetalleRiesgo` entry MUST be displayed in its Tab 3 row. The display is read-only; Tab 3 does not provide an edit control for `controlesImplementados`.

#### Scenario: Read-only controles per row

- GIVEN a DetalleRiesgo entry has `controlesImplementados = "3 controles: firewall, IDS, backup"`
- WHEN Tab 3 renders that row
- THEN a column shows that text
- AND no `<input>` or `<textarea>` for `controlesImplementados` is rendered in Tab 3

## MODIFIED Requirements

### Requirement: Tab 3 Uses Per-Row Selects, Not Global Form Selects

(Previously: Tab 3 had global `evaluacionForm.amenazaRiesgoId` and `evaluacionForm.vulnerabilidadRiesgoId` selects at lines 706–720 driving a single shared `previewRiesgo`)

Tab 3 MUST NOT render global `evaluacionForm.amenazaRiesgoId` or `evaluacionForm.vulnerabilidadRiesgoId` as selects. The row-level `d.riesgoId` and `d.vulnerabilidadRiesgoId` replaces the global selects.

#### Scenario: No global select elements in Tab 3

- GIVEN Tab 3 is visible
- WHEN the DOM is inspected
- THEN `select[v-model="evaluacionForm.amenazaRiesgoId"]` does NOT exist
- AND `select[v-model="evaluacionForm.vulnerabilidadRiesgoId"]` does NOT exist

## REMOVED Requirements

### Requirement: Global Shared previewRiesgo Display

(Reason: Replaced by per-row inline display; each row computes its own preview.)

The single shared `previewRiesgo` display computed from global selects MUST NOT be rendered in Tab 3. Each row shows its own `evaluacionRiesgo` and `nivelRiesgo`.

### Requirement: Global evaluacionForm.amenazaRiesgoId Select

(Reason: Replaced by per-row `d.riesgoId` select.)

### Requirement: Global evaluacionForm.vulnerabilidadRiesgoId Select

(Reason: Replaced by per-row `d.vulnerabilidadRiesgoId` select.)