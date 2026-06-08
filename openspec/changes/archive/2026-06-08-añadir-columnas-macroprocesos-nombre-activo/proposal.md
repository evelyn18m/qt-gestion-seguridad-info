# Proposal: Añadir columnas Macroproceso y Nombre del Activo en Pestañas 3 y 4

## Intent

Las Pestañas 3 (Evaluación de Riesgo) y 4 (Tratamiento de Riesgo) no muestran el activo ni macroproceso que se está evaluando/tratando. La Pestaña 2 ya tiene estas columnas readonly. Añadir las mismas 2 columnas al inicio de las tablas en Pestañas 3 y 4 usando los datos ya disponibles (`analisisForm.nombreActivo`, `macroProcesoName`).

## Scope

### In Scope
- Añadir `<th>Nombre del Activo</th>` y `<th>Macroproceso</th>` al `<thead>` de la tabla en Pestaña 3
- Añadir 2 `<td>` readonly por fila en Pestaña 3 (mismo patrón que Pestaña 2: `<input readonly>`)
- Añadir `<th>Nombre del Activo</th>` y `<th>Macroproceso</th>` al `<thead>` de la tabla en Pestaña 4
- Añadir 2 `<td>` readonly por fila en Pestaña 4

### Out of Scope
- Cambios de backend o BD — datos ya existen en `analisisForm`
- Modificar lógica de sincronización — ya funciona desde `valoracion.vue`
- Nueva lógica — `macroProcesoName` computed ya existe (línea 126)
- Pestaña 1 o 2 — ya tienen estos campos visibles

## Capabilities

### New Capabilities
None — display enhancement, no new behavior introduced.

### Modified Capabilities
- `valoracion-modal`: Extender tablas de Pestaña 3 y Pestaña 4 con columnas readonly "Nombre del Activo" y "Macroproceso" al inicio de cada fila.

## Approach

Template-only change (~30 líneas HTML) en `ValoracionModal.vue`. Copiar el patrón exacto ya probado en Pestaña 2 (líneas 741-761): `<th>` + `<input :value="..." readonly>`. Columnas insertadas ANTES de "Amenaza" en ambas tablas, consistente con Pestaña 2.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modified | +2 `<th>` + 2 `<td>`/fila en Tab 3 (líneas 876-884 y 887-950), +2 `<th>` + 2 `<td>`/fila en Tab 4 (líneas 971-982 y 987-1090) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tablas demasiado anchas en pantallas pequeñas | Low | Mismo `min-width` modesto (~160px) usado en Pestaña 2 |
| Regresión visual por reordenamiento de columnas | Low | Solo se añaden columnas al inicio, no se modifica lógica ni se eliminan columnas |

## Rollback Plan

Revertir ~30 líneas de template añadidas. `git revert` del commit único. Sin migraciones ni side-effects.

## Dependencies

Ninguna. Cambio 100% frontend sobre datos ya sincronizados vía props.

## Success Criteria

- [ ] Pestaña 3 muestra columnas "Nombre del Activo" y "Macroproceso" antes de Amenaza
- [ ] Pestaña 4 muestra columnas "Nombre del Activo" y "Macroproceso" antes de Amenaza
- [ ] Ambas columnas son readonly con el valor correcto del activo actual
- [ ] `macroProcesoName` resuelve ID → nombre legible en ambas pestañas
- [ ] Navegación wizard, validación de pasos, y submit no se ven afectados
- [ ] `docker compose up` — la app carga sin errores
