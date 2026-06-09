# Tasks: Tipo de Control obligatorio en Pestaña 4

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100 (8 files, ~14 atomic edits) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Database (dependency for Phase 2)

- [ ] 1.1 Check NULL count: `docker compose exec backend npx prisma db execute --stdin` with `SELECT COUNT(*) FROM DetalleRiesgo WHERE tipoControlId IS NULL;`
- [ ] 1.2 If count > 0, backfill: `UPDATE DetalleRiesgo SET tipoControlId = (SELECT MIN(id) FROM TipoControl) WHERE tipoControlId IS NULL;`
- [ ] 1.3 Change `backend/prisma/schema.prisma` line 148: `tipoControlId Int?` → `tipoControlId Int`
- [ ] 1.4 Run `docker compose exec backend npx prisma migrate dev --name make_tipo_control_id_required`
- [ ] 1.5 Run `docker compose exec backend npx prisma db push` (safety sync)

## Phase 2: Backend Validation Pipe + Service

- [ ] 2.1 Add `ValidationPipe` in `backend/src/main.ts`: import + `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`
- [ ] 2.2 Remove spread conditional in `backend/src/valoraciones/valoraciones.service.ts` line 243: `...(d.tipoControlId !== undefined && { tipoControlId: d.tipoControlId })` → `tipoControlId: d.tipoControlId`
- [ ] 2.3 Verify DTO `backend/src/valoraciones/dto/create-valoracion.dto.ts` line 82-83 already has `@IsNumber() tipoControlId: number;` (no change needed — confirm)

## Phase 3: Frontend Validation Gate

- [ ] 3.1 Add `canAdvanceFromStep4()` in `frontend/components/ValoracionModal.vue`: iterate `riskRows`, check each via `findMatchedDetalle()` has truthy `tipoControlId`, set `tipoControlErrors.value = true` if any missing; return boolean
- [ ] 3.2 Change Guardar button handler in `ValoracionModal.vue` line 1238: call `canAdvanceFromStep4()` before `emit('submit')`; block with `alert('Complete el campo Tipo de Control en todas las filas')` on failure
- [ ] 3.3 Remove `tipoControlErrors.value = !allGood` from `canAdvanceFromStep3()` (line 408) — decouples step 3 from step 4 errors
- [ ] 3.4 Change `frontend/pages/valoracion.vue` line 258: `d.tipoControlId ? Number(d.tipoControlId) : null` → `Number(d.tipoControlId)`

## Phase 4: Testing

- [ ] 4.1 Update mocks in `backend/src/valoraciones/valoraciones.service.spec.ts`: items still using `tipoControl: null` at lines 927, 993, 1100 — verify they don't fail with new direct assignment
- [ ] 4.2 Add E2E test in `backend/test/app.e2e-spec.ts`: POST `/valoraciones` without `tipoControlId` in `detallesRiesgo[]` → expect 400
- [ ] 4.3 Add E2E smoke test: GET `/catalogos/tipos-control`, GET `/valoraciones` → expect 200 (verify `forbidNonWhitelisted` doesn't break existing endpoints)

## Phase 5: Manual Smoke

- [ ] 5.1 Manual test: nueva valoración → completar tabs 1-3 → Tab 4 dejar Tipo Control vacío → clic Guardar → alert + modal sigue abierto
- [ ] 5.2 Manual test: mismas condiciones → completar Tipo Control en todas las filas → clic Guardar → guarda OK y redirige
- [ ] 5.3 Manual test: editar valoración existente → cambiar Tipo Control → Guardar → persiste correctamente
