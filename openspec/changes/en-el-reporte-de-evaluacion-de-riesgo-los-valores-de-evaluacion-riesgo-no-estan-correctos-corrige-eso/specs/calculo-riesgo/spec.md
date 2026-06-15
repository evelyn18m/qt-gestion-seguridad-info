# Delta for calculo-riesgo

## MODIFIED Requirements

### Requirement: Service Integration in DetalleRiesgoService

El `DetalleRiesgoService` DEBE invocar `calculateRiesgo()` en `create()` y `update()` de cada DetalleRiesgo. El parámetro VA DEBE leerse de `ValoracionActivo.impacto` (promedio CIA poblado por el frontend). Si `impacto` es null, DEBE usar fallback VA=3. Los campos calculados DEBEN persistirse: `evaluacionRiesgo`, `nivelRiesgo`, `metodoTratamiento`, `tipoControl`, `evaluacionRiesgoControl`, `nivelRiesgoControl`.
(Previously: VA derivation was unspecified; implementation hardcoded VA=3.)

#### Scenario: Create DetalleRiesgo usa VA del activo padre

- GIVEN un ValoracionActivo con `impacto = 2`
- AND se crea un DetalleRiesgo con `amenazaIds = "[2]"`, `vulnerabilidadIds = "[3]"`
- WHEN se llama `DetalleRiesgoService.create()`
- THEN `evaluacionRiesgo` se calcula con VA=2 (no 3)

#### Scenario: Create DetalleRiesgo con impacto null usa fallback

- GIVEN un ValoracionActivo con `impacto = null`
- WHEN se crea un DetalleRiesgo
- THEN `evaluacionRiesgo` se calcula con VA=3

#### Scenario: Update DetalleRiesgo recalcula con VA del padre

- GIVEN un DetalleRiesgo existente con `evaluacionRiesgo = 8`
- WHEN se actualiza `nivelVulnerabilidad` a 3
- THEN `evaluacionRiesgo` y derivados se recalculan con VA del activo padre

### Requirement: PATCH /detalle-riesgo/:id/calcular Endpoint

El endpoint PATCH `/detalle-riesgo/:id/calcular` DEBE invocar `calculateRiesgo()` con los inputs del body y retornar los campos calculados sin persistir. DEBE aceptar `nivelAmenaza` (required), `nivelVulnerabilidad` (required), `VA` (optional). Si `VA` no se envía, DEBE leer `ValoracionActivo.impacto` del activo padre como VA.
(Previously: VA field was optional with no defined fallback behavior.)

#### Scenario: Preview recalcula sin persistir

- GIVEN un DetalleRiesgo existe
- WHEN se llama `PATCH /detalle-riesgo/:id/calcular`
- THEN retorna campos calculados y NO modifica la base de datos

#### Scenario: Preview usa VA del body cuando se envía

- GIVEN se envía body con `nivelAmenaza=1`, `nivelVulnerabilidad=1`, `VA=2`
- WHEN se ejecuta el endpoint
- THEN evalúa con VA=2

#### Scenario: Preview deriva VA del activo cuando no se envía

- GIVEN el activo padre tiene `impacto = 1`
- AND no se envía campo `VA` en el body
- WHEN se ejecuta el endpoint
- THEN evalúa con VA=1

#### Scenario: Endpoint requiere nivelAmenaza y nivelVulnerabilidad

- GIVEN se llama sin `nivelAmenaza`
- WHEN se ejecuta el endpoint
- THEN retorna error 400 con mensaje de validación
