# Design: Drill-down en gráficos del dashboard

## Technical Approach

Reutilizar el panel expandible de `mapa-calor.vue` en el dashboard para mostrar detalles al hacer clic en los gráficos. Agregar manejadores `dataPointSelection` de ApexCharts a los tres gráficos interactivos. Los drill-downs de CIA y nivel de riesgo consultarán al backend con filtros opcionales; el drill-down del gráfico de barras filtrará los datos ya cargados en el cliente.

## Architecture Decisions

### CIA filter strategy

| Option | Tradeoff | Decision |
|---|---|---|
| Prisma where clause on Impacto IDs | One extra query, efficient, matches existing catalog-resolution pattern | ✅ Chosen |
| In-memory filter after enrichment | Simpler, but loads all assets every time | Rejected |

### Risk level filter strategy

| Option | Tradeoff | Decision |
|---|---|---|
| Prisma where clause on `nivelRiesgo` | Efficient, case-insensitive via `equals` + `mode: 'insensitive'` | ✅ Chosen |
| In-memory filter | Loads all assets | Rejected |

### Frontend panel

| Option | Tradeoff | Decision |
|---|---|---|
| Inline panel in `index.vue` | Minimal changes, reuses existing CSS | ✅ Chosen |
| New reusable component | Better for future reuse, but more files | Rejected for this change |

### Bar chart drill-down

| Option | Tradeoff | Decision |
|---|---|---|
| Client-side filter of `analisisRiesgo` | No extra request, instant | ✅ Chosen |
| New backend endpoint | Unnecessary, data already loaded | Rejected |

### Validation

| Option | Tradeoff | Decision |
|---|---|---|
| Manual controller validation | Matches existing `heatmap/cell` pattern | ✅ Chosen |
| DTO/class-validator | More code, not used in this controller | Rejected |

## Data Flow

```
User clicks chart segment
        │
        ▼
ApexCharts dataPointSelection event
        │
        ├── CIA ──► resolve dimension + nivel ──► GET /reportes/valoracion-activos?dimension=X&nivel=Y
        ├── Risk ──► resolve nivelRiesgo ──► GET /reportes/riesgos-por-activo?nivelRiesgo=X
        └── Bar ──► resolve nombreActivo ──► filter analisisRiesgo client-side
                          │
                          ▼
              open single drill-down panel
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/reportes/reportes.controller.ts` | Modify | Accept/forward query params; validate `dimension`/`nivel`/`nivelRiesgo` |
| `backend/src/reportes/reportes.service.ts` | Modify | Add CIA filter via Impacto IDs and risk-level filter in `getValoracionActivos`/`getRiesgosPorActivo` |
| `backend/src/reportes/reportes.service.spec.ts` | Modify | Cover new filters and empty results |
| `backend/src/reportes/reportes.controller.spec.ts` | Modify | Cover param forwarding and validation |
| `frontend/pages/index.vue` | Modify | Add drill-down state, event handlers, and inline panel |

## Interfaces / Contracts

Backend:
```typescript
// GET /reportes/valoracion-activos?dimension={confidencialidad|integridad|disponibilidad}&nivel={Muy Alto|Alto|Medio|Bajo|Muy Bajo}
// Response: ValoracionActivoReporteDto[]

// GET /reportes/riesgos-por-activo?nivelRiesgo={Alto|Medio|Bajo}
// Response: RiesgoPorActivoDto[]
```

Frontend union row for panel:
```typescript
type DrillDownRow =
  | { type: 'cia' | 'risk'; id: number; nombreActivo: string; macroProceso?: string; nivel?: string | null }
  | { type: 'bar'; nombreActivo: string; amenaza: string; vulnerabilidad: string; controlesImplementados: string | null }
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Service CIA filter | Mock `impacto.findMany` returning matching IDs, assert `valoracionActivo.findMany` called with correct `where` |
| Unit | Service risk filter | Mock `nivelRiesgo` value, assert filtered results |
| Unit | Controller | Assert query params forwarded; invalid values throw 400 |
| Manual | Frontend panel | Click each chart, verify panel content and single-open behavior |

## Migration / Rollout

No migration required. New query params are optional; existing behavior unchanged.

## Open Questions

- [ ] CIA levels in DB: current charts and `Impacto` seeding appear to use `Alto/Medio/Bajo`, while the spec allows five levels. Should the API accept all five and the UI only emit the three currently rendered, or should the charts be updated to show five levels?
