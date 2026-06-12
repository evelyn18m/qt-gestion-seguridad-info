# Reporte de Tratamiento de Riesgo — Specification

> **Change**: reporte-tratamiento-riesgo
> **Domain**: reporte-tratamiento-riesgo (NEW)

## Purpose

New read-only report combining per-row risk treatment data from `DetalleRiesgo` enriched through the `ValoracionActivo` FK chain. Exposes 13 display columns (14 including `id`), 5 filters, text search, and Excel export — following the same 4-stage pipeline as `getEvaluacionRiesgo()`.

## Requirements

### Requirement: GET /reportes/tratamiento-riesgo Returns 14-Column Rows

The system MUST expose `GET /reportes/tratamiento-riesgo` returning a JSON array of `TratamientoRiesgoReporteDto` objects.

**Query Parameters:**

| Param | Type | Filter | Default |
|-------|------|--------|---------|
| `macroProcesoId` | `number` | VA.macroProcesoId | none |
| `tipoControlId` | `number` | DR.tipoControlId | none |
| `nivelRiesgoControl` | `string` | Case-insensitive (Alto/Medio/Bajo) | none |
| `riesgoResidual` | `string` | Case-insensitive (ACEPTABLE/INACEPTABLE) | none |
| `q` | `string` | Contains match on nombreActivo OR riesgoResidual (OR, case-insensitive) | none |

**Response DTO (TratamientoRiesgoReporteDto):**

| # | Field | Type | Source |
|---|-------|------|--------|
| 1 | `id` | `number` | DetalleRiesgo.id |
| 2 | `impacto` | `number \| null` | ValoracionActivo.impacto |
| 3 | `macroProceso` | `string` | MacroProceso.nombre |
| 4 | `nombreActivo` | `string` | ValoracionActivo.nombreActivo |
| 5 | `amenaza` | `string` | DR.amenazaIds JSON → Amenaza.nombre (comma-joined) |
| 6 | `vulnerabilidad` | `string` | DR.vulnerabilidadIds JSON → Vulnerabilidad.descripcion (comma-joined) |
| 7 | `nivelAmenaza` | `string \| null` | DR.riesgoId → Riesgo.nivel |
| 8 | `nivelVulnerabilidad` | `string \| null` | DR.vulnerabilidadRiesgoId → Riesgo.nivel |
| 9 | `metodoTratamiento` | `string \| null` | DetalleRiesgo.metodoTratamiento |
| 10 | `evaluacionRiesgoControl` | `number \| null` | DetalleRiesgo.evaluacionRiesgoControl |
| 11 | `nivelRiesgoControl` | `string \| null` | DetalleRiesgo.nivelRiesgoControl |
| 12 | `tipoControl` | `string` | DR.tipoControlId → TipoControl.nombre (batch-fetch Map) |
| 13 | `riesgoResidual` | `string \| null` | DetalleRiesgo.riesgoResidual |
| 14 | `controlesImplementar` | `string \| null` | DR.controlesImplementarId → ControlesImplementar.descripcion (Prisma include) |

#### Scenario: Default request returns all rows sorted

- GIVEN DetalleRiesgo records exist
- WHEN `GET /reportes/tratamiento-riesgo` is called with no query params
- THEN response is JSON array sorted by `nombreActivo` ascending
- AND every row has all 14 fields populated (null where DB value is null)

#### Scenario: All five filters narrow results

- GIVEN mixed DetalleRiesgo rows
- WHEN `GET /reportes/tratamiento-riesgo?macroProcesoId=1&tipoControlId=2&nivelRiesgoControl=ALTO&riesgoResidual=ACEPTABLE&q=servidor` is called
- THEN only rows matching all filters are returned

#### Scenario: nivelRiesgoControl filter is case-insensitive

- GIVEN rows with `nivelRiesgoControl = "Alto"` and `"Bajo"`
- WHEN `GET /reportes/tratamiento-riesgo?nivelRiesgoControl=alto` is called
- THEN only "Alto" rows are returned

#### Scenario: riesgoResidual filter is case-insensitive

- GIVEN rows with `riesgoResidual = "ACEPTABLE"` and `"INACEPTABLE"`
- WHEN `GET /reportes/tratamiento-riesgo?riesgoResidual=aceptable` is called
- THEN only "ACEPTABLE" rows are returned

#### Scenario: Text search q uses OR logic

- GIVEN row A with `nombreActivo = "Servidor"` (riesgoResidual="INACEPTABLE"), row B with `nombreActivo = "DB"` (riesgoResidual="ACEPTABLE")
- WHEN `GET /reportes/tratamiento-riesgo?q=server` is called
- THEN row A is included (nombreActivo match)
- AND row B is NOT included

#### Scenario: Text search q matches riesgoResidual

- GIVEN a row with `riesgoResidual = "INACEPTABLE"` and `nombreActivo = "Router"`
- WHEN `GET /reportes/tratamiento-riesgo?q=inacep` is called
- THEN that row is included (riesgoResidual match)

#### Scenario: Invalid macroProcesoId returns empty

- GIVEN no VA has macroProcesoId = 999
- WHEN `GET /reportes/tratamiento-riesgo?macroProcesoId=999` is called
- THEN response is HTTP 200 with `[]`

