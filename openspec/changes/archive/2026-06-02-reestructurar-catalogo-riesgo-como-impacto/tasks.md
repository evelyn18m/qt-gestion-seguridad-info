# Tasks: Reestructurar Catálogo Riesgo como Impacto

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~50-80 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + seed + FIELD_MAPs + frontend + verify | PR 1 | ~50-80 lines across 5 files; autonomous unit, no chaining needed |

## Phase 1: Schema + Seed

- [x] 1.1 Modify `backend/prisma/schema.prisma` L174-180: drop `evaluacion (@db.Text)` + `valor (Int?)`, add `tipo (String)` + `nivel (String)`, make `valor (Int)` required
- [x] 1.2 Rewrite `backend/prisma/seed.ts` L227-240: section-aware parser tracking `currentTipo` from `"Evaluacion de ..."` headers; extract `nivel`/`valor` from data rows via regex; skip null-header rows
- [x] 1.3 Run `DELETE FROM DetalleRiesgo` (stale FKs), then `npx prisma db push`, then reseed — confirm 6 rows (Alto/Medio/Bajo × Amenaza/Vulnerabilidad)

## Phase 2: Backend Mapping

- [x] 2.1 Update `backend/src/catalogos/catalogos.service.ts` L38: `FIELD_MAP.riesgo` from `['evaluacion','valor']` to `['tipo','nivel','valor']`

## Phase 3: Frontend

- [x] 3.1 Update `frontend/pages/catalogos.vue` L54: `FIELD_MAP.riesgos` from `['evaluacion','valor']` to `['tipo','nivel','valor']`
- [x] 3.2 Update `frontend/components/ValoracionModal.vue` L814: replace `.filter(r => r.evaluacion?.toLowerCase().includes('amenaza'))` with `r.tipo === 'Amenaza'`; display `{{ r.nivel }} ({{ r.valor }})`
- [x] 3.3 Update `frontend/components/ValoracionModal.vue` L823: replace `.filter(r => r.evaluacion?.toLowerCase().includes('vulnerabilidad'))` with `r.tipo === 'Vulnerabilidad'`; display `{{ r.nivel }} ({{ r.valor }})`
- [x] 3.4 Update `frontend/components/ValoracionModal.vue` L898: replace `{{ r.evaluacion }}` with `{{ r.tipo }} - {{ r.nivel }} ({{ r.valor }})`

## Phase 4: Verification

- [x] 4.1 Verify seed: `prisma.riesgo.findMany()` returns 6 rows with `tipo`, `nivel`, `valor` columns (no `evaluacion` column present)
- [x] 4.2 Verify API: `GET /catalogos/riesgos` returns `{tipo, nivel, valor}` — no `evaluacion` field in response
- [x] 4.3 Smoke test: ValoracionModal Amenaza dropdown shows 3 levels, Vulnerabilidad dropdown shows 3 levels, display format correct per design spec
- [x] 4.4 Verify `calculateRiesgo()` produces identical output before/after (equation uses `r.valor` only — unchanged int 3/2/1)
