# Proposal: Interactive Risk Heatmap (Frontend)

## Intent

The backend already serves `GET /reportes/heatmap` with an ApexCharts-compatible 3×3 matrix. The frontend has no visualization. Users need an interactive heatmap to visually assess risk concentration across the Probabilidad × Impacto grid.

## Scope

### In Scope
- Install `apexcharts` + `vue3-apexcharts` npm packages
- Create `plugins/apexcharts.client.ts` (client-side plugin — SSR already disabled globally)
- Create `pages/reportes/mapa-calor.vue` — fetches heatmap data, renders ApexCharts heatmap with color-coded cells
- Add 5th tab "Mapa de Calor" to `components/ReportesTabs.vue`
- Add `HeatmapSerieDto` and `HeatmapCellDto` types to `types/api.d.ts`

### Out of Scope
- Server-side rendering (globally disabled)
- Changing backend endpoint (already implemented)
- Responsive breakpoint tuning beyond existing `--bg` dark theme variables
- Automated frontend tests (no test runner configured)
- Export/print functionality
- Filtering the heatmap by macroprocess or asset type

## Capabilities

### New Capabilities
- `heatmap-frontend`: Interactive ApexCharts 3×3 risk heatmap at `/reportes/mapa-calor` with color-coded cells (bottom-left risk scale), styled with project dark theme, consuming `GET /reportes/heatmap`.

### Modified Capabilities
- `frontend-navigation`: Add 5th "Mapa de Calor" tab to `ReportesTabs.vue` (currently specifies 4 tabs — requirement changes to 5).

## Approach

**Approach 1 from exploration: vue3-apexcharts plugin.** Backend response maps directly to ApexCharts `series` prop (`{ name, data: [{ x, y }] }`). Register via Nuxt client plugin (`.client.ts` suffix). No `<ClientOnly>` needed — `ssr: false` is global. Component uses `<script lang="ts" setup>`, fetches in `onMounted()` via `useApi().get<HeatmapSerieDto[]>('/reportes/heatmap')`, passes series to `<apexchart>`.

**Chart config**: `chart.type: 'heatmap'`, `enableShades: false`, `plotOptions.heatmap.colorScale.ranges`: 0–2 → `#2ECC71`, 3–4 → `#F1C40F`, 6–9 → `#E74C3C`. X = Probabilidad, Y = Impacto (descending). Cells show asset count.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/package.json` | Modified | Add `apexcharts`, `vue3-apexcharts` |
| `frontend/plugins/apexcharts.client.ts` | New | Register vue3-apexcharts globally |
| `frontend/pages/reportes/mapa-calor.vue` | New | Heatmap page — fetch + render |
| `frontend/components/ReportesTabs.vue` | Modified | +1 `<NuxtLink>` tab |
| `frontend/types/api.d.ts` | Modified | Add heatmap DTO types |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| vue3-apexcharts Nuxt 4 ESM compatibility | Low | Verify early; add `transpile` in nuxt.config if needed |
| ApexCharts dark theme mismatch | Low | Configure `theme: { mode: 'dark' }`; match `--bg: #0f172a` |
| Mobile overflow on 3×3 grid | Low | Use existing `.reportes-page` responsive layout pattern |
| No automated tests | Med | Manual smoke in browser; verify cell counts match known data |

## Rollback Plan

Revert via `git revert`: remove the 2 npm packages, delete the plugin and page files, restore `ReportesTabs.vue` to 4-tab version, and remove heatmap types from `api.d.ts`. No DB or backend changes.

## Dependencies

- Backend `GET /reportes/heatmap` endpoint (already live from `heatmap-iso27005` change)
- `useApi()` composable (already available from `frontend-api-consumption` change)

## Success Criteria

- [ ] `GET /reportes/heatmap` is consumed and renders a 3×3 colored heatmap
- [ ] Cells show correct asset counts per risk level
- [ ] Color scale matches: 1–2 green, 3–4 yellow, 6–9 red
- [ ] "Mapa de Calor" tab appears in ReportesTabs and navigates correctly
- [ ] No console errors on page load (plugin, component, API)
- [ ] Dark theme matches existing report pages
