# Proposal: Reporte de Evaluación de Riesgo

## Intent

New read-only report page showing per-row risk evaluation with CIA impact, threat/vulnerability levels, area controls, and calculated risk scores. Data already exists in `DetalleRiesgo` and catálogos — not yet exposed in any report endpoint.

## Scope

### In Scope
- `GET /reportes/evaluacion-riesgo` — returns 10-column enriched DetalleRiesgo rows
- `GET /reportes/evaluacion-riesgo/export` — Excel download via `xlsx-js-style`
- Frontend page at `/reportes/evaluacion-riesgo` with 7 sidebar filters + 2 text searches
- "Evaluación de Riesgo" tab in `ReportesTabs.vue`
- Typed DTO (`EvaluacionRiesgoReporteDto`) and frontend interface
- Backend unit tests for new service + controller methods

### Out of Scope
- Prisma schema changes (read-only, all columns exist)
- New catalog endpoints
- Pagination (in-memory aggregation, <10k rows)
- PDF export

## Capabilities

### New Capabilities
- `reporte-evaluacion-riesgo`: New report endpoint + page combining CIA impact, threat/vuln levels, controls, and risk scores from DetalleRiesgo

### Modified Capabilities
- `frontend-navigation`: Add "Evaluación de Riesgo" tab to `ReportesTabs.vue` (third tab alongside existing two)

## Approach

**Backend** — copy-pattern from `getAnalisisRiesgoActivos()`:
1. Resolve macroproceso FK → ValoracionActivo IDs
2. Fetch `DetalleRiesgo` rows with optional VA filter
3. Batch-fetch Impacto, Riesgo, Amenaza, Vulnerabilidad, MacroProceso, ValoracionActivo catalogs in parallel
4. Enrich in-memory: resolve CIA labels/values, amenaza/vuln levels, attach persisted `evaluacionRiesgo`/`nivelRiesgo`/`controlesArea`
5. Apply text filters (`q`, `nivelRiesgo`) post-enrichment

Risk formula is ALREADY centralized in `calculo-riesgo.service.ts` — no duplication. Values read from persisted DetalleRiesgo columns.

**Frontend** — copy-pattern from `analisis-riesgo.vue`:
- Sidebar filters: 7 selects (macroproceso, categoriaAmenaza, amenaza, categoriaVulnerabilidad, vulnerabilidad, nivelRiesgo) + search input
- 300ms debounced fetch via `useApi().apiFetch()`
- Excel export via native `fetch()` → blob download
- Color-coded `nivel-*` badges on risk columns

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/reportes/dto/reporte-response.dto.ts` | Modified | +EvaluacionRiesgoReporteDto |
| `backend/src/reportes/reportes.service.ts` | Modified | +getEvaluacionRiesgo(), +exportEvaluacionRiesgo() |
| `backend/src/reportes/reportes.controller.ts` | Modified | +2 @Get() endpoints |
| `backend/src/reportes/reportes.service.spec.ts` | Modified | Unit tests for new methods |
| `backend/src/reportes/reportes.controller.spec.ts` | Modified | Controller tests |
| `frontend/pages/reportes/evaluacion-riesgo.vue` | **New** | Report page (~350 loc) |
| `frontend/components/ReportesTabs.vue` | Modified | +1 tab link |
| `frontend/types/api.d.ts` | Modified | +EvaluacionRiesgoReporte interface |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| JSON-array FKs (`amenazaIds`, `vulnerabilidadIds`) break on malformed data | Low | `safeParseJsonArray()` helper already in service |
| CIA/riesgo catalog lookups add O(n²) if not Map-based | Low | Use `Map<id, value>` (O(1) per row), established pattern |
| `nivelRiesgo` casing mismatch (DB uses "BAJO"/"MEDIO"/"ALTO") | Low | Case-insensitive filter comparison |

## Rollback Plan

- Revert backend commits for new endpoints (controller + service methods)
- Delete `evaluacion-riesgo.vue`
- Remove tab from `ReportesTabs.vue`
- No schema or migration rollback needed (read-only)

## Dependencies

- `backend/src/valoraciones/calculo-riesgo.service.ts` (risk formula, already imported in reportes)
- `xlsx-js-style` (already in backend package.json)
- Existing catalog data (Impacto, Riesgo, Amenaza, Vulnerabilidad, MacroProceso seeded)

## Success Criteria

- [ ] `GET /reportes/evaluacion-riesgo` returns 10-column JSON with real data
- [ ] `GET /reportes/evaluacion-riesgo/export` returns valid `.xlsx` file
- [ ] 7 sidebar filters narrow results correctly
- [ ] Search fields filter by `nombreActivo` and `nivelRiesgo`
- [ ] Excel export matches on-screen table columns
- [ ] Backend unit tests pass (`npm run test`)
- [ ] Page loads at `/reportes/evaluacion-riesgo` without console errors
- [ ] Tab navigation works between the 3 report pages
