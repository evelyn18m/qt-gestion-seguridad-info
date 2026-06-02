# Proposal: Añadir macroproceso y nombreActivo como columnas readonly en Pestaña 2

## Intent

En la Pestaña 2 (Análisis de Riesgos), el usuario no tiene visibilidad del activo y macroproceso que está analizando. Los datos ya existen en `analisisForm` pero no se muestran. Añadir 2 columnas readonly al inicio de la tabla para dar contexto inmediato sin necesidad de volver a la Pestaña 1.

## Scope

### In Scope
- Añadir `<th>Nombre del Activo</th>` y `<th>Macroproceso</th>` al `<thead>` de la tabla en Pestaña 2
- Añadir 2 `<td>` con `<input readonly>` por fila usando `analisisForm.nombreActivo` (string directo) y `macroProcesoName` (computed existente ID→nombre)
- Tabla pasa de 4 a 6 columnas (Nombre Activo | Macroproceso | Amenazas | Vulnerabilidades | Controles | ×)

### Out of Scope
- Cambios de backend o BD — datos ya fluyen vía `analisisForm`
- Modificar el watch de sincronización en `valoracion.vue` — ya funciona
- Añadir lógica nueva — `macroProcesoName` computed ya existe (línea 125)
- Tests (frontend sin test runner)

## Capabilities

### New Capabilities
None — display enhancement leveraging existing data, no new behavior.

### Modified Capabilities
None — no existing spec defines Tab 2 table columns at a requirements level.

## Approach

Template-only change (~20 líneas) en `ValoracionModal.vue`. Se añaden 2 columnas readonly ANTES de Amenazas (Approach 1 del exploration). Usar `<input readonly>` consistente con el precedente de la Pestaña 3 (línea 771). El mismo valor se repite en todas las filas — describe el activo, no el riesgo individual.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modified | Añadir 2 `<th>` + 2 `<td>` por fila en tabla de Pestaña 2 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tabla demasiado ancha en pantallas pequeñas | Low | Usar `min-width` modesto (~150px) consistente con columnas existentes |
| Regresión visual en Pestaña 2 | Low | Solo se añaden columnas, no se modifica lógica existente |

## Rollback Plan

Revertir los ~20 líneas de template añadidas. `git revert` del commit único.

## Dependencies

Ninguna. Cambio 100% frontend sobre datos ya sincronizados.

## Success Criteria

- [ ] Pestaña 2 muestra columnas "Nombre del Activo" y "Macroproceso" antes de Amenazas
- [ ] Ambas columnas son readonly y muestran el valor correcto del activo actual
- [ ] `macroProcesoName` resuelve ID → nombre legible
- [ ] La funcionalidad existente (Agregar Riesgo, eliminar fila, navegación wizard) no se ve afectada
- [ ] `docker compose up` — la app carga sin errores
