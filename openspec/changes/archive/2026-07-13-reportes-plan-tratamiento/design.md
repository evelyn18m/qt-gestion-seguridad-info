# Design: Reporte de Plan de Tratamiento

## Technical Approach

Extend the existing `ReportesService`/`ReportesController` with a new `reporte-plan-tratamiento` capability that mirrors the `tratamiento-riesgo` report pattern. The backend will expose:

- `GET /reportes/plan-tratamiento` — filtered, enriched JSON list.
- `GET /reportes/plan-tratamiento/export` — same data as a styled `.xlsx`.

The frontend will add `/reportes/plan-tratamiento.vue` using the sidebar-filter + export-button pattern already used by the other report pages, and fix the broken `ReportesTabs.vue` link.

This maps to the confirmed **standalone plan list** decision: rows are `PlanTratamiento` records enriched with their own catalogs, not joined to `DetalleRiesgo`/`ValoracionActivo`.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Row scope | Standalone `PlanTratamiento` list vs. correlated risk/asset join | Standalone is simpler and matches existing reports; correlation would require new DTOs, filters, and tests | Standalone list |
| JSON label resolution | In-memory catalog maps vs. DB JSON functions | In-memory maps reuse `safeParseJsonArray` and keep Prisma queries portable; DB functions are DB-specific | In-memory maps |
| Filter implementation | Prisma `where` only vs. Prisma + in-memory | All requested filters map directly to scalar FKs or text fields, so a pure Prisma `AND` clause is sufficient | Prisma `where` only |
| Export reuse | Call `getPlanTratamiento` vs. duplicate query | Reuse guarantees identical filtered data and less code | Reuse `getPlanTratamiento` |
| Query typing | `Record<string, string \| undefined>` vs. validation DTO | Existing report endpoints use the loose record; staying consistent avoids introducing a new pattern | `Record<string, string \| undefined>` |
| Date display | Return `Date` and format in UI vs. string | Returning `Date` keeps DTO truthful; UI already formats dates with `.split('T')[0]` | `Date \| null` in DTO, format in UI |

## Data Flow

```
User ──► ReportesTabs ──► /reportes/plan-tratamiento page
                                │
                                ▼
                     ┌──────────────────────┐
                     │  Sidebar filters     │
                     │  q, tipoActivoId,    │
                     │  opcionTratamientoId,│
                     │  estadoId,           │
                     │  plazoImplementacionId│
                     │  areaFuncionalId     │
                     └──────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
GET /reportes/        GET /reportes/           Download
plan-tratamiento      plan-tratamiento/export  .xlsx
        │                       │
        ▼                       ▼
ReportesController ──► ReportesService
                              │
                              ▼
                  Prisma planTratamiento.findMany
                              │
                              ▼
              Batch catalog findMany maps
                              │
                              ▼
                  safeParseJsonArray + label join
                              │
                              ▼
              JSON / Buffer (xlsx-js-style)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/reportes/dto/reporte-response.dto.ts` | Modify | Add `PlanTratamientoReporteDto` |
| `backend/src/reportes/reportes.service.ts` | Modify | Add `getPlanTratamiento` and `exportPlanTratamiento` |
| `backend/src/reportes/reportes.controller.ts` | Modify | Add `GET /reportes/plan-tratamiento` and `/export`; register both in index |
| `backend/src/reportes/reportes.service.spec.ts` | Modify | Add unit tests for query and export |
| `frontend/types/api.d.ts` | Modify | Add `PlanTratamientoReporte` interface |
| `frontend/components/ReportesTabs.vue` | Modify | Fix route to `/reportes/plan-tratamiento`; insert tab in required order |
| `frontend/pages/reportes/plan-tratamiento.vue` | Create | Report page with filters, table, and export button |

## Interfaces / Contracts

### Backend DTO

```typescript
export class PlanTratamientoReporteDto {
  id: number;
  tipoActivo: string;
  opcionTratamiento: string;
  controlesImplementar: string;
  descripcionActividades: string;
  responsablesImplementacion: string;
  areaFuncional: string;
  plazoImplementacion: string;
  fechaInicioImplementacion: Date | null;
  fechaFinImplementacion: Date | null;
  horaDia: number;
  montoUSD: string;
  estado: string;
  observaciones: string | null;
}
```

### Frontend type

```typescript
export interface PlanTratamientoReporte {
  id: number
  tipoActivo: string
  opcionTratamiento: string
  controlesImplementar: string
  descripcionActividades: string
  responsablesImplementacion: string
  areaFuncional: string
  plazoImplementacion: string
  fechaInicioImplementacion: string | null
  fechaFinImplementacion: string | null
  horaDia: number
  montoUSD: string
  estado: string
  observaciones: string | null
}
```

### Service signatures

```typescript
async getPlanTratamiento(
  filters: Record<string, string | undefined>,
): Promise<PlanTratamientoReporteDto[]>

async exportPlanTratamiento(
  filters: Record<string, string | undefined>,
  user?: { userId: string; username: string } | null,
  req?: { headers?: Record<string, string>; ip?: string },
): Promise<Buffer>
```

### Filter mapping

| Query param | Maps to | Condition |
|-------------|---------|-----------|
| `q` | `descripcionActividades`, `observaciones` | `contains` (both escaped) |
| `tipoActivoId` | `tipoActivoId` | equality |
| `opcionTratamientoId` | `opcionTratamientoId` | equality |
| `estadoId` | `estadoId` | equality |
| `plazoImplementacionId` | `plazoImplementacionId` | equality |
| `areaFuncionalId` | `areaFuncionalId` | equality |

`controlesImplementarId` and `responsableImplementacionId` are resolved with the existing `safeParseJsonArray` helper, then mapped to `ControlesImplementar.seccion + ' - ' + descripcion` and `Area.nombre` respectively. Malformed JSON falls back to empty string.

## Testing Strategy

| Layer | What to test | Approach |
|-------|--------------|----------|
| Unit | `getPlanTratamiento` filters, catalog enrichment, malformed JSON fallback | Jest mocks in `reportes.service.spec.ts` |
| Unit | `exportPlanTratamiento` buffer, headers style, `AuditService.log` call | Jest mocks; assert on returned `Buffer` and `auditService.log` |
| Integration | Controller returns correct `Content-Type`/`Content-Disposition` and index entries | `reportes.controller.spec.ts` or e2e supertest |
| E2E / Manual | Frontend page renders, filters apply, Excel downloads with active filters | Manual smoke test (no frontend test runner) |

## Migration / Rollout

No migration required. The feature reads the existing `PlanTratamiento` model and related catalogs. After deploy, restart backend and frontend containers to clear compiled bundles.

## Open Questions

None. The standalone plan list product decision is confirmed.
