# Delta for calculo-riesgo

## MODIFIED Requirements

### Requirement: Service Integration in DetalleRiesgoService

El `DetalleRiesgoService` DEBE inyectar `ParametrosService`, leer `ConfiguracionRiesgo` vía `getConfiguracion()` antes de cada llamado a `calculateRiesgo()`, y pasar config como parámetro. `mapDetalleRiesgo()` DEBE recibir `va: number` como parámetro adicional derivado del `ValoracionActivo` padre — NO DEBE hardcodear `3`. Los callers (`create()`, `update()`) DEBEN calcular VA como promedio de los valores de impacto (CIA) del catálogo `Impacto`. Los campos calculados DEBEN persistirse: `evaluacionRiesgo`, `nivelRiesgo`, `metodoTratamiento`, `tipoControl`, `evaluacionRiesgoControl`, `nivelRiesgoControl`. `ValoracionActivo.evaluacionRiesgo` y `nivelRiesgo` DEBEN persistirse como MAX de sus `DetalleRiesgo` hijos dentro de `$transaction`.

(Previously: `mapDetalleRiesgo` hardcodeaba VA=3; `ValoracionActivo.evaluacionRiesgo`/`nivelRiesgo` nunca se escribían.)

#### Scenario: Create DetalleRiesgo calcula campos con VA derivado del padre

- GIVEN se crea un DetalleRiesgo con `amenazaIds = "[2]"`, y el ValoracionActivo padre tiene `confidencialidadId=1, integridadId=2, disponibilidadId=3` con valores de impacto `Bajo(1), Medio(2), Alto(3)`
- WHEN se llama `DetalleRiesgoService.create()`
- THEN `mapDetalleRiesgo()` recibe `va = 2` (promedio CIA = 6/3)
- AND `evaluacionRiesgo = 2 × nivelAmenaza × nivelVulnerabilidad`, no `3 × ...`

#### Scenario: Update recalcula con VA del padre existente

- GIVEN un DetalleRiesgo existente con `evaluacionRiesgo = 8` y el ValoracionActivo padre tiene impacto real=1
- WHEN se actualiza `nivelVulnerabilidad` a 3
- THEN `evaluacionRiesgo` se recalcula con `va=1` (no 3)
- AND `VA.evaluacionRiesgo` se persiste como MAX de todos los hijos

#### Scenario: Persiste MAX de hijos en ValoracionActivo

- GIVEN 3 DetalleRiesgo con `evaluacionRiesgo = 4, 12, 6`
- WHEN se completa create() o update()
- THEN `ValoracionActivo.evaluacionRiesgo = 12` (MAX)
- AND `ValoracionActivo.nivelRiesgo = nivelRiesgo` del hijo con MAX

#### Scenario: Create reads config from DB

- GIVEN ConfiguracionRiesgo with riesgoBajoMax=4 stored
- WHEN DetalleRiesgoService.create() is called
- THEN calculateRiesgo() receives DB config and classifies with threshold 4

### Requirement: PATCH /detalle-riesgo/:id/calcular Endpoint

El endpoint PATCH `/detalle-riesgo/:id/calcular` DEBE invocar `calculateRiesgo()` con los inputs del body y retornar los campos calculados sin persistir. DEBE aceptar `nivelAmenaza` (required), `nivelVulnerabilidad` (required), `VA` (optional). Cuando `VA` no se provee, DEBE leer `ValoracionActivo.impacto` del padre. Solo si `impacto` es null, DEBE usar fallback 3.

SHALL accept optional `config` field in request body. When provided, preview SHALL use submitted thresholds. When omitted, SHALL use DB config.

(Previously: fallback `dto.VA ?? 3` sin consultar el padre.)

#### Scenario: Preview recalcula sin persistir

- GIVEN un DetalleRiesgo existe
- WHEN se llama `PATCH /detalle-riesgo/:id/calcular` con `{ nivelAmenaza: 2, nivelVulnerabilidad: 2 }` y el padre tiene `impacto = 2`
- THEN se usa `va = 2` (del padre), no 3
- AND retorna campos calculados sin modificar DB

#### Scenario: VA enviado en body tiene precedencia

- GIVEN body incluye `VA: 1` y el padre tiene `impacto = 2.5`
- WHEN se llama el endpoint
- THEN se usa `va = 1` (del body, no del padre)

#### Scenario: Fallback 3 solo si padre sin impacto

- GIVEN ni body incluye `VA` ni el padre tiene `impacto`
- WHEN se llama el endpoint
- THEN se usa `va = 3`

#### Scenario: Endpoint requiere nivelAmenaza y nivelVulnerabilidad

- GIVEN se llama sin `nivelAmenaza`
- WHEN se ejecuta el endpoint
- THEN retorna error 400 con mensaje de validación

#### Scenario: Preview with submitted config

- GIVEN body includes `config: { riesgoBajoMax: 6, riesgoMedioMax: 12, ... }`
- WHEN PATCH /detalle-riesgo/:id/calcular
- THEN response classifications use threshold 6 for BAJO/MEDIO boundary
