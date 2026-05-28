# Design: update-valoracion-front-and-back

## Technical Approach

Fix 4 data-flow bugs in the valoracion page — 3 frontend (missing ref declaration, missing Tab 4 in submit payload, view modal only shows Tab 1) and 1 backend (DetalleRiesgo update non-atomic). The backend DTOs and Prisma schema already support all 4 tabs; no schema changes needed.

## Bug Fixes

### Bug 1: Declare `valTipoActivo` ref

**File**: `frontend/pages/valoracion.vue`  
**Location**: Line ~3 — among the other `val*` ref declarations

```javascript
const valTipoActivo = ref<CatalogoItem[]>([])  // MISSING
const valFormatos = ref<CatalogoItem[]>([])
const valMacroprocesos = ref<CatalogoItem[]>([])
...
```

**Why**: `loadValoracionData()` assigns `results[0]` to `valTipoActivo.value` (line 248), but `valTipoActivo` is never declared. The template at line 801 iterates `v-for="t in valTipoActivo"` expecting a reactive ref. Without the declaration, the dropdown throws a runtime error on change.

---

### Bug 2: Include Tab 4 fields in submit payload

**File**: `frontend/pages/valoracion.vue`  
**Location**: `submitValoracion()` body construction, ~lines 374-398

**Problem**: The `body` object built at lines 374-398 includes Tab 1 fields, Tab 2 (via `analisisForm`), Tab 3 (via `evaluacionForm`), and `detallesRiesgo` (which carries per-row Tab 4 fields). However, the top-level Tab 4 fields from `tratamientoForm` (`metodoTratamiento`, `tipoControl`, `controlesImplementar`, `nivelAmenazaControl`, `nivelVulnerabilidadControl`) are never included in the body.

The `detallesRiesgo` array does carry `metodoTratamiento`, `tipoControlId`, `riesgoControlId`, `evaluacionRiesgoControl`, `nivelRiesgoControl` per-row, but `tratamientoForm.value` (the standalone Tab 4 form section used for global/narrative treatment data) is not referenced in the body at all.

**Fix**: Add `tratamientoForm.value` fields to the body object:

```javascript
const body = {
  // existing fields...
  metodoTratamiento: t.metodoTratamiento || null,
  tipoControl: t.tipoControl || null,
  controlesImplementar: t.controlesImplementar || null,
  nivelAmenazaControl: t.nivelAmenazaControl || null,
  nivelVulnerabilidadControl: t.nivelVulnerabilidadControl || null,
  // ... existing fields
}
```

**Why**: Without this, Tab 4's standalone narrative fields are silently dropped on every save.

---

### Bug 3: Populate all 4 tabs in view modal

**File**: `frontend/pages/valoracion.vue`  
**Location**: `viewValoracion()` function, ~lines 478-481

```javascript
function viewValoracion(item: any) {
  viewItem.value = item        // raw item, no enrichment
  showViewModal.value = true
}
```

**Problem**: `viewValoracion` only assigns the raw item. Compare with `editValoracion()` (lines 418-476) which populates `valForm`, `analisisForm`, `evaluacionForm`, and `detallesRiesgo`. The view modal template (lines 1157-1200) only renders Tab 1 + CIA fields — tabs 2-4 are not displayed at all.

**Fix**: Two changes needed:

1. `viewValoracion()` must call `enrich()` to get the full item with relations and `detallesRiesgo` (matching how `editValoracion` works):

```javascript
async function viewValoracion(item: any) {
  const { apiFetch } = useApi()
  const enriched = await apiFetch<ValoracionActivo>(`/valoraciones/${item.id}`)
  viewItem.value = enriched
  showViewModal.value = true
}
```

2. The view modal template must add sections for Tab 2 (Análisis), Tab 3 (Evaluación), and Tab 4 (Tratamiento) with data from `viewItem.detallesRiesgo`, mirroring what `editValoracion` populates into the forms.

**Why**: Users cannot inspect saved Tab 2-4 data; they see only Tab 1 and CIA even when all 4 tabs have data.

---

### Bug 4: Transaction wrapper for DetalleRiesgo update

**File**: `backend/src/valoraciones/valoraciones.service.ts`  
**Location**: `update()` method, lines 98-108

```typescript
if (detallesRiesgo && Array.isArray(detallesRiesgo)) {
  await this.prisma.detalleRiesgo.deleteMany({ where: { valoracionActivoId: id } });
  await this.prisma.detalleRiesgo.createMany({ data: detallesRiesgo.map((d: any) => ({ ...d, valoracionActivoId: id })) });
}
```

**Problem**: `deleteMany` and `createMany` are two separate await calls. If `createMany` throws after `deleteMany` succeeds, the `DetalleRiesgo` records are lost (orphaned empty). The spec marks this as SHOULD-have (not a hard requirement), but the fix is trivial.

**Fix**: Wrap in `$transaction`:

```typescript
await this.prisma.$transaction([
  this.prisma.detalleRiesgo.deleteMany({ where: { valoracionActivoId: id } }),
  this.prisma.detalleRiesgo.createMany({
    data: detallesRiesgo.map((d: any) => ({ ...d, valoracionActivoId: id })),
  }),
]);
```

**Why**: Atomicity ensures no orphaned state if the create fails.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/pages/valoracion.vue` | Modify | Bug 1: add `valTipoActivo` ref declaration |
| `frontend/pages/valoracion.vue` | Modify | Bug 2: add `tratamientoForm` fields to submit body |
| `frontend/pages/valoracion.vue` | Modify | Bug 3: enrich view item + render tabs 2-4 in modal |
| `backend/src/valoraciones/valoraciones.service.ts` | Modify | Bug 4: wrap deleteMany/createMany in `$transaction` |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Backend: `ValoracionesService.update` with `detallesRiesgo` | Jest: mock Prisma, verify transaction called |
| Integration | Frontend: submit with Tab 4 fields | Verify payload contains Tab 4 fields |
| E2E | View modal with saved 4-tab record | Verify all 4 tabs render in view modal |

**Test command**: `docker compose exec backend npm run test`

## Migration / Rollout

No migration required. Existing records retain their data; new saves include Tab 4 fields. View modal fix applies immediately to all existing records.

## Open Questions

- None — all 4 bugs are fully understood and scoped.