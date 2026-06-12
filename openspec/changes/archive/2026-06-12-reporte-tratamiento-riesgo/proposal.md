# Proposal: Reporte de Tratamiento de Riesgo

## Intent

The system's existing `GET /reportes/tratamiento` returns only aggregate counts (method distribution, residual risk distribution). Users need a **row-level** table showing each `DetalleRiesgo` record with 13 columns — the same data that drives Tab 4 (Tratamiento) in the valoración modal, now queryable, filterable, and exportable.

## Scope

### In Scope
- New `GET /reportes/tratamiento-riesgo` endpoint (row-level, 13 columns)
- New `GET /reportes/tratamiento-riesgo/export` endpoint (Excel via xlsx-js-style)
- 5 dropdown filters: macroproceso, tipo de control, nivel de riesgo (control), riesgo residual, + text search (q)
- Text search searches BOTH `nombreActivo` AND `riesgoResidual` (OR logic)
- New frontend page replicating the sidebar+table layout of evaluacion-riesgo
- New tab in ReportesTabs navigation

### Out of Scope
- Modifying existing `GET /reportes/tratamiento` (aggregate summary — untouched)
- Schema changes (all columns already exist on DetalleRiesgo + ValoracionActivo)
- Adding Prisma relation for `tipoControlId` (batch-fetch approach, no migration risk)

## Capabilities

### New Capabilities
- `reporte-tratamiento-riesgo`: Row-level risk treatment report with 13-column table, 5 filters, text search, and Excel export. Data sourced from DetalleRiesgo enriched through ValoracionActivo FK chain.

### Modified Capabilities
- `reportes-index`: Add two new route entries (`tratamiento-riesgo`, `tratamiento-riesgo/export`) to the endpoint index response.

## Approach

**Single approach** — copy-adapt the 4-stage pipeline from `getEvaluacionRiesgo()` (lines 518–666):

1. **Stage 1**: Resolve `macroProcesoId` filter → `ValoracionActivo` IDs. Early return `[]` if empty.
2. **Stage 2**: Fetch `DetalleRiesgo` records (where `valoracionActivoId` in vaIds or all).
3. **Stage 3**: Batch-fetch all 7 catalogs: `ValoracionActivo`, `Riesgo`, `Amenaza`, `Vulnerabilidad`, `MacroProceso`, **`TipoControl`**, `ControlesImplementar`. Build lookup Maps.
4. **Stage 4**: `.map()` enrich each DR row → `.filter()` in-memory filters (nivelRiesgoControl, riesgoResidual, tipoControlId, text `q`) → sort by `nombreActivo` ASC → strip internal fields.

**Critical**: `tipoControlId` has NO Prisma relation — must batch-fetch `TipoControl` and join in-memory via Map. `controlesImplementar` HAS a relation, can use `include`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/reportes/dto/reporte-response.dto.ts` | Modified | Add `TratamientoRiesgoReporteDto` (13 fields + `_tipoControlId`) |
| `backend/src/reportes/reportes.service.ts` | Modified | Add `getTratamientoRiesgo()` + `exportTratamientoRiesgo()` |
| `backend/src/reportes/reportes.controller.ts` | Modified | Add 2 `@Get` routes + DTO import |
| `backend/src/reportes/reportes.service.spec.ts` | Modified | Add `describe('getTratamientoRiesgo', ...)` |
| `backend/src/reportes/reportes.controller.spec.ts` | Modified | Mock + describe blocks for new endpoints |
| `frontend/types/api.d.ts` | Modified | Add `TratamientoRiesgoReporte` interface |
| `frontend/pages/reportes/tratamiento-riesgo.vue` | New | Sidebar+table page (copy-adapted from evaluacion-riesgo) |
| `frontend/components/ReportesTabs.vue` | Modified | Add 4th tab entry |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `tipoControlId` has no Prisma relation — `include` fails silently | High | Batch-fetch `TipoControl.findMany()` + in-memory Map; verify in tests |
| `tipoControlId` is required Int — seed data might have gaps | Low | Verify seed data assigns a valid tipoControlId to every DetalleRiesgo row |
| Existing `GET /reportes/tratamiento` naming confusion with new route | Low | Distinct paths: `/tratamiento` (aggregate) vs `/tratamiento-riesgo` (row-level); no code sharing |

## Rollback Plan

Delete the two new `@Get` routes from controller (and their imports). Remove `getTratamientoRiesgo()` + `exportTratamientoRiesgo()` from service. Delete `tratamiento-riesgo.vue`. Remove tab entry from `ReportesTabs.vue`. No DB migration needed — zero schema changes.

## Dependencies

- Catalogs `tipos-control` and `macroprocesos` already exist via `GET /catalogos/` — no new catalog endpoints needed.
- Prisma adapter (mariadb) unchanged — no `db push` or migration required.

## Success Criteria

- [ ] `GET /reportes/tratamiento-riesgo` returns 13-column rows with correct FK resolution
- [ ] All 5 filters work: macroproceso, tipoControl, nivelRiesgoControl, riesgoResidual, text `q`
- [ ] Text search matches against BOTH `nombreActivo` AND `riesgoResidual` (case-insensitive OR)
- [ ] `GET /reportes/tratamiento-riesgo/export` returns `.xlsx` with indigo headers + 13 columns + auto-filter
- [ ] Backend Jest tests pass (controller + service specs)
- [ ] Frontend page renders sidebar filters + table + loading/error/empty states
- [ ] Tab appears in ReportesTabs and navigates correctly
- [ ] Existing `GET /reportes/tratamiento` (aggregate) continues working unchanged
