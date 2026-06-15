# Archive Report: heatmap-iso27005

**Change**: heatmap-iso27005
**Archived**: 2026-06-15
**Artifact store**: hybrid
**Status**: PASS WITH WARNINGS

## Executive Summary

Archived the completed `heatmap-iso27005` change — `GET /reportes/heatmap` endpoint implementing ISO 27005 3×3 risk heatmap. All 12 tasks complete, 177/177 tests passing, 10/10 spec scenarios compliant. Two documented deviations (in-memory join, db push) are justified by model limitations and project conventions.

## Artifact Traceability

### Engram Observation IDs

| Artifact | Observation ID | Topic Key |
|----------|---------------|-----------|
| Exploration | #213 | `sdd/heatmap-iso27005/explore` |
| Proposal | #214 | `sdd/heatmap-iso27005/proposal` |
| Design | #215 | `sdd/heatmap-iso27005/design` |
| Spec | #216 | `sdd/heatmap-iso27005/spec` |
| Tasks | #217 | `sdd/heatmap-iso27005/tasks` |
| Apply Progress | #218 | `sdd/heatmap-iso27005/apply-progress` |
| Verify Report | #220 | `sdd/heatmap-iso27005/verify-report` |
| **Archive Report** | *(this observation)* | `sdd/heatmap-iso27005/archive-report` |

### Filesystem Artifacts

| Artifact | Path |
|----------|------|
| Proposal | `openspec/changes/archive/2026-06-15-heatmap-iso27005/proposal.md` |
| Specs (delta) | `openspec/changes/archive/2026-06-15-heatmap-iso27005/specs/` |
| Design | `openspec/changes/archive/2026-06-15-heatmap-iso27005/design.md` |
| Tasks | `openspec/changes/archive/2026-06-15-heatmap-iso27005/tasks.md` |
| Verify Report | `openspec/changes/archive/2026-06-15-heatmap-iso27005/verify-report.md` |
| Exploration | `openspec/changes/archive/2026-06-15-heatmap-iso27005/exploration.md` |
| Archive Report | `openspec/changes/archive/2026-06-15-heatmap-iso27005/archive-report.md` |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `reporte-heatmap` | **Created** | New domain — `openspec/specs/reporte-heatmap/spec.md`. 6 requirements, 7 scenarios. |
| `reportes-index` | **Updated** | Merged delta — added heatmap row to required entries table, added "Index includes new heatmap route" scenario. |

### reportes-index Merge Details

- **Requirement matched**: `GET /reportes Returns Complete Endpoint Index` (by name match)
- **Table updated**: Added row `GET /reportes/heatmap | Mapa de calor 3x3 de riesgos (Probabilidad × Impacto)`
- **New scenario added**: "Index includes new heatmap route"
- **Preserved**: Existing scenarios ("Index includes new tratamiento routes", "Existing routes are unchanged")

## Implementation Summary

| Metric | Value |
|--------|-------|
| Files modified | 7 |
| Files created | 0 |
| Lines changed | ~200 |
| New tests | 8 (5 service + 3 controller) |
| Total tests passing | 177/177 |
| TDD cycle | RED → GREEN → VERIFY (strict) |
| PR budget risk | Low |

### Files Changed
| File | Action | Lines |
|------|--------|-------|
| `prisma/schema.prisma` | Modified | +1 (`valor Int @default(1)`) |
| `prisma/seed.ts` | Modified | ~3 (add valor to Probabilidad creates) |
| `src/reportes/dto/reporte-response.dto.ts` | Modified | +12 (3 DTO classes) |
| `src/reportes/reportes.service.ts` | Modified | +65 (`getHeatmap()` + constants) |
| `src/reportes/reportes.controller.ts` | Modified | +6 (route + index entry) |
| `src/reportes/reportes.service.spec.ts` | Modified | +55 (factory + 5 test cases) |
| `src/reportes/reportes.controller.spec.ts` | Modified | +30 (mock + 3 test cases) |

## Deviations from Design

| Deviation | Justification |
|-----------|---------------|
| In-memory join (impactoMap + probMap) instead of Prisma `include` | `ValoracionActivo` model lacks `@relation` definitions to `Impacto`/`Probabilidad`. Matches existing `getCia()` pattern using `fetchImpactoMap()`. |
| `prisma db push` instead of `migrate dev` | Shadow DB creation blocked on MariaDB container. Documented project convention in `AGENTS.md`. |

## Verification Result

**Verdict**: PASS WITH WARNINGS
- All 177 tests pass (169 existing + 8 new heatmap tests)
- All 10 spec scenarios (7 reporte-heatmap + 3 reportes-index) covered by passing tests
- All 4 design decisions correctly implemented
- 2 justified deviations documented (no CRITICAL issues)

## Archive Checklist

- [x] Main specs updated: `reporte-heatmap` (created), `reportes-index` (merged)
- [x] Change folder moved to `openspec/changes/archive/2026-06-15-heatmap-iso27005/`
- [x] Archive contains all artifacts: proposal, specs/, design, tasks, verify-report, exploration
- [x] Active changes directory no longer has `heatmap-iso27005`
- [x] Archive report persisted to Engram (topic: `sdd/heatmap-iso27005/archive-report`)
- [x] Archive report written to filesystem

## SDD Cycle Complete

The `heatmap-iso27005` change has been fully planned, implemented, verified, and archived. The source of truth (`openspec/specs/`) now reflects the new heatmap capability. Ready for the next change.
