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

When the user clicks "Guardar" on Step 4, the component MUST emit the `submit` event with the structured payload for the parent to send to the API. The system MUST NOT allow submit from Steps 1–3.

(Previously: Submit via Guardar button from any step after form completion)

#### Scenario: Submit from Step 4 only

- GIVEN the user is on Step 4 (Tratamiento de Riesgo)
- WHEN they click "Guardar"
- THEN emits `submit` with payload including `valForm`, `analisisForm`, `evaluacionForm`, `tratamientoForm` and `detallesRiesgo`

#### Scenario: Submit blocked on earlier steps

- GIVEN the user is on Steps 1–3
- THEN "Guardar" button is NOT rendered
- AND the system MUST NOT emit `submit` from those steps

## REMOVED Requirements

### Requirement: Tab Navigation

(Reason: Replaced by Wizard Navigation requirement — free tab click navigation is removed; navigation is now sequential via Back/Next buttons only)