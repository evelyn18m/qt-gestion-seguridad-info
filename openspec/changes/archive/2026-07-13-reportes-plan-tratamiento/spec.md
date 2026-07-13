# Delta Specs: reportes-plan-tratamiento

## Domain: reporte-plan-tratamiento (NEW)

### Purpose

Read-only report listing `PlanTratamiento` records with catalog enrichment, filters, and Excel export.

### Requirements

#### Requirement: GET /reportes/plan-tratamiento Returns Enriched Rows

The system MUST expose `GET /reportes/plan-tratamiento` returning `PlanTratamientoReporteDto[]`.

| Param | Filters on |
|-------|------------|
| `q` | `descripcionActividades` OR `observaciones` |
| `tipoActivoId` | `tipoActivoId` |
| `opcionTratamientoId` | `opcionTratamientoId` |
| `estadoId` | `estadoId` |
| `plazoImplementacionId` | `plazoImplementacionId` |
| `areaFuncionalId` | `areaFuncionalId` |

**DTO fields:** `id`, `tipoActivo`, `opcionTratamiento`, `controlesImplementar`, `descripcionActividades`, `responsablesImplementacion`, `areaFuncional`, `plazoImplementacion`, `fechaInicioImplementacion`, `fechaFinImplementacion`, `horaDia`, `montoUSD`, `estado`, `observaciones`.

##### Scenario: Default request returns all rows

- GIVEN `PlanTratamiento` records exist
- WHEN `GET /reportes/plan-tratamiento` is called
- THEN response is JSON array with all DTO fields populated

##### Scenario: Filters narrow results

- GIVEN mixed plans
- WHEN `GET /reportes/plan-tratamiento?tipoActivoId=1&estadoId=2&q=migración` is called
- THEN only rows matching all filters are returned

##### Scenario: Malformed JSON falls back safely

- GIVEN a plan has `controlesImplementarId = "{bad"`
- WHEN the report is generated
- THEN that row shows `controlesImplementar = ""`
- AND no 500 error is thrown

#### Requirement: GET /reportes/plan-tratamiento/export Returns Styled Excel

The system MUST expose `GET /reportes/plan-tratamiento/export` returning `.xlsx` with the same filtered data.

##### Scenario: Export with headers and style

- GIVEN plans exist
- WHEN `GET /reportes/plan-tratamiento/export` is called
- THEN Content-Type is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- AND Content-Disposition includes `attachment; filename="plan-tratamiento-{date}.xlsx"`
- AND headers match DTO columns
- AND header row has indigo background with white bold text
- AND auto-filter is applied

##### Scenario: Export respects filters

- GIVEN `GET /reportes/plan-tratamiento/export?estadoId=1` is called
- THEN the Excel contains only rows with that estado

#### Requirement: Backend DTO and Frontend Type

The backend MUST declare `PlanTratamientoReporteDto` in `reporte-response.dto.ts`. The frontend MUST declare `PlanTratamientoReporte` in `types/api.d.ts` matching the DTO shape.

#### Requirement: Frontend Page Renders at /reportes/plan-tratamiento

The frontend MUST render a read-only page at `/reportes/plan-tratamiento` with sidebar filters and export button.

##### Scenario: Page loads with filters

- GIVEN user navigates to `/reportes/plan-tratamiento`
- WHEN the page mounts
- THEN `ReportesTabs` renders with the new tab
- AND sidebar shows filters (`q`, `tipoActivo`, `opcionTratamiento`, `estado`, `plazo`, `areaFuncional`)

##### Scenario: Excel download uses current filters

- GIVEN user clicks "Exportar Excel"
- WHEN export triggers
- THEN `/reportes/plan-tratamiento/export` is called with active filters
- AND blob downloads as `plan-tratamiento-{date}.xlsx`

## Domain: reportes-index (MODIFIED)

### Requirement: GET /reportes Returns Complete Endpoint Index

The system MUST expose `GET /reportes` returning `IndiceReporteDto` with an `endpoints` array. Each entry MUST have `ruta` and `descripcion`.
(Previously: Index listed 11 report endpoints.)

Required entries MUST include:

| ruta | descripcion |
|------|-------------|
| `GET /reportes/plan-tratamiento` | Reporte de plan de tratamiento con filtros |
| `GET /reportes/plan-tratamiento/export` | Exportación Excel del reporte de plan de tratamiento |

##### Scenario: Index includes plan-tratamiento routes

- GIVEN backend is running
- WHEN `GET /reportes` is called
- THEN `endpoints` array includes both plan-tratamiento entries

##### Scenario: Existing routes remain unchanged

- GIVEN `GET /reportes` is called
- THEN all previously existing entries are still present with original descriptions

## Domain: frontend-navigation (MODIFIED)

### Requirement: ReportesTabs Component Includes Six Report Tabs

The `ReportesTabs.vue` component MUST include six tabs. The tab order SHALL be: Valoración de Activos → Análisis de Riesgo → Evaluación de Riesgo → Tratamiento de Riesgo → Plan de Tratamiento → Mapa de Calor.
(Previously: Component had five tabs.)

##### Scenario: Six tab links render

- GIVEN user is on any `/reportes/*` page
- WHEN `ReportesTabs.vue` renders
- THEN six `<NuxtLink>` elements are present
- AND the "Plan de Tratamiento" link has `to="/reportes/plan-tratamiento"`

##### Scenario: Plan de Tratamiento tab active

- GIVEN user is on `/reportes/plan-tratamiento`
- WHEN `ReportesTabs` renders
- THEN only the "Plan de Tratamiento" tab has the `active` class
