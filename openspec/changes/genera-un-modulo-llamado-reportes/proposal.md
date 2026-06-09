# Proposal: Módulo de Reportes (Read-Only Aggregation)

## Intent

El módulo `reportes` existe como scaffold CRUD vacío (DTOs/entity sin campos, service devuelve strings). El usuario necesita dashboards de consulta sobre datos de valoraciones existentes, no un CRUD nuevo. No hay tabla `Reporte` en la BD — los reportes son queries de agregación read-only sobre `ValoracionActivo`, `DetalleRiesgo` y catálogos.

## Scope

### In Scope
- **Backend**: Reemplazar CRUD por 5 endpoints GET-only con agregaciones Prisma
- **Frontend**: Página `reportes.vue` con tabla resumen + gráficos de distribución (barras, dona)
- **Navegación**: Link "Reportes" en sidebar (`default.vue`)
- **Tipado**: Interfaces de respuesta en `frontend/types/api.d.ts`
- **Testing**: Tests unitarios backend con mock de Prisma

### Out of Scope
- Exportar reportes a PDF/Excel (futuro)
- Filtros por rango de fechas (futuro)
- Reportes parametrizados por activo (todos son globales)
- CRUD de reportes (no hay entidad `Reporte`)

## Capabilities

### New Capabilities
- `reportes-api`: Endpoints GET de agregación: `/reportes/resumen`, `/reportes/riesgos-por-activo`, `/reportes/riesgos-por-macroproceso`, `/reportes/tratamiento`, `/reportes/cia`
- `reportes-dashboard`: Página frontend con tabla resumen, gráficos de distribución CIA, niveles de riesgo y estado de tratamiento

### Modified Capabilities
- `frontend-navigation`: Agregar entrada "Reportes" al sidebar con ícono y ruta `/reportes`
- `frontend-api-consumption`: Agregar interfaces `ReporteResumen`, `RiesgoPorActivo`, `RiesgoPorMacroProceso`, `ReporteTratamiento`, `ReporteCIA` en `api.d.ts`

## Approach

**Estrategia de agregación**: `findMany` + procesamiento en memoria (evita `groupBy` que tiene soporte limitado en `@prisma/adapter-mariadb`). Fetch completo de `ValoracionActivo` + `DetalleRiesgo` con `include` de catálogos, agregar en TypeScript. Para volúmenes SGSI (<10k registros) es seguro y evita raw SQL.

**Formula de riesgo**: `evaluacionRiesgo = VA × nivelAmenaza × nivelVulnerabilidad` (1..27). Niveles: ≤3 Bajo, ≤8 Medio, >8 Alto. Residual: ≤3 ACEPTABLE, >3 INACEPTABLE.

**DTOs de respuesta**: Clases planas con `@Expose()` (class-transformer) para serialización controlada, sin validación (read-only).

**Frontend**: `useApi().apiFetch<T>()` para fetch tipado. Gráficos con CSS puro (barras porcentuales, anillos dona con `conic-gradient`), sin librería externa de charts.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/reportes/reportes.module.ts` | Modified | Inyectar `PrismaService` |
| `backend/src/reportes/reportes.controller.ts` | Modified | 5 `@Get()` endpoints, sin POST/PATCH/DELETE |
| `backend/src/reportes/reportes.service.ts` | Modified | Lógica de agregación con `findMany` + enrich |
| `backend/src/reportes/dto/` | Modified | Reemplazar DTOs vacíos por response DTOs |
| `backend/src/reportes/entities/reporte.entity.ts` | **Deleted** | Sin entidad persistente |
| `backend/src/reportes/*.spec.ts` | Modified | Tests con mock de Prisma |
| `frontend/pages/reportes.vue` | New | Dashboard con tabla + gráficos |
| `frontend/layouts/default.vue` | Modified | Link "Reportes" en sidebar |
| `frontend/types/api.d.ts` | Modified | Interfaces de respuesta |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `@prisma/adapter-mariadb` no soporta `groupBy`/`_count` | Medium | Usar `findMany` + agregación en TS (probado en otros módulos) |
| Volumen de datos alto degrade rendimiento | Low | SGSI <10k registros; si crece, migrar a `$queryRaw` con SQL |
| Gráficos CSS puro no cubren todos los reportes | Low | Empezar con barras + dona; si se requiere complejidad, evaluar Chart.js |

## Rollback Plan

- **Backend**: Revertir `reportes/` a scaffold CRUD (conservado en git history)
- **Frontend**: Eliminar `reportes.vue`, remover link del sidebar
- **Módulo ya importado** en `app.module.ts` — no requiere cambios de rollback ahí

## Dependencies

- `PrismaService` debe estar disponible (ya lo está, usado por `ValoracionesModule`)
- Catálogos (`Impacto`, `MacroProceso`, etc.) deben tener datos (ya seedeados)

## Success Criteria

- [ ] 5 endpoints GET retornan JSON con datos agregados reales (no strings hardcodeados)
- [ ] Tests unitarios backend pasan con `npm run test` (cada endpoint con mock de Prisma)
- [ ] Página `/reportes` renderiza tabla resumen + gráficos sin errores de consola
- [ ] Link "Reportes" en sidebar navega correctamente a `/reportes`
- [ ] Endpoints rechazados para POST/PATCH/DELETE (HTTP 405 Method Not Allowed)
- [ ] Tipos TypeScript exportados y usados sin `any`
