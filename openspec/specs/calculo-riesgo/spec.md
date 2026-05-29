# Delta: Backend — calculo-riesgo Service

## Purpose

Servicio puro de cálculo de riesgo según matriz EGSI v1.4. Sin side effects, exportable para testing. Integra en `DetalleRiesgoService` y expone endpoint de preview.

## ADDED Requirements

### Requirement: Pure calculateRiesgo() Function

La función `calculateRiesgo(va: number, nivelAmenaza: number, nivelVulnerabilidad: number)` DEBE ser exportada desde `calculo-riesgo.service.ts` como función pura. NO DEBE tener side effects ni dependencias de Prisma.

#### Scenario: Función pura retornable

- GIVEN se importa `calculateRiesgo` desde `calculo-riesgo.service`
- WHEN se llama con `(2, 2, 2)`
- THEN retorna objeto con `evaluacionRiesgo: 8` y sin llamado a base de datos

### Requirement: Service Integration in DetalleRiesgoService

El `DetalleRiesgoService` DEBE invocar `calculateRiesgo()` en `create()` y `update()` de cada DetalleRiesgo. Los campos calculados DEBEN persistirse: `evaluacionRiesgo`, `nivelRiesgo`, `metodoTratamiento`, `tipoControl`, `evaluacionRiesgoControl`, `nivelRiesgoControl`.

#### Scenario: Create DetalleRiesgo calcula campos

- GIVEN se crea un DetalleRiesgo con `amenazaIds = "[2]"`, `vulnerabilidadIds = "[3]"`
- WHEN se llama `DetalleRiesgoService.create()`
- THEN los campos derivados se calculan y persisten usando CIA promedio del padre

#### Scenario: Update DetalleRiesgo recalcula campos

- GIVEN un DetalleRiesgo existente con `evaluacionRiesgo = 8`
- WHEN se actualiza `nivelVulnerabilidad` a 3
- THEN `evaluacionRiesgo` y derivados se recalculan

### Requirement: PATCH /detalle-riesgo/:id/calcular Endpoint

El endpoint PATCH `/detalle-riesgo/:id/calcular` DEBE invocar `calculateRiesgo()` con los inputs del body y retornar los campos calculados sin persistir. DEBE aceptar `nivelAmenaza` (required), `nivelVulnerabilidad` (required), `VA` (optional).

#### Scenario: Preview recalcula sin persistir

- GIVEN un DetalleRiesgo existe
- WHEN se llama `PATCH /detalle-riesgo/:id/calcular`
- THEN retorna campos calculados y NO modifica la base de datos

#### Scenario: Endpoint requiere nivelAmenaza y nivelVulnerabilidad

- GIVEN se llama sin `nivelAmenaza`
- WHEN se ejecuta el endpoint
- THEN retorna error 400 con mensaje de validación

## Out of Scope

- Persistencia de `riesgoResidual` como columna (se calcula en tiempo de query/display)
- Modificación de schema Prisma (campos ya existen)
