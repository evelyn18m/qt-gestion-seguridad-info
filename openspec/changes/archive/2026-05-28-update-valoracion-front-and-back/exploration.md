# Exploration: update-valoracion-front-and-back

## Current State

### Backend (NestJS + Prisma)

**Models** (`backend/prisma/schema.prisma`):
- `ValoracionActivo` (lines 95-136): Core entity with 4-tab structure:
  - Tab 1: Basic asset info + CIA (Confidentiality, Integrity, Availability)
  - Tab 2: Risk Analysis (threats/vulnerabilities stored as JSON arrays)
  - Tab 3: Risk Evaluation (probabilidad, amenazaRiesgo, vulnerabilidadRiesgo)
  - Tab 4: Risk Treatment (metodoTratamiento, tipoControl, controlesImplementar, nivelAmenazaControl, nivelVulnerabilidadControl, evaluacionRiesgoControl, nivelRiesgoControl)
- `DetalleRiesgo` (lines 138-153): Per-item risk details (threats and vulnerabilities have individual evaluations)
- `TipoControl`, `Probabilidad`, `Riesgo`, `Impacto` (catalogs)
- `Amenaza`, `Vulnerabilidad` (catalogs)

**Service** (`backend/src/valoraciones/valoraciones.service.ts`):
- `enrich()`: Hydrates `ValoracionActivo` with lookup data (tipoActivo, formato, macroProceso, etc.) and `detallesRiesgo`
- `create()`: Creates `ValoracionActivo` + bulk `DetalleRiesgo`
- `update()`: Replaces all `DetalleRiesgo` on update (deleteMany + createMany)
- Uses Prisma MariaDB adapter

**DTOs** (`backend/src/valoraciones/dto/create-valoracion.dto.ts`):
- `DetalleRiesgoDto`: tipo, catalogoId, riesgoId, evaluacionRiesgo, nivelRiesgo, metodoTratamiento, tipoControlId, riesgoControlId, evaluacionRiesgoControl, nivelRiesgoControl
- `CreateValoracionDto`: Contains all 4 tabs + detallesRiesgo array

### Frontend (Nuxt 4 / Vue 3)

**Page** (`frontend/pages/valoracion.vue`, ~1603 lines):
- Tabbed modal interface (4 tabs)
- `valForm`: Tab 1 data
- `analisisForm`: Tab 2 data
- `evaluacionForm`: Tab 3 data
- `tratamientoForm`: Tab 4 data (MISSING from submit!)
- `detallesRiesgo`: Array for per-item risk details
- Computed: `ciaAverage`, `evaluacionRiesgo`, `nivelRiesgo`, `evaluacionRiesgoControl`, `nivelRiesgoControl`

## Affected Areas

| Area | File | Issue |
|------|------|-------|
| **Frontend** | `pages/valoracion.vue` | `valTipoActivo` ref is **never declared** but used (lines 248, 801) |
| **Frontend** | `pages/valoracion.vue` | `tratamientoForm` fields are **NOT submitted** to backend (lines 346-416) |
| **Frontend** | `pages/valoracion.vue` | View modal (lines 1156-1200) **doesn't show** Tab 2-4 data |
| **Backend** | `dto/create-valoracion.dto.ts` | `DetalleRiesgoDto.tipoControlId` vs `CreateValoracionDto.tipoControl` naming inconsistency |
| **Backend** | `valoraciones.service.ts` | `enrich()` looks up `item.tipoControl` but Prisma has `tipoControl` (correct), DTOs have mixed naming |
| **Both** | Types | `DetalleRiesgo` interface in `api.d.ts` has `tipoControlId` but backend `DetalleRiesgoDto` has `tipoControlId` |

## Critical Bugs Found

### 1. `valTipoActivo` undefined reference (frontend)
```javascript
// Line 248: assigns to undefined ref
valTipoActivo.value = results[0]

// Line 801: uses undefined ref in template
<option v-for="t in valTipoActivo" ...>
```
**Impact**: "Tipo de Activo" dropdown would be empty/broken at runtime.

### 2. Tab 4 (Tratamiento) data not persisted
The `submitValoracion()` function (lines 346-416) never includes `tratamientoForm.value` fields in the POST/PATCH body:
```javascript
const body = {
  // ... tabs 1-3 data
  // MISSING: metodoTratamiento, tipoControl, controlesImplementar, 
  //          nivelAmenazaControl, nivelVulnerabilidadControl
}
```
**Impact**: All Tab 4 fields are **lost on submit**.

### 3. View modal doesn't show risk analysis/evaluation/treatment
Lines 1166-1193 only show Tab 1 data (basic info + CIA). Tabs 2-4 data (`detallesRiesgo`, threat/vulnerability details) is **never displayed** in the view modal.

## Approaches

### 1. Minimal Fix (Bug Fixes Only)
Fix the 3 critical bugs above without adding features.
- **Pros**: Low risk, focused scope, fixes broken functionality
- **Cons**: Doesn't improve the UX or data model
- **Effort**: Low

### 2. Comprehensive Update (Bug Fixes + UX + Data Integrity)
Fix bugs + improve view modal + add validation + ensure Tab 4 data flow is complete.
- **Pros**: Complete fix, better UX, proper data flow
- **Cons**: More testing needed, larger scope
- **Effort**: Medium

### 3. Full Refactor (Outside Scope)
Extract composables, add TypeScript strict mode, add unit tests.
- **Not recommended for this change** — separate refactor ticket needed

## Recommended Scope

**Approach 1 (Minimal Fix)** is the target for this SDD, but with bug #2 (Tab 4 data) expanded to verify the full data flow actually works end-to-end.

The `tratamientoForm` fields need to be:
1. Added to the `submitValoracion()` body
2. The backend DTO (`CreateValoracionDto`) already has these fields
3. The Prisma schema already stores them on `ValoracionActivo`
4. Verify `enrich()` returns them correctly

## Risks

1. **Data loss**: Tab 4 fields have been silently dropped since the feature was built — existing records may have incomplete data
2. **Frontend undefined ref**: `valTipoActivo` will cause runtime error when selecting "Tipo de Activo"
3. **DetalleRiesgo cascade**: The `update()` method does `deleteMany` before `createMany` — if the transaction fails mid-way, data could be lost (no transaction wrapper)
4. **Type mismatch**: `DetalleRiesgoDto.tipoControlId` vs `CreateValoracionDto.tipoControl` — could cause confusion

## Complexity Estimate

- **Files**: 4 main files (1 Prisma schema, 2 backend, 1 frontend)
- **Risk**: Medium (bug fixes, but data flow is complex with nested DetalleRiesgo)
- **Testing**: Backend has no existing tests for ValoracionesService

## Ready for Proposal

**Yes**, but the orchestrator should clarify the scope with the user:
1. Is this just bug fixes (the 3 critical issues)?
2. Or should it include UX improvements (better view modal)?
3. Should we add unit tests for ValoracionesService given no existing tests?

The exploration confirms the feature exists and is functional for Tab 1-3 data, but Tab 4 (Tratamiento) has a data persistence gap, and `valTipoActivo` is a runtime crash waiting to happen.
