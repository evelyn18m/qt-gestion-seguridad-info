# Proposal: Risk Heatmap Endpoint

## Intent

Provide a `GET /reportes/heatmap` endpoint that aggregates `ValoracionActivo` assessments into a 3x3 heatmap matrix compatible with ApexCharts. The frontend already expects this exact format — the backend is the missing piece.

## Scope

### In Scope
- **Prisma migration**: Add `valor: Int` to `Probabilidad` model (3=Alto, 2=Medio, 1=Bajo)
- **Seed update**: Populate `Probabilidad.valor` in `prisma/seed.ts`
- **Service method**: `getHeatmap()` in `reportes.service.ts` — aggregate assets into matrix cells
- **Controller route**: `GET /reportes/heatmap` returning `HeatmapReporteDto`
- **DTOs**: `HeatmapCellDto`, `HeatmapSerieDto`, `HeatmapReporteDto` in `reporte-response.dto.ts`
- **Report index entry**: Add heatmap route to the `GET /reportes` endpoint index
- **Unit tests**: Service and controller tests following existing factory patterns

### Out of Scope
- Frontend chart rendering (already built)
- Risk-level thresholds in heatmap (count matrix only; thresholds from `calculo-riesgo` align with existing system conventions)
- ISO 27005 compliance labeling

## Capabilities

### New Capabilities
- `reporte-heatmap`: `GET /reportes/heatmap` returning a 3x3 count matrix (Probabilidad × Impacto Final) in ApexCharts series format

### Modified Capabilities
- `reportes-index`: Add `{ ruta: "GET /reportes/heatmap", descripcion: "Mapa de calor 3x3 de riesgos (Probabilidad × Impacto)" }` to the endpoint index

## Approach

Add to existing `reportes` module — consistent with all other analytical endpoints under `/reportes/*`.

**Query logic**: Fetch all `ValoracionActivo` with their CIA `Impacto` and `Probabilidad` records. Skip assets where `probabilidadId` IS NULL (no default). For each asset:
1. Read `Probabilidad.valor` (new column, 1–3) for X-axis
2. Compute `impactoFinal = max(C.valor, I.valor, D.valor)` from joined `Impacto` rows for Y-axis
3. Increment cell `[impactoFinal][probabilidadValor]` count

**Response format**: Array of `HeatmapSerieDto` sorted descending by impact (3→1), each with `data: HeatmapCellDto[]` containing `{ x, y }` for all three probability columns:

```json
[
  { "name": "3. Alto", "data": [{ "x": "1. Bajo", "y": 0 }, { "x": "2. Medio", "y": 4 }, { "x": "3. Alto", "y": 2 }] },
  { "name": "2. Medio", "data": [{ "x": "1. Bajo", "y": 1 }, { "x": "2. Medio", "y": 0 }, { "x": "3. Alto", "y": 5 }] },
  { "name": "1. Bajo", "data": [{ "x": "1. Bajo", "y": 10 }, { "x": "2. Medio", "y": 2 }, { "x": "3. Alto", "y": 0 }] }
]
```

**Threshold alignment**: Uses the same system thresholds as `calculo-riesgo.service.ts` (1–3=Bajo, 4–8=Medio, 9–27=Alto) for any future risk-level overlay. The heatmap itself is a count matrix.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `valor Int` to `Probabilidad` model |
| `prisma/seed.ts` | Modified | Set `valor` for each Probabilidad record |
| `src/reportes/dto/reporte-response.dto.ts` | Modified | Add 3 heatmap DTO classes |
| `src/reportes/reportes.service.ts` | Modified | Add `getHeatmap()` method |
| `src/reportes/reportes.controller.ts` | Modified | Add `GET /reportes/heatmap` route + index entry |
| `src/reportes/reportes.service.spec.ts` | Modified | Add `getHeatmap()` unit tests |
| `src/reportes/reportes.controller.spec.ts` | Modified | Add heatmap route tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Probabilidad.seed hardcodes values, diverging from DB state | Low | Seed maps by `nombre` not position; explicit `{ nombre, valor }` tuples |
| Null probabilidadId omits assets from heatmap (unexpected) | Low | Documented behavior; controller spec validates empty-DB returns all-zero matrix |
| Migration adds NOT NULL column to existing table | Low | Migration includes default value; seed populates all rows immediately |

## Rollback Plan

1. Delete `GET /reportes/heatmap` route and `getHeatmap()` method
2. Remove heatmap DTOs from `reporte-response.dto.ts`
3. Remove entry from `GET /reportes` index array
4. *Migration only*: generate down migration to drop `Probabilidad.valor` column
5. Revert seed to original signature

## Dependencies

- Prisma migration must run before `npm run start:dev` (schema sync)
- No external services or new npm packages required

## Success Criteria

- [ ] `GET /reportes/heatmap` returns 3x3 count matrix in ApexCharts format
- [ ] Assets with null `probabilidadId` are excluded from counts
- [ ] Matrix is sorted descending by impacto final (3→1)
- [ ] `GET /reportes` index includes the new heatmap route entry
- [ ] All backend unit tests pass (`npm run test`)
- [ ] Migration applied cleanly (`npx prisma migrate dev`)