#### Scenario: tipoControlId resolved via batch-fetch Map

- GIVEN DR has `tipoControlId = 1` and TipoControl(id=1).nombre = "Preventivo"
- WHEN the report is generated
- THEN the row's `tipoControl` field is "Preventivo"

#### Scenario: Malformed JSON in amenazaIds is safely handled

- GIVEN a Dr has `amenazaIds = "{bad"` (corrupted JSON)
- WHEN `GET /reportes/tratamiento-riesgo` is called
- THEN that row appears with `amenaza = ""`
- AND no 500 error is thrown

#### Scenario: Internal server error on DB failure

- GIVEN database is unavailable
- WHEN `GET /reportes/tratamiento-riesgo` is called
- THEN response is HTTP 500 with descriptive message

---

### Requirement: GET /reportes/tratamiento-riesgo/export Returns Styled Excel

The system MUST expose `GET /reportes/tratamiento-riesgo/export` returning an `.xlsx` with the same filtered data.

#### Scenario: Excel export with default filters

- GIVEN DetalleRiesgo records exist
- WHEN `GET /reportes/tratamiento-riesgo/export` is called
- THEN Content-Type is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- AND Content-Disposition includes `attachment; filename="tratamiento-riesgo-{date}.xlsx"`
- AND column headers are: Impacto, Macroproceso, Nombre Activo, Amenaza, Vulnerabilidad, Nivel Amenaza, Nivel Vulnerabilidad, Método Tratamiento, Evaluación Riesgo Control, Nivel Riesgo Control, Tipo Control, Riesgo Residual, Controles a Implementar
- AND header row has indigo (`#4F46E5`) background with white bold text
- AND auto-filter applied to all columns

#### Scenario: Excel export respects active filters

- GIVEN `GET /reportes/tratamiento-riesgo/export?nivelRiesgoControl=Alto` is called
- THEN the Excel contains only rows with nivelRiesgoControl "Alto"

#### Scenario: Empty results produce valid Excel with header only

- GIVEN no rows match
- WHEN `GET /reportes/tratamiento-riesgo/export?macroProcesoId=999` is called
- THEN a valid .xlsx is returned with header row only

---

### Requirement: TratamientoRiesgoReporteDto Typed in Backend

The backend MUST define `TratamientoRiesgoReporteDto` in `backend/src/reportes/dto/reporte-response.dto.ts` with all 14 fields typed.

#### Scenario: DTO exports all fields

- GIVEN `reporte-response.dto.ts` is read
- WHEN `TratamientoRiesgoReporteDto` is examined
- THEN it declares: `id: number`, `impacto: number | null`, `macroProceso: string`, `nombreActivo: string`, `amenaza: string`, `vulnerabilidad: string`, `nivelAmenaza: string | null`, `nivelVulnerabilidad: string | null`, `metodoTratamiento: string | null`, `evaluacionRiesgoControl: number | null`, `nivelRiesgoControl: string | null`, `tipoControl: string`, `riesgoResidual: string | null`, `controlesImplementar: string | null`

### Requirement: TratamientoRiesgoReporte Interface in Frontend

The frontend MUST declare `TratamientoRiesgoReporte` in `frontend/types/api.d.ts` matching the backend DTO shape. The page MUST use `ref<TratamientoRiesgoReporte[]>`.

#### Scenario: Frontend type matches backend DTO

- GIVEN `api.d.ts` is read
- WHEN `TratamientoRiesgoReporte` is found
- THEN it declares all 14 fields matching `TratamientoRiesgoReporteDto`

---

### Requirement: Nuxt Page Renders Table at /reportes/tratamiento-riesgo

The frontend MUST render a read-only page at `/reportes/tratamiento-riesgo` following the sidebar+table pattern from `/reportes/evaluacion-riesgo.vue`.

#### Scenario: Page loads with sidebar and table

- GIVEN user navigates to `/reportes/tratamiento-riesgo`
- WHEN the page mounts
- THEN `ReportesTabs` renders with four tabs
- AND sidebar shows 5 filters (q text, macroProceso select, tipoControl select, nivelRiesgoControl select, riesgoResidual select)
- AND main area shows 13-column table via `useApi().apiFetch()`

#### Scenario: Filter changes trigger 300ms debounced refetch

- GIVEN page is loaded
- WHEN user changes any filter
- THEN 300ms debounce starts
- AND after 300ms, `GET /reportes/tratamiento-riesgo` is called with new params

#### Scenario: Loading state while fetching

- GIVEN fetch is in progress
- THEN "Cargando tratamiento de riesgo..." spinner is displayed
- AND previous data is NOT shown

#### Scenario: Empty state

- GIVEN filters produce zero results
- THEN "No hay registros de tratamiento de riesgo para los filtros seleccionados." is displayed

#### Scenario: Error state with retry

- GIVEN backend returns HTTP error
- THEN error message with detail is shown
- AND "Reintentar" button re-triggers fetch

#### Scenario: Excel download via blob

- GIVEN user clicks "Exportar Excel"
- WHEN export triggers
- THEN `fetch()` calls `/reportes/tratamiento-riesgo/export` with current filters
- AND blob downloads as `tratamiento-riesgo-{date}.xlsx` with `useAuth().token`
