# Delta: Lógica de Cálculo de Riesgos — Matriz EGSI v1.4

## ADDED Requirements

### Requirement: calculateRiesgo() — Core Formula

La función `calculateRiesgo(va, nivelAmenaza, nivelVulnerabilidad)` DEBE calcular `evaluacionRiesgo = VA × nivelAmenaza × nivelVulnerabilidad` con resultado entero en rango 1–27. La función DEBE ser pura (sin side effects), exportable y testeable independientemente del servicio.

#### Scenario: BAJO riesgo (mínimo)

- GIVEN `VA = 1`, `nivelAmenaza = 1`, `nivelVulnerabilidad = 1`
- WHEN `calculateRiesgo()` se ejecuta
- THEN retorna `evaluacionRiesgo = 1`, `nivelRiesgo = "BAJO"`

#### Scenario: BAJO riesgo (borde superior, límite 3)

- GIVEN `VA = 3`, `nivelAmenaza = 1`, `nivelVulnerabilidad = 1`
- WHEN `calculateRiesgo()` se ejecuta
- THEN retorna `evaluacionRiesgo = 3`, `nivelRiesgo = "BAJO"`

#### Scenario: MEDIO riesgo (borde inferior, límite 4)

- GIVEN `VA = 1`, `nivelAmenaza = 2`, `nivelVulnerabilidad = 2`
- WHEN `calculateRiesgo()` se ejecuta
- THEN retorna `evaluacionRiesgo = 4`, `nivelRiesgo = "MEDIO"`

#### Scenario: MEDIO riesgo (borde superior, límite 8)

- GIVEN `VA = 2`, `nivelAmenaza = 2`, `nivelVulnerabilidad = 2`
- WHEN `calculateRiesgo()` se ejecuta
- THEN retorna `evaluacionRiesgo = 8`, `nivelRiesgo = "MEDIO"`

#### Scenario: ALTO riesgo (borde inferior, límite 9)

- GIVEN `VA = 1`, `nivelAmenaza = 3`, `nivelVulnerabilidad = 3`
- WHEN `calculateRiesgo()` se ejecuta
- THEN retorna `evaluacionRiesgo = 9`, `nivelRiesgo = "ALTO"`

#### Scenario: ALTO riesgo (máximo)

- GIVEN `VA = 3`, `nivelAmenaza = 3`, `nivelVulnerabilidad = 3`
- WHEN `calculateRiesgo()` se ejecuta
- THEN retorna `evaluacionRiesgo = 27`, `nivelRiesgo = "ALTO"`

### Requirement: calculateRiesgo() — metodoTratamiento Derivation

La función DEBE derivar `metodoTratamiento` según: 1–3 → "RETENER / ACEPTAR", 4–27 → "MODIFICAR / PREVENIR / COMPARTIR".

#### Scenario: BAJO riesgo usa RETENER

- GIVEN `evaluacionRiesgo = 2`
- WHEN se deriva `metodoTratamiento`
- THEN retorna `"RETENER / ACEPTAR"`

#### Scenario: MEDIO riesgo usa MODIFICAR

- GIVEN `evaluacionRiesgo = 6`
- WHEN se deriva `metodoTratamiento`
- THEN retorna `"MODIFICAR / PREVENIR / COMPARTIR"`

#### Scenario: ALTO riesgo usa MODIFICAR

- GIVEN `evaluacionRiesgo = 18`
- WHEN se deriva `metodoTratamiento`
- THEN retorna `"MODIFICAR / PREVENIR / COMPARTIR"`

### Requirement: calculateRiesgo() — tipoControl Derivation

La función DEBE derivar `tipoControl` según: 1–3 → "Monitoreo", 4–8 → "Preventivo", 9–27 → "Correctivo".

#### Scenario: BAJO riesgo usa Monitoreo

- GIVEN `evaluacionRiesgo = 2`
- WHEN se deriva `tipoControl`
- THEN retorna `"Monitoreo"`

#### Scenario: MEDIO riesgo usa Preventivo

- GIVEN `evaluacionRiesgo = 5`
- WHEN se deriva `tipoControl`
- THEN retorna `"Preventivo"`

#### Scenario: ALTO riesgo usa Correctivo

