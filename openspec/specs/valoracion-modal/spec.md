# Delta for valoracion-modal

## MODIFIED Requirements

### Requirement: Wizard Navigation (replaces "Tab Navigation")

The system MUST display a horizontal stepper with 4 numbered steps (Valoración de Activo, Análisis de Riesgos, Evaluación de Riesgo, Tratamiento de Riesgo) and allow navigation only via Back/Next buttons, not free tab clicks. The system MUST enforce sequential validation gates before allowing advancement to the next step.

(Previously: Free tab click navigation between 4 tabs without validation gates)

#### Scenario: Step 1 to Step 2 gate

- GIVEN the user is on Step 1 (Valoración de Activo)
- WHEN they click "Siguiente"
- THEN the system MUST validate all required fields in Step 1 (`nombreActivo`, `tipoActivo`, `formato`, `macroProceso`, `subProceso`, `propietario`, `custodio`, `descripcion`, `controlSeguridad`, `ubicacion`, `confidencialidad`, `integridad`, `disponibilidad`) are filled before advancing
- AND if any is missing, the system MUST block advancement and show an alert

#### Scenario: Step 2 to Step 3 gate

- GIVEN the user is on Step 2 (Análisis de Riesgos)
- WHEN they click "Siguiente"
- THEN the system MUST validate `riskRows.length > 0` before advancing
- AND if no rows exist, the system MUST block advancement and show an alert

#### Scenario: Step 3 to Step 4 gate

- GIVEN the user is on Step 3 (Evaluación de Riesgo)
- WHEN they click "Siguiente"
- THEN the system MUST validate every riskRow has both `riesgoId` and `vulnerabilidadRiesgoId` selected
- AND if any row is incomplete, the system MUST block advancement and show an alert

#### Scenario: Back navigation

- GIVEN the user is on Step N > 1
- WHEN they click "Atrás"
- THEN the system MUST navigate to Step N-1 without any validation

#### Scenario: Back disabled on Step 1

- GIVEN the user is on Step 1
- THEN the "Atrás" button MUST NOT be rendered

#### Scenario: Guardar only on Step 4

- GIVEN the user is on Step 4
- THEN the "Siguiente" button MUST be replaced by "Guardar"
- AND given the user is on Steps 1–3, "Guardar" MUST NOT be rendered

#### Scenario: Step indicator completed state

- GIVEN the user has completed Step N and is on Step M > N
- THEN the step indicator for Step N MUST show a checkmark (✓) to indicate completion

#### Scenario: Step indicator current state

- GIVEN the user is on Step N
- THEN the step indicator for Step N MUST be visually highlighted (filled circle, primary color)

#### Scenario: Wizard state reset on close

- GIVEN the modal is open and the user clicks Cancel or closes the modal
- WHEN the modal reopens
- THEN `currentStep` MUST be 0 (Step 1)

### Requirement: Submit Flow

When the user clicks "Guardar" on Step 4, the component MUST run `canAdvanceFromStep4()` to validate that every risk row has a non-empty `tipoControlId`. If validation fails, the system MUST block submission and show visual error indicators on empty fields. If validation passes, the component MUST emit the `submit` event with the structured payload. The system MUST NOT allow submit from Steps 1–3.

(Previously: Submit via Guardar from Step 4 with no tipoControlId validation gate)

#### Scenario: Submit from Step 4 with all rows complete

- GIVEN the user is on Step 4 and every risk row has `tipoControlId` filled
- WHEN they click "Guardar"
- THEN `canAdvanceFromStep4()` returns true and `submit` is emitted with full payload

#### Scenario: Submit blocked — tipoControlId missing

- GIVEN the user is on Step 4 and at least one risk row has empty `tipoControlId`
- WHEN they click "Guardar"
- THEN the system MUST NOT emit `submit`
- AND the system MUST show error indicators on rows with empty `tipoControlId`

#### Scenario: Submit blocked on earlier steps

- GIVEN the user is on Steps 1–3
- THEN "Guardar" button is NOT rendered
- AND the system MUST NOT emit `submit` from those steps

## ADDED Requirements

### Requirement: Tab 3 and Tab 4 Asset/Macroprocess Columns

