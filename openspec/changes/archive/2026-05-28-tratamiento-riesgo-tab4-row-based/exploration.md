## Exploration: Tab 4 Tratamiento de Riesgo — Row-based Migration

### Current State

**Tab 4 today (per-item, lines 794–893):**

The two-column layout (Amenazas | Vulnerabilidades) renders `detallesAmenazas` and `detallesVulnerabilidades` filtered lists. Each `DetalleRiesgo` entry renders as its own table row, so a RiskRow containing `[A1, A2]` amenazas and `[V1]` vulnerabilidad produces **three separate entries** in `detallesRiesgo`:

```
Entry 1: tipo=amenaza, catalogoId=A1, amenazaIds=[A1,A2], vulnerabilidadIds=[V1], metodoTratamiento="...", tipoControlId=..., ...
Entry 2: tipo=amenaza, catalogoId=A2, amenazaIds=[A1,A2], vulnerabilidadIds=[V1], metodoTratamiento="...", tipoControlId=..., ...
Entry 3: tipo=vulnerabilidad, catalogoId=V1, amenazaIds=[A1,A2], vulnerabilidadIds=[V1], metodoTratamiento="...", tipoControlId=..., ...
```

`syncRowsToDetalles()` (lines 230–277) creates exactly this structure — one entry per amenaza + one per vulnerabilidad in each row, all sharing the same `amenazaIds[]`/`vulnerabilidadIds[]` arrays. This means:
- Editing `metodoTratamiento` on A1 **does not** propagate to A2 or V1 (unless the user manually fills each row)
- Tab 4 shows 3 separate rows instead of 1 unified RiskRow with all threats/vulnerabilidades listed

**Tabs 2/3 already use row-based display:**
- `riskRows[]` is the source of truth for which amenazas/vulnerabilidades belong together
- Tab 3 table iterates `riskRows` (not `detallesRiesgo`) and uses `findMatchedDetalle(row)` to pull evaluation data from the first matching entry
- Tab 4 needs the same: ONE row per `RiskRow`, not one row per entry

**Backend already supports row-based:**
- `Prisma.DetalleRiesgo` stores `amenazaIds`/`vulnerabilidadIds` as JSON text
- The backend DTO (`DetalleRiesgoDto`) serializes these as JSON strings via `JSON.stringify()`
- Each created entry gets the full array fields — no backend schema change needed

### Affected Areas

| File | Why |
|------|-----|
| `frontend/components/ValoracionModal.vue` | Tab 4 template (lines 794–893) needs new row-based table; `syncRowsToDetalles()` semantics may shift; `findMatchedDetalle()` already exists |
| `frontend/pages/valoracion.vue` | `submitValoracion()` maps `detallesRiesgo` to payload — may need filtering dedup for per-row writes |
| `frontend/types/api.d.ts` | `DetalleRiesgo` interface already has all needed fields; no type change needed |
| `backend/src/valoraciones/valoraciones.service.ts` | No structural change needed; existing `mapDetalleRiesgo()` already handles `amenazaIds`/`vulnerabilidadIds` arrays |

### Approaches

#### Approach 1: Display-consolidation (UI-only consolidation, same backend entry count)

Keep `syncRowsToDetalles()` unchanged — it still creates one entry per amenaza + per vulnerabilidad per row. Tab 4 iterates `riskRows` (not `detallesRiesgo`), uses `findMatchedDetalle()` to bind treatment fields, and writes back to all matched entries.

**How it works:**
- Tab 4 table: `<tr v-for="row in riskRows">` — one row per RiskRow
- Treatment inputs: `v-model` bound to `findMatchedDetalle(row)!.metodoTratamiento`, etc.
- On save: `submitValoracion()` iterates `riskRows` and reconstructs the same entry-per-amenaza-vulnerabilidad payload (no change to backend contract)
- **No backend change**
- **No change to `syncRowsToDetalles()`**

| Pros | Cons |
|------|------|
| Minimal risk — mostly template changes | Treatment is logically "one per row" but stored per entry; if user edits A1's método, A2's stays stale unless `submitValoracion` propagates writes |
| Backward-compatible with existing data | Doesn't solve the root data duplication |
| Reuses existing `findMatchedDetalle()` |  |

**Effort:** Low-Medium — primarily template refactor in Tab 4 + optional propagation in `submitValoracion()`

---

#### Approach 2: Single-entry-per-row (collapse multiple DetalleRiesgo into one per RiskRow)

Change `syncRowsToDetalles()` to emit **one entry per RiskRow** (not one per amenaza + per vulnerabilidad). A row with `[A1, A2, V1]` creates a single entry with `tipo=amenaza` (or `vulnerabilidad`), `catalogoId=A1`, full `amenazaIds=[A1,A2]`, `vulnerabilidadIds=[V1]`, and treatment fields on that one entry.

