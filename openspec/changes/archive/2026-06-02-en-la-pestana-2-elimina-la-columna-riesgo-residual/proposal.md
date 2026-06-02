# Proposal: Eliminar columna "Riesgo Residual" de Pestaña 2

## Intent

Remover la columna "Riesgo Residual" de Pestaña 2 (Análisis de Riesgos) en `ValoracionModal.vue`. Es un badge visual computado (`ACEPTABLE`/`INACEPTABLE`) derivado de `evaluacionRiesgoControl`, no persistido en BD. La decisión de negocio es que ese indicador no aporta en el paso de análisis de riesgos; el dato subyacente (`evaluacionRiesgoControl`) sigue visible en Pestaña 4 (Tratamiento de Riesgo).

## Scope

### In Scope
- Eliminar `<th>Riesgo Residual</th>` (línea 678) y la celda badge (líneas 756-771) de `ValoracionModal.vue`
- La tabla de Tab 2 pasa de 5 a 4 columnas (Amenazas, Vulnerabilidades, Controles Implementados, Acción)

### Out of Scope
- Cambios en backend (`calculo-riesgo.service.ts` sigue retornando `riesgoResidual` — útil para reportes futuros)
- Limpieza de tipos muertos en `frontend/types/api.d.ts` y `frontend/pages/valoracion.vue`
- Otras pestañas (3, 4) — no se ven afectadas

## Capabilities

### New Capabilities
None

### Modified Capabilities
- **`riesgo-preview`**: Removed requirement "Riesgo Residual Badge in Tab 2" — the badge is being eliminated from Tab 2 display. All other requirements in this spec (Tab 3 preview, per-row dual selects, preview API call) remain intact.

## Approach

**Enfoque A (mínimo, frontend-only)**: Remover ~15 líneas de template en `ValoracionModal.vue`. Sin cambios de lógica, sin tocar backend, sin nuevas dependencias.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Removed | Eliminar header `<th>` (L678) y celda badge (L756-771); la tabla se reduce de 5 a 4 columnas |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Layout de tabla con 4 columnas se ve desbalanceado | Baja | Las columnas restantes ya usan `min-width`; verificar visualmente post-cambio |
| Regresión en otra pestaña | Nula | `riesgoResidual` no se usa en Tabs 3 ni 4 ni en `ValoracionViewModal.vue` |

## Rollback Plan

Revertir `ValoracionModal.vue` al commit anterior. Cambio acotado a un solo archivo, sin migraciones ni side effects.

## Dependencies

Ninguna. Cambio auto-contenido en el frontend.

## Success Criteria

- [ ] La columna "Riesgo Residual" no aparece en el `<thead>` ni en ninguna fila del `<tbody>` de Tab 2
- [ ] Las 4 columnas restantes (Amenazas, Vulnerabilidades, Controles Implementados, Acción eliminar) se renderizan correctamente
- [ ] La navegación wizard Step 2→Step 3 funciona sin cambios (validación de `riskRows.length > 0`)
- [ ] El badge ACEPTABLE/INACEPTABLE no se muestra en ningún escenario de Tab 2
