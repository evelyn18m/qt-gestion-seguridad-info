# Proposal: Parametrización — Consolidated Risk View

## Intent

Users need a single-page consolidated view of ALL assets with their 4 risk dimensions (CIA, Riesgo, Riesgo con Control, Riesgo Residual). Currently this data is only visible one asset at a time via `ValoracionViewModal`. No backend changes are needed — the existing `GET /valoraciones` endpoint already returns all required data.

## Scope

### In Scope
- New `frontend/pages/parametrizacion.vue` — read-only consolidated data table
- Sidebar `NuxtLink` to `/parametrizacion` in `default.vue`
- Client-side worst-of aggregation for Riesgo Residual per asset
- Color-coded badges for risk levels (BAJO=green, MEDIO=yellow, ALTO=red, ACEPTABLE=green, INACEPTABLE=red)
- Loading, error, and empty states

### Out of Scope
- Backend changes (none needed)
- Editing/modifying data (strictly read-only)
- Export, filtering, or sorting beyond what API provides
- Pagination (current data volumes don't warrant it)

## Capabilities

### New Capabilities
- `parametrizacion-page`: Read-only consolidated data table displaying all assets with 4 risk dimensions (CIA, Riesgo, Riesgo con Control, Riesgo Residual) via `GET /valoraciones`

### Modified Capabilities
- `frontend-navigation`: Sidebar gains a new `NuxtLink` to `/parametrizacion` between "Valoración de Activos" and "Reportes"

## Approach

**Frontend-only page** consuming `GET /valoraciones`. No backend module, DTO, or endpoint created.

1. `parametrizacion.vue` calls `useApi().apiFetch<ValoracionActivo[]>('/valoraciones')` on mount
2. Client-side derives per-asset Riesgo Residual: `INACEPTABLE` if any `detallesRiesgo[]` row has `riesgoResidual === 'INACEPTABLE'`, else `ACEPTABLE`
3. Renders an HTML table with columns: Activo, Macroproceso, C, I, D (with levels), Nivel Riesgo, Nivel Riesgo Control, Riesgo Residual
4. Risk level cells use `<span>` badges with color classes matching existing `getNivelStyle()` pattern from `valoracion.vue`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/pages/parametrizacion.vue` | New | Consolidated read-only data table page |
| `frontend/layouts/default.vue` | Modified | Add sidebar `NuxtLink to="/parametrizacion"` |
| `frontend/types/api.d.ts` | None | Existing `ValoracionActivo` type covers all fields |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Residual aggregation mismatch with backend logic | Low | Worst-of logic matches `calculo-riesgo.service.ts` (evaluacionRiesgoControl > 3 → INACEPTABLE); rollback is trivial |
| Table performance with many assets | Low | Current data volumes are low; can add pagination later if needed |

## Rollback Plan

1. Delete `frontend/pages/parametrizacion.vue`
2. Remove the `NuxtLink to="/parametrizacion"` line from `frontend/layouts/default.vue`
3. No database migrations, no backend deploys — rollback is a single commit

## Dependencies

- Existing `GET /valoraciones` endpoint must be operational (no changes required)

## Success Criteria

- [ ] `/parametrizacion` page loads all assets with CIA, riesgo, riesgo control, and residual columns
- [ ] Residual risk badges show ACEPTABLE/INACEPTABLE matching `calculo-riesgo.service.ts` threshold (>3)
- [ ] Color badges match: BAJO=green, MEDIO=yellow, ALTO=red
- [ ] Sidebar link navigates to `/parametrizacion` and highlights when active
- [ ] Empty state shows a message when no valoraciones exist
- [ ] Network error shows error state with retry option
