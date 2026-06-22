# Tasks: Corrección de Evaluación de Riesgo en Modal/Form

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 320–380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Backend — Fix VA Calculation Pipeline (TDD)

- [x] 1.1 **RED**: Write test in `valoraciones.service.spec.ts` for `mapDetalleRiesgo()` with `va=1.67` — assert `evaluacionRiesgo = 1.67 × A × V` (not `3 × A × V`)
- [x] 1.2 **GREEN**: Add `va: number` param to `mapDetalleRiesgo()` signature (`valoraciones.service.ts` line 262), replace `calculateRiesgo(3, ...)` at line 325 with `calculateRiesgo(va, ...)`
- [x] 1.3 **RED**: Write test asserting `create()` looks up `impacto.valor` for `confidencialidadId`, `integridadId`, `disponibilidadId`, computes CIA average, passes to `mapDetalleRiesgo`
- [x] 1.4 **GREEN**: In `create()` and `update()`, query 3 impacto records via `prisma.impacto.findUnique`, compute `Math.round(avg*100)/100`, pass as `va` arg to `mapDetalleRiesgo()`
- [x] 1.5 **RED**: Write test for `calcularDetalleRiesgo()` — body sin `VA`, padre con CIA avg=2 → assert fallback uses 2 (not 3)
- [x] 1.6 **GREEN**: Fix `calcularDetalleRiesgo()` line 230: replace `dto.VA ?? 3` with `dto.VA ?? parentVAAvg ?? 3` — query parent impacto values, compute avg, use as fallback
- [x] 1.7 **RED**: Write test asserting `prisma.valoracionActivo.update` called with `evaluacionRiesgo`/`nivelRiesgo` = MAX of hijos after create/update
- [x] 1.8 **GREEN**: After `$transaction` in `create()` and `update()`, compute `MAX(hijos.evaluacionRiesgo)`, persist via `prisma.valoracionActivo.update({ data: { evaluacionRiesgo, nivelRiesgo } })`

## Phase 2: Backend — Recalculo Endpoint (TDD)

- [x] 2.1 **RED**: Write test for `POST /valoraciones/:id/recalcular` — mock child with VA=3 inflated value → assert recreated with real VA, inputs preserved (`riesgoId`, `amenazaIds` unchanged)
- [x] 2.2 **GREEN**: Implement `recalcular(id)` method: load VA with enrich, delete all hijos, recreate each via `mapDetalleRiesgo` with real VA in `$transaction`, persist `VA.evaluacionRiesgo`/`nivelRiesgo` as MAX. Handle 404 if not found.
- [x] 2.3 Add `@Post(':id/recalcular')` route to `valoraciones.controller.ts`, delegate to `valoracionesService.recalcular(id)`

## Phase 3: Frontend — Fix Helpers & Submit Flow

- [x] 3.1 Send `VA: ciaAverage.value` in `/calcular` body: add `VA: ciaAverage.value` to `JSON.stringify({ nivelAmenaza, nivelVulnerabilidad, nivelAmenazaControl, nivelVulnerabilidadControl, VA: ciaAverage.value })` in `submitValoracion()` at `valoracion.vue` line 364
- [x] 3.2 Unify `calcularNivelRiesgo()` in `ValoracionModal.vue` line 477 → 3 levels: `≤3→'Bajo', ≤8→'Medio', ≤27→'Alto'` (remove "Crítico", match `deriveNivelRiesgo` thresholds)
- [x] 3.3 Unify `getNivelStyle()` across 3 files: remove `.includes('critico')` branch in `valoracion.vue` line 576, `ValoracionModal.vue` line 486, `ValoracionViewModal.vue` line 48
- [x] 3.4 Unify `getMaxNivelIndex()`/`getNivelFromIndex()`: 1=BAJO, 2=MEDIO, 3=ALTO in `valoracion.vue` lines 582–594 and `ValoracionViewModal.vue` lines 54–66

## Phase 4: Verification

- [x] 4.1 Run backend tests: `docker compose exec backend npm run test` — all tests GREEN
- [ ] 4.2 Manual: open modal, set CIA=1 activo, verify Tab 3 preview shows `eval = 1×A×V`; save; verify persisted values match preview; verify no "Crítico" badge in report page, view modal, or list page
