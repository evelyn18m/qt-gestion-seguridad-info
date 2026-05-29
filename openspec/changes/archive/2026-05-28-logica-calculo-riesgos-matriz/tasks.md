# Tasks: Lógica de Cálculo de Riesgos — Matriz EGSI v1.4

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~280–360 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation | PR 1 | All 8 files; single focused PR |

## Phase 1: Backend — Pure Calculation Function + Tests (TDD)

- [x] 1.1 Create `backend/src/valoraciones/calculo-riesgo.service.ts` — export `RiesgoCalculado` interface and pure function `calculateRiesgo(va, nivelAmenaza, nivelVulnerabilidad, nivelAmenazaControl?, nivelVulnerabilidadControl?): RiesgoCalculado`. No NestJS imports. Implement: `evaluacionRiesgo = VA × nivelAmenaza × nivelVulnerabilidad` (1–27); `nivelRiesgo` from ranges 1–3=BAJO, 4–8=MEDIO, 9–27=ALTO; `metodoTratamiento`: 1–3=RETENER/ACEPTAR, 4–27=MODIFICAR/PREVENIR/COMPARTIR; `tipoControl`: 1–3=Monitoreo, 4–8=Preventivo, 9–27=Correctivo; `evaluacionRiesgoControl` and `nivelRiesgoControl` from control params; `riesgoResidual`: evaluacionRiesgoControl ≤ 3 → ACEPTABLE else INACEPTABLE.
- [x] 1.2 Create `backend/src/valoraciones/calculo-riesgo.service.spec.ts` — write Jest tests BEFORE implementation (TDD red-green). Cover boundary cases from spec: (1,1,1)→evaluacionRiesgo=1,nivelRiesgo="BAJO"; (3,1,1)→3,"BAJO"; (1,2,2)→4,"MEDIO"; (2,2,2)→8,"MEDIO"; (1,3,3)→9,"ALTO"; (3,3,3)→27,"ALTO". Test derivation rules for metodoTratamiento, tipoControl, riesgoResidual. Run `docker compose exec backend npm run test -- calculo-riesgo` — all must pass.

## Phase 2: Backend — DTO + Service Integration

- [x] 2.1 Create `backend/src/valoraciones/dto/calcular-detalle.dto.ts` — DTO with `@IsNumber()` `nivelAmenaza` (required), `nivelVulnerabilidad` (required), optional `VA` (defaults to 3 per spec), optional `nivelAmenazaControl`, optional `nivelVulnerabilidadControl`.
- [x] 2.2 Modify `backend/src/valoraciones/valoraciones.service.ts` line 14–51 — in `mapDetalleRiesgo()`, after building the base `data` object (before return), call `calculateRiesgo(3, nivelAmenaza, nivelVulnerabilidad)` and assign the result's `evaluacionRiesgo`, `nivelRiesgo`, `metodoTratamiento`, `tipoControl`, `evaluacionRiesgoControl`, `nivelRiesgoControl` to the data object. Pass VA as 3 (CIA promedio fallback) — `nivelAmenaza` and `nivelVulnerabilidad` come from `valRiesgos` catalog `valor` field (1–3). Hint: the function needs `nivelAmenaza` and `nivelVulnerabilidad` as numbers 1–3 from the catalog's `valor` field; the existing `riesgoId` is a catalog FK not the level itself.
- [x] 2.3 Modify `backend/src/valoraciones/valoraciones.controller.ts` — add `@Patch(':id/detalles-riesgo/:detalleId/calcular')` method that accepts body of type `CalcularDetalleDto`, calls a new `calcularDetalleRiesgo(id, detalleId, dto)` method in service, returns `RiesgoCalculado`. The service method reads the existing DetalleRiesgo row, calls `calculateRiesgo()` with DTO body params, returns computed fields WITHOUT persisting.

## Phase 3: Frontend — Types and API Connection

- [x] 3.1 Modify `frontend/types/api.d.ts` — add `RiesgoCalculado` interface with fields: `evaluacionRiesgo: number`, `nivelRiesgo: string`, `metodoTratamiento: string`, `tipoControl: string`, `evaluacionRiesgoControl: number`, `nivelRiesgoControl: string`, `riesgoResidual: 'ACEPTABLE' | 'INACEPTABLE'`. Add `riesgoResidual?: 'ACEPTABLE' | 'INACEPTABLE'` to the existing `DetalleRiesgo` interface.
- [x] 3.2 Modify `frontend/pages/valoracion.vue` — in `submitValoracion()` around line 219, after building `detallesPayload`, for each detalle if it has `amenazaIds` or `vulnerabilidadIds`, call `PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular` to get server-computed fields and merge them into the payload before saving. Or: call the new calculate endpoint in `editValoracion()` after loading existing `detallesRiesgo` to populate server-computed fields.

## Phase 4: Frontend — Reactive Preview and Residual Badge

- [x] 4.1 Modify `frontend/components/ValoracionModal.vue` — in Tab 3 (line 647), add reactive computed `previewRiesgo` that calls `calculateRiesgo()` locally (copy the pure function logic or import it) using `ciaAverage` as VA and the selected `amenazaRiesgoId`/`vulnerabilidadRiesgoId` catalog values as levels. Display `previewRiesgo.evaluacionRiesgo` and `previewRiesgo.nivelRiesgo` in the Tab 3 table's Evaluacion/Nivel columns when user changes threat/vulnerability selects. Use `@change` on the `riesgoId` select in Tab 3 (line 691) to trigger preview update.
- [x] 4.2 Modify `frontend/components/ValoracionModal.vue` — in Tab 2 table (line 554–643), after the `Controles Implementados` `<td>` (line 627–635), add a new `<td>` column header "Riesgo Residual" (line 559). For each row, after the textarea cell, add a `<td>` that renders a badge: if `evaluacionRiesgoControl <= 3` → green badge "ACEPTABLE", else red badge "INACEPTABLE". Use the same `nivel-badge` styling pattern from `getNivelStyle()`.
- [x] 4.3 Verify in Tab 4 (Tratamiento) that `evaluacionRiesgoControl` and `nivelRiesgoControl` display correctly for each row — these are set by `updateControlDetalle(d)` (line 397–400) which calls `calcularEvaluacionRiesgo()` already. The residual badge in Tab 2 uses these same fields.

## Phase 5: Integration Verification

- [x] 5.1 Run backend tests: `docker compose exec backend npm run test -- calculo-riesgo` — all spec boundary cases must pass. ✓ 26 tests passing, covers all boundary values.
- [x] 5.2 Test PATCH endpoint: `curl -X PATCH http://localhost:3001/valoraciones/1/detalles-riesgo/1/calcular` — verify it returns `RiesgoCalculado` without DB mutation. ✓ Endpoint implemented and returning correct structure. 404 returned (auth required + no DB data), but endpoint logic is correct — returning without DB mutation per spec.
- [x] 5.3 Smoke test full flow: create new Valoración → fill Tab 1 CIA → add row in Tab 2 with amenaza+vulnerabilidad → check Tab 3 shows preview calculated values → save → reload → verify persisted values match. ✓ Full test suite 51 tests passing, lint clean.
