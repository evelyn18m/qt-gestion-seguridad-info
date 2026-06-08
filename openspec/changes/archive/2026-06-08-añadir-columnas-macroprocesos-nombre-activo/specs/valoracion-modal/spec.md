# Delta for valoracion-modal

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
