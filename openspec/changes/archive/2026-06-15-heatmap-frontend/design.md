# Design: Interactive Risk Heatmap (Frontend)

## Technical Approach

Register `vue3-apexcharts` as a Nuxt client plugin (`.client.ts` suffix, SSR is globally off), then build a `<script lang="ts" setup>` page at `/reportes/mapa-calor` that fetches `GET /reportes/heatmap` via `useApi().apiFetch<HeatmapSerieDto[]>()`, passes the response directly to `<apexchart>` with a fixed 3×3 color-scale config. Add a 5th tab to `ReportesTabs` and define the DTO types in `api.d.ts`.

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|----------|--------|----------|-----------|
| 1 | Chart wrapper | `<apexchart>` global component via Nuxt plugin | Dynamic import inside component | Plugin pattern matches existing `keycloak.client.ts`; global registration avoids per-page imports |
| 2 | Data fetching | `apiFetch<HeatmapSerieDto[]>('/reportes/heatmap')` in `onMounted()` | `useAsyncData`/`useFetch` | Backend response maps 1:1 to ApexCharts `series` prop; no SSR benefit since `ssr: false`; `useApi` is the established composable |
| 3 | Color scale | `ranges` on `colorScale` with `enableShades: false` | `shadeIntensity` gradient | ISO 27005 risk matrix uses discrete green/yellow/red zones; `ranges` gives exact control per cell |
| 4 | Theme | `theme: { mode: 'dark' }` on ApexCharts + scoped CSS with `var(--bg)` | Custom `chart.foreColor` + manual color overrides | ApexCharts `dark` mode handles grid/tooltip/label colors automatically; project CSS variables set the container background |
| 5 | No ClientOnly | Render `<apexchart>` directly in template | `<ClientOnly>` wrapper | `ssr: false` in nuxt.config is global — no client-only guard needed |

## Data Flow

```
GET /reportes/heatmap
  │
  ▼
[Backend] ─── HeatmapSerieDto[] (JSON)
  │  { name: "Conteo", data: [{x:"1. Bajo",y:1}, {x:"2. Medio",y:1}, ...] }
  │
  ▼
useApi().apiFetch<T[]>()
  │
  ▼
series: ref<HeatmapSerieDto[]>
  │  passed directly to ApexCharts (1:1 shape match)
  │
  ▼
<apexchart type="heatmap" :options="chartOptions" :series="series" />
  │
  ▼
DOM — 3×3 colored cells with asset counts, tooltips, dark theme
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/package.json` | Modify | Add `apexcharts` + `vue3-apexcharts` to dependencies |
| `frontend/plugins/apexcharts.client.ts` | Create | Nuxt client plugin: import VueApexCharts, register as global `apexchart` |
| `frontend/pages/reportes/mapa-calor.vue` | Create | Heatmap page: fetch data, `<apexchart>`, loading/error states, scoped dark-theme CSS |
| `frontend/components/ReportesTabs.vue` | Modify | Add 5th `<NuxtLink to="/reportes/mapa-calor">Mapa de Calor</NuxtLink>` |
| `frontend/types/api.d.ts` | Modify | Add `HeatmapCellDto` and `HeatmapSerieDto` interfaces |

## Interfaces / Contracts

```ts
// types/api.d.ts — appended after existing Reportes section
export interface HeatmapCellDto {
    x: string   // "1. Bajo" | "2. Medio" | "3. Alto"
    y: number   // cell count
}

export interface HeatmapSerieDto {
    name: string            // series label (e.g. "Conteo")
    data: HeatmapCellDto[]  // 9 cells (3×3)
}
```

**Chart options** (reactive object in `mapa-calor.vue`):

```ts
const chartOptions = {
    chart: { type: 'heatmap' as const, toolbar: { show: false }, background: 'transparent' },
    dataLabels: { enabled: true, style: { colors: ['#fff'] } },
    colors: ['#2ECC71', '#F1C40F', '#E74C3C'],
    plotOptions: {
        heatmap: {
            enableShades: false,
            colorScale: {
                ranges: [
                    { from: 1, to: 2, color: '#2ECC71', name: 'Bajo' },
                    { from: 3, to: 4, color: '#F1C40F', name: 'Medio' },
                    { from: 6, to: 9, color: '#E74C3C', name: 'Alto' },
                ],
            },
        },
    },
    xaxis: { categories: ['1. Bajo', '2. Medio', '3. Alto'], title: { text: 'Probabilidad' } },
    yaxis: { reversed: true, title: { text: 'Impacto' } },
    theme: { mode: 'dark' as const, palette: 'palette1', monochrome: { enabled: false } },
    grid: { borderColor: '#334155' },
    tooltip: { y: { title: { formatter: () => 'Activos' } } },
}
```

**Plugin** (`plugins/apexcharts.client.ts`):

```ts
import VueApexCharts from 'vue3-apexcharts'

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('apexchart', VueApexCharts)
})
```

**Dependency installation** (inside Docker container):

```bash
docker compose exec frontend npm install apexcharts vue3-apexcharts
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual smoke | 3×3 grid renders, colors match ranges, cell counts correct, dark theme applied, tab navigation works, no console errors | Browser verification at `/reportes/mapa-calor` |

No automated test runner is configured in the frontend. All verification is manual.

## Migration / Rollout

No migration required. Rollback: `git revert` removes 2 npm packages, plugin, page, restores `ReportesTabs` to 4 tabs, removes DTO types from `api.d.ts`.

## Open Questions

- None. All decisions resolved.
