## Exploration: Reporte de Plan de Tratamiento

### Current State
The SGSI monorepo already has a `/backend/src/reportes/` module and a set of report pages under `/frontend/pages/reportes/`. Existing reports that support filtering and Excel export are the canonical templates to copy:

- `GET /reportes/valoracion-activos` + `/export`
- `GET /reportes/analisis-riesgo-activos` + `/export`
- `GET /reportes/evaluacion-riesgo` + `/export`
- `GET /reportes/tratamiento-riesgo` + `/export`

The treatment-plan domain (`PlanTratamiento`) already exists in Prisma and has its own CRUD backend module (`/backend/src/plan-tratamiento/`) and management page (`/frontend/pages/plan-tratamiento.vue`). The report pages share a tab component (`ReportesTabs.vue`) that already contains a stub link to `/reportes/plan-tratamientos`, but the route/page does not exist yet.

### Affected Areas
- `backend/src/reportes/reportes.service.ts` — add `getPlanTratamiento` + `exportPlanTratamiento` following the existing filter/export patterns.
- `backend/src/reportes/reportes.controller.ts` — add `GET /reportes/plan-tratamiento` and `GET /reportes/plan-tratamiento/export` endpoints.
- `backend/src/reportes/dto/reporte-response.dto.ts` — add `PlanTratamientoReporteDto`.
- `backend/src/reportes/reportes.service.spec.ts` — add unit tests for the new query/export methods (strict TDD).
- `frontend/types/api.d.ts` — add `PlanTratamientoReporte` interface.
- `frontend/pages/reportes/plan-tratamiento.vue` (new) — list + filter + export page, copied from `tratamiento-riesgo.vue`/`evaluacion-riesgo.vue`.
- `frontend/components/ReportesTabs.vue` — link already points to `/reportes/plan-tratamientos`; align route name to whatever slug the new page uses.
- `frontend/composables/useCatalog.ts` (read-only) — confirm catalog keys `opciones-tratamiento`, `estados-plan-tratamiento`, `plazos-implementacion`, `areas` are available.

### Plan de Tratamiento Data Model
From `prisma/schema.prisma` (`model PlanTratamiento`):

| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | surrogate ID |
| `tipoActivoId` | Int | relation → `TipoActivo` |
| `nivelRiesgoId` | Int | relation → `Riesgo` |
| `opcionTratamientoId` | Int | relation → `OpcionTratamiento` |
| `controlesImplementarId` | String (JSON array) | IDs of `ControlesImplementar` |
| `descripcionActividades` | String | free text |
| `responsableImplementacionId` | String (JSON array) | IDs of `Area` |
| `areaFuncionalId` | Int? | relation → `Area` |
| `plazoImplementacionId` | Int? | relation → `PlazoImplementacion` |
| `fechaInicioImplementacion` | DateTime? | |
| `fechaFinImplementacion` | DateTime? | |
| `horaDia` | Int | |
| `montoUSD` | String | stored as string |
| `estadoId` | Int | relation → `EstadoPlanTratamiento` |
| `observaciones` | String? | |

Catalog endpoints already exposed via `/catalogos/:tipo`:
- `opciones-tratamiento`
- `estados-plan-tratamiento`
- `plazos-implementacion`
- `areas`
- `tipos-activo`
- `riesgos`

### Existing Patterns to Copy

**Backend query/export pattern** (`reportes.service.ts`):
1. Accept `filters: Record<string, string | undefined>`.
2. Build `where` conditions or in-memory filters.
3. Fetch `PlanTratamiento` plus related catalogs in batch (`Promise.all`).
4. Map JSON fields (`controlesImplementarId`, `responsableImplementacionId`) to human-readable labels.
5. Return DTO array.

**Backend Excel export pattern**:
- Uses `xlsx-js-style` (`XLSX_STYLE`) with header styling, auto-filter, and auto-width.
- Audit log via `AuditService.log({ accion: 'EXPORTAR', modulo: 'reportes', entidad: 'reporte', ... })`.

**Frontend pattern** (`tratamiento-riesgo.vue` / `evaluacion-riesgo.vue`):
- Sidebar filters with `q`, `<select>` catalog filters, debounced fetch via `watch`.
- `clearFilters()` resets all refs and refetches.
- `exportExcel()` builds the same query string, calls the `/export` endpoint with bearer token, and triggers a browser download.

### Auth / Permissions
- `AuthGuard` and `RolesGuard` are global `APP_GUARD`s.
- `ReportesController` has **no** `@Roles(...)` annotations, so any authenticated user can read/export reports.
- `PlanTratamientoController` mutations are restricted to `@Roles('administrador')`, but reads (`GET /plan-tratamiento`) are open to authenticated users.
- New report endpoints should follow the same convention: read/export open to authenticated users, no admin role required.

### Reusable Components / Utilities
- **Excel library**: `xlsx-js-style` in backend.
- **Filter UI pattern**: sidebar + `filters-sidebar` CSS + `filter-group`/`filter-select` classes (copy from existing report page).
- **Composables**: `useApi()` for authenticated JSON requests, `useCatalog()` for generic catalog loading.
- **Report tabs**: `ReportesTabs.vue`.

### Approaches
1. **Extend existing `ReportesService` / `ReportesController`** — add `getPlanTratamiento`/`exportPlanTratamiento` methods and endpoints.
   - Pros: Consistent with current reports; minimal routing/config changes; reuses established patterns.
   - Cons: `ReportesService` is already large (~1400 lines); another report adds more code to the same file.
   - Effort: Medium

2. **Create a dedicated `ReportePlanTratamientoModule`** — separate controller/service for plan-treatment reports.
   - Pros: Smaller, focused module; easier to test in isolation.
   - Cons: Diverges from the current convention where all reports live in `ReportesModule`; adds a new module to `AppModule`.
   - Effort: Medium-High

### Recommendation
**Approach 1** — extend the existing `ReportesService`/`ReportesController`. The user explicitly asked to include plan treatment information "en los reportes" and follow the patterns of previous reports. Keeping the new endpoint inside the existing module is the lowest-friction path and matches the established architecture.

### Risks
- `PlanTratamiento.controlesImplementarId` and `responsableImplementacionId` are stored as JSON strings; parsing errors must be handled gracefully (copy `safeParseJsonArray`).
- `PlanTratamiento` is **not** directly linked to `ValoracionActivo`/`DetalleRiesgo`, so the report will be a standalone list of plans, not a join with risk rows. Clarify with the user if they expect correlation with risk data.
- No frontend test runner exists; verification must rely on backend unit tests and manual smoke testing.
- `ReportesTabs.vue` currently links to `/reportes/plan-tratamientos` (plural). The new page path should be decided now to avoid a broken route.

### Ready for Proposal
**Yes**, with one clarification needed: should the report list the `PlanTratamiento` records as a standalone report (tipo activo, opción tratamiento, plazo, estado, responsables, etc.), or should it correlate/join each plan with its related risk/asset rows? Once that is confirmed, the next phase (`sdd-propose`) can define scope and acceptance criteria.
