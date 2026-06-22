# Proposal: Corrección de Evaluación de Riesgo en Modal/Form

## Intent

El modal Tab 3 muestra preview correcta (CIA real), pero al guardar el backend recalcula con `VA=3` hardcodeado y persiste valores inflados. El reporte lee datos inconsistentes con lo validado en el modal. Agravantes: frontend no envía VA al `/calcular`, `ValoracionActivo.evaluacionRiesgo` nunca se persiste, frontend usa 4 niveles vs 3 del backend.

## Scope

### In Scope
- `mapDetalleRiesgo()` recibe `va: number` del activo, no hardcoded 3
- `calcularDetalleRiesgo()` deriva VA del `ValoracionActivo` padre si DTO no lo provee
- Frontend envía `VA: ciaAverage` en PATCH `/calcular`; eliminar overwrite de preview correcta
- `ValoracionActivo.evaluacionRiesgo`/`nivelRiesgo` persistidos como MAX de hijos
- Frontend unificado a 3 niveles (BAJO/MEDIO/ALTO) en ValoracionModal, valoracion.vue, ValoracionViewModal
- `POST /valoraciones/:id/recalcular` → corrige existentes con VA real
- Tests: spec CIA=1 → evaluacionRiesgo=1, no 3

### Out of Scope
- Cambio de fórmula, recalculo masivo, migración schema (columnas ya existen)

## Capabilities

### New Capabilities
- `recalculo-riesgo`: POST en `$transaction` que recalcula todos los DetalleRiesgo de un activo con VA real sin modificar inputs.

### Modified Capabilities
- `calculo-riesgo`: `mapDetalleRiesgo` y `calcularDetalleRiesgo` derivan VA del activo padre. Fallback 3 solo si `impacto` null. `create`/`update` persisten `ValoracionActivo.evaluacionRiesgo`/`nivelRiesgo`.
- `riesgo-preview`: Frontend envía VA en PATCH body. Niveles 3: ≤3 BAJO, ≤8 MEDIO, ≤27 ALTO.

## Approach

1. **Backend**: `mapDetalleRiesgo(dto, activoId, niveles, va)`. Callers calculan VA desde CIA IDs → catálogo Impacto. MAX de hijos en `ValoracionActivo`.
2. **`/calcular`**: `dto.VA ?? valoracionActivo.impacto ?? 3`.
3. **Frontend**: agregar `VA: ciaAverage.value`. Eliminar `Object.assign` que sobreescribe preview.
4. **Helpers**: 6 funciones unificadas a 3 niveles (BAJO/MEDIO/ALTO).

## Affected Areas

| Area | Impact |
|------|--------|
| `backend/src/valoraciones/valoraciones.service.ts` | `mapDetalleRiesgo` +va; persistir padre; `recalcular()` |
| `backend/src/valoraciones/valoraciones.controller.ts` | `@Post(':id/recalcular')` |
| `backend/src/valoraciones/valoraciones.service.spec.ts` | Tests VA=1, VA=2 |
| `frontend/pages/valoracion.vue` | Enviar VA, eliminar overwrite, unificar helpers |
| `frontend/components/ValoracionModal.vue` | `calcularNivelRiesgo` → 3 niveles |
| `frontend/components/ValoracionViewModal.vue` | `getNivelStyle`/`getMaxNivelIndex` → 3 niveles |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Datos existentes con VA=3 | Alta | Endpoint recalcular + release notes |
| Badge "Crítico" desaparece | Baja | 3 niveles = EGSI v1.4 spec |
| Tests asumen VA=3 | Media | Actualizar specs CIA=1, CIA=2 |

## Rollback Plan

Revert commit. Columnas nullable. Activos editados post-fix correctos; no-editados inflados (estado pre-fix). Recalcular disponible ad-hoc.

## Dependencies

Ninguna. `ValoracionActivo.impacto` ya poblado. Catálogo Impacto sembrado.

## Success Criteria

- [ ] Modal Tab 3: preview y valor persistido coinciden
- [ ] CIA=1 → evaluacionRiesgo = 1 × A × V (no 3×)
- [ ] `POST /valoraciones/:id/recalcular` corrige existentes a VA real
- [ ] Backend tests: spec CIA=1 produce evaluacionRiesgo=1
- [ ] Sin badge "Crítico" en frontend
