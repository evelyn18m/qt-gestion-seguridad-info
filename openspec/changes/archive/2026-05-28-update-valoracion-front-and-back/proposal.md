# Proposal: update-valoracion-front-and-back

## Intent

Fix critical data-flow bugs in the valoracion (asset valuation) page that cause runtime crashes and silent data loss. All 4 tabs exist in the backend schema but Tab 4 data is never persisted and the view modal only shows Tab 1.

## Scope

### In Scope
- **Bug 1**: Declare `valTipoActivo` ref — `ref([])` missing, causing runtime crash on "Tipo de Activo" dropdown
- **Bug 2**: Submit Tab 4 "Tratamiento de Riesgo" data to backend — `tratamientoForm` fields omitted from `submitValoracion()` payload
- **Bug 3**: Populate all 4 tabs in view modal — currently only Tab 1 fields are shown

### Out of Scope
- Transaction wrapper for `DetalleRiesgo` update (deleteMany + createMany lacks atomicity)
- Type naming inconsistency fix (`tipoControlId` vs `tipoControl`)
- Frontend unit tests (no test runner detected)
- Full refactor of `valoracion.vue`

## Capabilities

### New Capabilities
None — bug fixes only, no new spec-level behavior.

### Modified Capabilities
None — backend schema and DTOs already support all 4 tabs; no spec changes needed.

## Approach

1. **Bug 1** — Add `const valTipoActivo = ref([])` near the other `val*` refs in `valoracion.vue`
2. **Bug 2** — Add `tratamientoForm.value` fields to the `submitValoracion()` body payload (lines ~346-416)
3. **Bug 3** — Populate Tab 2-4 data in the view modal's `openViewModal()` function using the existing `enrich()` response structure

No backend schema or DTO changes required. Verify `enrich()` already returns Tab 4 fields.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/pages/valoracion.vue` | Modified | Bug 1: add `valTipoActivo` ref declaration |
| `frontend/pages/valoracion.vue` | Modified | Bug 2: include `tratamientoForm` in submit payload |
| `frontend/pages/valoracion.vue` | Modified | Bug 3: populate all tabs in view modal |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing records have no Tab 4 data | High | Data loss is historical; new records will be complete |
| `valTipoActivo` declared but wrong scope | Low | Place near other `val*` refs (~line 200-250) |
| View modal tabs 2-4 use different field names | Medium | Cross-reference with `analisisForm`, `evaluacionForm`, `tratamientoForm` structures |

## Rollback Plan

- All changes confined to `frontend/pages/valoracion.vue`
- Revert: restore previous version of that file from git
- Backend unchanged — no migration needed

## Dependencies

- Backend DTOs already have Tab 4 fields (`CreateValoracionDto`): `metodoTratamiento`, `tipoControl`, `controlesImplementar`, etc.
- Prisma schema already stores them on `ValoracionActivo`
- No external dependencies

## Success Criteria

- [ ] `valTipoActivo` ref declared and not undefined at runtime
- [ ] Tab 4 "Tratamiento" fields included in POST/PATCH body
- [ ] View modal shows data from all 4 tabs (not just Tab 1)
- [ ] Backend tests pass: `docker compose exec backend npm run test`