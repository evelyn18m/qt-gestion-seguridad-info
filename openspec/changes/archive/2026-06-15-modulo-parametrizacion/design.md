# Design: Parametrización — Consolidated Risk View

## Technical Approach

Frontend-only Nuxt page at `/parametrizacion` consuming `GET /valoraciones` (no backend changes). The `enrich()` method in `ValoracionesService` already joins `confidencialidad`, `integridad`, `disponibilidad` (Impacto rows with `nivel`), `macroProceso`, and `detallesRiesgo[]`. Client-side aggregation derives Riesgo Residual per asset via worst-of: INACEPTABLE if any `detallesRiesgo[].riesgoResidual === 'INACEPTABLE'`. Risk levels rendered as colored `<span>` badges via CSS classes.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| CIA data source | Joined Impacto objects from API | Load impactos catalog client-side | API already returns enriched Impacto rows with `nivel` field; no extra request needed |
| Badge rendering | CSS classes (`.badge-bajo`, etc.) | Inline `:style` via `getNivelStyle()` pattern | Simpler for read-only table; proposal explicitly specifies CSS class names; avoids function call overhead in tight loops |
| Residual aggregation | Client-side worst-of over `detallesRiesgo[]` | Server-side pre-computation | Pure read; no backend changes; logic is 3 lines; matches existing `calculo-riesgo.service.ts` threshold |
| TypeScript access for joined fields | `(va as any).confidencialidad?.nivel` with fallback | Extend `ValoracionActivo` interface | Existing type uses `[key: string]: any`; keeping existing types avoids drift; explicit cast is intentional |

## Data Flow

```
GET /valoraciones ──→ ValoracionesService.findAll()
                           │
                           ├── enrich(): joins confidencialidad, integridad,
                           │             disponibilidad (Impacto.nivel),
                           │             macroProceso, detallesRiesgo[]
                           │
                           ▼
                    ValoracionActivo[] (JSON)
                           │
                           ▼
              parametrizacion.vue (onMounted)
                           │
                           ├── va.confidencialidad?.nivel  → badge "C"
                           ├── va.integridad?.nivel        → badge "I"
                           ├── va.disponibilidad?.nivel    → badge "D"
                           ├── detallesRiesgo worst-of     → badge "Riesgo Residual"
                           └── va.macroProceso?.nombre     → text
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/pages/parametrizacion.vue` | **Create** | Read-only data table with `<script lang="ts" setup>`, imports `ValoracionActivo` + `useApi`, fetches on mount, renders 8-column table with loading/error/empty states |
| `frontend/layouts/default.vue` | **Modify** | Insert `<NuxtLink to="/parametrizacion">` between line 111 (`/valoracion`) and line 112 (`/reportes`) — 1 line add |

## Interfaces / Contracts

No new types. `ValoracionActivo` (existing) carries:
- `detallesRiesgo?: DetalleRiesgo[]` — each with `.nivelRiesgo`, `.nivelRiesgoControl`, `.riesgoResidual`
- Joined `confidencialidad/integridad/disponibilidad` — each Impacto with `.nivel` ("Bajo"|"Medio"|"Alto")
- `macroProceso?: { nombre: string }`

Key function signatures (in `<script setup>`):
- `getResidualRiesgo(va: ValoracionActivo): string` — worst-of aggregation
- `getNivelClass(nivel: string): string` — maps "BAJO"/"bajo"/"ACEPTABLE"/etc. → CSS class

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Page renders, columns show, badges match colors | Smoke test via `docker compose exec frontend npm run dev` |
| Manual | Empty state: delete all valoraciones, verify "No hay valoraciones registradas" | Direct DB or UI action |
| Manual | Error state: stop backend, verify error message + retry button | Stop backend container |
| Manual | Sidebar active class highlights `/parametrizacion` | Navigate and inspect |

> No automated test runner available in frontend (`config.yaml` confirms `unit.available: false`).

## Migration / Rollout

No migration required. Rollback: delete `parametrizacion.vue` + remove 1 sidebar line.

## Open Questions

None — all data fields present in existing API response; no backend ambiguity.