- GIVEN `evaluacionRiesgo = 12`
- WHEN se deriva `tipoControl`
- THEN retorna `"Correctivo"`

### Requirement: calculateRiesgo() — Riesgo Residual

La función DEBE calcular `riesgoResidual` como `"ACEPTABLE"` cuando `evaluacionRiesgoControl ≤ 3`, de lo contrario `"INACEPTABLE"`.

#### Scenario: Control reduce riesgo a aceptable

- GIVEN `evaluacionRiesgoControl = 2`
- WHEN se deriva `riesgoResidual`
- THEN retorna `"ACEPTABLE"`

#### Scenario: Control mantiene riesgo inaceptable

- GIVEN `evaluacionRiesgoControl = 5`
- WHEN se deriva `riesgoResidual`
- THEN retorna `"INACEPTABLE"`

### Requirement: calculateRiesgo() — Boundary Values

La función DEBE manejar correctamente todos los valores de frontera: 1, 3, 4, 8, 9, 27.

#### Scenario: Todos los inputs en mínimo (1,1,1)

- GIVEN `VA = 1`, `nivelAmenaza = 1`, `nivelVulnerabilidad = 1`
- WHEN `calculateRiesgo()` se ejecuta
- THEN `evaluacionRiesgo = 1`, `nivelRiesgo = "BAJO"`, `metodoTratamiento = "RETENER / ACEPTAR"`, `tipoControl = "Monitoreo"`

#### Scenario: Todos los inputs en máximo (3,3,3)

- GIVEN `VA = 3`, `nivelAmenaza = 3`, `nivelVulnerabilidad = 3`
- WHEN `calculateRiesgo()` se ejecuta
- THEN `evaluacionRiesgo = 27`, `nivelRiesgo = "ALTO"`, `metodoTratamiento = "MODIFICAR / PREVENIR / COMPARTIR"`, `tipoControl = "Correctivo"`

### Requirement: PATCH /detalle-riesgo/:id/calcular — Preview Endpoint

El endpoint PATCH `/detalle-riesgo/:id/calcular` DEBE recalcular los campos derivados sin persistir cambios. DEBE aceptar `VA` (opcional, default CIA promedio), `nivelAmenaza` y `nivelVulnerabilidad` en el body, y retornar todos los campos calculados.

#### Scenario: Preview con inputs válidos

- GIVEN un DetalleRiesgo existe con `id = 5`
- WHEN se llama `PATCH /detalle-riesgo/5/calcular` con `{ nivelAmenaza: 2, nivelVulnerabilidad: 2, VA: 2 }`
- THEN retorna `evaluacionRiesgo = 8`, `nivelRiesgo = "MEDIO"`, `metodoTratamiento = "MODIFICAR / PREVENIR / COMPARTIR"`, `tipoControl = "Preventivo"`

#### Scenario: Preview sin VA usa CIA promedio

- GIVEN un DetalleRiesgo existe con `valoracionActivoId` referencing a ValoracionActivo con CIA promedio = 2
- WHEN se llama `PATCH /detalle-riesgo/5/calcular` con `{ nivelAmenaza: 2, nivelVulnerabilidad: 2 }` (sin VA)
- THEN usa `VA = 2` (CIA promedio) y retorna `evaluacionRiesgo = 8`

### Requirement: TDD Mode — Unit Tests Required

El backend DEBE tener unit tests para `calculateRiesgo()` cubriendo todos los casos de frontera y escenarios de derivación antes de cualquier implementación.

#### Scenario: Tests cubren boundary values

- GIVEN Jest configurado en backend
- WHEN se ejecutan los tests de `calculo-riesgo.service.spec.ts`
- THEN cubren inputs: (1,1,1), (3,1,1), (1,2,2), (2,2,2), (1,3,3), (3,3,3)

#### Scenario: Tests cubren derivations

- GIVEN Jest configurado en backend
- WHEN se ejecutan los tests
- THEN cubren derivación de `nivelRiesgo`, `metodoTratamiento`, `tipoControl` y `riesgoResidual` para cada rango

## MODIFIED Requirements

Ninguno — el cálculo es completamente nuevo.

## REMOVED Requirements

Ninguno.
