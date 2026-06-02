## Exploration: Reestructurar catálogo Riesgo como Impacto

### Current State

The `Riesgo` model currently has 2 content fields:
```prisma
model Riesgo {
  id          Int      @id @default(autoincrement())
  evaluacion  String   @db.Text   // e.g. "Alto (3)", "Evaluacion de Amenaza"
  valor       Int?                 // 3, 2, 1, or null (for header rows)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Seed data** (`catalogos.json`, lines 761-785) contains 8 rows:
- 2 header rows (`"Evaluacion de Amenaza"`, `"Evaluacion de Vulnerabilidad"` with `valor: null`)
- 6 data rows (`"Alto (3)"`, `"Medio (2)"`, `"Bajo (1)"` each for Amenaza and Vulnerabilidad)

**Consumption** (`valoraciones.service.ts`, lines 148-166, 180-198):
- `prisma.riesgo.findUnique({ where: { id: d.riesgoId } })` extracts `r.valor`
- `r?.valor ?? 1` is passed to `calculateRiesgo(va, nivelAmenaza, nivelVulnerabilidad)` as both `nivelAmenaza` and `nivelVulnerabilidad`
- **Key insight**: `valor` field is already 3, 2, 1 — semantically compatible with the new model

**Catalog management** (`catalogos.service.ts`, line 38):
- `FIELD_MAP.riesgo = ['evaluacion', 'valor']` — controls CRUD allowed fields
- Generic `CatalogosService` auto-adapts to FIELD_MAP — no logic change needed

**Frontend** (`ValoracionModal.vue`, lines 372-375, 814, 823, 898):
- Extensive use of `r.evaluacion` for display text and filtering (`r.evaluacion?.toLowerCase().includes('amenaza')`)
- `getValorRiesgo()` extracts `found.valor || 0` — compatible with new model

### Affected Areas

| # | File | Lines | Impact |
|---|------|-------|--------|
| 1 | `backend/prisma/schema.prisma` | 174-180 | **DESTRUCTIVE**: drop `evaluacion`, add `tipo` + `nivel`, make `valor` non-nullable |
| 2 | `backend/prisma/seed.ts` | 227-240 | Rewrite Riesgo seed to parse header rows as `tipo` values, data rows as `{tipo, nivel, valor}` |
| 3 | `backend/catalogos.json` | 761-785 | No structural change needed; seed.ts parser handles the existing format |
| 4 | `backend/src/catalogos/catalogos.service.ts` | 38 | `FIELD_MAP.riesgo: ['evaluacion', 'valor']` → `['tipo', 'nivel', 'valor']` |
| 5 | `backend/src/valoraciones/valoraciones.service.ts` | 149-156, 181-188 | **NO CHANGE needed** — `r?.valor` still extracts the integer (3,2,1) for risk calculation |
| 6 | `frontend/pages/catalogos.vue` | 42-56 | `FIELD_MAP.riesgos: ['evaluacion', 'valor']` → `['tipo', 'nivel', 'valor']` |
| 7 | `frontend/components/ValoracionModal.vue` | 372-375, 814, 823, 898 | Replace `r.evaluacion` with `r.nivel`/`r.tipo`; update filtering from `r.evaluacion?.toLowerCase().includes(...)` to `r.tipo === 'Amenaza'`/`r.tipo === 'Vulnerabilidad'` |
| 8 | `frontend/components/ValoracionViewModal.vue` | — | **NO CHANGE needed** — does not reference Riesgo catalog directly |
| 9 | `frontend/components/CatalogoManager.vue` | — | **NO CHANGE needed** — fully generic, receives `campos` as prop |

### Approaches

#### Approach A: Prisma migrate with data transformation (RECOMMENDED)
**Preserves IDs, handles data loss gracefully.**

1. Add nullable `tipo` and `nivel` columns to Riesgo table
2. Run a migration script that populates existing rows: parse `evaluacion` to extract `tipo` (Amenaza/Vulnerabilidad) and `nivel` (Alto/Medio/Bajo), copying `valor` as-is
3. Delete header rows (evaluacion = "Evaluacion de Amenaza/Vulnerabilidad", valor = null) — no corresponding rows in new schema
4. Make `tipo`, `nivel`, `valor` required/non-nullable
5. Drop `evaluacion` column

- **Pros**: IDs preserved → existing `DetalleRiesgo.riesgoId` references remain valid; no data corruption; proper migration hygiene
- **Cons**: Complex multi-step migration; Prisma doesn't natively support data-transform migrations (needs raw SQL or manual step)
- **Effort**: Medium

#### Approach B: Prisma db push + reseed (SIMPLEST — dev environment)
**Destroys table, recreates, reseeds.**

1. Update `schema.prisma` to new Riesgo model
2. Run `prisma db push` (drops and recreates table)
3. Update `seed.ts` for new field structure
4. Delete all `DetalleRiesgo` rows (their `riesgoId` references will be stale after reseed)
5. Reseed

- **Pros**: Fast, minimal code, no migration complexity
- **Cons**: IDs change → any `DetalleRiesgo` rows referencing old `riesgoId` values become orphaned (must be cleared); loses all existing valoracion data — acceptable in dev/staging but NOT in production
- **Effort**: Low

#### Approach C: Non-destructive rename via Prisma migration
**Keeps `valor` semantics compatible with existing code.**

The `valor` field already contains 3,2,1 — same semantics as target. Only `evaluacion` → `{tipo, nivel}` mapping needed. This is essentially the same as Approach A but acknowledges that the risk calculation code (`r?.valor ?? 1`) works unchanged.

- **Pros**: Backward compatible with `valoraciones.service.ts`
- **Cons**: Same migration complexity as Approach A
- **Effort**: Medium

### `valor` Field Compatibility Analysis

| Aspect | Current Model | New Model | Compatible? |
|--------|--------------|-----------|-------------|
| Type | `Int?` (nullable) | `Int` (required) | ✅ `r?.valor ?? 1` handles both |
| Semantics | Risk level: 3=Alto, 2=Medio, 1=Bajo | Same: 3=Alto, 2=Medio, 1=Bajo | ✅ Identical |
| Usage in `calculateRiesgo()` | Multiplied with VA and vulnerabilidad | Same multiplication | ✅ Formula unchanged |
| Null handling | `?? 1` fallback | Won't be null after migration | ✅ Defensive code still works |

**Conclusion**: The `valor` field itself does NOT need to change at the consumption level. The `valoraciones.service.ts` code is fully forward-compatible.

### Frontend Impact Detail

#### `catalogos.vue` FIELD_MAP (line 54)
- Current: `riesgos: ['evaluacion', 'valor']`
- Target: `riesgos: ['tipo', 'nivel', 'valor']`
- Auto-adapts: table headers, form fields rendered from `FIELD_MAP`

#### `ValoracionModal.vue` — 4 places affected:

1. **Line 814**: Filter dropdown for Amenaza Riesgo levels
   ```html
   <!-- Current -->
   <option v-for="r in catalogData.valRiesgos.filter(r => r.evaluacion?.toLowerCase().includes('amenaza'))" ...>
     {{ r.evaluacion }}
   </option>
   <!-- Target -->
   <option v-for="r in catalogData.valRiesgos.filter(r => r.tipo === 'Amenaza')" ...>
     {{ r.nivel }} ({{ r.valor }})
   </option>
   ```

2. **Line 823**: Filter dropdown for Vulnerabilidad Riesgo levels
   ```html
   <!-- Current -->
   <option v-for="r in catalogData.valRiesgos.filter(r => r.evaluacion?.toLowerCase().includes('vulnerabilidad'))" ...>
     {{ r.evaluacion }}
   </option>
   <!-- Target -->
   <option v-for="r in catalogData.valRiesgos.filter(r => r.tipo === 'Vulnerabilidad')" ...>
     {{ r.nivel }} ({{ r.valor }})
   </option>
   ```

3. **Line 898**: Riesgo Control level dropdown (no filter — shows all)
   ```html
   <!-- Current -->
   <option v-for="r in catalogData.valRiesgos" ...>{{ r.evaluacion }}</option>
   <!-- Target -->
   <option v-for="r in catalogData.valRiesgos" ...>{{ r.tipo }} - {{ r.nivel }} ({{ r.valor }})</option>
   ```

4. **Line 375**: `getValorRiesgo()` — no change needed (uses `found.valor`)

### Recommendation

**Approach B (db push + reseed)** for this dev environment. Rationale:
- The project is in active development with `session_preflight.execution_mode: interactive` and no production data to protect
- Existing `DetalleRiesgo` rows are development test data — acceptable to clear
- Migrations add complexity (Prisma migration with data transforms requires raw SQL) with minimal benefit here
- The `valor` field is already compatible → risk calculation unaffected

### Risks

1. **Orphaned foreign keys**: `DetalleRiesgo.riesgoId`, `DetalleRiesgo.vulnerabilidadRiesgoId`, `DetalleRiesgo.riesgoControlId` all reference Riesgo IDs. After reseed, these IDs will point to wrong/different entries. **Mitigation**: Clear all `DetalleRiesgo` rows before reseed, or accept stale references in dev data.

2. **ValoracionModal.vue breakage**: If `r.evaluacion` is referenced after schema change but before frontend update, the UI will show `undefined`. **Mitigation**: Both schema and frontend changes should be deployed together.

3. **Seed parser regression**: The current seed parser reads `"Alto (3)"` and stores the full text + extracted value. The new parser must correctly track the section context (`"Evaluacion de Amenaza"` vs `"Evaluacion de Vulnerabilidad"`) to populate `tipo`. **Mitigation**: Update seed.ts with a section-aware parser (similar to Impacto seed that uses `currentImpactType` tracking).

4. **`catalogos.json` source data**: The Excel source may be regenerated. If the format changes, the new seed parser could break. **Mitigation**: The existing JSON format already has the necessary structure (header rows + data rows).

### Ready for Proposal

**Yes.** The change is well-understood. All affected files are mapped with line numbers. The `valor` field is confirmed compatible with the risk calculation engine. Only approach decision needed: Approach B (simplest, dev-friendly) vs Approach A (safer, production-grade).
