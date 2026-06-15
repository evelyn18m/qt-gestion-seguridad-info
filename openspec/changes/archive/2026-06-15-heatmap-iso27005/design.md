# Design: Risk Heatmap Endpoint

## Technical Approach

Add `GET /reportes/heatmap` to the existing `reportes` module. Query `ValoracionActivo` with Prisma `include` (CIA `Impacto` + `Probabilidad`), aggregate into a 3×3 count matrix, and return ApexCharts-compatible series. No new modules, no new packages — follows the exact patterns of existing report endpoints.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Probability mapping | Add `valor Int @default(1)` column to `Probabilidad` model | String-based mapping (`nombre → valor`) is fragile. `Impacto` already has a `valor` column; consistency wins |
| Impact aggregation | `max(C.valor, I.valor, D.valor)` | Conservative risk assessment. Existing `getCia()` uses distribution by level, not aggregation — this is a new metric |
| Null probabilidadId | Skip assets without probability | No sensible default; documented behavior; controller spec validates all-zero matrix on empty DB |
| Response shape | `HeatmapSerieDto[]` sorted desc by impact | ApexCharts heatmap expects series-per-row format; `name` = row label, `data[].x` = col label, `data[].y` = count |

## Data Flow

```
GET /reportes/heatmap
  → ReportesController.getHeatmap()
    → ReportesService.getHeatmap()
      → prisma.valoracionActivo.findMany({ include: { confidencialidad, integridad, disponibilidad, probabilidad } })
      → filter(va => va.probabilidadId != null)
      → reduce: impactoFinal = max(C.valor, I.valor, D.valor), probValor = prob.valor
      → fill 3×3 Map with 0s, increment cell[impactoFinal][probValor]
      → build HeatmapSerieDto[] (impact 3→1), each with data: HeatmapCellDto[] (prob 1→3)
      → return
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add `valor Int @default(1)` to `Probabilidad` model |
| `prisma/seed.ts` | Modify | Change `Probabilidad` creates from `{ nombre }` to `{ nombre, valor }` tuples |
| `src/reportes/dto/reporte-response.dto.ts` | Modify | Add `HeatmapCellDto`, `HeatmapSerieDto`, `HeatmapReporteDto` |
| `src/reportes/reportes.service.ts` | Modify | Add `getHeatmap()` method + `PROBABILIDAD_LABELS`/`IMPACTO_LABELS` constants |
| `src/reportes/reportes.controller.ts` | Modify | Add `@Get('heatmap')` route + index entry |
| `src/reportes/reportes.service.spec.ts` | Modify | Add `makeProbabilidad()` factory + 5 test cases |
| `src/reportes/reportes.controller.spec.ts` | Modify | Add `getHeatmap` mock + 3 test cases |

## Prisma Schema Diff

```diff
 model Probabilidad {
   id        Int      @id @default(autoincrement())
   nombre    String   @db.Text
+  valor     Int      @default(1)
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt
 }
```

Migration command: `npx prisma migrate dev --name add_valor_to_probabilidad`

## DTOs

```ts
// reporte-response.dto.ts additions
export class HeatmapCellDto {
  x: string;  // probabilidad label
  y: number;  // count
}
export class HeatmapSerieDto {
  name: string;  // impacto label
  data: HeatmapCellDto[];
}
export type HeatmapReporteDto = HeatmapSerieDto[];
```

## Service Implementation

Constants at module top:
```ts
const PROBABILIDAD_LABELS: Record<number, string> = { 1: '1. Bajo', 2: '2. Medio', 3: '3. Alto' };
const IMPACTO_LABELS: Record<number, string> = { 1: '1. Bajo', 2: '2. Medio', 3: '3. Alto' };
```

`getHeatmap()`:
1. `vas = await prisma.valoracionActivo.findMany({ include: { confidencialidad: true, integridad: true, disponibilidad: true, probabilidad: true } })`
2. Filter `vas.filter(va => va.probabilidadId != null)`
3. Pre-initialize `cellMap: Record<string, number>` with all 9 `"imp-prob"` keys set to 0
4. For each VA: `impacto = Math.max(va.confidencialidad.valor, va.integridad.valor, va.disponibilidad.valor)`; `prob = va.probabilidad!.valor`; `cellMap[$`{impacto}_${prob}`]++`
5. Build series for impacto 3,2,1: each contains 3 cells with `x = PROBABILIDAD_LABELS[p]`, `y = cellMap[$`{i}_${p}`]`
6. Return `HeatmapSerieDto[]`
7. Full try/catch wrapping with `HttpException(HttpStatus.INTERNAL_SERVER_ERROR)`

## Testing Strategy

| Layer | Cases | Key Assertions |
|-------|-------|---------------|
| Service | 0 assets → all-zero 3×3 matrix | 3 series, each with 3 cells, all y=0 |
| Service | Assets with null probabilidad excluded | No counts from skipped assets |
| Service | Mixed assets produce correct counts | Exact cell values verified per impact×prob |
| Service | Prisma error → HttpException 500 | `.rejects.toThrow(HttpException)` |
| Service | Single asset at impact=3, prob=3 | Only [3][3] cell = 1, rest = 0 |
| Controller | HTTP 200 with correct body shape | 3 series, each with `name` and `data[].x/y` |
| Controller | Index includes heatmap entry | `endpoints` array contains expected route |
| Controller | Delegates to service.getHeatmap | `expect(service.getHeatmap).toHaveBeenCalled()` |

New factory in spec:
```ts
const makeProbabilidad = (id: number, nombre: string, valor: number) => ({
  id, nombre, valor, createdAt: new Date(), updatedAt: new Date(),
});
```

Service mock additions: `probabilidad: { findMany: jest.fn().mockResolvedValue([]) }` already unnecessary since we `include` — no separate probabilidad query needed.

Controller mock addition: `getHeatmap: jest.fn().mockResolvedValue(mockHeatmap)`

## Migration / Rollout

1. Run `docker compose exec backend npx prisma migrate dev --name add_valor_to_probabilidad`
2. Run seed: `docker compose exec backend ts-node prisma/seed.ts`
3. Deploy code; no feature flags needed
4. Rollback: reverse migration + remove route/DTO/method; revert seed

## Open Questions

None. All decisions resolved in proposal phase: prob mapping (column), impact aggregation (max), nullable handling (skip), thresholds (aligned with `calculo-riesgo` 1–3/4–8/9–27).
