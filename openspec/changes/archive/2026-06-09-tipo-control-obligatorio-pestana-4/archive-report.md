# Archive Report: Tipo de Control obligatorio en Pestaña 4

**Change**: en la pestaña 4 tratamiento de riesgo el campo tipo de control debe ser un campo obligatorio.
**Date archived**: 2026-06-09
**Verdict**: PASS — all automated tests pass, specs compliant, 3 manual smoke tests remain as follow-up

---

## SDD Cycle Completion

| Phase | Artifact | Enram ID | Status |
|-------|----------|----------|--------|
| Propose | Proposal | #160 | ✅ |
| Spec | Delta spec (valoracion-modal) | #161 | ✅ |
| Design | Technical design | #162 | ✅ |
| Tasks | 18 tasks (5 phases) | #163 | ✅ |
| Apply | Apply progress (15/18) | #164 | ✅ |
| Verify | Verification report | #166 | ✅ |
| Archive | This report | #167 | ✅ |

---

## Specs Synced to Source of Truth

### openspec/specs/valoracion-modal/spec.md

| Action | Requirement | Details |
|--------|-------------|---------|
| **ADDED** | Step 4 Tipo Control Validation | 3 scenarios: all complete → pass, any missing → fail, mixed rows → per-row errors |
| **MODIFIED** | Submit Flow | Updated: now requires `canAdvanceFromStep4()` gate. 3 scenarios |

---

## Test Summary

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| Unit (7 suites) | 91 | 91 | 0 |
| E2E (1 suite) | 5 | 5 | 0 |
| **Total** | **96** | **96** | **0** |

---

## Tasks: 15/18 complete (3 manual smoke tests remain)

| Phase | Tasks | Complete |
|-------|-------|----------|
| Phase 1: Database | 5 | 5 |
| Phase 2: Backend | 4 | 4 |
| Phase 3: Frontend | 4 | 4 |
| Phase 4: Testing | 3 | 3 |
| Phase 5: Manual Smoke | 3 | 0 |

### Pending Follow-Up (Phase 5)

- 🔲 5.1: Nueva valoración → Tab 4 sin Tipo Control → Guardar → alert + modal abierto
- 🔲 5.2: Completar Tipo Control en todas filas → Guardar → OK y redirige
- 🔲 5.3: Editar valoración existente → cambiar Tipo Control → Guardar → persiste OK

---

## Files Changed (9 files)

| File | Action |
|------|--------|
| `backend/prisma/schema.prisma` | tipoControlId Int? → Int |
| `backend/src/main.ts` | Global ValidationPipe |
| `backend/src/valoraciones/valoraciones.service.ts` | Spread condicional → directo |
| `backend/src/valoraciones/dto/create-valoracion.dto.ts` | @ValidateNested + @Type |
| `backend/test/app.e2e-spec.ts` | 4 nuevos tests E2E |
| `backend/test/jest-e2e.json` | transformIgnorePatterns |
| `backend/package.json` | class-transformer |
| `frontend/components/ValoracionModal.vue` | canAdvanceFromStep4() + Guardar gate |
| `frontend/pages/valoracion.vue` | Serialización sin ternario |
