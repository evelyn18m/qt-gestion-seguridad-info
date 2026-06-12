# Reporte de Evaluación de Riesgo — Specification

> **Archived from change**: `reporte-evaluacion-riesgo` (2026-06-12)
> **Domain**: reporte-evaluacion-riesgo

## Purpose

New read-only report combining per-row CIA impact (from ValoracionActivo → Impacto catalog), resolved threat/vulnerability names, persisted `controlesArea`, `evaluacionRiesgo`, and `nivelRiesgo` from DetalleRiesgo — exposed via API and rendered on a dedicated Nuxt page.

## Requirements

### Requirement: GET /reportes/evaluacion-riesgo Returns Enriched DetalleRiesgo Rows

The system MUST expose `GET /reportes/evaluacion-riesgo` returning a JSON array of `EvaluacionRiesgoReporteDto` objects with exactly 10 typed columns.

**Query Parameters:**

| Param | Type | Filter | Default |
|-------|------|--------|---------|
| `macroProcesoId` | `number` | VA.macroProcesoId | none |
| `categoriaAmenazaId` | `string` | Amenaza.categoria match | none |
| `amenazaId` | `number` | Present in DetalleRiesgo.amenazaIds JSON | none |
| `categoriaVulnerabilidadId` | `string` | Vulnerabilidad.categoria match | none |
| `vulnerabilidadId` | `number` | Present in DetalleRiesgo.vulnerabilidadIds JSON | none |
| `nivelRiesgo` | `string` | Case-insensitive match on DetalleRiesgo.nivelRiesgo | none |
| `q` | `string` | Contains match on nombreActivo | none |

**Response DTO (EvaluacionRiesgoReporteDto):**

| # | Field | Type | Source |
|---|-------|------|--------|
| 1 | `id` | `number` | DetalleRiesgo.id |
| 2 | `nombreActivo` | `string` | ValoracionActivo.nombreActivo |
| 3 | `macroProceso` | `string` | MacroProceso.nombre |
| 4 | `confidencialidad` | `string` | VA.confidencialidadId → Impacto.nivel |
| 5 | `integridad` | `string` | VA.integridadId → Impacto.nivel |
| 6 | `disponibilidad` | `string` | VA.disponibilidadId → Impacto.nivel |
| 7 | `amenaza` | `string` | DR.amenazaIds JSON → Amenaza.nombre (comma-joined) |
| 8 | `vulnerabilidad` | `string` | DR.vulnerabilidadIds JSON → Vulnerabilidad.descripcion (comma-joined) |
| 9 | `controlesArea` | `string \| null` | DetalleRiesgo.controlesArea |
| 10 | `evaluacionRiesgo` | `number \| null` | DetalleRiesgo.evaluacionRiesgo |
| 11 | `nivelRiesgo` | `string \| null` | DetalleRiesgo.nivelRiesgo |

> NOTE: 11 fields listed; `id` is internal (used as Vue `:key`) but all 11 MAY appear in response. The 10 display columns exclude `id`.

#### Scenario: Default request returns all rows

- GIVEN DetalleRiesgo records exist with associated ValoracionActivo data
- WHEN `GET /reportes/evaluacion-riesgo` is called with no query params
- THEN response is JSON array of EvaluacionRiesgoReporteDto
- AND rows are sorted by `nombreActivo` ascending
- AND every row has all 11 fields populated (null where DB value is null)

#### Scenario: Macroproceso filter narrows results

- GIVEN DetalleRiesgo rows across multiple macroprocesos
- WHEN `GET /reportes/evaluacion-riesgo?macroProcesoId=1` is called
- THEN only rows whose ValoracionActivo.macroProcesoId = 1 are returned

#### Scenario: amenazaId filter matches JSON array

- GIVEN a DetalleRiesgo row has `amenazaIds = "[3,7]"`
- WHEN `GET /reportes/evaluacion-riesgo?amenazaId=7` is called
- THEN that row is included
- AND a row with `amenazaIds = "[3,5]"` is excluded

