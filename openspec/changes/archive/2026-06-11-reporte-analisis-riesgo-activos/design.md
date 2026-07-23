# Design: Reporte de Análisis de Riesgo de Activos

## Technical Approach

Add a new `GET /reportes/analisis-riesgo-activos` endpoint that returns `DetalleRiesgo` rows enriched with human-readable names from `ValoracionActivo`, `Amenaza`, and `Vulnerabilidad`. Filtering is two-stage: `macroProcesoId` is resolved server-side by querying `ValoracionActivo` IDs first, then filtering `DetalleRiesgo` by `valoracionActivoId`. Threat/vulnerability/search filters are applied in-memory after JSON parsing and catalog enrichment. The frontend converts `pages/reportes.vue` from a single page into a tabbed interface with the existing “Valoración de Activos” and the new “Análisis de Riesgo de Activos” tab.

## Architecture Decisions

| Decision | Options | Trade-offs | Choice |
|----------|---------|------------|--------|
| Schema change for DetalleRiesgo ↔ ValoracionActivo relation | Add `@relation` in Prisma schema | Enables nested `where`/`include`, but requires migration and schema change | **No schema change** — resolve `macroProcesoId` by querying `ValoracionActivo` IDs first, then `DetalleRiesgo` with `in: [...]` |
| Threat/vulnerability filter layer | Raw SQL JSON functions | Database-specific, complex with MariaDB | **In-memory** after loading all catalogs into Maps; dataset < 1000 rows |
| JSON parsing of `amenazaIds`/`vulnerabilidadIds` | Custom parser | More control, more code | **`JSON.parse` with `try/catch`** — consistent with existing DTO validation; malformed records are skipped and logged |
| Frontend tab implementation | New page `/reportes/analisis-riesgo-activos` | Clean separation, but duplicates layout boilerplate | **Tabs inside `pages/reportes.vue`** — reuses existing sidebar+table layout and `useApi` pattern |

## Data Flow

```
Frontend (reportes.vue)
  │ debounced 300ms
  ▼
GET /reportes/analisis-riesgo-activos?q=…&macroProcesoId=…&amenazaId=…
  │
  ▼
ReportesController.getAnalisisRiesgoActivos(query)
  │
  ▼
ReportesService.getAnalisisRiesgoActivos(filters)
  ├─► Prisma: ValoracionActivo.findMany({ where: macroProcesoId, select: id })
  │     │
  │     ▼
  ├─► Prisma: DetalleRiesgo.findMany({ where: valoracionActivoId: { in: [...] } })
  ├─► Prisma: ValoracionActivo.findMany()   ──┐
  ├─► Prisma: Amenaza.findMany()            ├── In-memory enrichment
  ├─► Prisma: Vulnerabilidad.findMany()     ──┘
  │
  ▼
Enrich → Filter → Search → Sort
  │
  ▼
AnalisisRiesgoActivoDto[]  ──►  JSON 200
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/reportes/reportes.controller.ts` | Modify | Add `GET /reportes/analisis-riesgo-activos` handler |
| `backend/src/reportes/reportes.service.ts` | Modify | Add `getAnalisisRiesgoActivos()` with hybrid filtering and enrichment |
| `backend/src/reportes/dto/reporte-response.dto.ts` | Modify | Add `AnalisisRiesgoActivoDto` class |
| `frontend/pages/reportes.vue` | Modify | Convert to tabbed layout; add new tab, filters, table, and state |
| `frontend/types/api.d.ts` | Modify | Add `AnalisisRiesgoActivoReporte` interface |
| `backend/src/reportes/reportes.controller.spec.ts` | Modify | Add controller tests for new endpoint (query forwarding, HTTP 200, shape) |
| `backend/src/reportes/reportes.service.spec.ts` | Modify | Add service tests for `getAnalisisRiesgoActivos` (Prisma calls, JSON parsing, concatenated names, edge cases) |

## Interfaces / Contracts

```typescript
// backend/src/reportes/dto/reporte-response.dto.ts
export class AnalisisRiesgoActivoDto {
  id: number;
  nombreActivo: string;
  macroProceso: string;
  amenaza: string;
  vulnerabilidad: string;
  controlesImplementados: string | null;
  controlesArea: string | null;
}

// frontend/types/api.d.ts
export interface AnalisisRiesgoActivoReporte {
  id: number
  nombreActivo: string
  macroProceso: string
  amenaza: string
  vulnerabilidad: string
  controlesImplementados: string | null
  controlesArea: string | null
}
```

**Query Parameters** (all optional, string-based from `@Query`):
- `q` — full-text search (case-insensitive, partial match)
- `macroProcesoId` — exact match via `ValoracionActivo`
- `categoriaAmenazaId` — in-memory filter on `Amenaza.categoria`
- `amenazaId` — in-memory filter on parsed `amenazaIds`
- `categoriaVulnerabilidadId` — in-memory filter on `Vulnerabilidad.categoria`
- `vulnerabilidadId` — in-memory filter on parsed `vulnerabilidadIds`

**Search Logic** (in-memory after enrichment):
- Lowercase `q` and test against `nombreActivo`, `amenaza`, and `vulnerabilidad`.
- Escape `\` and `_` is not required for in-memory string search; Prisma `contains` escaping is only used when `q` is pushed to the DB layer. Since `macroProcesoId` is exact and `nombreActivo` search is in-memory, no SQL LIKE escaping is needed.

**Sorting**: Always by `nombreActivo` ascending.

**Error Handling**: Malformed JSON in `amenazaIds`/`vulnerabilidadIds` is caught, logged, and the record is treated as having no IDs for filtering purposes (included if no threat/vulnerability filter applies, otherwise excluded).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — Controller | `GET /reportes/analisis-riesgo-activos` returns 200, forwards query params, matches DTO shape | Extend existing `reportes.controller.spec.ts` with mocked service method |
| Unit — Service | `getAnalisisRiesgoActivos` calls Prisma correctly, enriches names, concatenates multiple threats, handles malformed JSON, applies combined filters | Extend existing `reportes.service.spec.ts` with mocked Prisma and new helper factories |
| Integration | Endpoint with real DB (optional) | Deferred; unit coverage is sufficient given the TDD requirement and small scope |
| E2E | Frontend tab loads and filters | Manual verification; no frontend test runner available |

## Migration / Rollout

No migration required. The change is purely additive: new endpoint, new DTO, new frontend tab. No schema or data changes.

## Open Questions

- None
