# Tasks: update-valoracion-front-and-back

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 100-180 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Frontend — Bug 1 (valTipoActivo ref declaration)

- [x] 1.1 In `frontend/pages/valoracion.vue`, add `const valTipoActivo = ref<CatalogoItem[]>([])` among the other `val*` ref declarations (~line 3-20 area)

## Phase 2: Frontend — Bug 2 (Tab 4 submit payload)

- [x] 2.1 In `submitValoracion()` body construction (~lines 374-398), add `tratamientoForm.value` fields to the body object: `metodoTratamiento`, `tipoControl`, `controlesImplementar`, `nivelAmenazaControl`, `nivelVulnerabilidadControl`
- [x] 2.2 Verify body object includes `reducirProbabilidad`, `reducirImpacto`, `quienReduce`, `fechaImplementacion`, `estadoImplementacion`, `seguimiento`, `fechaSeguimiento`, `responsable` from Tab 4

## Phase 3: Frontend — Bug 3 (View modal all tabs)

- [x] 3.1 In `viewValoracion()` function (~line 478), replace `viewItem.value = item` with `apiFetch<ValoracionActivo>(/valoraciones/${item.id})` to get enriched item with relations
- [x] 3.2 In view modal template (~lines 1157-1200), add Tab 2 "Análisis" section with data from `viewItem.detallesRiesgo`
- [x] 3.3 In view modal template, add Tab 3 "Evaluación" section with data from `viewItem.detallesRiesgo`
- [x] 3.4 In view modal template, add Tab 4 "Tratamiento" section with data from `viewItem` top-level fields (`metodoTratamiento`, `tipoControl`, etc.)

## Phase 4: Backend — Bug 4 (Transaction wrapper)

- [x] 4.1 In `backend/src/valoraciones/valoraciones.service.ts`, wrap `deleteMany` + `createMany` in `this.prisma.$transaction([...])` inside the `update()` method (~lines 91-94). Added `&& detallesRiesgo.length > 0` guard to avoid calling $transaction with empty array.

## Phase 5: Testing

- [x] 5.1 Run backend unit tests: `docker compose exec backend npm run test`
- [x] 5.2 Verify all tests pass
- [x] 5.3 All tests green (18/18)

## Implementation Order

Bug 1 → Bug 2 → Bug 3 (all frontend, sequential) → Bug 4 (backend, independent) → Testing

Rationale: Frontend bugs are independent files but sequential in risk. Backend transaction fix is isolated and can be verified with unit tests alone.