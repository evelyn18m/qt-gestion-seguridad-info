# Exploration: Dashboard de Inicio

## Current State

The SGSI frontend is a Nuxt 4 SPA (`ssr: false`) with a single existing layout (`frontend/layouts/default.vue`) that already provides a top banner and a dark-themed sidebar. The canonical home page is `frontend/pages/index.vue` at `/`. Today it only renders a welcome banner and an empty `dashboard-grid` placeholder; it does not fetch data or display KPIs/charts.

The sidebar is already role-aware (`useAuth().tieneRol('administrador')`) and links to the main modules: Inicio, Catálogos, Valoración de Activos, Plan de Tratamiento, Parametrización/Usuarios/Roles (admin-only), Auditoría, and Reportes. The application uses ApexCharts (vue3-apexcharts) only in the `/reportes/mapa-calor` page; the rest of the report pages are table-based.

For data, the backend exposes a `GET /reportes/resumen` endpoint that returns exactly the kind of high-level counts needed for KPI cards: `totalActivos`, `conRiesgo`, `sinRiesgo`, `distribucionRiesgos`, and `distribucionControles`. Additional endpoints useful for chart sections are `GET /reportes/cia`, `GET /reportes/riesgos-por-macroproceso`, `GET /reportes/tratamiento`, and `GET /reportes/heatmap`. The frontend already has matching types in `frontend/types/api.d.ts` and the `useApi()` composable handles Bearer tokens and errors.

## Affected Areas

- `frontend/pages/index.vue` — will be transformed from a static welcome page into a data-driven dashboard with KPI cards and charts.
- `frontend/layouts/default.vue` — the sidebar navigation may need to be simplified or restructured to match the requested minimalist menu (Inicio, Inventario, Riesgos, Reportes, Configuración). Current links to Catálogos, Valoración de Activos, Plan de Tratamiento, Auditoría, and admin items may need to be grouped under these five categories.
- `frontend/assets/css/main.css` and `frontend/app.vue` — existing CSS variables and shared button/card styles can be reused; no new theme is required.
- `frontend/types/api.d.ts` — types for `ReporteResumen`, `ReporteCIA`, `ReporteTratamiento`, and `RiesgoPorMacroProceso` already exist and should be used.
- `frontend/composables/useApi.ts` — already supports authenticated fetch; dashboard will use it to call `/reportes/resumen` and related endpoints.
- `backend/src/reportes/reportes.controller.ts` and `backend/src/reportes/reportes.service.ts` — existing endpoints can feed the dashboard; no backend changes are strictly required for the first iteration.

## Approaches

### 1. Reuse Existing Layout, Redesign Sidebar

Use the current `layouts/default.vue` as-is and redesign its sidebar to match the requested five-item minimalist menu, grouping the existing modules logically.

- **Inicio** → `/`
- **Inventario** → `/valoracion` (or `/catalogos` if it represents asset inventory)
- **Riesgos** → `/plan-tratamiento` or a new risk landing page
- **Reportes** → `/reportes/valoracion-activos`
- **Configuración** → `/parametrizacion` (admin-only), with `/usuarios` and `/roles` as sub-items

Transform `pages/index.vue` into a dashboard that fetches `/reportes/resumen` and displays KPI cards plus ApexCharts sections (donut/pie for risk/control distribution, bar chart for risks by macroprocess, etc.).

- **Pros**: Minimal structural change; leverages existing auth, routing, and theming; backend endpoints are already available.
- **Cons**: Requires reconciling the user's five labels with the existing eight-plus module list; sidebar grouping decisions may affect user expectations.
- **Effort**: Medium

### 2. Create a Dedicated Dashboard Layout

Add a new `frontend/layouts/dashboard.vue` with a redesigned sidebar/header, and configure `pages/index.vue` to use it. Keep the existing `default.vue` for other modules initially.

- **Pros**: Clean separation of the new dashboard concept from legacy module navigation; easy to iterate without breaking existing pages.
- **Cons**: Introduces a second layout to maintain; may create inconsistency when users navigate from the dashboard to other modules unless the sidebar is unified later.
- **Effort**: Medium-High

### 3. Keep Sidebar Unchanged, Only Build Dashboard Content

Leave `layouts/default.vue` untouched and only populate `pages/index.vue` with KPI cards and charts. The sidebar remains the same eight-plus item menu.

- **Pros**: Lowest risk, fastest to implement; no navigation redesign needed.
- **Cons**: Does not satisfy the user's explicit request for a minimalist sidebar with the five named items.
- **Effort**: Low

## Recommendation

Adopt **Approach 1** — reuse the existing layout and redesign the sidebar to the five-item structure while building the dashboard in `pages/index.vue`. This is the best balance because the layout already exists, auth/role guards are already wired, and the backend already provides the data. The sidebar can be made conditional: the five top-level items render for all authenticated users, and "Configuración" expands to show admin-only sub-items (`/parametrizacion`, `/usuarios`, `/roles`) using the existing `tieneRol('administrador')` guard.

For the dashboard content, use the following data strategy:

1. **KPI cards (top row)**: fetch `GET /reportes/resumen` and display `totalActivos`, `conRiesgo`, `sinRiesgo`, plus derived metrics such as percentage of assets with risk and residual risk status.
2. **Charts section**: reuse ApexCharts with the dark theme already configured (`theme: { mode: 'dark' }`):
   - Donut or pie chart for `distribucionRiesgos` (Alto/Medio/Bajo).
   - Donut or pie chart for `distribucionControles` (Alto/Medio/Bajo).
   - Bar chart from `GET /reportes/riesgos-por-macroproceso` showing risk distribution by macroprocess.
   - Optional stacked bar or pie chart from `GET /reportes/tratamiento` for treatment methods and residual risk.

## Risks

- **Sidebar ambiguity**: The user's five labels (Inventario, Riesgos, Configuración) do not map one-to-one to existing modules. The mapping must be agreed upon before design/spec.
- **Data staleness**: `reportes.service.ts` currently loads full tables in memory (`findMany`) for several endpoints; adding a dashboard that calls multiple endpoints on every home-page load could increase backend load. This is acceptable for the current scale but should be monitored.
- **Chart library constraints**: ApexCharts is the only installed chart library; complex or custom visualizations may be limited compared to Chart.js or D3 alternatives.
- **No frontend tests**: The frontend has no test runner, so verification must be manual. This is consistent with the current OpenSpec config but increases regression risk for the sidebar redesign.
- **Role consistency**: Any sidebar changes must preserve the existing `tieneRol('administrador')` behavior for admin-only links; mixing the new menu with the old guard requires careful review.

## Ready for Proposal

**Yes**, but the sidebar label mapping must be confirmed with the user first. The orchestrator should ask the user to clarify:

1. Whether "Inventario" should map to `/valoracion`, `/catalogos`, or a new route.
2. Whether "Riesgos" should map to `/plan-tratamiento` or a new risk summary page.
3. Whether "Configuración" should include `/parametrizacion`, `/usuarios`, and `/roles` for admins only, or also expose some items to the `usuario` role.
4. Whether the existing Auditoría and Plan de Tratamiento links should remain in the sidebar or be absorbed under the five categories.

Once clarified, the next phase (`sdd-propose`) can define the exact scope, sidebar mapping, and KPI chart specification.
