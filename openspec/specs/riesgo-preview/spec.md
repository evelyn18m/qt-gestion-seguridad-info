# Delta: Frontend — Reactive Risk Preview

## Purpose

Preview reactiva en Tab 3 (Evaluación de Riesgos). Muestra `evaluacionRiesgo` y `nivelRiesgo` antes de guardar, usando CIA promedio del formulario padre.

## ADDED Requirements

### Requirement: Reactive Preview in Tab 3

El componente DEBE calcular y mostrar `evaluacionRiesgo` y `nivelRiesgo` en Tab 3 cuando `amenazaIds` o `nivelVulnerabilidad` cambian. El cálculo DEBE usar CIA promedio del formulario padre como VA.

#### Scenario: Preview actualiza al cambiar amenazaIds

- GIVEN Tab 3 está visible con `amenazaIds = "[2]"` y `nivelVulnerabilidad = 2`
- WHEN usuario añade amenaza con id = 3 (nueva `amenazaIds = "[2,3]"`)
- THEN `evaluacionRiesgo` y `nivelRiesgo` se recalculan y muestran

#### Scenario: Preview usa CIA promedio como VA

- GIVEN el formulario padre tiene `confidencialidad = 3`, `integridad = 2`, `disponibilidad = 3`
- WHEN se computa preview en Tab 3
- THEN usa `VA = 3` (promedio CIA = 8/3 ≈ 2.67, redondeado a 3)

### Requirement: Per-Row Dual Selects Render in Tab 3

Each Tab 3 table row MUST render two `<select>` elements side by side: one bound to `d.riesgoId` (amenaza nivel) and one bound to `d.vulnerabilidadRiesgoId` (vulnerabilidad nivel). Selects are independent per row — no shared state.

#### Scenario: Two selects per row in Tab 3

- GIVEN `detallesRiesgo` has 2 entries
- WHEN Tab 3 renders
- THEN row 0 has `<select v-model="detallesRiesgo[0].riesgoId">` and `<select v-model="detallesRiesgo[0].vulnerabilidadRiesgoId">`
- AND row 1 has `<select v-model="detallesRiesgo[1].riesgoId">` and `<select v-model="detallesRiesgo[1].vulnerabilidadRiesgoId">`
- AND row 0 selects do not affect row 1 values

#### Scenario: Select options populated from catalog riesgos

- GIVEN `catalogData.riesgos` contains entries with `id` and `valorRiesgo`
- WHEN a row select renders
- THEN each `<option>` has `value = riesgo.id` and label from `riesgo.nombre`
- AND `getValorRiesgo(riesgoId)` returns the associated `valorRiesgo` for calculation

### Requirement: Per-Row Preview Calculation in Tab 3

Each row MUST compute `evaluacionRiesgo` and `nivelRiesgo` via `localCalculateRiesgo(ciaAverage, getValorRiesgo(d.riesgoId), getValorRiesgo(d.vulnerabilidadRiesgoId))` and display them inline in the row, replacing any global preview.

#### Scenario: Preview updates on riesgoId change

- GIVEN a row with `d.riesgoId = 1`, `d.vulnerabilidadRiesgoId = 2`, `ciaAverage = 3`
- WHEN user changes `d.riesgoId` to option with `valorRiesgo = 2`
- THEN `localCalculateRiesgo(3, 2, 2)` is called
- AND the row's inline `evaluacionRiesgo` and `nivelRiesgo` update to reflect the new calculation

#### Scenario: Preview updates on vulnerabilidadRiesgoId change

- GIVEN a row with `d.riesgoId = 2`, `d.vulnerabilidadRiesgoId = null`, `ciaAverage = 3`
- WHEN user selects `d.vulnerabilidadRiesgoId = 2` (valorRiesgo = 2)
- THEN `localCalculateRiesgo(3, 2, 2)` is called
- AND the row's inline `evaluacionRiesgo` and `nivelRiesgo` update

#### Scenario: Both null shows placeholder

- GIVEN a row with `d.riesgoId = null` and `d.vulnerabilidadRiesgoId = null`
- WHEN `localCalculateRiesgo` is called with null values
- THEN the row shows `—` for both `evaluacionRiesgo` and `nivelRiesgo`
- AND no error is thrown

### Requirement: Per-Row Controles de Área Read-Only Display

The `controlesImplementados` field of each `DetalleRiesgo` entry MUST be displayed in its Tab 3 row. The display is read-only; Tab 3 does not provide an edit control for `controlesImplementados`.

#### Scenario: Read-only controles per row

- GIVEN a DetalleRiesgo entry has `controlesImplementados = "3 controles: firewall, IDS, backup"`
- WHEN Tab 3 renders that row
- THEN a column shows that text
- AND no `<input>` or `<textarea>` for `controlesImplementados` is rendered in Tab 3


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

### Requirement: Preview API Call for Exact Calculation

El frontend DEBE llamar a `PATCH /detalle-riesgo/:id/calcular` para obtener el cálculo exacto del backend cuando se necesita preview precisa (no aproximación local). DEBE incluir `VA` en el body. DEBE usar la respuesta para actualizar `evaluacionRiesgo` y `nivelRiesgo` del detalle — ya que el backend ahora usa VA real, los valores retornados son correctos.

#### Scenario: Preview on blur llama API con VA

- GIVEN usuario modifica `vulnerabilidadRiesgoId` en Tab 3 y `ciaAverage = 2`
- WHEN el campo pierde foco (blur)
- THEN se llama `/calcular` con body `{ nivelAmenaza, nivelVulnerabilidad, VA: 2 }`
- AND la respuesta actualiza `d.evaluacionRiesgo` y `d.nivelRiesgo`

## Component Changes

| Component | Change | Description |
|-----------|--------|-------------|
| `ValoracionModal.vue` | Modified Tab 3 | Añadir preview reactiva |
| `pages/valoracion.vue` | Modified | Conectar API preview |
| `types/api.d.ts` | Modified | Tipos para campos calculados |

## Out of Scope

- Guardado automático sin confirmación del usuario
- Tests unitarios frontend (sin test runner)
