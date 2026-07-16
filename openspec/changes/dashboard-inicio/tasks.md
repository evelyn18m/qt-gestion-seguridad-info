# Tasks: Dashboard de Inicio

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200–250 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Dashboard page | PR 1 | Only `frontend/pages/index.vue` changes; existing endpoints reused |

## Phase 1: Dashboard Implementation

- [x] 1.1 Rewrite `frontend/pages/index.vue` to call `GET /reportes/resumen` and `GET /reportes/riesgos-por-macroproceso` in parallel via `useApi()` inside `onMounted`.
- [x] 1.2 Render three KPI cards (total assets, with risk, without risk) from `ReporteResumen`, falling back to `0` for missing fields.
- [x] 1.3 Add an ApexCharts donut chart for risk distribution using resumen data, with an empty-state label when the array is empty.
- [x] 1.4 Add an ApexCharts horizontal bar chart for `RiesgoPorMacroProceso` data, with an empty-state label when the array is empty.
- [x] 1.5 Add a loading indicator while requests are in flight and a retryable error message if the critical request fails.
- [x] 1.6 Configure every chart with `theme: { mode: 'dark' }` to match the existing dark UI.

## Phase 2: Manual Verification

- [ ] 2.1 Smoke test in Docker Compose: `/` loads the dashboard, KPI cards show numbers, and both charts render without runtime errors.
- [ ] 2.2 Smoke test: loading state displays while fetching, and the retry button re-fetches on error.
