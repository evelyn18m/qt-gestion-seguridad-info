# Design: Reporte de Valoración de Activos con Filtros y Búsqueda

## Technical Approach

Add a new `GET /reportes/valoracion-activos` endpoint that returns a server-side filtered, searchable list of asset valuations with enriched relation names. Use Prisma `findMany` with `where` conditions for filtering and a single query per related table to avoid N+1 (since the schema lacks relation fields on `ValoracionActivo`, `include` is not possible). The frontend adds a new tab in `reportes.vue` with a reactive table, search input with 300ms debounce, and dropdown filters.

## Architecture Decisions

| Decision | Options | Trade-offs | Choice |
|---|---|---|---|
| Relation enrichment | `include` vs batch fetch + map | Schema lacks relation fields on `ValoracionActivo`; `include` is impossible. Batch fetch avoids N+1 with minimal code. | Batch fetch + in-memory map |
| Search case sensitivity | `mode: 'insensitive'` vs rely on MySQL collation | `mode` has limited DB support; project uses MySQL/MariaDB with default case-insensitive collation. | Rely on collation + `contains` |
| DTO shape | Class with decorators vs plain class | No `class-validator` installed in project; plain class matches existing DTO pattern. | Plain class / interface |
| Frontend debounce | `useDebounce` (VueUse) vs manual `setTimeout` | No VueUse dependency; manual adds ~5 lines of code. | Manual `setTimeout` |
| Filter query params | All as `string` via `@Query()` vs `ParseIntPipe` | IDs are optional; parsing empty strings to `NaN` is risky. Keep as strings and cast in service. | Strings via `@Query()`, cast in service |

## Data Flow

    User types / selects filter
           ↓
    frontend/pages/reportes.vue (reactive params + debounce)
           ↓
    useApi().get('/reportes/valoracion-activos', { params })
           ↓
    ReportesController @Get('valoracion-activos') @Query()
           ↓
    ReportesService.getValoracionActivos(filters)
           ↓
    Prisma: findMany ValoracionActivo (where)
    Prisma: findMany TipoActivo, Formato, MacroProceso, Funcionario, Impacto (batch)
           ↓
    In-memory map + DTO transform
           ↓
    HTTP 200 JSON → frontend table

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/reportes/reportes.controller.ts` | Modify | Add `@Get('valoracion-activos')` with `@Query()` params forwarding to service |
| `backend/src/reportes/reportes.service.ts` | Modify | Add `getValoracionActivos(filters)` with Prisma `where` + batch enrichment of all relations |
| `backend/src/reportes/dto/reporte-response.dto.ts` | Modify | Add `ValoracionActivoReporteDto` with string name fields (no IDs) |
| `backend/src/reportes/reportes.controller.spec.ts` | Modify | Add TDD tests for new endpoint: HTTP 200, query param forwarding, response shape |
| `backend/src/reportes/reportes.service.spec.ts` | Modify | Add TDD tests for `getValoracionActivos`: `findMany` `where` clause, batch enrichment, DTO mapping, empty result, special char escape |
| `frontend/pages/reportes.vue` | Modify | Add tab 5 with table, search input, dropdown filters, empty state, and `useApi` integration |
| `frontend/types/api.d.ts` | Modify | Add `ValoracionActivoReporte` interface with all enriched string fields |

## Interfaces / Contracts

```typescript
// backend/src/reportes/dto/reporte-response.dto.ts
export class ValoracionActivoReporteDto {
  id: number;
  nombreActivo: string;
  ubicacion: string;
  tipoActivo: string;
  formato: string;
  macroProceso: string;
  custodio: string;
  confidencialidad: string;
  integridad: string;
  disponibilidad: string;
}

// frontend/types/api.d.ts
export interface ValoracionActivoReporte {
  id: number;
  nombreActivo: string;
  ubicacion: string;
  tipoActivo: string;
  formato: string;
  macroProceso: string;
  custodio: string;
  confidencialidad: string;
  integridad: string;
  disponibilidad: string;
}

// Query parameters (controller receives these as strings)
interface ValoracionActivosQuery {
  q?: string;                    // search text (nombreActivo OR ubicacion)
  macroProcesoId?: string;
  formatoId?: string;
  custodioId?: string;
  confidencialidadId?: string;
  integridadId?: string;
  disponibilidadId?: string;
}
```

### Prisma `where` contract (service)

```typescript
const where: Prisma.ValoracionActivoWhereInput = {
  AND: [
    // Exact filters (only include if present)
    macroProcesoId ? { macroProcesoId: Number(macroProcesoId) } : undefined,
    formatoId ? { formatoId: Number(formatoId) } : undefined,
    custodioId ? { custodioId: Number(custodioId) } : undefined,
    confidencialidadId ? { confidencialidadId: Number(confidencialidadId) } : undefined,
    integridadId ? { integridadId: Number(integridadId) } : undefined,
    disponibilidadId ? { disponibilidadId: Number(disponibilidadId) } : undefined,
    // Search filter
    q ? {
      OR: [
        { nombreActivo: { contains: escapedQ } },
        { ubicacion: { contains: escapedQ } },
      ],
    } : undefined,
  ].filter(Boolean),
};
```

> **Escape rule**: Before passing `q` to Prisma, replace `%` → `\%` and `_` → `\_` to prevent SQL wildcard injection. Prisma's `contains` generates `LIKE '%q%'` under the hood.

### Batch enrichment strategy

```typescript
// Fetch all related catalogs in parallel (single query each)
const [tipoActivos, formatos, macroProcesos, funcionarios, impactos] = await Promise.all([
  prisma.tipoActivo.findMany(),
  prisma.formato.findMany(),
  prisma.macroProceso.findMany(),
  prisma.funcionario.findMany(),
  prisma.impacto.findMany(),
]);

// Build lookup maps
const tipoActivoMap = new Map(tipoActivos.map(t => [t.id, t.nombre]));
const impactoMap = new Map(impactos.map(i => [i.id, i.nombre]));
// ... etc

// Map each ValoracionActivo to DTO
return valuations.map(va => ({
  id: va.id,
  nombreActivo: va.nombreActivo,
  ubicacion: va.ubicacion,
  tipoActivo: tipoActivoMap.get(va.tipoActivoId) ?? 'Desconocido',
  // ... etc
}));
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Controller: query param forwarding, HTTP 200, response shape | Jest mock `ReportesService` with `jest.fn()` |
| Unit | Service: `findMany` called with correct `where` shape, batch enrichment, DTO mapping, empty result, special char escape | Jest mock `PrismaService` models; assert `findMany` args and return shape |
| Integration | Full request/response cycle | Optional — not in scope per spec (no frontend tests) |

## Migration / Rollout

No migration required. No database schema changes. No feature flags needed.

## Open Questions

- [ ] How many `ValoracionActivo` records exist today? If >500, pagination should be added in a follow-up PR.
- [ ] Should the search query escape `%` and `_` as literal characters? (Spec says yes — implement via `replaceAll` before passing to Prisma.)
