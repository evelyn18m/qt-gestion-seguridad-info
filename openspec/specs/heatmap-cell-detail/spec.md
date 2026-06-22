# heatmap-cell-detail Specification

## Purpose

Provides per-cell asset detail from the risk heatmap matrix (impacto × probabilidad). Users click any heatmap cell, view the list of information assets classified in it, and drill into each asset's full risk valuation via the existing `ValoracionViewModal`.

## Requirements

| # | Requirement | Strength | Key Scenarios |
|---|------------|----------|---------------|
| R1 | Cell Asset Query Endpoint | MUST | Valid cell, empty cell, invalid params |
| R2 | Heatmap Cell Click to Detail | MUST | Non-empty click, empty cell ignores, outside valid area |
| R3 | Asset List Display | MUST | List render, loading state, error + retry |
| R4 | Asset Detail Modal Integration | MUST | Open modal, close returns to list |

### Requirement R1: Cell Asset Query Endpoint

`GET /reportes/heatmap/cell` MUST accept query params `impacto` (1–3) and `probabilidad` (1–3), returning assets classified in that cell. Each asset SHALL include: `id`, `nombreActivo`, `macroProceso` (resolved name, fallback "Desconocido"), `nivelRiesgo`, `evaluacionRiesgo`.

#### Scenario: Valid cell with assets
- GIVEN existen activos con impacto=2 y probabilidad=1
- WHEN `GET /reportes/heatmap/cell?impacto=2&probabilidad=1`
- THEN retorna array con los campos requeridos de cada activo
- AND solo incluye activos cuya clasificación coincide con impacto y probabilidad dados

#### Scenario: Valid cell with no assets
- GIVEN no hay activos en impacto=3 y probabilidad=3
- WHEN `GET /reportes/heatmap/cell?impacto=3&probabilidad=3`
- THEN retorna array vacío (HTTP 200)

#### Scenario: Invalid parameters
- GIVEN se recibe `impacto=5` o `probabilidad=0`
- WHEN se procesa la request
- THEN HTTP 400 con mensaje indicando rango válido (1–3)

### Requirement R2: Heatmap Cell Click to Detail

The ApexCharts heatmap MUST respond to clicks via `dataPointSelection`. Clicks on cells with count > 0 SHALL trigger the cell detail fetch. Clicks on empty cells (count = 0) SHALL be ignored. Clicks outside valid cell areas SHALL be no-ops.

#### Scenario: Click non-empty cell
- GIVEN celda impacto=2, probabilidad=1 tiene conteo > 0
- WHEN usuario hace clic en esa celda
- THEN `seriesIndex` se mapea a impacto, `dataPointIndex` a probabilidad
- AND se dispara `GET /reportes/heatmap/cell` con los parámetros mapeados
- AND se muestra el panel de lista de activos

#### Scenario: Click empty cell
- GIVEN celda tiene `y === 0`
- WHEN usuario hace clic
- THEN no se ejecuta API call ni se muestra panel

#### Scenario: Click outside valid cell area
- GIVEN el evento `dataPointSelection` no porta índices válidos
- WHEN el handler evalúa el evento
- THEN termina sin efectos (early return)

### Requirement R3: Asset List Display

The asset list panel MUST show: `nombreActivo`, `macroProceso`, and `nivelRiesgo` as a color-coded badge (Bajo=#2ECC71, Medio=#F1C40F, Alto=#E74C3C). The panel SHALL include a close button. Loading and error states MUST follow the page's existing UX pattern.

#### Scenario: Panel renders asset list
- GIVEN endpoint retorna 3 activos
- WHEN respuesta se procesa
- THEN se renderiza lista con nombre, macroproceso, y badge coloreado
- AND botón "Cerrar" oculta el panel al clickearlo

#### Scenario: Loading state
- GIVEN se hizo clic en celda
- WHEN API call está en curso
- THEN panel muestra indicador de carga

#### Scenario: API error with retry
- GIVEN API call falla por error de red/servidor
- WHEN se recibe el error
- THEN panel muestra mensaje de error con botón "Reintentar"
- AND al presionar reintentar se re-ejecuta la API call

### Requirement R4: Asset Detail Modal Integration

Clicking an asset in the cell list MUST fetch `GET /valoraciones/:id` and open the existing `ValoracionViewModal` with the returned data. Closing the modal SHALL return to the cell list panel.

#### Scenario: Open asset detail from cell list
- GIVEN panel de lista muestra activos
- WHEN usuario hace clic en un activo
- THEN se llama `GET /valoraciones/:id`
- AND `ValoracionViewModal` se abre con `viewItem` poblado

#### Scenario: Modal close returns to cell list
- GIVEN modal de detalle está abierto
- WHEN usuario cierra el modal (`update:modelValue = false`)
- THEN panel de lista de activos permanece visible sin re-fetch

### Non-Functional Constraints

- La clasificación de activos en celdas (cálculo de impacto y probabilidad) SHALL residir exclusivamente en el backend — no se duplica en el frontend.
- `GET /reportes/heatmap` existente NO se modifica — su respuesta permanece idéntica.
- `ValoracionViewModal` NO se modifica — se reutiliza con `viewItem` poblado vía `GET /valoraciones/:id`.
