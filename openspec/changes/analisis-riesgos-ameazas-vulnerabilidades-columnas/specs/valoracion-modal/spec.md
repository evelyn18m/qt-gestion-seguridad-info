# Delta for valoracion-modal

## MODIFIED Requirements

### Requirement: Tab 2 — Risk Analysis Layout

The Tab 2 "Análisis de Riesgos" tab of `ValoracionModal` MUST display risk analysis as an editable table of rows (filas), where each row represents a distinct risk entry combining threat(s) and vulnerability(s) with their own controls. The tab no longer uses flat chip-lists. Instead, it displays three columns: "Amenazas", "Vulnerabilidades", and "Controles Implementados" per row.

(Previously: Tab 2 displayed two flat chip-lists — one for amenazas and one for vulneribilidade — with a single shared `controlesImplementacion` field at the ValoracionActivo level)

#### Scenario: Display existing risk rows on tab open

- GIVEN `detallesRiesgo` contains existing rows with amenazaIds, vulnerabilidadIds, and controlesImplementados per row
- WHEN Tab 2 is rendered
- THEN each row displays its amenaza(s), vulnerabilidad(s), and controlesImplementados in separate columns
- AND rows are editable inline

#### Scenario: Add new row with amenaza only (no vulnerabilidad)

- GIVEN the user is on Tab 2
- WHEN the user clicks "Agregar fila" and selects an amenaza from the amenaza picker
- AND leaves vulnerabilidad empty
- THEN a new row is created with the selected amenazaId and null vulnerabilidadId
- AND the row passes validation (has at least one of amenaza/vulnerabilidad)

#### Scenario: Add new row with vulnerabilidad only (no amenaza)

- GIVEN the user is on Tab 2
- WHEN the user clicks "Agregar fila" and selects a vulnerabilidad from the vulnerabilidad picker
- AND leaves amenaza empty
- THEN a new row is created with the selected vulnerabilidadId and null amenazaId
- AND the row passes validation (has at least one of amenaza/vulnerabilidad)

#### Scenario: Add new row with both amenaza and vulnerabilidad

- GIVEN the user is on Tab 2
- WHEN the user clicks "Agregar fila" and selects both an amenaza and a vulnerabilidad
- THEN a new row is created with both IDs populated
- AND the row is valid

#### Scenario: Remove a risk row

- GIVEN Tab 2 has at least one risk row
- WHEN the user clicks the remove button on a specific row
- THEN that row is removed from `detallesRiesgo`
- AND the table updates to reflect the removal

#### Scenario: Save row with 0+0 (both null)

- GIVEN the user creates a new row without selecting any amenaza AND without selecting any vulnerabilidad
- WHEN the user attempts to save or navigate away
- THEN the system shows a validation error
- AND the row is NOT saved

### Requirement: Submit Flow with Per-Row Controls

When the user submits the valuation, the component MUST emit `submit` with a payload where each entry in `detallesRiesgo` includes `amenazaIds`, `vulnerabilidadIds`, and `controlesImplementados` per row. The shared `controlesImplementacion` field at the `ValoracionActivo` level is no longer used for Tab 2 data.

(Previously: `controlesImplementacion` was a single shared text field at the ValoracionActivo level, and Tab 2 only sent amenaza and vulnerabilidad arrays)

#### Scenario: Submit with multiple risk rows

- GIVEN the user has added 3 risk rows in Tab 2 with different amenaza/vulnerabilidad combinations and per-row controls
- WHEN the user clicks "Guardar"
- THEN the emitted `submit` payload contains `detallesRiesgo` as an array of 3 objects
- AND each object includes its own `amenazaIds` (JSON string), `vulnerabilidadIds` (JSON string), and `controlesImplementados` (string)

### Requirement: Edit Mode — Load Per-Row Data

When `editId` refers to an existing `ValoracionActivo`, the component MUST populate Tab 2 with the risk rows from that valuation, loading amenaza(s), vulnerabilidad(s), and controlesImplementados for each row independently.

#### Scenario: Edit existing valuation loads per-row data

- GIVEN `editId` is a valid ID pointing to an existing `ValoracionActivo`
- WHEN the modal opens
- THEN Tab 2 is populated with risk rows where each row has its own amenazaIds, vulnerabilidadIds, and controlesImplementados
- AND the user can modify, add, or remove rows