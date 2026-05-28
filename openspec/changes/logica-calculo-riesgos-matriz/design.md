# Design: Lógica de Cálculo de Riesgos — Matriz EGSI v1.4

## Technical Approach

Implementar `calculateRiesgo()` como función pura exportable en `calculo-riesgo.service.ts`, integrarla en `ValoracionesService.create/update` para persistir campos derivados, y exponer `PATCH /valoraciones/:id/detalle/:detalleId/calcular` para preview. El frontend muestra preview reactiva en Tab 3 y badge residual en Tab 2 usando la API de cálculo.

**Mapping to Proposal**: Backend-first approach matches proposal intent. Función pura en `calculo-riesgo.service.ts` (no NestJS deps) satisfies TDD requirement. Endpoint de preview separado del save flow matches spec requirement.

## Architecture Decisions

### Decision: Pure function over NestJS service for calculation

| Option | Tradeoff | Decision |
|--------|----------|----------|
| NestJS service with DI | Testable via module mocking, follows Nest conventions | Coupling to PrismaService makes unit testing harder |
| Plain TypeScript function/class | Maximum testability, no framework coupling | ✅ CHOOSE THIS — `calculateRiesgo()` as exported pure function |

**Rationale**: Strict TDD mode (`strict_tdd: true` in config) requires writing tests BEFORE implementation. A pure function with no dependencies is trivially testable with Jest. NestJS service would require mocking PrismaService for every test.

### Decision: VA source for preview

| Option | Tradeoff | Decision |
|--------|----------|----------|
| CIA promedio del formulario padre | Non-invasive, no API change | ✅ Use for preview |
| VA stored explicitly in DetalleRiesgo row | Requires schema change | Out of scope per proposal |

**Rationale**: Proposal acknowledges "VA no está disponible en el create flow de DetalleRiesgo (per-row)" — fallback to CIA average is the pragmatic path. The preview endpoint accepts optional `VA` param so callers can override.

### Decision: Existing module structure (no DetalleRiesgoService separation)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Create `detalle-riesgo.service.ts` + controller | Clean separation of concerns | Requires new module registration in app.module |
| Keep logic in `ValoracionesService` | Simpler, less churn | ✅ Keep in ValoracionesService; calculateRiesgo() is the separate testable unit |

**Rationale**: The codebase has no `detalle-riesgo.service.ts` today — all logic lives in `valoraciones.service.ts`. Creating a new service file would require new module wiring. The calculation logic IS the separation (pure function), not a new service class.

### Decision: PATCH endpoint path — where to place it

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `PATCH /detalle-riesgo/:id/calcular` (separate route) | Clear separation | Requires new controller or route registration |
| `PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular` (nested) | Follows existing resource hierarchy | ✅ Follows existing `valoraciones` controller pattern |

**Rationale**: All existing endpoints are under `/valoraciones`. Adding a separate `detalle-riesgo` controller creates a second resource group for what is essentially a preview of the same data. Nesting under `/valoraciones` matches the existing API design.

## Data Flow

```
[Frontend Tab 3] ──blur──> [PATCH /valoraciones/:id/detalle/:detalleId/calcular]
                                    │
                                    ▼
                    [ValoracionesController.calcular()]
                                    │
                                    ▼
                    [calculateRiesgo(VA, nivelAmenaza, nivelVulnerabilidad)]
                       ── pure function, no DB call
                                    │
                                    ▼
                    { evaluacionRiesgo, nivelRiesgo, metodoTratamiento,
                      tipoControl, evaluacionRiesgoControl, nivelRiesgoControl,
                      riesgoResidual }
```

```
[Frontend Tab 2 — riskRows]
    │
    ├─ amenazaIds[] (array, not JSON string)
    ├─ vulnerabilidadIds[] (array, not JSON string)
    └─ controlesImplementados
           │
           ▼ syncRowsToDetalles() ──> [detallesRiesgo[]]
                                          │
                                          ▼ [create/update Valoracion]
                                                │
                                                ▼ [mapDetalleRiesgo → calculateRiesgo()]
                                                      │
                                                      ▼
                                              Prisma DetalleRiesgo table
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/valoraciones/calculo-riesgo.service.ts` | Create | Pure function `calculateRiesgo()`, exportable, 0 NestJS deps |
| `backend/src/valoraciones/calculo-riesgo.service.spec.ts` | Create | Jest tests covering all boundary values per spec |
| `backend/src/valoraciones/dto/calcular-detalle.dto.ts` | Create | DTO for PATCH body: `nivelAmenaza`, `nivelVulnerabilidad`, `VA` (optional) |
| `backend/src/valoraciones/valoraciones.service.ts` | Modify | Call `calculateRiesgo()` in `mapDetalleRiesgo()` for create/update |
| `backend/src/valoraciones/valoraciones.controller.ts` | Modify | Add `PATCH :id/detalles-riesgo/:detalleId/calcular` |
| `frontend/types/api.d.ts` | Modify | Add `RiesgoCalculado` interface; extend `DetalleRiesgo` with `riesgoResidual` |
| `frontend/components/ValoracionModal.vue` | Modify | Tab 3: reactive preview calling API on blur; Tab 2: badge for residual |
| `frontend/pages/valoracion.vue` | Modify | Connect API response to Tab 3 preview state |

