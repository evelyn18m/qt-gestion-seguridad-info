# reporte-valoracion-activos Specification

## Purpose

Define the behavior for the **Valoración de Activos** report: a server-side filtered, searchable list of asset valuations with enriched relationship names, exposed via a new tab in the existing `/reportes` page.

## Requirements

### Requirement: Endpoint — GET /reportes/valoracion-activos

The system MUST expose a `GET /reportes/valoracion-activos` endpoint that accepts optional query parameters for filtering and full-text search.

#### Scenario: Filter by exact relation IDs

- GIVEN the user selects a macroproceso, formato, custodio, or any CIA impact level
- WHEN the frontend sends `GET /reportes/valoracion-activos?macroProcesoId=1&formatoId=2`
- THEN the response MUST contain only valuations matching all provided filters
- AND each record MUST include enriched relation names (not raw IDs)

#### Scenario: Full-text search by name or location

- GIVEN the user types a query string in the search box
- WHEN the frontend sends `GET /reportes/valoracion-activos?q=oficina`
- THEN the response MUST contain valuations where `nombreActivo` or `ubicacion` contains the query (case-insensitive, partial match)
- AND results MUST be sorted by `nombreActivo` ascending

#### Scenario: Combined filters + search

- GIVEN the user applies a dropdown filter AND a search query
- WHEN the request includes both query parameters
- THEN the response MUST apply exact filters first, then search within the filtered subset

#### Scenario: Empty result set

- GIVEN no valuations match the applied filters or search
- WHEN the endpoint returns
- THEN the response MUST return an empty array `[]` with HTTP 200
- AND the frontend MUST display an empty-state message

### Requirement: Response — Enriched ValoracionActivoReporteDto

The response MUST use a dedicated DTO that includes human-readable names for all foreign-key relations.

| Field | Source | Required in DTO |
|-------|--------|-----------------|
| id | ValoracionActivo.id | MUST |
| nombreActivo | ValoracionActivo.nombreActivo | MUST |
| ubicacion | ValoracionActivo.ubicacion | MUST |
| tipoActivo | TipoActivo.nombre | MUST |
| formato | Formato.nombre | MUST |
| macroProceso | MacroProceso.nombre | MUST |
| custodio | Custodio.nombre | MUST |
| confidencialidad | NivelCIA.nombre | MUST |
| integridad | NivelCIA.nombre | MUST |
| disponibilidad | NivelCIA.nombre | MUST |

#### Scenario: Response contains names, not IDs

- GIVEN a valuation with `tipoActivoId = 3` and `TipoActivo.nombre = "Servidor"`
- WHEN the endpoint returns the record
- THEN the DTO field `tipoActivo` MUST equal `"Servidor"`
- AND the raw `tipoActivoId` MUST NOT be exposed in the response

### Requirement: Frontend — Tab with Table, Filters, and Search

The frontend MUST add a new tab "Valoración de Activos" inside `pages/reportes.vue` with reactive filtering and debounced search.

#### Scenario: Tab renders and loads data

- GIVEN the user navigates to `/reportes`
- WHEN the user clicks the "Valoración de Activos" tab
- THEN the table MUST populate via `useApi().get('/reportes/valoracion-activos')`
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
- WHEN a new test for `GET /reportes/valoracion-activos` is added
- THEN the test MUST assert HTTP 200, response shape, and query parameter forwarding
- AND the test MUST run via `docker compose exec backend npm run test`

#### Scenario: Service test

- GIVEN the `ReportesService` test suite
- WHEN a new test for `getValoracionActivos(filters)` is added
- THEN the test MUST assert Prisma `findMany` is called with correct `where` and `include`
- AND the test MUST assert the returned array matches the DTO shape

#### Scenario: Edge case — no query parameters

- GIVEN the endpoint is called with no query params
- WHEN the service executes
- THEN the system MUST return all valuations ordered by `nombreActivo` ASC
- AND the query MUST still include all relation `include` clauses to prevent N+1

#### Scenario: Edge case — special characters in search

- GIVEN the user searches for a string containing `%` or `_`
- WHEN the query is executed
- THEN the search MUST treat these as literal characters (escaped), not SQL wildcards

## Out of Scope

- Server-side pagination (deferred until dataset > 500 records)
- Excel / PDF export
- Date-range or multi-select OR filters
- CRUD operations on valuations (existing `ValoracionesController` covers this)
- Frontend unit tests (no test runner available in frontend)
