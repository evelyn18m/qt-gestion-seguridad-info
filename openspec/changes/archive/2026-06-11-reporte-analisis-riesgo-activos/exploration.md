## Exploration: Reporte de Análisis de Riesgo de Activos

### Current State

El sistema ya tiene un módulo de reportes funcional (`backend/src/reportes/` + `frontend/pages/reportes.vue`) con endpoints para resumen, riesgos por activo, riesgos por macroproceso, tratamiento, CIA, y valoración de activos.

El reporte actual de **Valoración de Activos** (`GET /reportes/valoracion-activos`) muestra: nombre, ubicación, tipo, formato, macroproceso, custodio, CIA. No incluye amenazas, vulnerabilidades ni controles.

La entidad `DetalleRiesgo` almacena las relaciones clave para el análisis de riesgo:
- `valoracionActivoId` → FK a `ValoracionActivo`
- `amenazaIds` → JSON array de IDs (texto), ej. `"[3,7]"`
- `vulnerabilidadIds` → JSON array de IDs (texto), ej. `"[5]"`
- `controlesImplementados` → texto libre
- `controlesArea` → texto libre
- `tipo` → `"amenaza"` | `"vulnerabilidad"`

El frontend (`valoracion.vue`) crea filas de `DetalleRiesgo` de tipo único: una fila por amenaza (`tipo: 'amenaza'`, `amenazaIds: [id]`, `vulnerabilidadIds: []`) y una fila por vulnerabilidad (`tipo: 'vulnerabilidad'`, `vulnerabilidadIds: [id]`, `amenazaIds: []`). Aunque el schema permite arrays múltiples, el patrón de uso actual es 1:1 por fila.

### Affected Areas

- `backend/src/reportes/reportes.controller.ts` — Nuevo endpoint GET `/reportes/analisis-riesgo-activos` con query params para filtros y búsqueda
- `backend/src/reportes/reportes.service.ts` — Nuevo método `getAnalisisRiesgoActivos()` con lógica de enriquecimiento y filtrado
- `backend/src/reportes/dto/reporte-response.dto.ts` — Nuevo DTO `AnalisisRiesgoActivoDto`
- `frontend/pages/reportes.vue` — Nuevo tab "Análisis de Riesgo de Activos" con tabla, filtros y búsqueda
- `frontend/types/api.d.ts` — Nueva interface `AnalisisRiesgoActivoReporte`
- `backend/src/reportes/reportes.controller.spec.ts` — Tests para el nuevo endpoint
- `backend/src/reportes/reportes.service.spec.ts` — Tests para el nuevo servicio

### Approaches

1. **In-memory filtering (hybrid server-side + client-side)** — Query `DetalleRiesgo` con `include: { valoracionActivo: { include: { macroProceso: true } } }`, luego enriquecer con catálogos de Amenaza y Vulnerabilidad en memoria, aplicar filtros y búsqueda en código.
   - **Pros**: Mantiene el stack Prisma puro (sin raw SQL), consistente con el patrón actual del reporte `valoracion-activos`, rápido de implementar. El dataset de SGSI es típicamente < 1000 registros, por lo que la escalabilidad no es un problema real.
   - **Cons**: Todos los `DetalleRiesgo` se cargan en memoria antes de filtrar; no escala a datasets masivos (100k+). No aprovecha índices de BD para filtrar por amenaza/vulnerabilidad.
   - **Effort**: Medium

2. **Raw SQL con MySQL JSON functions** — Usar `prisma.$queryRaw` con `JSON_CONTAINS` para filtrar `amenazaIds` y `vulnerabilidadIds` directamente en la BD.
   - **Pros**: Filtros por amenaza/vulnerabilidad son ejecutados en la BD (eficiente), aprovecha el índice de `valoracionActivoId` y potencialmente JSON indexes en MySQL 8.0.
   - **Cons**: Pierde type safety de Prisma, requiere mapeo manual de resultados a DTO, más complejo de testear, no hay precedentes en el código actual (no se usa `$queryRaw` en ningún lado).
   - **Effort**: High

3. **Schema migration a tablas join** — Crear `_DetalleRiesgoAmenaza` y `_DetalleRiesgoVulnerabilidad` con relaciones many-to-many explícitas, migrar datos JSON existentes, y actualizar `ValoracionesService` para guardar en las tablas join.
   - **Pros**: Modelo relacional correcto, filtros nativos en Prisma, escalable, elimina la deuda técnica de JSON arrays.
   - **Cons**: Cambio de schema grande que afecta la lógica de guardado en `ValoracionesService`, requiere migración de datos existentes, riesgo de regresión en la pestaña 2 del wizard de valoración. No es directamente el alcance del reporte.
   - **Effort**: High

4. **Combinación server-side para macroproceso + in-memory para amenazas/vulnerabilidades** — Filtrar `macroProcesoId` en Prisma `where` (server-side), luego cargar en memoria y aplicar el resto de filtros.
   - **Pros**: Aprovecha el índice de BD para el filtro más común (macroproceso), reduce el dataset de memoria. El resto de filtros (amenaza/vulnerabilidad) son en memoria sobre un subconjunto más pequeño.
   - **Cons**: Más complejo que la opción 1 (dos capas de filtrado), pero aún manejable.
   - **Effort**: Medium

### Recommendation

**Opción 4 (Combinación server-side para macroproceso + in-memory para amenazas/vulnerabilidades)**. Es el equilibrio óptimo: el filtro de macroproceso (el más probable) usa índice de BD, y los filtros de amenaza/vulnerabilidad se aplican sobre el subconjunto reducido. El search por nombre de activo también puede ir server-side (`ValoracionActivo.nombreActivo` contiene `q`).

Si el dataset crece masivamente en el futuro, la migración a tablas join (Opción 3) sería el siguiente paso lógico.

### Risks

- **JSON parsing en memoria**: `amenazaIds` y `vulnerabilidadIds` son strings JSON. Error de parseo si el formato varía (aunque el DTO ya valida con `JSON.parse`).
- **Dataset grande**: Si hay > 10.000 filas de `DetalleRiesgo`, el in-memory filtering podría causar latencia. Mitigación: el filtro de macroproceso server-side reduce el conjunto antes del enriquecimiento.
- **TDD obligatorio**: `strict_tdd: true` en config. El endpoint nuevo requiere tests previos a la implementación.
- **Ambigüedad en la representación de filas**: El usuario pidió singular "amenaza" y "vulnerabilidad" por columna. Si un `DetalleRiesgo` tiene múltiples amenazas, hay que decidir si se concatenan (","), se crean filas explotadas, o se muestra la primera. Recomendación: **concatenar con ", "** para mantener 1 fila = 1 detalle de riesgo, que es la granularidad de la BD. Si el usuario necesita granularidad por amenaza individual, se puede pivotar en el futuro.
- **Prisma adapter MariaDB**: El soporte de `groupBy` y `json` es limitado. `findMany` + `include` funciona bien, pero `where` sobre campos JSON no es soportado nativamente. Esto valida la necesidad de in-memory filtering.

### Ready for Proposal

**Yes**. El scope es claro: nuevo tab en `/reportes`, nuevo endpoint `/reportes/analisis-riesgo-activos`, columnas de amenaza/vulnerabilidad/controles, filtros por macroproceso/categoría de amenaza/amenaza/categoría de vulnerabilidad/vulnerabilidad, búsqueda por nombre de activo/amenaza/vulnerabilidad. El orchestrator puede iniciar `sdd-propose`.
