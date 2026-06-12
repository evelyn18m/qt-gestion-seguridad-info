# Archive Report: reporte-evaluacion-riesgo

**Date**: 2026-06-12
**Mode**: Hybrid (openspec + Engram)

## Change Summary

New read-only report page (`/reportes/evaluacion-riesgo`) with 10-column table, 7 sidebar filters, Excel export, and third ReportesTabs tab.

## Verification

- **Tests**: 147/147 PASS across 9 suites
- **TDD**: RED→GREEN confirmed for both service and controller layers
- **Spec Compliance**: 30/30 scenarios compliant
- **WARNINGs (originally 2)**: Both fixed (Excel filename with date, CIA column order)
- **CRITICAL**: 0

## Archive Contents

| Artifact | Location |
|----------|----------|
| proposal.md | `openspec/changes/archive/2026-06-12-reporte-evaluacion-riesgo/proposal.md` |
| specs/ | `openspec/changes/archive/2026-06-12-reporte-evaluacion-riesgo/specs/` |
| design.md | **Engram** — observation #184 (topic: `sdd/reporte-evaluacion-riesgo/design`) |
| tasks.md | **Engram** — observation #186 (topic: `sdd/reporte-evaluacion-riesgo/tasks`) |
| apply-progress | **Engram** — observation #187 (topic: `sdd/reporte-evaluacion-riesgo/apply-progress`) |
| verify-report | **Engram** — observation #188 (topic: `sdd/reporte-evaluacion-riesgo/verify-report`) |
| archive-report | **Engram** — topic `sdd/reporte-evaluacion-riesgo/archive-report` |

## Specs Synced

| Domain | Action | Main Spec Path |
|--------|--------|----------------|
| `reporte-evaluacion-riesgo` | **Created** | `openspec/specs/reporte-evaluacion-riesgo/spec.md` |
| `frontend-navigation` | **Updated** (1 requirement added) | `openspec/specs/frontend-navigation/spec.md` |

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `backend/src/reportes/dto/reporte-response.dto.ts` | Modified | +11 fields |
| `backend/src/reportes/reportes.service.ts` | Modified | +170 loc |
| `backend/src/reportes/reportes.service.spec.ts` | Modified | +10 test cases |
| `backend/src/reportes/reportes.controller.ts` | Modified | +2 endpoints |
| `backend/src/reportes/reportes.controller.spec.ts` | Modified | +4 test cases |
| `frontend/pages/reportes/evaluacion-riesgo.vue` | **Created** | ~651 loc |
| `frontend/types/api.d.ts` | Modified | +1 interface |
| `frontend/components/ReportesTabs.vue` | Modified | +1 tab link |
