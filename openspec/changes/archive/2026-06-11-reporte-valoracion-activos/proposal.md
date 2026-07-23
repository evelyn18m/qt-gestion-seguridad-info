# Proposal: Reporte de Valoración de Activos con Filtros y Búsqueda

## Intent

El usuario necesita consultar la lista completa de valoraciones de activos desde el módulo de Reportes, con capacidad de filtrar por campos clave (nombre, ubicación, macroproceso, formato, custodio, nivel CIA) y buscar por texto libre sobre nombre/ubicación. Hoy solo existen reportes agregados; no hay un listado detallado navegable.

## Scope

### In Scope
- Nuevo endpoint `GET /reportes/valoracion-activos` con query params de filtro y búsqueda
- Nuevo DTO `ValoracionActivoReporteDto` con campos enriquecidos (nombres de relaciones, no solo IDs)
- Nuevo tab "Valoración de Activos" en `frontend/pages/reportes.vue` con tabla, filtros UI y búsqueda
- Interface TypeScript `ValoracionActivoReporte` en `frontend/types/api.ts`
- Tests unitarios (controller + service) antes de implementación (TDD obligatorio)

### Out of Scope
- Paginación server-side (se evaluará si el dataset supera 500 registros)
- Exportar a Excel/PDF
- Filtros avanzados por rango de fechas o múltiples selecciones OR
- CRUD de valoraciones (ya existe en `ValoracionesController`)

## Capabilities

### New Capabilities
- `reporte-valoracion-activos`: Tabla de valoraciones de activos con server-side filtering, búsqueda full-text sobre nombre/ubicación, y enriquecimiento de relaciones (tipoActivo, formato, macroProceso, custodio, impactos CIA).

### Modified Capabilities
- None. El tab se agrega al módulo `reportes` existente; los specs actuales no cambian de comportamiento.

## Approach

Server-side filtering con Prisma `findMany({ where: { OR: [...] }, include: { ... } })` para evitar N+1. El endpoint acepta `?q=` (búsqueda texto) y `?macroProcesoId=`, `?formatoId=`, `?custodioId=`, `?confidencialidadId=`, `?integridadId=`, `?disponibilidadId=` como filtros exactos. El frontend usa `useApi().get()` con parámetros reactivos y debounce de 300ms en la búsqueda.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/reportes/reportes.controller.ts` | Modified | Agrega `@Get('valoracion-activos')` con `@Query()` params |
| `backend/src/reportes/reportes.service.ts` | Modified | Agrega `getValoracionActivos(filters)` con Prisma `where` + `include` |
| `backend/src/reportes/dto/reporte-response.dto.ts` | Modified | Agrega `ValoracionActivoReporteDto` |
| `frontend/pages/reportes.vue` | Modified | Agrega tab 5 con tabla, filtros y búsqueda |
| `frontend/types/api.ts` | Modified | Agrega `ValoracionActivoReporte` interface |
| `backend/src/reportes/reportes.controller.spec.ts` | Modified | Tests para nuevo endpoint (TDD) |
| `backend/src/reportes/reportes.service.spec.ts` | Modified | Tests para nuevo método (TDD) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| N+1 queries en enriquecimiento | Low | Usar `include` en la query de Prisma, no `findMany` + `findUnique` |
| PR excede 400 líneas | Medium | Backend (~80) + frontend (~150) + tests (~80) = ~310 líneas estimadas. Si excede, dividir en 2 PRs |
| `@prisma/adapter-mariadb` limita `groupBy` | Low | No se usa `groupBy` en este reporte; `findMany` + `where` es suficiente |

## Rollback Plan

Eliminar el tab del frontend (revert de `reportes.vue`), el endpoint del controller, y el método del service. Los DTOs nuevos no afectan endpoints existentes. No hay cambios de base de datos.

## Dependencies

- Ninguna externa. Depende de la infraestructura existente (`useApi`, `PrismaService`, `reportes` module).

## Success Criteria

- [ ] Tab "Valoración de Activos" visible en `/reportes` con datos cargados
- [ ] Búsqueda por texto filtra sobre `nombreActivo` y `ubicacion` sin recargar página completa
- [ ] Filtros por dropdown (macroproceso, formato, custodio, CIA) funcionan combinados
- [ ] Respuesta incluye nombres de relaciones (tipoActivo, formato, macroProceso, custodio) en lugar de IDs
- [ ] Tests unitarios pasan antes y después de la implementación
- [ ] Zero `localhost:3001` hardcoded en el frontend (usa `useApi()`)

## Proposal Question Round

Antes de pasar a `sdd-spec`, las siguientes preguntas mejorarían la precisión del spec:

1. **Business rule**: ¿El filtro de búsqueda debe ser case-insensitive y con wildcard (LIKE `%q%`) o exact match? ¿Debe buscar en `nombreActivo` **OR** `ubicacion` o ambas concatenadas?
2. **Target user**: ¿Este reporte es solo para lectura, o el usuario espera poder hacer clic en una fila para ir al CRUD de editar valoración?
3. **Scope boundary**: ¿Cuántos registros de valoración activos existen hoy? Si son >500, ¿deberíamos incluir paginación server-side en este slice o en un segundo PR?
4. **Edge case**: ¿Qué debe mostrar cuando no hay valoraciones registradas? ¿Empty state genérico o mensaje con CTA a "Crear valoración"?
5. **Product outcome**: ¿El orden de la tabla debe ser por fecha de creación, por nombre, o por algún criterio de riesgo?

---

*Assumptions basadas en la exploración: búsqueda LIKE case-insensitive, sin paginación para dataset <500, orden por nombreActivo ASC, empty state con mensaje genérico.*
