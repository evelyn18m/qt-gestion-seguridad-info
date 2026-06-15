# Tasks: Risk Heatmap Endpoint

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Infrastructure (schema + seed + DTOs)

- [x] 1.1 Add `valor Int @default(1)` to `Probabilidad` model in `prisma/schema.prisma`
- [x] 1.2 Run migration: `docker compose exec backend npx prisma db push` (migrate dev blocked by shadow DB permissions on MariaDB; db push used per project convention)
- [x] 1.3 Update seed in `prisma/seed.ts`: change `{ nombre: 'Bajo' }` → `{ nombre: 'Bajo', valor: 1 }` (and 2, 3 for Medio, Alto)
- [x] 1.4 Run seed: `docker compose exec backend npx ts-node prisma/seed.ts` (after `prisma generate`)
- [x] 1.5 Add `HeatmapCellDto`, `HeatmapSerieDto`, `HeatmapReporteDto` to `src/reportes/dto/reporte-response.dto.ts`

## Phase 2: RED — Write failing tests

- [x] 2.1 Service spec: add `makeProbabilidad()` factory + 5 test cases in `src/reportes/reportes.service.spec.ts` (empty DB all-zero, null prob excluded, mixed counts, single asset, Prisma error → 500)
- [x] 2.2 Controller spec: add `getHeatmap` mock + 3 test cases in `src/reportes/reportes.controller.spec.ts` (200 with correct shape, index includes heatmap entry, delegates to service)

## Phase 3: GREEN — Core implementation

- [x] 3.1 Add `PROBABILIDAD_LABELS`/`IMPACTO_LABELS` constants + `getHeatmap()` method to `src/reportes/reportes.service.ts` (in-memory join approach instead of include — ValoracionActivo has no relation definitions to Impacto/Probabilidad)
- [x] 3.2 Add `@Get('heatmap')` route to `src/reportes/reportes.controller.ts` + import `HeatmapReporteDto` + add index entry

## Phase 4: VERIFY — Run tests

- [x] 4.1 Run full test suite: `docker compose exec backend npm run test` → 9 suites, 177 tests, 0 failures
- [x] 4.2 Verify all service heatmap tests (5) and controller heatmap tests (3) pass → confirmed in 177/177
- [x] 4.3 Manual smoke: `curl http://localhost:3001/reportes/heatmap` returns 401 (auth guard) — route mapped and functional; index endpoint confirmed working
