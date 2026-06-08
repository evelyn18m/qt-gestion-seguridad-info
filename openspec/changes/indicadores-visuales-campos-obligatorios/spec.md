# Delta for valoracion-modal

## MODIFIED Requirements

### Requirement: Wizard Navigation

The system MUST display a horizontal stepper with 4 numbered steps (Valoración de Activo, Análisis de Riesgos, Evaluación de Riesgo, Tratamiento de Riesgo) and allow navigation only via Back/Next buttons, not free tab clicks. The system MUST enforce sequential validation gates before allowing advancement to the next step. On Step 1 validation failure, the system MUST display per-field inline error messages with red borders and scroll to the first empty field — NO generic `alert()` dialog.

(Previously: Free tab click navigation between 4 tabs without validation gates. Step 1 validation failure showed generic alert() without per-field visual indicators.)

#### Scenario: Step 1 to Step 2 gate — inline error display

- GIVEN the user is on Step 1 and at least one required field (`nombreActivo`, `tipoActivo`, `formato`, `macroProceso`, `subProceso`, `propietario`, `custodio`, `descripcion`, `controlSeguridad`, `ubicacion`, `confidencialidad`, `integridad`, `disponibilidad`) is empty
- WHEN they click "Siguiente"
- THEN the system MUST block advancement
- AND each empty required field MUST render a red border (`#dc2626`) on its input/select/textarea
- AND each empty required field MUST display "Este campo es obligatorio" as red text below the control
- AND the viewport MUST smooth-scroll to the first empty field (block: center)
- AND no `alert()` dialog MUST appear

#### Scenario: Step 1 to Step 2 gate — all fields complete

- GIVEN the user is on Step 1 and all required fields are filled
- WHEN they click "Siguiente"
- THEN the system advances to Step 2 without showing any error indicators

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
- THEN the step indicator for Step N MUST show a checkmark (✓)

#### Scenario: Step indicator current state

- GIVEN the user is on Step N
- THEN the step indicator for Step N MUST be visually highlighted (filled circle, primary color)

#### Scenario: Wizard state reset on close

- GIVEN the modal is open and the user clicks Cancel or closes the modal
- WHEN the modal reopens
- THEN `currentStep` MUST be 0 (Step 1)

## ADDED Requirements

### Requirement: Required Field Visual Indicators

| Aspect | Requirement |
|--------|-------------|
| Fields | `macroProceso`, `descripcion`, `formato`, `propietario`, `custodio`, `ubicacion` |
| Indicator | Red asterisk (`*`) adjacent to label text, always visible |
| Color | Red (`#dc2626` or equivalent `color: red`) |
| Condition | ALWAYS shown — not conditional on validation state |

#### Scenario: Asterisks visible on Step 1 open

- GIVEN the modal is open and Step 1 is displayed
- THEN the labels for macroProceso, descripcion, formato, propietario, custodio, and ubicacion MUST each show a red asterisk (`*`)
- AND asterisks MUST remain visible regardless of whether the field is filled or empty

### Requirement: Inline Validation Error Display

When validation fails on Step 1 advancement, the system MUST display per-field visual errors (red border + inline message) on each empty required field and scroll to the first one. The generic `alert()` dialog MUST NOT appear.

| Aspect | Requirement |
|--------|-------------|
| Border color | `#dc2626` on empty fields' input/select/textarea |
| Message text | "Este campo es obligatorio" below the control |
| Message styling | Red text, small font |
| Scroll target | First empty field, smooth behavior, block center |
| Alert suppression | `alert()` MUST NOT fire on Step 1 validation failure |

#### Scenario: Multiple empty fields trigger per-field errors

- GIVEN Step 1 has campos A, B, and C empty
- WHEN user clicks "Siguiente"
- THEN all three fields MUST show red border AND "Este campo es obligatorio" message
- AND the viewport scrolls to field A

#### Scenario: No errors on fields with values

- GIVEN Step 1 has some fields empty and others filled
- WHEN user clicks "Siguiente"
- THEN filled fields MUST NOT show red border or error message

### Requirement: Error State Clearing on Revalidation

The system MUST clear all error indicators when fields are filled and the user retries advancement.

| Aspect | Requirement |
|--------|-------------|
| Clear trigger | User fills previously-empty fields and clicks "Siguiente" again |
| Clear scope | ALL error indicators (red border + inline message) for ALL fields that now have values |
| Partial clear | Fields that remain empty retain their error indicators after revalidation |

#### Scenario: All errors clear on complete fill

- GIVEN Step 1 shows inline errors on multiple empty fields
- WHEN the user fills ALL empty fields and clicks "Siguiente"
- THEN all red borders and error messages MUST disappear
- AND the system advances to Step 2

#### Scenario: Partial fill clears individual errors

- GIVEN Step 1 shows inline errors on field A (empty) and field B (empty)
- WHEN the user fills field A but leaves field B empty and clicks "Siguiente"
- THEN field A's error indicators MUST clear
- AND field B's error indicators MUST remain visible