#### Scenario: nivelRiesgo case-insensitive filter

- GIVEN rows with `nivelRiesgo = "Alto"` and `nivelRiesgo = "Bajo"`
- WHEN `GET /reportes/evaluacion-riesgo?nivelRiesgo=alto` is called
- THEN only rows with nivelRiesgo "Alto" are returned (case-insensitive match)

#### Scenario: Text search q matches nombreActivo

- GIVEN a row with `nombreActivo = "Servidor Principal"`
- WHEN `GET /reportes/evaluacion-riesgo?q=servidor` is called
- THEN that row is included (case-insensitive contains match)

#### Scenario: Invalid macroProcesoId returns empty array

- GIVEN no ValoracionActivo has macroProcesoId = 999
- WHEN `GET /reportes/evaluacion-riesgo?macroProcesoId=999` is called
- THEN response is HTTP 200 with empty array `[]`
- AND NOT an HTTP error

#### Scenario: Malformed amenazaIds JSON is safely handled

- GIVEN a DetalleRiesgo row has corrupted `amenazaIds = "{bad"`
- WHEN `GET /reportes/evaluacion-riesgo` is called
- THEN that row still appears with `amenaza = ""` (empty string)
- AND the API does NOT throw a 500 error
- AND the malformed row is logged via `console.error`

#### Scenario: Internal server error on DB failure

- GIVEN the database connection is unavailable
- WHEN `GET /reportes/evaluacion-riesgo` is called
- THEN response is HTTP 500 with descriptive error message

---

### Requirement: GET /reportes/evaluacion-riesgo/export Returns Styled Excel File

The system MUST expose `GET /reportes/evaluacion-riesgo/export` that returns an `.xlsx` file with the same filtered data as the JSON endpoint.

#### Scenario: Excel export with default filters

- GIVEN DetalleRiesgo records exist
- WHEN `GET /reportes/evaluacion-riesgo/export` is called
- THEN response Content-Type is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- AND Content-Disposition header includes `attachment; filename="evaluacion-riesgo-{date}.xlsx"`
- AND Column headers are: `Activo, Macroproceso, Confidencialidad, Integridad, Disponibilidad, Amenaza, Vulnerabilidad, Controles de Área, Evaluación de Riesgo, Nivel de Riesgo`
- AND header row has indigo background (`#4F46E5`) with white bold text
- AND columns have auto-width (min 10, max 40 chars)
- AND auto-filter is applied to all columns

#### Scenario: Excel export respects active filters

- GIVEN `GET /reportes/evaluacion-riesgo/export?nivelRiesgo=Alto` is called
- THEN the Excel file contains only rows where nivelRiesgo = "Alto"

#### Scenario: Empty results produce valid Excel

- GIVEN no rows match filter criteria
- WHEN `GET /reportes/evaluacion-riesgo/export?macroProcesoId=999` is called
- THEN a valid .xlsx file is returned with only the header row

---

### Requirement: Risk Values Are Read from Persisted Columns (Not Recomputed)

The service MUST read `evaluacionRiesgo` and `nivelRiesgo` directly from DetalleRiesgo columns. The `calculo-riesgo.service.ts` formula SHALL NOT be invoked.

#### Scenario: Persisted values used directly

- GIVEN DetalleRiesgo row has `evaluacionRiesgo = 45.5` and `nivelRiesgo = "Medio"`
- WHEN the report endpoint is called
- THEN the response uses those exact values without re-running the risk formula

---

### Requirement: CIA Impact Resolution from Impacto Catalog

The service MUST resolve CIA impact labels by joining ValoracionActivo's `confidencialidadId`, `integridadId`, `disponibilidadId` FK columns against the Impacto catalog's `nivel` field. Resolution MUST use `Map<id, nivel>` for O(1) lookup per row.

#### Scenario: CIA labels resolved from catalog

