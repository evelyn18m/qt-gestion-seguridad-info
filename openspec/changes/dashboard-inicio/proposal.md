# Proposal: Dashboard de Inicio

## Intent

The SGSI home page (`frontend/pages/index.vue`) is currently a static welcome banner with no data. This change turns it into a live dashboard so users can see the security posture at a glance as soon as they log in.

## Scope

### In Scope
- Populate `frontend/pages/index.vue` with KPI cards fed by `GET /reportes/resumen`.
- Add ApexCharts sections for CIA valuation (Confidencialidad, Integridad, Disponibilidad) and threats/vulnerabilities by asset.
- Preserve the existing sidebar and all other modules unchanged.

### Out of Scope
- Changes to `frontend/layouts/default.vue` or sidebar structure.
- New routes or placeholder pages.
- New backend endpoints or data model changes.
- New chart library; ApexCharts only.
- Frontend unit tests (no runner exists).

## Capabilities

### New Capabilities
- `dashboard-inicio`: Live home dashboard with KPI cards and charts consuming existing report endpoints.

### Modified Capabilities
- None.

## Approach

Build the dashboard directly in `pages/index.vue` using `useApi()` to call `GET /reportes/resumen`, `GET /reportes/cia`, and `GET /reportes/analisis-riesgo-activos`. Render KPI cards from the resumen payload, three CIA valuation donut charts from the CIA payload, and a grouped horizontal bar chart for threats and vulnerabilities by asset, all with the existing dark theme (`theme: { mode: 'dark' }`).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `frontend/pages/index.vue` | Modified | Static welcome replaced by KPI cards and charts. |
| `frontend/composables/useApi.ts` | Used | Existing authenticated fetch; no change. |
| `frontend/types/api.d.ts` | Used | Existing `ReporteResumen`, `ReporteCIA`, and `AnalisisRiesgoActivoReporte` types. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| No frontend tests means regressions go unnoticed. | Med | Add manual smoke-test steps to the verify phase. |
| Multiple report endpoints called on every home load. | Low | Acceptable at current scale; monitor response times. |

## Rollback Plan

1. Restore the previous `frontend/pages/index.vue` welcome banner.
2. Redeploy and confirm `/` renders the original home page.

## Dependencies

- Backend endpoints `GET /reportes/resumen`, `GET /reportes/cia`, and `GET /reportes/analisis-riesgo-activos` must remain available.
- `vue3-apexcharts` is already installed and used in `/reportes/mapa-calor`.
- `useApi()` must continue to provide authenticated fetch behavior.

## Success Criteria

- [ ] Dashboard loads `/reportes/resumen` and displays KPI cards for total assets, with risk, and without risk.
- [ ] Dashboard displays at least two ApexCharts sections (CIA valuation donuts, threats/vulnerabilities-by-asset bar chart).
- [ ] Manual smoke test passes in local Docker Compose environment.
