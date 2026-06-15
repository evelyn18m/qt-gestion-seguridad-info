# Proposal: Fix Duplicate amenaza/vulnerabilidad Rows in Reports

## Intent

Fix duplicate rows in three reports (Análisis de Riesgo, Evaluación de Riesgo, Tratamiento de Riesgo). Root cause: `syncRowsToDetalles()` creates N+M `DetalleRiesgo` DB entries per `RiskRow` — one per amenaza + one per vulnerabilidad — all with identical `amenazaIds` and `vulnerabilidadIds` JSON arrays. A RiskRow with 2 threats + 2 vulnerabilities produces 4 identical DB rows. Reports iterate all rows without deduplication.

## Scope

### In Scope
- **Frontend**: `syncRowsToDetalles()` → 1 entry per RiskRow (was N+M)
- **Frontend**: `findMatchedDetalle()` → match by JSON arrays (was fragile tipo+catalogoId)
- **Backend**: In-memory dedup in `getAnalisisRiesgoActivos`, `getEvaluacionRiesgo`, `getTratamientoRiesgo`
- **Backend**: Fix double-counting in `getResumen()` (VA-level stats) and `getTratamiento()` (unique rows)
- Existing DB data self-heals on next VA edit, no migration needed

### Out of Scope
- SQL cleanup migration (self-healing covers active VAs)
- Frontend report page changes (dedup is server-side)
- Prisma query changes (dedup is post-query, in-memory)

## Capabilities

### New Capabilities
None — bug fix, no new capabilities.

### Modified Capabilities
None — implementation fixes align with existing spec intent ("one row per unique entity"). No spec-level behavior change.

## Approach

**Frontend** (`ValoracionModal.vue`):
- `syncRowsToDetalles()` (L260-327): Remove per-amenaza/per-vulnerabilidad `forEach` loops. Create exactly ONE entry per RiskRow. ~20-line reduction.
- `findMatchedDetalle()` (L569-579): Match by `JSON.stringify(amenazaIds)` + `JSON.stringify(vulnerabilidadIds)` only. Drop `tipo`/`catalogoId` from key.

**Backend** (`reportes.service.ts`):
- 3 report methods: Post-enrichment dedup via `Map<string, row>` keyed by `vaId|amenazaIds|vulnerabilidadIds`. Keep latest entry per key. ~5 lines each.
- `getResumen()` (L35-73): Replace `detalles` loop → `vas` loop for `distribucionRiesgos` + `distribucionControles`. Use `va.nivelRiesgo`/`va.nivelRiesgoControl`.
- `getTratamiento()` (L199-236): Deduplicate `detalles` by VA composite key before counting metodos/residual.

**Self-Healing**: On next VA edit, `ValoracionesService.update()` (L103-180) deletes all existing rows and recreates from the fixed frontend → only 1 row per RiskRow.

## Affected Areas

| Area | Impact | Lines |
|------|--------|-------|
| `frontend/components/ValoracionModal.vue` | Modified | ~70 changed (L260–327, L569–579) |
| `backend/src/reportes/reportes.service.ts` | Modified | ~35 added (5 methods × ~7 lines) |
| `backend/src/reportes/reportes.service.spec.ts` | Modified | Update summary count expectations |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tab 3/4 fields lose backward compat after 1-entry change | Low | `prevMap` already preserves values keyed by array content |
| Existing duplicate data shows wrong Tab 3/4 data on edit | Low | `update()` deletes all + recreates 1 row per RiskRow |
| Export methods break | None | Export calls same dedup'ed methods internally |

## Rollback Plan

Revert the single commit on `develop`. Frontend change is one function. Backend dedup is additive — no schema changes. DB data remains intact; duplicates only re-appear on next VA save until backend dedup is restored.

## Dependencies

None — no schema changes, no new packages, no external APIs.

## Success Criteria

- [ ] New VA with 2 threats + 2 vulnerabilities → exactly 1 `DetalleRiesgo` DB row
- [ ] `getAnalisisRiesgoActivos` → 1 row per unique VA (was N+M)
- [ ] `getEvaluacionRiesgo` → 1 row per unique VA (was N+M)
- [ ] `getTratamientoRiesgo` → 1 row per unique VA (was N+M)
- [ ] `getResumen().distribucionRiesgos` counts VAs, not rows (1 VA with Alto → Alto=1, not 4)
- [ ] `getTratamiento().distribucionMetodos` counts unique VAs, not duplicate rows
- [ ] Backend unit tests pass (updated where count expectations change)
- [ ] Manual smoke: no duplicate rows visible in any report page
