# Tasks: Interactive Risk Heatmap (Frontend)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~145 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Foundation

- [x] 1.1 Install `apexcharts` + `vue3-apexcharts` in frontend container: `docker compose exec frontend npm install apexcharts vue3-apexcharts`
- [x] 1.2 Create `frontend/plugins/apexcharts.client.ts` — import VueApexCharts, register as global `apexchart` via `defineNuxtPlugin` (see design.md for exact code)
- [x] 1.3 Append `HeatmapCellDto` and `HeatmapSerieDto` interfaces to `frontend/types/api.d.ts` (after the Reportes section)

## Phase 2: Core Implementation

- [x] 2.1 Create `frontend/pages/reportes/mapa-calor.vue` — `<script lang="ts" setup>`, fetch `GET /reportes/heatmap` via `useApi().apiFetch` in `onMounted()`, render `<apexchart>` with chart options from design.md, handle loading/error/empty states with scoped dark-theme CSS
- [x] 2.2 Add 5th `<NuxtLink to="/reportes/mapa-calor">Mapa de Calor</NuxtLink>` to `frontend/components/ReportesTabs.vue` between Tratamiento de Riesgo and closing `</div>`

## Phase 3: Verification

- [x] 3.1 Manual smoke — navigate to `/reportes/mapa-calor`: verify 3×3 grid renders, cells show correct colors (1-2 green, 3-4 yellow, 6-9 red), asset counts visible, dark theme matches other report pages, tab navigation works
- [ ] 3.2 Manual smoke — loading indicator appears during fetch, error message shown on API failure, 3×3 grid shows zeros for empty data
