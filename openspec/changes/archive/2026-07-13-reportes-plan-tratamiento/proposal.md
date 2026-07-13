# Proposal: Reporte de Plan de Tratamiento

## Intent

Add a dedicated treatment-plan report so users can list, filter, and export `PlanTratamiento` records to Excel, following the same UX and backend patterns as the existing `tratamiento-riesgo` and `evaluacion-riesgo` reports. Today the report tabs link to a non-existent `/reportes/plan-tratamientos` route.

## Scope

### In Scope
- Backend `GET /reportes/plan-tratamiento` with filtering.
- Backend `GET /reportes/plan-tratamiento/export` styled Excel export.
- Frontend page `/reportes/plan-tratamiento` with sidebar filters and export button.
- Update `ReportesTabs.vue` link to a working route and register the route in `GET /reportes` index.
- Backend unit tests for query/export methods.

### Out of Scope
- Correlating plans with risk/asset rows (standalone plan list only; see question below).
- New catalog creation or changes to `PlanTratamiento` CRUD.
- PDF or other export formats.

## Capabilities

### New Capabilities
- `reporte-plan-tratamiento`: list and export `PlanTratamiento` records with catalog enrichment and filters.

### Modified Capabilities
- `reportes-index`: add `GET /reportes/plan-tratamiento` and `/export` entries to the index endpoint.
- `frontend-navigation`: add or fix the "Plan de Tratamiento" tab in `ReportesTabs.vue` (currently a broken stub link).

## Approach

Extend the existing `ReportesService`/`ReportesController` (Approach 1 from exploration). Reuse the established 4-stage pipeline: accept filters, build `where`, fetch `PlanTratamiento` with related catalogs via `Promise.all`, map JSON fields (`controlesImplementarId`, `responsableImplementacionId`) to labels, return DTO. Excel export uses `xlsx-js-style` with indigo header, auto-filter, and auto-width, plus `AuditService` logging. The frontend page copies the sidebar+table pattern from `tratamiento-riesgo.vue`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/reportes/reportes.service.ts` | Modified | Add `getPlanTratamiento` and `exportPlanTratamiento`. |
| `backend/src/reportes/reportes.controller.ts` | Modified | Add two new GET endpoints. |
| `backend/src/reportes/dto/reporte-response.dto.ts` | Modified | Add `PlanTratamientoReporteDto`. |
| `backend/src/reportes/reportes.service.spec.ts` | Modified | Add unit tests. |
| `frontend/pages/reportes/plan-tratamiento.vue` | New | Report page with filters and export. |
| `frontend/types/api.d.ts` | Modified | Add `PlanTratamientoReporte` interface. |
| `frontend/components/ReportesTabs.vue` | Modified | Fix route for Plan de Tratamiento tab. |
| `backend/src/reportes/dto/indice-reporte.dto.ts` usage | Modified | Register new routes in index. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| JSON parsing errors on `controlesImplementarId` / `responsableImplementacionId` | Med | Reuse existing `safeParseJsonArray` helper; default to empty string. |
| Route name mismatch between page and `ReportesTabs` | Low | Use `/reportes/plan-tratamiento` consistently and update the tab. |
| ReportesService grows larger | Med | Accept for consistency; consider refactoring only if service exceeds maintainability threshold. |
| Frontend has no test runner | High | Rely on backend unit tests and manual smoke test. |

## Rollback Plan

1. Revert commits that introduced the new service methods, controller routes, DTO, frontend page, and tab link.
2. If schema changes were made (none planned), run `npx prisma db push` after reverting schema.
3. Restart backend/frontend containers to clear compiled/bundled code.

## Dependencies

- Existing `PlanTratamiento` Prisma model and CRUD module.
- Catalog endpoints: `opciones-tratamiento`, `estados-plan-tratamiento`, `plazos-implementacion`, `areas`, `tipos-activo`, `riesgos`.
- `xlsx-js-style` library already used for Excel export.

## Success Criteria

- [ ] `GET /reportes/plan-tratamiento` returns filtered JSON with all required columns.
- [ ] `GET /reportes/plan-tratamiento/export` returns a styled `.xlsx` respecting active filters.
- [ ] Frontend page loads, filters, and exports correctly.
- [ ] `ReportesTabs.vue` links to a working route.
- [ ] Backend unit tests pass.

## Proposal Question Round

The exploration surfaced one product decision that affects scope and column design:

- **Should this report list `PlanTratamiento` records as a standalone plan list, or should it correlate/join each plan with its related risk/asset rows?**

This proposal assumes a **standalone plan list** (tipo activo, opción tratamiento, plazo, estado, responsables, controles, etc.) because that matches the user's wording "incluir en los reportes la información del plan de tratamiento" and follows the pattern of existing reports. If correlation with `DetalleRiesgo`/`ValoracionActivo` is required, the scope, DTO, filters, and tests will change significantly.