**How it works:**
- `syncRowsToDetalles()` simplified: for each non-empty `RiskRow`, creates ONE entry with `catalogoId = row.amenazaIds[0] ?? row.vulnerabilidadIds[0]`
- Tab 4 template: same row-based approach as Approach 1
- `loadExistingRows()`: rebuilds `riskRows` from entry arrays (already works — deduplication by `[...aIds, ...vIds].sort()` key)
- Backend: receives same `amenazaIds`/`vulnerabilidadIds` arrays — no contract change
- **Key risk:** Tab 3 still needs evaluation data per individual amenaza/vulnerabilidad for the `riesgoId`/`vulnerabilidadRiesgoId` selects. If those are only on one entry per row, Tab 3 would lose per-item evaluation.

| Pros | Cons |
|------|------|
| Clean data model: one entry per row | Breaks Tab 3 evaluation — currently uses per-entry `riesgoId`/`vulnerabilidadRiesgoId` selects |
| No stale data risk | Requires Tab 3 changes too if entries are collapsed |
| Cleaner backend payloads | Medium-high risk of breaking Tab 3 which works today |

**Effort:** Medium-High — requires verifying Tab 3 still works with collapsed entries, or migrating Tab 3 evaluation to also use `riskRows` state directly

---

#### Approach 3: Hybrid (keep per-entry for evaluation, collapse for treatment)

Keep the existing entry-per-amenaza/vulnerabilidad structure for Tab 3 evaluation. In Tab 4, display one row per RiskRow and store treatment fields ONLY on the **first matched entry** per row, then propagate all writes to every entry in that row on save.

**How it works:**
- `syncRowsToDetalles()` unchanged
- Tab 4 reads/writes via `findMatchedDetalle(row)` — same as Tab 3
- `submitValoracion()` maps each `riskRow` to multiple payload entries, copying treatment fields from the first matched entry to all entries in that row
- Leaves `detallesRiesgo` entry count unchanged — but treatment is now consistent across all entries in a row

| Pros | Cons |
|------|------|
| Lowest risk — no structural changes to entries or Tabs 2/3 | Treatment data is still logically redundant (copied to all entries) |
| Backward-compatible | Requires explicit propagation logic in `submitValoracion()` |
| Works with existing data without migration | Slightly unusual UX: display shows one row but data has multiples |

**Effort:** Low — primarily in `submitValoracion()` where propagation would happen, plus Tab 4 template refactor

---

### Recommendation

**Approach 1 (Display-consolidation)** is too incremental and leaves the data duplication problem intact.

**Approach 2 (Single-entry-per-row)** would be ideal architecturally but breaks Tab 3 evaluation which relies on per-entry `riesgoId`/`vulnerabilidadRiesgoId` fields. Tab 3 evaluation is currently working and well-tested; collapsing entries would require also migrating Tab 3 to store evaluation data on `riskRows` directly, which is a larger change.

**Approach 3 (Hybrid)** is the pragmatic choice:
- Tab 4 template migrates to row-based display (iterating `riskRows` with `findMatchedDetalle()` for inputs), exactly matching how Tab 3 works
- `submitValoracion()` propagates treatment field writes across all entries in the same row
- No changes to `syncRowsToDetalles()`, Tab 3, or backend
- Works with existing saved data (entries already have matching `amenazaIds`/`vulnerabilidadIds` arrays)

The downside (redundant treatment data) is acceptable — the `amenazaIds`/`vulnerabilidadIds` arrays on each entry act as the true row identifier, and propagation just keeps them consistent. This is the same pattern already used for `controlesImplementados` in Tab 3.

### Risks

1. **Propagation in `submitValoracion()`** adds a post-processing loop — must be tested for correctness and performance at scale (though `detallesRiesgo` is typically small)
2. **Existing saved data** where treatment was entered per-item (old behavior) and never propagated: when re-opening the modal, existing entries may have inconsistent `metodoTratamiento` values. Tab 4 will show only the first entry's values. May need a migration pass or a warning.
3. **UX gap:** Users who expect editing a row's treatment to affect only one specific amenaza/vulnerabilidad will be surprised when it propagates to the whole row. This is arguably the CORRECT semantic (row-based) but needs user-facing documentation.
4. **Tab 4 header says "por Item"** — the card title "Tratamiento de Riesgo por Item" (line 797) should be updated together with this change.

### Ready for Proposal

**Yes.** The scope is clear: row-based Tab 4 table using `riskRows` + `findMatchedDetalle()`, plus `submitValoracion()` propagation logic. No backend changes, no Prisma schema changes, no type changes. The main deliverable is the Tab 4 template refactor and save propagation.

The orchestrator should proceed to `sdd-propose` — scope fits cleanly in a single change, low risk, with clear rollback (revert to per-item display template and remove propagation logic).