- GIVEN ValoracionActivo has `confidencialidadId = 1` and Impacto(id=1).nivel = "Alto"
- WHEN the report is generated
- THEN the row's `confidencialidad` field is "Alto"

#### Scenario: Missing FK resolves to "Desconocido"

- GIVEN ValoracionActivo has `confidencialidadId = 999` (no matching Impacto)
- WHEN the report is generated
- THEN the row's `confidencialidad` field is "Desconocido"

---

### Requirement: Nuxt Page Renders Risk Evaluation Table at /reportes/evaluacion-riesgo

The frontend MUST render a read-only report page at `/reportes/evaluacion-riesgo` following the established pattern from `/reportes/analisis-riesgo.vue`.

#### Scenario: Page loads with sidebar and table

- GIVEN user navigates to `/reportes/evaluacion-riesgo`
- WHEN the page mounts
- THEN `ReportesTabs` component renders with three tabs
- AND a left sidebar with 7 select filters and 2 text search inputs is displayed
- AND the main area shows a table with 10 columns
- AND data is fetched via `useApi().apiFetch()`

#### Scenario: Filter changes trigger debounced refetch

- GIVEN the page is loaded with data
- WHEN user changes any filter value
- THEN a 300ms debounce timer starts
- AND after 300ms without further changes, `GET /reportes/evaluacion-riesgo` is called with new query params
- AND the table updates with filtered results

#### Scenario: Loading state while fetching

- GIVEN a fetch is in progress
- WHEN the table area renders
- THEN a spinner with "Cargando evaluación de riesgo..." is displayed
- AND the previous table data is NOT shown during loading

#### Scenario: Empty state when no results match

- GIVEN filters produce zero results
- WHEN the response is an empty array
- THEN the table area displays "No hay registros de evaluación de riesgo para los filtros seleccionados."

#### Scenario: Error state with retry

- GIVEN the backend returns an HTTP error
- WHEN the page receives the error
- THEN an error message is displayed with the error detail
- AND a "Reintentar" button is shown that re-triggers the fetch

#### Scenario: Excel download via blob

- GIVEN user clicks "Exportar Excel" button
- WHEN the export is triggered
- THEN a `fetch()` call is made to `/reportes/evaluacion-riesgo/export` with current filter params
- AND the blob is downloaded with filename `evaluacion-riesgo-{date}.xlsx`
- AND the download uses `useAuth().token` for Authorization header

#### Scenario: nivelRiesgo column shows color-coded badge

- GIVEN a row has `nivelRiesgo = "Alto"`
- WHEN the table renders
- THEN that cell displays a `nivel-alto` CSS class badge

---

### Requirement: EvaluacionRiesgoReporteDto Typed in Backend

The backend MUST define `EvaluacionRiesgoReporteDto` class in `backend/src/reportes/dto/reporte-response.dto.ts` with all fields typed.

#### Scenario: DTO exports all required fields

- GIVEN `reporte-response.dto.ts` is read
- WHEN `EvaluacionRiesgoReporteDto` is examined
- THEN it declares: `id: number`, `nombreActivo: string`, `macroProceso: string`, `confidencialidad: string`, `integridad: string`, `disponibilidad: string`, `amenaza: string`, `vulnerabilidad: string`, `controlesArea: string | null`, `evaluacionRiesgo: number | null`, `nivelRiesgo: string | null`

### Requirement: EvaluacionRiesgoReporte Interface in Frontend

The frontend MUST declare `EvaluacionRiesgoReporte` interface in `frontend/types/api.d.ts` matching the backend DTO shape. The page component MUST use `ref<EvaluacionRiesgoReporte[]>` not `ref<any>`.

#### Scenario: Frontend type matches backend DTO

- GIVEN `frontend/types/api.d.ts` is read
- WHEN `EvaluacionRiesgoReporte` interface is found
- THEN it declares all 11 fields matching `EvaluacionRiesgoReporteDto`
- AND the page component uses typed refs
