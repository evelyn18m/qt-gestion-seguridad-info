## Exploration: heatmap-iso27005 (Risk Heatmap Endpoint)

### Current State

The system manages risk assessments through `ValoracionActivo` (asset valuation) records. Each has:
- Three CIA impact dimensions as FK to `Impacto` catalog: `confidencialidadId`, `integridadId`, `disponibilidadId`
- A `probabilidadId` FK to `Probabilidad` catalog
- Computed fields: `evaluacionRiesgo`, `nivelRiesgo`, `impacto` (float)
- Row-level detail in `DetalleRiesgo` with its own per-row risk calculations

The existing `reportes` module has 10+ report endpoints (`/reportes/resumen`, `/reportes/cia`, `/reportes/evaluacion-riesgo`, etc.) that aggregate data and return typed DTOs. There is NO existing heatmap endpoint. Risk calculation is handled by `calculo-riesgo.service.ts` (pure function, `VA * nivelAmenaza * nivelVulnerabilidad`).

### Affected Areas

- `backend/prisma/schema.prisma` — `Probabilidad` model has no `valor` field (only `nombre`); `Impacto` has `valor: Int` (1–3). Need to understand probability numeric mapping.
- `backend/src/reportes/reportes.module.ts` — Where the new endpoint should be registered (or a new module)
- `backend/src/reportes/reportes.controller.ts` — Add `GET /reportes/heatmap` route
- `backend/src/reportes/reportes.service.ts` — Add `getHeatmap()` service method
- `backend/src/reportes/dto/reporte-response.dto.ts` — Add `HeatmapReporteDto` response type
- `backend/src/reportes/reportes.controller.spec.ts` — Add controller tests
- `backend/src/reportes/reportes.service.spec.ts` — Add service tests

### Key Findings

#### Prisma Model Field Names (exact)
| Model | Key Fields | Notes |
|-------|-----------|-------|
| `ValoracionActivo` | `confidencialidadId: Int`, `integridadId: Int`, `disponibilidadId: Int`, `probabilidadId: Int?`, `impacto: Float?`, `evaluacionRiesgo: Float?`, `nivelRiesgo: String?` | `probabilidadId` is nullable |
| `Impacto` | `tipo: String`, `nivel: String` ("Alto"/"Medio"/"Bajo"), `valor: Int` (3/2/1) | Has numeric `valor` for mapping |
| `Probabilidad` | `id: Int`, `nombre: String` | **NO numeric `valor` field** — must be derived from `nombre` |
| `Riesgo` | `tipo: String`, `nivel: String`, `valor: Int` | Used in per-row calculations, not per-asset |
| `DetalleRiesgo` | `valoracionActivoId: Int`, `evaluacionRiesgo: Float?`, `nivelRiesgo: String?` | Per-row detail |

#### Probabilidad Model Gap
The `Probabilidad` model has `nombre` (e.g., "Alta", "Media", "Baja") but **NO numeric `valor`** field. For a 3x3 heatmap, we need a 1–3 scale for the probability axis. Two options:
1. Derive from `nombre` string (map "Alta"→3, "Media"→2, "Baja"→1)
2. Add a `valor` column to the `Probabilidad` model (schema migration required)

#### Existing Service Methods That Could Be Reused
- `calculo-riesgo.service.ts::calculateRiesgo()` — pure function for VA × amenaza × vulnerabilidad. The heatmap uses a DIFFERENT formula (impact × probability), so this is NOT directly reusable.
- `reportes.service.ts::getResumen()` — pattern for counting distribution (similar to heatmap cell counts)
- `reportes.service.ts::getCia()` — pattern for using `fetchImpactoMap()` to resolve numeric values
- `reportes.service.ts::getValoracionActivos()` — pattern for filtering and batch-enriching

#### NestJS Patterns in Use
- **Module registration**: `@Module({ controllers, providers: [Service, PrismaService] })` in `app.module.ts` `imports` array
- **Dependency injection**: Constructor-based, `private readonly prisma: PrismaService`
- **Return types**: Explicit DTO types on controller methods (e.g., `Promise<ResumenReporteDto>`)
- **Error handling**: `try/catch` with `HttpException` 500 in services
- **Request validation**: `class-validator` decorators on DTO classes for POST/PATCH; none needed for GET
- **Response DTOs**: Plain TypeScript classes with typed properties (no decorators), defined in `dto/reporte-response.dto.ts`
- **Testing**: `Test.createTestingModule` with mocked providers, `jest.fn()` for Prisma methods, factory helpers (`makeVa`, `makeDr`, `makeImpacto`) in `reportes.service.spec.ts`

