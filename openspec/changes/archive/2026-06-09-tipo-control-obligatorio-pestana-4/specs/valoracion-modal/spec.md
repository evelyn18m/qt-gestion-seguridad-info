# Delta for valoracion-modal

## ADDED Requirements

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

## MODIFIED Requirements

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
