## Exploration: Reporte de Valoración de Activos con Filtros y Búsqueda

### Current State

El sistema ya tiene un módulo de reportes funcional (`backend/src/reportes/` + `frontend/pages/reportes.vue`) con 5 tabs:
1. Resumen (totales, donut, barras)
2. Riesgos por Activo
3. Riesgos por MacroProceso
4. Tratamiento
5. CIA

El backend expone 5 endpoints GET en `ReportesController` y el frontend consume vía `useApi().apiFetch<T>()`.

La entidad `ValoracionActivo` en Prisma contiene los campos necesarios:
- `nombreActivo`, `ubicacion`
- `macroProcesoId`, `formatoId`, `custodioId`
- `confidencialidadId`, `integridadId`, `disponibilidadId`

El servicio `ValoracionesService` ya implementa un método `enrich()` que resuelve relaciones (tipoActivo, formato, macroProceso, propietario, custodio, impactos CIA), pero usa N+1 queries (`findUnique` por campo). El `reportes.service.ts` actualmente agrega en memoria con `findMany` sin `include`.

### Affected Areas

- `backend/src/reportes/reportes.controller.ts` — Nuevo endpoint GET `/reportes/valoracion-activos` con query params
- `backend/src/reportes/reportes.service.ts` — Nuevo método `getValoracionActivos()` con filtros Prisma y enriquecimiento eficiente
- `backend/src/reportes/dto/reporte-response.dto.ts` — Nuevo DTO `ValoracionActivoReporteDto`
- `frontend/pages/reportes.vue` — Nuevo tab "Valoración de Activos" con tabla, filtros y búsqueda
- `frontend/types/api.d.ts` — Nueva interface `ValoracionActivoReporte`
- `backend/src/reportes/reportes.controller.spec.ts` — Tests para el nuevo endpoint
- `backend/src/reportes/reportes.service.spec.ts` — Tests para el nuevo servicio

### Approaches

1. **Tab en Reportes existente + Server-side filtering** — Agregar un 6to tab a `reportes.vue` con filtros server-side.
   - **Pros**: UX coherente (todo en Reportes), menos código de rutas/navegación, filtros son eficientes con Prisma `where`, aprovecha `useApi` existente.
   - **Cons**: `reportes.vue` crece (pero aún manejable < 1000 líneas), el endpoint necesita parámetros de query.
   - **Effort**: Medium

2. **Página separada + Client-side filtering** — Crear `frontend/pages/reporte-valoracion.vue` y cargar TODO en memoria.
   - **Pros**: Página dedicada, sin tocar `reportes.vue`.
   - **Cons**: Navegación duplicada, el usuario ya tiene un link "Reportes" en el sidebar, client-side filtering no escala si el dataset crece, más trabajo de UI/UX para mantener consistencia visual.
   - **Effort**: Medium

3. **Reuse `ValoracionesController.findAll()` con query params** — Extender `GET /valoraciones` en lugar de `GET /reportes/valoracion-activos`.
   - **Pros**: Reusa endpoint existente.
   - **Cons**: Rompe la separación de responsabilidades (el listado de valoraciones es CRUD, el reporte es agregación/filtrado), la respuesta CRUD tiene muchos campos innecesarios para el reporte, y `findAll` no tiene `search` sobre `nombreActivo`/`ubicacion`.
   - **Effort**: Medium

### Recommendation

**Opción 1 (Tab en Reportes + Server-side filtering)**. Es la más limpia arquitectónicamente: el módulo `reportes` se encarga de reportes, el CRUD `valoraciones` se encarga de mantenimiento. Prisma `where` con `OR` para búsqueda de texto y `include` para relaciones resuelve N+1 en una sola query.

### Risks

- **N+1 en enriquecimiento**: Si `getValoracionActivos()` usa `findMany` + `findUnique` por relación como el `enrich()` actual, será ineficiente con muchos registros. Mitigación: usar `include` en la query de Prisma.
- `@prisma/adapter-mariadb` tiene soporte limitado de `groupBy` pero `findMany` + `where` + `include` funciona bien. No hay riesgo para este caso.
- **Tamaño del PR**: Frontend + backend + tests puede superar 400 líneas. Mitigación: el frontend tab es ~120-150 líneas, backend ~80, tests ~80. Total ~310-350 líneas, dentro del presupuesto. Si excede, dividir en 2 PRs: backend primero, frontend segundo.
- **TDD obligatorio**: `strict_tdd: true` en config. Hay que escribir tests antes de la implementación.

### Ready for Proposal

**Yes**. El scope es claro: nuevo tab en `/reportes`, nuevo endpoint `/reportes/valoracion-activos`, filtros por query params, búsqueda full-text sobre nombre/ubicación. El orchestrator puede iniciar `sdd-propose`.