### Approaches

#### 1. Add to Existing Reportes Module (Recommended)
Add `GET /reportes/heatmap` to the existing `reportes` controller and service. Follows the established pattern of all other report endpoints.

- **Pros**: Consistent with existing architecture, no new module, minimal boilerplate, reuses `PrismaService` injection and testing patterns
- **Cons**: Adds to an already large service file (~1200 lines)
- **Effort**: Low

#### 2. Create Standalone Heatmap Module
Generate a new `heatmap` module via `nest g resource heatmap` with its own controller, service, and module.

- **Pros**: Separation of concerns, cleaner service file
- **Cons**: Inconsistent with existing pattern (all reports are in `reportes` module), more boilerplate, user expects reports at `/reportes/*`
- **Effort**: Medium

#### 3. Add to Valoraciones Module
Add heatmap endpoint to the existing `valoraciones` controller.

- **Pros**: Direct access to valoracion data
- **Cons**: Breaks REST semantics (`/valoraciones/heatmap` is not RESTful for a valoracion resource), mixes concerns
- **Effort**: Low

### Recommendation

**Approach 1**: Add to existing `reportes` module. This is the most consistent pattern — all analytical/reporting endpoints live under `/reportes/*`. The heatmap IS a report. The service file size concern can be addressed later with extraction if it becomes a maintenance issue.

#### Implementation Plan (high-level)
1. **Define response DTO** in `reporte-response.dto.ts`: `HeatmapCellDto` and `HeatmapReporteDto` with a 3x3 matrix
2. **Add service method** `getHeatmap()` that:
   - Calls `fetchImpactoMap()` (already exists as private)
   - Fetches all `ValoracionActivo` with their `probabilidadId` + CIA IDs
   - Derives probability numeric values (1–3) from `Probabilidad.nombre`
   - Computes impact value (max of the three CIA `Impacto.valor` fields)
   - Maps each valuation to a (impact, probability) cell and counts
   - Returns the matrix
3. **Add controller route** `GET /reportes/heatmap`
4. **Write tests** following the `makeVa()`/`makeImpacto()` factory pattern already used in `reportes.service.spec.ts`

#### ISO 27005 3x3 Matrix Structure
```
          Impact (X axis)
          1 (Bajo)   2 (Medio)   3 (Alto)
Prob 1    BAJO        BAJO         MEDIO
(Y)   2    BAJO        MEDIO        ALTO
     3    MEDIO       ALTO         ALTO
```
The standard ISO 27005 risk matrix: `risk = impact × probability` with thresholds 1–3=Low, 4–6=Medium, 7–9=High. However, the existing `calculo-riesgo` uses 1–3=Low, 4–8=Medium, 9–27=High (3x3 matrix with VA factor). The heatmap should follow the same threshold convention for consistency, or the standard ISO 27005 thresholds. **This needs clarification in the proposal phase.**

### Risks

- **Probabilidad numeric mapping**: The `Probabilidad` model lacks a `valor` field. Mapping by `nombre` string is fragile (typos, language changes). Consider adding a `valor` column via migration for robustness.
- **Impact aggregation**: Three CIA dimensions need to be collapsed into one. Max is standard for conservative risk assessment, but the existing code uses VA (average of 3). Decision needed.
- **Nullable probability**: `probabilidadId` is nullable on `ValoracionActivo`. Assets without probability cannot be plotted. Decide whether to skip them or use a default.
- **Heatmap thresholds**: The existing system uses 1–3/4–8/9–27 (3-factor product), while ISO 27005 uses 1–3/4–6/7–9 (2-factor product). Must align with the project's risk methodology.

### Ready for Proposal
Yes — but the proposal must resolve: (1) probability numeric mapping strategy, (2) impact aggregation method, (3) nullable handling, (4) threshold alignment with existing `calculo-riesgo` conventions.
