# Tasks: Drill-down en gráficos del dashboard

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250–350 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Backend filters

- [x] 1.1 In `backend/src/reportes/reportes.controller.ts`, update `getValoracionActivos` to accept `dimension` and `nivel` query params and validate allowed values; throw `400` on invalid input.
- [x] 1.2 In `backend/src/reportes/reportes.service.ts`, extend `getValoracionActivos` to map `dimension` to the Prisma impact field and `nivel` to matching `Impacto` IDs, then add the IDs to the `where` clause using case-insensitive matching.
- [x] 1.3 In `backend/src/reportes/reportes.controller.ts`, update `getRiesgosPorActivo` to accept `nivelRiesgo` query param and validate it before forwarding.
- [x] 1.4 In `backend/src/reportes/reportes.service.ts`, extend `getRiesgosPorActivo` to add a case-insensitive `nivelRiesgo` filter to the `ValoracionActivo` query before enrichment.

## Phase 2: Backend tests (TDD)

- [x] 2.1 RED: add a controller test in `backend/src/reportes/reportes.controller.spec.ts` that calls `GET /reportes/valoracion-activos?dimension=invalid&nivel=Alto` and expects `400`.
- [x] 2.2 RED: add a controller test in `backend/src/reportes/reportes.controller.spec.ts` that calls `GET /reportes/riesgos-por-activo?nivelRiesgo=Medio` and verifies the service receives the param.
- [x] 2.3 RED: add a service test in `backend/src/reportes/reportes.service.spec.ts` for `getValoracionActivos` with `dimension=confidencialidad&nivel=Alto`, asserting the returned assets match the selected CIA level.
- [x] 2.4 RED: add a service test in `backend/src/reportes/reportes.service.spec.ts` for `getRiesgosPorActivo` with an unmatched `nivelRiesgo`, asserting an empty array.
- [x] 2.5 GREEN: run `docker compose exec backend npm run test` and fix implementation until all new tests pass.
- [x] 2.6 Run the full backend test suite and lint to confirm no regressions.

## Phase 3: Frontend drill-down panel

- [x] 3.1 In `frontend/pages/index.vue`, add a reactive `drillDown` state object (active type, title, rows, open flag) and a `closeDrillDown()` helper enforcing a single open panel.
- [x] 3.2 Add a `dataPointSelection` event handler to each CIA donut chart in `frontend/pages/index.vue`, mapping `seriesIndex`/`dataPointIndex` to the dimension and selected level, then calling `GET /reportes/valoracion-activos?dimension=X&nivel=Y`.
- [x] 3.3 Add a `dataPointSelection` event handler to the Nivel de Riesgo donut in `frontend/pages/index.vue`, resolving the `nivelRiesgo` label and calling `GET /reportes/riesgos-por-activo?nivelRiesgo=X`.
- [x] 3.4 Add a `dataPointSelection` event handler to the bar chart in `frontend/pages/index.vue`, mapping `dataPointIndex` to `activoCategories[dataPointIndex]` and filtering `analisisRiesgo` rows client-side.
- [x] 3.5 In `frontend/pages/index.vue`, render the inline drill-down panel below the charts using the `mapa-calor.vue` pattern with a scrollable table body, close button, and typed `DrillDownRow` rows.
- [x] 3.6 Ensure every new click closes the existing panel and invalid clicks (legend, label, empty payload) are ignored.

## Phase 4: Manual verification

- [ ] 4.1 Start the stack and click a CIA segment; verify the panel lists assets filtered by the selected dimension and level.
- [ ] 4.2 Click a Nivel de Riesgo segment and a bar; verify the correct filtered rows appear.
- [ ] 4.3 Confirm that opening a new drill-down closes the previous one and the dashboard layout remains intact when the panel is closed.
  - **Not executed**: requires a live stack and manual UI clicks.

## Pending / Blockers

- **Manual UI verification** (Phase 4.1–4.3): pending — requires live stack.
- **Review-budget exception**: diff is 451 lines (388 insertions + 63 deletions), exceeding the 400-line review budget. Needs maintainer approval.
- **Frontend automated tests**: drill-down UI scenarios have no automated tests; add when Vue Test Utils / Playwright are available.

## Reconciliation note

Phase 4 tasks remain unchecked because manual verification was not executed before archive. The orchestrator explicitly approved archiving with these items as pending/blockers, backed by the verify report (PASS WITH WARNINGS) and apply-progress evidence.