## Interfaces / Contracts

### `calculo-riesgo.service.ts`

```typescript
export interface RiesgoCalculado {
  evaluacionRiesgo: number         // 1–27
  nivelRiesgo: string             // 'BAJO' | 'MEDIO' | 'ALTO'
  metodoTratamiento: string       // 'RETENER / ACEPTAR' | 'MODIFICAR / PREVENIR / COMPARTIR'
  tipoControl: string             // 'Monitoreo' | 'Preventivo' | 'Correctivo'
  evaluacionRiesgoControl: number
  nivelRiesgoControl: string
  riesgoResidual: string          // 'ACEPTABLE' | 'INACEPTABLE'
}

export function calculateRiesgo(
  va: number,
  nivelAmenaza: number,
  nivelVulnerabilidad: number,
  nivelAmenazaControl?: number,
  nivelVulnerabilidadControl?: number,
): RiesgoCalculado
```

### `PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular`

**Request body:**
```typescript
{
  nivelAmenaza: number      // required, 1–3
  nivelVulnerabilidad: number // required, 1–3
  VA?: number               // optional, defaults to CIA promedio
  nivelAmenazaControl?: number
  nivelVulnerabilidadControl?: number
}
```

**Response:**
```typescript
RiesgoCalculado
```

### Frontend type additions (`api.d.ts`)

```typescript
export interface RiesgoCalculado {
  evaluacionRiesgo: number
  nivelRiesgo: string
  metodoTratamiento: string
  tipoControl: string
  evaluacionRiesgoControl: number
  nivelRiesgoControl: string
  riesgoResidual: 'ACEPTABLE' | 'INACEPTABLE'
}

export interface DetalleRiesgo {
  // ... existing fields ...
  riesgoResidual?: 'ACEPTABLE' | 'INACEPTABLE'
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `calculateRiesgo()` — all formula combos and boundary values | `calculo-riesgo.service.spec.ts` with Jest. 100% coverage required before implementation. |
| Unit | `mapDetalleRiesgo()` calls `calculateRiesgo()` correctly | Mock `calculateRiesgo` in `valoraciones.service.spec.ts` |
| Integration | `PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular` | `valoraciones.e2e-spec.ts` — supertest |
| E2E | Full flow: create valoración → Tab 2 rows → preview → save | Smoke test via supertest |

**Boundary test cases (from spec):**
- (1,1,1) → evaluacionRiesgo=1, nivelRiesgo="BAJO"
- (3,1,1) → evaluacionRiesgo=3, nivelRiesgo="BAJO"
- (1,2,2) → evaluacionRiesgo=4, nivelRiesgo="MEDIO"
- (2,2,2) → evaluacionRiesgo=8, nivelRiesgo="MEDIO"
- (1,3,3) → evaluacionRiesgo=9, nivelRiesgo="ALTO"
- (3,3,3) → evaluacionRiesgo=27, nivelRiesgo="ALTO"

**Derivation tests:**
- nivelRiesgo: 1–3=BAJO, 4–8=MEDIO, 9–27=ALTO
- metodoTratamiento: 1–3=RETENER/ACEPTAR, 4–27=MODIFICAR/PREVENIR/COMPARTIR
- tipoControl: 1–3=Monitoreo, 4–8=Preventivo, 9–27=Correctivo
- riesgoResidual: evaluacionRiesgoControl ≤ 3 → ACEPTABLE, else INACEPTABLE

## Migration / Rollout

No migration required. Schema already has all necessary columns. New rows get calculated fields on create/update; existing rows remain unchanged until edited.

## Open Questions

- [ ] `nivelAmenaza` and `nivelVulnerabilidad` inputs: are they the `nivel` (1–3) from the `valRiesgos` catalog, or the `valor` field? The spec uses numeric levels 1–3 but the existing frontend code uses `amenazaRiesgoId` (catalog FK). Need to confirm: does the preview compute from catalog `valor` or from explicit level inputs?
- [ ] `riesgoResidual` persistence: spec says "no se persiste como columna" — confirm it is computed at query/display time only, not stored.