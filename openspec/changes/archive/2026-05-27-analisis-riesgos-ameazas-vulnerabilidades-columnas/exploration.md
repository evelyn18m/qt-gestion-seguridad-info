## Exploration: análisis-riesgos-ameazas-vulnerabilidades-columnas

### Current State

The **"Análisis de Riesgos" (Tab 2)** of `ValoracionModal.vue` currently uses a **flat chip-list layout**:
- Two independent arrays: `analisisForm.amenazas: number[]` and `analisisForm.vulnerabilidades: number[]`
- All selected threats are listed together; all vulnerabilities are listed together — separately
- The `controlesImplementacion` text field is a single shared field for the entire valoración
- The relationship is implicit: every amenaza is paired with every vulnerabilidad (Cartesian product via `rebuildDetalles`)

This models a **many-to-many cartesian product** but displays it as two independent flat lists.

### Affected Areas

- `frontend/components/ValoracionModal.vue` — Tab 2 layout and form data model (most affected)
- `frontend/pages/valoracion.vue` — Form state, `rebuildDetalles()`, submit payload construction, and edit loading
- `frontend/types/api.d.ts` — `DetalleRiesgo` interface likely needs a new field
- `backend/src/valoraciones/dto/create-valoracion.dto.ts` — `DetalleRiesgoDto` extension
- `backend/prisma/schema.prisma` — `DetalleRiesgo` model: add `controlesImplementados? String`, `amenazaIds? String`, `vulnerabilidadIds? String` (all `@db.Text`)
- `backend/src/valoraciones/valoraciones.service.ts` and controller — parse/store the new fields

### Approaches

1. **Row-level relational (Prisma native)** — Add `amenazaIds`, `vulnerabilidadIds`, `controlesImplementados` as `@db.Text` JSON columns to `DetalleRiesgo`. Each `DetalleRiesgo` row explicitly holds its own amenaza+ vulnerabilidad set + controls. Flat arrays on `ValoracionActivo` are replaced by the row data.
   - Pros: Normalized; each row is self-contained; existing `DetalleRiesgo` rows already hold per-item risk evaluation
   - Cons: Requires schema migration; data from existing rows needs a one-time migration to populate the new columns
   - Effort: Medium

2. **Flat array on `ValoracionActivo` (minimal change)** — Keep `amenazas` and `vulnerabilidades` JSON array columns on `ValoracionActivo` as-is (they represent the catalog picks). Add only `controlesImplementacion` per `DetalleRiesgo` row (currently it doesn't exist there). Render each `DetalleRiesgo` row as the new column-based row with its amenaza+ vulnerability cell + controles text.
   - Pros: Minimal schema change; only adds one `controlesImplementacion? @db.Text` to `DetalleRiesgo`
   - Cons: `DetalleRiesgo` rows still don't know which specific amenazas/vulnerabilidades they group — relies on catalog array membership mapping
   - Effort: Low

### Recommendation

**Approach 2 (minimal extension) + a new data structure for the new UI**: The user wants a table where each row explicitly contains a specific amenaza-vulnerabilidad combo with its own `controles implementados` text. Since `DetalleRiesgo` already stores a single `catalogoId` + `tipo`, the cleanest path is to:

1. Add `controlesImplementados String? @db.Text` to `DetalleRiesgo`
2. Keep `amenazas`/`vulnerabilidades` JSON strings on `ValoracionActivo` for backward compatibility (they represent the raw catalog selections)
3. In the UI, pre-seed `DetalleRiesgo` rows from the catalog picks (via `rebuildDetalles`), but also attach amenaza+ vulnerabilidad lists per row for display purposes
4. The column-based table in Tab 2 renders each item as `Amenaza(s) | Vulnerabilidad(s) | Controles Implementados` — where the amenaza/vulnerabilidad columns can show multiple chips per cell

The backend stores controls at the `DetalleRiesgo` level when the user edits. This matches the existing `DetalleRiesgo` row granularity (one item per row in Tab 3).

### Risks

- The current `rebuildDetalles()` function creates one `DetalleRiesgo` per catalog item (amenaza OR vulnerabilidad). The new model may want one row per combination. Clarify: should each **row** be a unique (amenaza set × vulnerabilidad set) combination, or is each row still one item but with a controles field?
- Backward compatibility: existing saved data uses flat JSON arrays — a migration/adapter is needed to load old records into the new row structure
- The JSON string columns (`amenazas`, `vulnerabilidades` on `ValoracionActivo`) become redundant if all risk data moves into `DetalleRiesgo` rows — consider deprecating but not removing them yet

### Ready for Proposal

**Yes, but clarification needed on exact row semantics**: The core ask (column layout + controles per row) is clear. Before proposing, confirm: does each row represent one specific amenaza + one specific vulnerabilidad combination, or does it remain one-item-per-row where the cell can contain multiple chips? The data model implications differ significantly. With that answer, `sdd-propose` can proceed with a full scope and approach definition.
