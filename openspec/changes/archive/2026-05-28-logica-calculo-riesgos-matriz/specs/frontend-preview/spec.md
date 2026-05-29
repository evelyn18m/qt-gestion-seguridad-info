# Delta: Frontend — Reactive Risk Preview

## Purpose

Preview reactiva en Tab 3 (Evaluación de Riesgos) y badge residual en Tab 2. Muestra `evaluacionRiesgo` y `nivelRiesgo` antes de guardar, usando CIA promedio del formulario padre.

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

### Requirement: Riesgo Residual Badge in Tab 2

La tabla de análisis en Tab 2 DEBE mostrar badge `"ACEPTABLE"` o `"INACEPTABLE"` basado en `evaluacionRiesgoControl` y `nivelRiesgoControl` de cada fila.

#### Scenario: Badge muestra ACEPTABLE

- GIVEN una fila tiene `evaluacionRiesgoControl = 2`, `nivelRiesgoControl = "BAJO"`
- WHEN Tab 2 se renderiza
- THEN muestra badge verde "ACEPTABLE"

#### Scenario: Badge muestra INACEPTABLE

- GIVEN una fila tiene `evaluacionRiesgoControl = 6`, `nivelRiesgoControl = "MEDIO"`
- WHEN Tab 2 se renderiza
- THEN muestra badge rojo "INACEPTABLE"

### Requirement: Preview API Call for Exact Calculation

El frontend DEBE llamar a `PATCH /detalle-riesgo/:id/calcular` para obtener el cálculo exacto del backend cuando se necesita preview precisa (no aproximación local).

#### Scenario: Preview on blur llama API

- GIVEN usuario modifica `nivelVulnerabilidad` en Tab 3
- WHEN el campo pierde foco (blur)
- THEN se llama API de preview para obtener valores exactos

## Component Changes

| Component | Change | Description |
|-----------|--------|-------------|
| `ValoracionModal.vue` | Modified Tab 3 | Añadir preview reactiva |
| `ValoracionModal.vue` | Modified Tab 2 | Añadir badge residual |
| `pages/valoracion.vue` | Modified | Conectar API preview |
| `types/api.d.ts` | Modified | Tipos para campos calculados |

## Out of Scope

- Guardado automático sin confirmación del usuario
- Tests unitarios frontend (sin test runner)
