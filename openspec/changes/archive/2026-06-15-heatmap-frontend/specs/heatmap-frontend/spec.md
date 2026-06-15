# heatmap-frontend Specification

> **Change**: heatmap-frontend
> **Domain**: heatmap-frontend (NEW)
> **Last updated**: 2026-06-15

## Purpose

Interactive ApexCharts 3×3 risk heatmap at `/reportes/mapa-calor`, color-coded by Impact × Probabilidad product. Matches project dark theme.

## Requirements

### Requirement: Page Route

The system MUST serve the heatmap page at `/reportes/mapa-calor`.

#### Scenario: Route renders

- GIVEN user navigates to `/reportes/mapa-calor`
- WHEN the page mounts
- THEN the page renders with dark background `--bg: #0f172a`

---

### Requirement: Data Fetching

On mount, the page MUST fetch `GET /reportes/heatmap` via `useApi()` and handle loading, empty, and error states.

#### Scenario: Successful fetch

- GIVEN backend returns `HeatmapSerieDto[]`
- WHEN the page mounts
- THEN `loading` is `true` during fetch, `false` after
- AND chart series are populated from response

#### Scenario: Loading state

- GIVEN the API request is in-flight
- WHEN the page renders
- THEN a loading indicator is displayed without the chart

#### Scenario: Error state

- GIVEN the API returns 5xx or network error
- WHEN the page mounts
- THEN an error message is shown and the chart is not rendered

#### Scenario: Empty data

- GIVEN all cells have `y: 0`
- WHEN the page mounts
- THEN a 3×3 grid renders with zeros in every cell

---

### Requirement: Heatmap Rendering

The page MUST render a 3×3 heatmap via `<apexchart>` with this config:

| Config | Value |
|--------|-------|
| `chart.type` | `'heatmap'` |
| `chart.background` | `'#0f172a'` |
| `plotOptions.heatmap.enableShades` | `false` |
| X-axis | `['1. Bajo', '2. Medio', '3. Alto']` |
| Y-axis (descending) | `3. Alto` → `2. Medio` → `1. Bajo` |

#### Scenario: 9-cell grid

- GIVEN API returns 3 series × 3 data points
- WHEN `<apexchart>` mounts
- THEN 9 colored cells are visible with count labels

#### Scenario: Solid colors

- GIVEN the chart renders
- WHEN inspecting plot options
- THEN `enableShades` is `false` (no gradient)

---

### Requirement: Risk Color Scale

Cells MUST use color ranges by Impact × Probabilidad product:

| Product | Level | Hex |
|---------|-------|-----|
| 1–2 | Bajo | `#2ECC71` |
| 3–4 | Medio | `#F1C40F` |
| 6–9 | Alto | `#E74C3C` |

#### Scenario: Green for low risk

- GIVEN Impacto=1 × Probabilidad=1
- THEN fill is `#2ECC71`

#### Scenario: Red for high risk

- GIVEN Impacto=3 × Probabilidad=3
- THEN fill is `#E74C3C`

---

### Requirement: Plugin Registration

The system MUST register `vue3-apexcharts` globally via `plugins/apexcharts.client.ts`.

#### Scenario: Global registration

- GIVEN the `.client.ts` plugin exists
- WHEN Nuxt starts
- THEN `<apexchart>` is available in all Vue templates (client-only, no SSR)

---

### Requirement: Type Definitions

`types/api.d.ts` MUST define:

- `HeatmapCellDto`: `{ x: string; y: number }`
- `HeatmapSerieDto`: `{ name: string; data: HeatmapCellDto[] }`

#### Scenario: Typed fetch compiles

- WHEN `useApi().get<HeatmapSerieDto[]>('/reportes/heatmap')` is called
- THEN TypeScript compiles without error