The system MUST display two readonly columns — "Nombre del Activo" and "Macroproceso" — at the start of every data row in the Step 3 (Evaluación de Riesgo) and Step 4 (Tratamiento de Riesgo) tables. The columns MUST use the same template pattern already proven in Step 2: `<input :value="analisisForm.nombreActivo" readonly>` and `<input :value="macroProcesoName" readonly>`. Data flows from the parent component via props — no new backend calls or computed properties required.

| Aspect | Requirement |
|--------|-------------|
| Columns | `Nombre del Activo` (min-width 160px) + `Macroproceso` (min-width 180px) |
| Placement | Before Amenaza — first two `<th>` and first two `<td>` of each row |
| Editability | Readonly — `<input readonly>` with muted styling, cursor not-allowed |
| Data source | `analisisForm.nombreActivo` (string) and `macroProcesoName` (computed, resolves macroProceso ID → label) |
| Tabs affected | Step 3 (Evaluación de Riesgo) and Step 4 (Tratamiento de Riesgo) |
| Empty state | Value rendered regardless of riskRow count; if no rows, table is hidden by existing `v-else` |

#### Scenario: Tab 3 displays asset info per row

- GIVEN the user is on Step 3 (Evaluación de Riesgo) and riskRows has at least one entry
- WHEN the table renders
- THEN the first column MUST show "Nombre del Activo" with the value from `analisisForm.nombreActivo` in a readonly input
- AND the second column MUST show "Macroproceso" with the resolved label from `macroProcesoName` in a readonly input
- AND both inputs MUST have `cursor:not-allowed` and muted background styling

#### Scenario: Tab 4 displays asset info per row

- GIVEN the user is on Step 4 (Tratamiento de Riesgo) and riskRows has at least one entry
- WHEN the table renders
- THEN the first column MUST show "Nombre del Activo" with the value from `analisisForm.nombreActivo` in a readonly input
- AND the second column MUST show "Macroproceso" with the resolved label from `macroProcesoName` in a readonly input
- AND both inputs MUST have `cursor:not-allowed` and muted background styling

#### Scenario: Column order preserved

- GIVEN the user is on Step 3 or Step 4 and the table is rendered
- THEN the column order MUST be: Nombre del Activo, Macroproceso, Amenaza, Vulnerabilidad, (remaining columns)
- AND the `<thead>` header order MUST match the `<tbody>` cell order

#### Scenario: Macroproceso unresolved shows fallback

- GIVEN `analisisForm.macroProceso` is not set or not found in `catalogData.valMacroprocesos`
- WHEN the table renders on Step 3 or Step 4
- THEN the Macroproceso column MUST display "No seleccionado en Pestaña 1" or "ID #{id}" as the fallback label

#### Scenario: No regression on existing columns

- GIVEN the user has entered data in Amenaza, Vulnerabilidad, Nivel, Controles Area (Step 3) and Método, Tipo Control, etc. (Step 4) columns
- WHEN the two new columns are added at the start of each row
- THEN all existing columns MUST retain their values, editability, and behavior unchanged

### Requirement: Step 4 Tipo Control Validation

The system MUST validate that every risk row in Step 4 has a non-empty `tipoControlId` before allowing submission. The validation function `canAdvanceFromStep4()` MUST iterate all `riskRows`, resolve each via `findMatchedDetalle()`, and check that `tipoControlId` is truthy and not `""`. On failure, `tipoControlErrors` MUST be set to `true` to activate per-row error indicators.

#### Scenario: All rows have tipoControlId — validation passes

- GIVEN the user is on Step 4 and all risk rows have a selected Tipo Control value
- WHEN `canAdvanceFromStep4()` executes
- THEN the function MUST return `true`

#### Scenario: One or more rows missing tipoControlId — validation fails

- GIVEN the user is on Step 4 and at least one risk row has `tipoControlId` empty (`""` or `undefined`)
- WHEN `canAdvanceFromStep4()` executes
- THEN the function MUST return `false`
- AND `tipoControlErrors` MUST be set to `true`

#### Scenario: Mixed rows — only empty rows show error

- GIVEN riskRows has 3 rows where row 1 has empty `tipoControlId` and rows 0,2 are filled
- WHEN validation runs
- THEN only the row with empty `tipoControlId` MUST show the `has-error` class and "Este campo es obligatorio" message

## REMOVED Requirements

### Requirement: Tab Navigation

(Reason: Replaced by Wizard Navigation requirement — free tab click navigation is removed; navigation is now sequential via Back/Next buttons only)