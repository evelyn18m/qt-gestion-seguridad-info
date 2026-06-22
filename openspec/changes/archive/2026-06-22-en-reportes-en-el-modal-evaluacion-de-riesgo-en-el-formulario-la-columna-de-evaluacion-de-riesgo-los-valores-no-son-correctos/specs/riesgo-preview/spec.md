# Delta for riesgo-preview

## ADDED Requirements

### Requirement: Frontend Envía VA en PATCH /calcular

El frontend DEBE incluir `VA: ciaAverage.value` en el body del `PATCH /detalle-riesgo/:id/calcular` al guardar una valoración. El valor DEBE ser el promedio CIA computado desde `valImpactos` del catálogo.

#### Scenario: Submit incluye VA en body

- GIVEN `ciaAverage.value = 2` y usuario guarda valoración
- WHEN `submitValoracion()` llama a `/calcular` por cada detalle
- THEN el body incluye `{ nivelAmenaza, nivelVulnerabilidad, VA: 2 }`

#### Scenario: Overwrite con respuesta correcta del backend

- GIVEN frontend envía `VA: 1.67` a `/calcular` y backend retorna `evaluacionRiesgo: 10.02`
- WHEN frontend recibe respuesta
- THEN sobrescribe `d.evaluacionRiesgo = 10.02` (ahora correcto porque VA real fue usado)

### Requirement: Frontend NivelRiesgo Unificado a 3 Niveles

Todos los helpers de clasificación de riesgo en ValoracionModal.vue, valoracion.vue y ValoracionViewModal.vue DEBEN usar exactamente 3 niveles: BAJO (evaluacion ≤ 3), MEDIO (≤ 8), ALTO (≤ 27). NO DEBE existir nivel "Crítico".

#### Scenario: calcularNivelRiesgo usa 3 niveles

- GIVEN `calcularNivelRiesgo(evaluacion)` en ValoracionModal.vue
- WHEN `evaluacion = 2` → THEN retorna "BAJO"
- WHEN `evaluacion = 5` → THEN retorna "MEDIO"
- WHEN `evaluacion = 15` → THEN retorna "ALTO"

#### Scenario: getNivelStyle sin badge Crítico

- GIVEN `getNivelStyle("BAJO")` en ValoracionViewModal.vue
- THEN retorna estilo con solo 3 opciones (bg verde/amarillo/rojo), sin referencia a "CRÍTICO"

#### Scenario: resumenEvaluacionRiesgo sin Crítico

- GIVEN `resumenEvaluacionRiesgo(detalles)` en valoracion.vue
- WHEN ningún detalle tiene evaluacionRiesgo > 27
- THEN retorna `{ maxEvaluacion: N, nivel: "ALTO" }` no "CRÍTICO"

## MODIFIED Requirements

### Requirement: Preview API Call for Exact Calculation

El frontend DEBE llamar a `PATCH /detalle-riesgo/:id/calcular` para obtener el cálculo exacto del backend cuando se necesita preview precisa (no aproximación local). DEBE incluir `VA` en el body. DEBE usar la respuesta para actualizar `evaluacionRiesgo` y `nivelRiesgo` del detalle — ya que el backend ahora usa VA real, los valores retornados son correctos.

(Previously: no enviaba `VA` en el body, causando que el backend usara fallback 3.)

#### Scenario: Preview on blur llama API con VA

- GIVEN usuario modifica `vulnerabilidadRiesgoId` en Tab 3 y `ciaAverage = 2`
- WHEN el campo pierde foco (blur)
- THEN se llama `/calcular` con body `{ nivelAmenaza, nivelVulnerabilidad, VA: 2 }`
- AND la respuesta actualiza `d.evaluacionRiesgo` y `d.nivelRiesgo`
