## Exploration: heatmap-frontend (Risk Heatmap Component)

### Current State

**Frontend** (`frontend/`): Nuxt 4.4, Vue 3.5, TypeScript. SSR globally disabled (`ssr: false` in `nuxt.config.ts`). Plain dark-theme CSS via `<style scoped>` — no Tailwind, no CSS modules. Keycloak OIDC auth via `keycloak-js`. No Pinia or state management library — all state is component-local `ref()`. No charting library installed.

**Backend**: `GET /reportes/heatmap` **already implemented** (via completed `heatmap-iso27005` change). Returns `HeatmapSerieDto[]` — a 3×3 matrix (Impacto rows × Probabilidad columns) in ApexCharts-compatible format:

```json
[
  { "name": "3. Alto",  "data": [{ "x": "1. Bajo", "y": 3 }, { "x": "2. Medio", "y": 5 }, { "x": "3. Alto", "y": 2 }] },
  { "name": "2. Medio", "data": [{ "x": "1. Bajo", "y": 1 }, { "x": "2. Medio", "y": 4 }, { "x": "3. Alto", "y": 0 }] },
  { "name": "1. Bajo",  "data": [{ "x": "1. Bajo", "y": 0 }, { "x": "2. Medio", "y": 2 }, { "x": "3. Alto", "y": 0 }] }
]
```

Impacto = `max(C.valor, I.valor, D.valor)` per asset. Assets without `probabilidadId` excluded. Always returns all 9 cells even when zero.

### Affected Areas

| File | Reason |
|------|--------|
| `frontend/package.json` | Add `apexcharts` + `vue3-apexcharts` dependencies |
| `frontend/nuxt.config.ts` | Possibly add `vue3-apexcharts` to `modules` or transpile config |
| `frontend/pages/reportes/mapa-calor.vue` | **New**. Heatmap report page — fetches `GET /reportes/heatmap` and renders chart |
| `frontend/components/ReportesTabs.vue` | Add 5th tab "Mapa de Calor" linking to `/reportes/mapa-calor` |
| `frontend/components/HeatmapChart.vue` | **New** (optional). Wraps `<apexchart>` with ApexCharts config |
| `frontend/types/api.d.ts` | Add `HeatmapCellDto`, `HeatmapSerieDto`, `HeatmapReporteDto` types |
| `frontend/plugins/apexcharts.client.ts` | **New**. Nuxt plugin to register vue3-apexcharts globally |

### Key Findings

- **Nuxt/Vue/TS versions**: Nuxt ^4.4.4, Vue ^3.5.33, TypeScript (no explicit TS dependency — Nuxt manages it)
- **Existing deps**: keycloak-js ^26.2.4, nuxt ^4.4.4, vue ^3.5.33, vue-router ^5.0.6. **No apexcharts installed**.
- **Component patterns**: All use `<script lang="ts" setup>` (Composition API), `defineProps<Props>()`, `defineEmits<{}>()`, `ref()`, `computed()`, `onMounted()`, `watch()`. No Options API anywhere.
- **API patterns**: `useApi()` composable → `apiFetch<T>(path)` proxies to native `fetch()` with Keycloak Bearer token injection via `$keycloak`. Pages call `apiFetch` in `onMounted()`.
- **SSR**: `ssr: false` globally → **no `<ClientOnly>` needed** for client-side chart libraries.
- **Styling**: All `<style scoped>` with CSS custom properties (dark theme). `.reportes-page` layout pattern: sidebar filters + main content area.
- **ReportesTabs**: 4 existing tabs with `<NuxtLink>` — adding a 5th is a one-line change.
- **Where heatmap should live**: `pages/reportes/mapa-calor.vue` following the same filter+main layout as other report pages. Route: `/reportes/mapa-calor`.
- **Testing**: Frontend has NO test runner — manual smoke test only.

### Approaches

| | Approach | Pros | Cons | Effort |
|---|----------|------|------|--------|
| **1** | **vue3-apexcharts plugin** — Install `vue3-apexcharts`, register via Nuxt plugin. `<apexchart>` component renders heatmap. | Official Vue 3 wrapper, declarative, matches backend format, clean separation (plugin + page) | Extra dependency (~30KB gzipped), Nuxt 4 compatibility to verify, dark theme config needed | **Low** |
| **2** | **ApexCharts directly (no wrapper)** — Install `apexcharts` only, use `new ApexCharts(el, options)` in `onMounted()` with `ref` template. | No Vue wrapper dependency, more control | Imperative DOM manipulation, manual cleanup in `onUnmounted`, doesn't align with Vue's declarative paradigm | Medium |
| **3** | **chart.js + chartjs-chart-matrix** — Alternative lightweight charting library. | Smaller bundle | Different API, less mature heatmap support, doesn't match backend's ApexCharts intent | High |

### Recommendation

**Approach 1: vue3-apexcharts plugin.** The backend endpoint was explicitly designed with ApexCharts heatmap format in mind (the `x`/`y` per data point structure matches `apexcharts` heatmap series format). Registering the wrapper as a Nuxt client plugin (`plugins/apexcharts.client.ts`) makes `<apexchart>` available everywhere. Since `ssr: false` is set globally, no `ClientOnly` wrapper is needed. The page component follows the established report pattern: fetch data in `onMounted()`, render in a card with sidebar context.

### Risks

- **vue3-apexcharts + Nuxt 4**: ApexCharts and its Vue wrapper are ESM packages. May need `transpile` in `nuxt.config.ts` or explicit plugin loading. Verify early.
- **Dark theme**: ApexCharts default theme is light — must configure `theme: { mode: 'dark' }` plus chart colors to match `--bg: #0f172a`.
- **Heatmap rendering**: ApexCharts heatmap uses a matrix grid, NOT an HTML table. Verify mobile responsiveness with the same media queries as the layout.
- **No frontend tests**: Verification is manual — smoke test in browser against real data.
- **Backend format confirmation**: The `HeatmapSerieDto` structure (`{ name, data: [{ x, y }] }`) maps directly to ApexCharts `series` prop for heatmap charts. Test with real API response.

### Ready for Proposal

Yes — the backend endpoint exists, the data format is ApexCharts-compatible, and the frontend pattern is well-established. The proposal should define: (1) which approach, (2) where the page lives, (3) what the chart config looks like, (4) tab navigation update.
