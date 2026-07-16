# Design: Dashboard de Inicio

## Technical Approach

Transform `frontend/pages/index.vue` from a static welcome page into a live dashboard that consumes the existing `/reportes/resumen`, `/reportes/cia`, and `/reportes/riesgos-por-macroproceso` endpoints. No other modules, routes, or sidebar items are modified.

## Architecture Decisions

### Decision: Reuse existing report endpoints

**Choice**: Use `GET /reportes/resumen` for KPI cards, `GET /reportes/cia` for the CIA valuation donuts, and `GET /reportes/riesgos-por-macroproceso` for the bar chart.
**Alternatives considered**: Creating a dedicated `/dashboard` endpoint.
**Rationale**: The existing endpoints already expose the required counts and distribution data. A new endpoint would add backend work without adding value.

### Decision: Keep sidebar and other modules unchanged

**Choice**: Only modify `frontend/pages/index.vue`.
**Alternatives considered**: Redesigning the sidebar and adding placeholder routes.
**Rationale**: The user explicitly restricted the change to the Inicio module. The rest of the navigation remains untouched.

### Decision: ApexCharts with dark theme

**Choice**: Use `vue3-apexcharts` with `theme: { mode: 'dark' }`.
**Alternatives considered**: Adding another chart library.
**Rationale**: ApexCharts is already installed and used elsewhere (e.g., `/reportes/mapa-calor`). Reusing it keeps dependencies and theming consistent.

### Decision: Parallel fetch with fallback values

**Choice**: Fetch both endpoints in parallel via `Promise.all`; treat `/reportes/resumen` as critical and macroprocess data as optional.
**Alternatives considered**: Sequential fetching or a single aggregated endpoint.
**Rationale**: Parallel fetch minimizes perceived load time. The macroprocess endpoint can return an empty array gracefully, while a failed resumen triggers the error state.

## Data Flow

```
/pages/index.vue
  ├── onMounted()
  │     └── fetchDashboard()
  │           ├── useApi().apiFetch('/reportes/resumen')
  │           └── useApi().apiFetch('/reportes/riesgos-por-macroproceso')
  ├── computed KPIs (totalActivos, conRiesgo, sinRiesgo)
  ├── computed CIA donut series (confidencialidad, integridad, disponibilidad)
  └── computed bar series (riesgos por macroproceso)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/pages/index.vue` | Modify | Replace welcome banner with dashboard: KPI cards, ApexCharts donut/bar charts, loading and error states. |

## Interfaces / Contracts

No new interfaces. Reuses existing types from `frontend/types/api.d.ts`:

- `ReporteResumen` — `{ totalActivos, conRiesgo, sinRiesgo }`
- `ReporteCIA` — `{ confidencialidad: { Alto, Medio, Bajo }, integridad: { Alto, Medio, Bajo }, disponibilidad: { Alto, Medio, Bajo } }`
- `RiesgoPorMacroProceso` — `{ macroproceso, riesgosAlto, riesgosMedio, riesgosBajo }`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Dashboard renders KPIs and charts | Smoke test in Docker Compose |
| Manual | Loading and error states | Trigger via network throttling or backend stop |

## Migration / Rollout

No migration required. The change is limited to the home page content.

## Open Questions

None.
