# reporte-analisis-riesgo-activos Specification

## Purpose

Define the behavior for the **Análisis de Riesgo de Activos** report: a consolidated view linking each `DetalleRiesgo` with its associated `ValoracionActivo`, enriched with human-readable threat and vulnerability names, filtered server-side and in-memory, and exposed via a new tab in the existing `/reportes` page.

## Requirements

### Requirement: Endpoint — GET /reportes/analisis-riesgo-activos

The system MUST expose a `GET /reportes/analisis-riesgo-activos` endpoint that accepts optional query parameters for filtering and full-text search.

#### Scenario: Filter by exact relation IDs

- GIVEN the user selects `macroProcesoId`, `categoriaAmenazaId`, `amenazaId`, `categoriaVulnerabilidadId`, or `vulnerabilidadId`
- WHEN the frontend sends `GET /reportes/analisis-riesgo-activos?macroProcesoId=1&amenazaId=2`
- THEN the response MUST contain only `DetalleRiesgo` records matching all provided filters
- AND each record MUST include enriched relation names (not raw IDs)

#### Scenario: Full-text search by asset, threat, or vulnerability

- GIVEN the user types a query string in the search box
- WHEN the frontend sends `GET /reportes/analisis-riesgo-activos?q=phishing`
- THEN the response MUST contain records where `nombreActivo`, `amenaza`, or `vulnerabilidad` contains the query (case-insensitive, partial match)
- AND results MUST be sorted by `nombreActivo` ascending

#### Scenario: Combined filters + search

- GIVEN the user applies a dropdown filter AND a search query
- WHEN the request includes both query parameters
- THEN the response MUST apply exact filters first, then search within the filtered subset

#### Scenario: Empty result set

- GIVEN no `DetalleRiesgo` records match the applied filters or search
- WHEN the endpoint returns
- THEN the response MUST return an empty array `[]` with HTTP 200
- AND the frontend MUST display an empty-state message

### Requirement: Response — Enriched AnalisisRiesgoActivoDto

The response MUST use a dedicated DTO that includes human-readable names for all foreign-key and JSON-array relations.

| Field | Source | Required in DTO |
|-------|--------|-----------------|
| id | DetalleRiesgo.id | MUST |
| nombreActivo | ValoracionActivo.nombreActivo | MUST |
| macroProceso | MacroProceso.nombre | MUST |
| amenaza | Amenaza.nombre (from JSON array) | MUST |
| vulnerabilidad | Vulnerabilidad.nombre (from JSON array) | MUST |
| controlesImplementados | DetalleRiesgo.controlesImplementados | MUST |
| controlesArea | DetalleRiesgo.controlesArea | MUST |

#### Scenario: Response contains names, not IDs

- GIVEN a `DetalleRiesgo` with `amenazaIds = "[3]"` and `Amenaza.nombre = "Phishing"`
- WHEN the endpoint returns the record
- THEN the DTO field `amenaza` MUST equal `"Phishing"`
- AND the raw `amenazaIds` MUST NOT be exposed in the response

#### Scenario: Multiple threats concatenated

- GIVEN a `DetalleRiesgo` with `amenazaIds = "[1,2]"`, `Amenaza[1].nombre = "Robo"`, `Amenaza[2].nombre = "Incendio"`
- WHEN the endpoint returns the record
- THEN the DTO field `amenaza` MUST equal `"Robo, Incendio"`

### Requirement: Backend — Hybrid Filtering Logic

The backend MUST apply a two-stage filter: `macroProcesoId` server-side via Prisma `where`, and threat/vulnerability filters in-memory after JSON parsing and catalog enrichment.

#### Scenario: Server-side filtering by macroproceso

- GIVEN a `macroProcesoId` filter is provided
- WHEN the service queries Prisma
- THEN the `findMany` MUST include `where: { valoracionActivo: { macroProcesoId: 1 } }` to reduce the dataset via database index

#### Scenario: In-memory filtering by amenaza/vulnerabilidad

- GIVEN a `amenazaId` or `vulnerabilidadId` filter is provided
- WHEN the service enriches the data
- THEN it MUST parse the JSON arrays, match against the catalog, and filter the in-memory array
- AND records with malformed JSON MUST be excluded gracefully

#### Scenario: Edge case — invalid JSON in amenazaIds/vulnerabilidadIds

- GIVEN a `DetalleRiesgo` record has `amenazaIds = "invalid"`
- WHEN the service attempts to parse and filter
- THEN the record MUST be skipped (or included if no filter applies) without throwing an error
- AND the error MUST be logged internally

### Requirement: Frontend — Tab with Table, Filters, and Search

The frontend MUST add a new tab "Análisis de Riesgo de Activos" inside `pages/reportes.vue` with reactive filtering and debounced search.

#### Scenario: Tab renders and loads data

- GIVEN the user navigates to `/reportes`
- WHEN the user clicks the "Análisis de Riesgo de Activos" tab
- THEN the table MUST populate via `useApi().get('/reportes/analisis-riesgo-activos')`
- AND `localhost:3001` MUST NOT be hardcoded

#### Scenario: Search debounce

- GIVEN the user types in the search input
- WHEN 300ms pass without additional keystrokes
- THEN the frontend MUST trigger a new API request with the updated `q` parameter
- AND the table MUST update without a full page reload

#### Scenario: Filter combination

- GIVEN the user selects a macroproceso from a dropdown AND types a search term
- WHEN both values are present
- THEN the frontend MUST send a single request combining both parameters
- AND the table MUST reflect the combined result

### Requirement: Testing — TDD for Backend

Before implementation, the system MUST have failing tests for the new endpoint and service method.

#### Scenario: Controller test

- GIVEN the `ReportesController` test suite
- WHEN a new test for `GET /reportes/analisis-riesgo-activos` is added
- THEN the test MUST assert HTTP 200, response shape, and query parameter forwarding
- AND the test MUST run via `docker compose exec backend npm run test`

#### Scenario: Service test

- GIVEN the `ReportesService` test suite
- WHEN a new test for `getAnalisisRiesgoActivos(filters)` is added
- THEN the test MUST assert Prisma `findMany` is called with correct `where` and `include`
- AND the test MUST assert the returned array matches the DTO shape, including concatenated names

#### Scenario: Edge case — special characters in search

- GIVEN the user searches for a string containing `%` or `_`
- WHEN the query is executed
- THEN the search MUST treat these as literal characters (escaped), not SQL wildcards

#### Scenario: Edge case — no query parameters

- GIVEN the endpoint is called with no query params
- WHEN the service executes
- THEN the system MUST return all `DetalleRiesgo` records ordered by `nombreActivo` ASC
- AND the query MUST still include all relation `include` clauses to prevent N+1

## Out of Scope

- Server-side pagination (deferred until dataset > 500 records)
- Excel / PDF export
- Modification of `amenazaIds`/`vulnerabilidadIds` storage to proper join tables
- Modification of `ValoracionesService` save logic
- Frontend unit tests (no test runner available in frontend)
- Color coding or severity indicators in the UI
