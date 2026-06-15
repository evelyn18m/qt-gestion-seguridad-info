## Exploration: modulo-parametrizacion

### Current State

The SGSI system currently has:

- **`/valoracion` frontend page**: Displays a data table with columns: Nro, Nombre de Activo, Macroproceso, Valoración CIA, Acciones. No consolidated risk-level view across all assets.
- **`ValoracionViewModal` component**: Shows per-asset detail with CIA levels, análisis de riesgos, evaluación de riesgos (per-row DetalleRiesgo table), and tratamiento de riesgo. This already displays the four dimensions the user wants (CIA, riesgo, riesgo con control, riesgo residual) but only ONE asset at a time.
- **`GET /valoraciones` backend endpoint**: Returns all `ValoracionActivo` records enriched with CIA objects (confidencialidad, integridad, disponibilidad — each with `nivel` and `valor` fields), `detallesRiesgo` array (including `riesgoResidual` per row), and computed fields (`evaluacionRiesgo`, `nivelRiesgo`, `evaluacionRiesgoControl`, `nivelRiesgoControl`).
- **No existing "parametrizacion"** module, page, endpoint, or reference exists anywhere in the codebase.

### Affected Areas

- `backend/src/valoraciones/valoraciones.controller.ts` — existing `GET /valoraciones` already returns all needed data; no changes needed
- `backend/src/valoraciones/valoraciones.service.ts` — `enrich()` method (L299-354) already joins CIA + DetalleRiesgo; no changes needed
- `backend/src/valoraciones/calculo-riesgo.service.ts` — risk calculation logic (formula: VA × nivelAmenaza × nivelVulnerabilidad); reference only
- `frontend/pages/valoracion.vue` — existing asset list page; could be extended or a new page created
- `frontend/components/ValoracionViewModal.vue` — existing detail modal showing CIA + risk + control risk + residual; serves as UI reference
- `frontend/layouts/default.vue` — sidebar navigation; needs a new `NuxtLink` entry for parametrizacion
- `frontend/types/api.d.ts` — may need extension for a parametrizacion-specific DTO (optional; existing `ValoracionActivo` type already covers all fields)

### Key Findings

#### 1. Prisma Data Model — All Four Dimensions Present

The `ValoracionActivo` table (schema.prisma L95-136) contains:
- **CIA fields**: `confidencialidadId`, `integridadId`, `disponibilidadId` → FKs to `Impacto` table (which has `tipo`, `nivel`, `valor`, `criterio`). CIA is per-asset (not per-threat/vuln row).
- **Risk fields**: `evaluacionRiesgo` (Float), `nivelRiesgo` (String: BAJO/MEDIO/ALTO) — these are legacy aggregate fields on the VA record.
- **Control risk fields**: `evaluacionRiesgoControl` (Float), `nivelRiesgoControl` (String) — legacy aggregate on the VA record.
- **Residual risk**: NOT on the VA record directly; it lives on each `DetalleRiesgo` row as `riesgoResidual` (ACEPTABLE/INACEPTABLE). Must be aggregated from child rows.

The `DetalleRiesgo` table (schema.prisma L138-164) contains per-threat/vulnerability-row fields:
- `evaluacionRiesgo`, `nivelRiesgo` (before control)
- `evaluacionRiesgoControl`, `nivelRiesgoControl` (after control)
- `riesgoResidual` (ACEPTABLE/INACEPTABLE) — **this is where residual risk lives**

