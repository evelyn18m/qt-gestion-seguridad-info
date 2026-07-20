# Proposal: Drill-down en gráficos del dashboard

## Intent
Permitir que los usuarios hagan clic en los segmentos o barras de los gráficos del dashboard de Inicio para ver, sin salir de la página, la tabla detallada de activos o amenazas/vulnerabilidades que representan.

## Scope

### In Scope
- Drill-down en el gráfico de Valoración CIA (3 donuts): mostrar activos filtrados por dimensión y nivel CIA.
- Drill-down en el gráfico "Activos con riesgo" (donut Nivel de Riesgo): mostrar activos filtrados por `nivelRiesgo`.
- Drill-down en el gráfico "Amenazas y vulnerabilidades por activo" (barras): mostrar filas desagregadas del activo seleccionado.
- Reutilizar el patrón de panel expandible del heat-map.
- Agregar filtros backend en `/reportes/valoracion-activos` y `/reportes/riesgos-por-activo`.
- Tests en `reportes.service.spec.ts` y `reportes.controller.spec.ts` bajo `strict_tdd: true`.

### Out of Scope
- Navegación a páginas de reportes existentes con query params.
- Exportar Excel/CSV desde los paneles de drill-down.
- Edición de datos dentro del panel.

## Capabilities

### New Capabilities
- `dashboard-chart-drill-down`: Al hacer clic en un segmento o barra del dashboard se abre un panel inline con la tabla filtrada correspondiente.

### Modified Capabilities
- `reporte-valoracion-activos`: Agregar query params opcionales para filtrar por dimensión CIA (`confidencialidad`, `integridad`, `disponibilidad`) y nivel (`Alto`, `Medio`, `Bajo`).
- `reporte-riesgos-por-activo`: Agregar query param `nivelRiesgo` para filtrar por nivel de riesgo.

## Approach
Reutilizar el patrón de panel expandible de `frontend/pages/reportes/mapa-calor.vue`. En `frontend/pages/index.vue` agregar handlers `dataPointSelection` a las opciones de ApexCharts, mapear el índice clickeado al elemento de datos correspondiente usando las categorías/series del gráfico, y llamar a los endpoints de reportes con los nuevos filtros. En backend, extender los métodos de `ReportesService` para aplicar los filtros opcionales y exponerlos como query params en `ReportesController`. Los tests deben cubrir los nuevos filtros y combinaciones vacías.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/pages/index.vue` | Modified | Eventos de clic, estado de panel, tablas de detalle |
| `backend/src/reportes/reportes.controller.ts` | Modified | Nuevos query params opcionales |
| `backend/src/reportes/reportes.service.ts` | Modified | Lógica de filtrado por CIA y nivel de riesgo |
| `backend/src/reportes/reportes.service.spec.ts` | Modified | Casos de filtros |
| `backend/src/reportes/reportes.controller.spec.ts` | Modified | Tests de query params |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Clic en leyenda/etiqueta dispara `dataPointSelection` | Med | Validar payload del evento antes de navegar |
| Índice de barra no coincide con nombre de activo | Med | Mapear siempre vía `categories[dataPointIndex]` |
| `nivelRiesgo` en BD en mayúsculas vs labels UI | Med | Normalizar case al filtrar |
| Ambigüedad sobre qué gráfico es "activos con riesgo" | Med | Confirmar alcance antes de specs (ver pregunta 1) |

## Rollback Plan
Reverter el commit. Si ya está desplegado, restaurar `frontend/pages/index.vue` a la versión anterior y eliminar los query params agregados en controller/service. No requiere migraciones de BD.

## Dependencies
- El endpoint `/reportes/analisis-riesgo-activos` debe seguir devolviendo `nombreActivo` para el mapeo del gráfico de barras.

## Success Criteria
- [ ] Clic en segmento CIA abre panel con activos filtrados por dimensión y nivel.
- [ ] Clic en segmento de Nivel de Riesgo abre panel con activos de ese `nivelRiesgo`.
- [ ] Clic en barra abre panel con amenazas/vulnerabilidades del activo seleccionado.
- [ ] Todos los cambios de backend tienen tests que pasan.
- [ ] El dashboard conserva su layout y rendimiento cuando los paneles están cerrados.

## Proposal Question Round
Antes de avanzar a specs, confirmar:
1. ¿"Activos con riesgo" se refiere al donut "Nivel de Riesgo" (Alto/Medio/Bajo) o al KPI de conteo total de activos con riesgo?
2. ¿Los paneles deben permitir ordenar/paginar, o basta con una lista scrollable?
3. ¿Al hacer clic en un segmento de otro gráfico se cierra el panel anterior, o se permiten varios paneles abiertos?

**Assumptions**: implementaremos drill-down sobre el donut de Nivel de Riesgo, un panel por gráfico, y listas scrollables básicas.