> **Important**: When the user says "Riesgo residual", this data comes from `DetalleRiesgo.riesgoResidual`, not from the `ValoracionActivo` record itself. Per-asset residual risk must be derived (e.g., worst-case: if any DetalleRiesgo has INACEPTABLE, the asset's residual is INACEPTABLE).

#### 2. Risk Calculation Logic

`calculo-riesgo.service.ts` (`calculateRiesgo()` pure function):
```
Risk = VA × nivelAmenaza × nivelVulnerabilidad
  VA defaults to 3 (CIA average fallback)
  Each factor is 1-3 (mapped from Riesgo catalog's valor field)

Level derivation:
  evaluacion ≤ 3  → BAJO,     metodo: RETENER/ACEPTAR, tipoControl: Monitoreo
  evaluacion ≤ 8  → MEDIO,    metodo: MODIFICAR/PREVENIR/COMPARTIR, tipoControl: Preventivo
  evaluacion > 8  → ALTO,     metodo: MODIFICAR/PREVENIR/COMPARTIR, tipoControl: Correctivo

Control risk: VA × nivelAmenazaControl × nivelVulnerabilidadControl
Residual risk: evaluacionRiesgoControl ≤ 3 → ACEPTABLE, >3 → INACEPTABLE
```

Risk calculation happens server-side in `mapDetalleRiesgo()` (valoraciones.service.ts L276-294) when creating/updating DetalleRiesgo rows. The `GET /valoraciones` endpoint returns already-computed values.

#### 3. Existing Endpoints — All Data Already Available

| Endpoint | Returns | Covers |
|---|---|---|
| `GET /valoraciones` | Array of VA with CIA objects + detallesRiesgo[] | CIA, riesgo, riesgo control, residual (per row) |
| `GET /valoraciones/:id` | Single VA fully enriched | All four dimensions |
| `GET /reportes/cia` | Aggregate CIA distribution | CIA aggregation only |
| `GET /reportes/riesgos-por-activo` | Flattened view with riesgoResidual | Risk + residual per asset |

**The existing `GET /valoraciones` endpoint already returns all four dimensions the user wants.** No new backend endpoint is strictly needed.

#### 4. Frontend Display Patterns

- Data table pattern: simple HTML `<table class="val-table">` with `v-for` iteration (valoracion.vue L667-714)
- API fetching: `useApi().apiFetch<T>(path)` composable with Keycloak token injection (useApi.ts)
- Modal pattern: teleported overlay with `v-model` two-way binding (ValoracionViewModal.vue)
- Nivel badges: `getNivelStyle()` returns `{label, color, bg}` for color-coded badges
- Navigation: `NuxtLink` entries in `default.vue` sidebar

#### 5. Module Structure Patterns

Backend modules (e.g., valoraciones, reportes, catalogos) follow identical structure:
```
src/{module}/
  {module}.module.ts      # @Module({ controllers, providers })
  {module}.controller.ts  # @Controller('route')
  {module}.service.ts     # @Injectable() + PrismaService
  dto/                    # Request/response DTOs
```

#### 6. Data Relationships

```
ValoracionActivo
  ├── FK → Impacto (confidencialidadId, integridadId, disponibilidadId)
  ├── FK → TipoActivo, Formato, MacroProceso, Subproceso, Area (propietario), Funcionario (custodio)
  ├── Direct fields: evaluacionRiesgo, nivelRiesgo, evaluacionRiesgoControl, nivelRiesgoControl
  └── Has-many → DetalleRiesgo (valoracionActivoId)
       ├── riesgoResidual (ACEPTABLE / INACEPTABLE)
       ├── FK → Riesgo (riesgoId, vulnerabilidadRiesgoId, riesgoControlId, vulnerabilidadControlId)
       ├── FK → ControlesImplementar (controlesImplementarId)
       └── FK → TipoControl (tipoControlId)

Impacto model: id, tipo (Confidencialidad/Integridad/Disponibilidad), nivel (Alto/Medio/Bajo), valor (3/2/1), criterio
```

### Approaches

1. **Frontend-only: New `/parametrizacion` page** — Create a new Nuxt page that fetches `GET /valoraciones` and renders a consolidated data table with all four dimensions. No backend changes needed.

   - **Pros**: Minimal scope; zero backend risk; reuses existing API; fastest delivery; all data already in API response.
   - **Cons**: No backend validation or dedicated endpoint; relies on client-side aggregation for residual risk (must derive from DetalleRiesgo rows).
   - **Effort**: Low

2. **Extend existing `/valoracion` page** — Add a "Parametrización" tab or expand the table columns on the existing `valoracion.vue` page to show CIA + riesgo + riesgo control + residual.

   - **Pros**: No new page/routes; consolidates the workflow; users see everything in one place.
   - **Cons**: The existing page is already complex (1008 lines) with 4-tab modal; adding more columns would clutter the table; potential UX degradation.
   - **Effort**: Low-Medium

3. **New backend module `parametrizacion` + frontend page** — Create a dedicated NestJS module with a `/parametrizacion` endpoint that returns a flattened, pre-aggregated view of all assets with CIA, riesgo, riesgo control, and derived residual risk per asset. New frontend page consumes it.

   - **Pros**: Clean separation of concerns; dedicated endpoint with server-side aggregation; proper REST design; testable backend.
   - **Cons**: More code; new Prisma queries; new DTOs; more files to maintain; over-engineered for read-only data that already exists.
   - **Effort**: Medium

4. **Extend reportes module** — Add a `GET /reportes/parametrizacion` endpoint that returns a consolidated parametrization view, similar to existing reporte endpoints.

   - **Pros**: Follows existing reporte patterns; server-side aggregation; consistent with `GET /reportes/riesgos-por-activo`.
   - **Cons**: Doesn't need the heavy filtering/export logic of reportes; overlaps with existing valoraciones endpoint.
   - **Effort**: Medium

### Recommendation

**Approach 1: Frontend-only new `/parametrizacion` page.**

The strongest reason: **all four data dimensions already exist in the `GET /valoraciones` API response.** The endpoint already returns:
- `confidencialidad.nivel` / `confidencialidad.valor` (and same for integridad, disponibilidad)
- `evaluacionRiesgo` / `nivelRiesgo`
- `evaluacionRiesgoControl` / `nivelRiesgoControl`
- `detallesRiesgo[].riesgoResidual` (must be aggregated per asset)

Creating a new NestJS module would add unnecessary complexity for a read-only view. The frontend-only approach:
1. Creates `frontend/pages/parametrizacion.vue` — a data table with columns: Activo, Macroproceso, CIA (C/I/D with levels), Nivel Riesgo, Nivel Riesgo Control, Riesgo Residual
2. Adds a sidebar link in `default.vue`
3. Optionally adds a simple backend aggregation endpoint later if performance becomes an issue (unlikely with current data volumes)

If the team later needs filtering, sorting, or export, a dedicated backend endpoint can be added incrementally following the reportes module pattern.

### Risks

- **Residual risk aggregation**: `riesgoResidual` is per-DetalleRiesgo row, not per-asset. The frontend must derive a per-asset residual (e.g., worst-of: if any row is INACEPTABLE → INACEPTABLE, else ACEPTABLE). This logic must be consistent with how the backend interprets it.
- **Table performance**: If there are hundreds of assets, the client-side aggregation of DetalleRiesgo rows could be slow. Mitigation: lazy-load detail on expand, or paginate.
- **Scope creep**: "Parametrización" is a vague term. Clarify with the user whether this includes editing capabilities (re-assigning CIA levels, risk levels) or is strictly read-only.

### Ready for Proposal

**Yes** — Proceed to `sdd-propose` for `modulo-parametrizacion`. Define scope as: a new read-only frontend page displaying all four risk dimensions per asset in a consolidated data table, consuming the existing `GET /valoraciones` endpoint.
