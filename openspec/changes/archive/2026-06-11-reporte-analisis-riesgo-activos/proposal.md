# Proposal: Reporte de Análisis de Riesgo de Activos

## Intent

El reporte actual de Valoración de Activos no muestra amenazas, vulnerabilidades ni controles asociados a cada activo. Los auditores y responsables de SGSI necesitan una vista consolidada que vincule cada activo con sus riesgos detallados para revisión de cumplimiento y toma de decisiones.

## Scope

### In Scope
- Endpoint `GET /reportes/analisis-riesgo-activos` con filtros y búsqueda
- DTO `AnalisisRiesgoActivoDto` con nombres enriquecidos
- Tab "Análisis de Riesgo de Activos" en `pages/reportes.vue`
- Filtros: macroproceso, categoría de amenaza, amenaza, categoría de vulnerabilidad, vulnerabilidad
- Búsqueda: nombre de activo, amenaza, vulnerabilidad
- Tests unitarios backend (TDD obligatorio)

### Out of Scope
- Export Excel/PDF del nuevo reporte
- Migración de `amenazaIds`/`vulnerabilidadIds` a tablas join
- Modificación de la lógica de guardado en `ValoracionesService`
- Paginación server-side (dataset < 1000 registros)

## Capabilities

### New Capabilities
- `reporte-analisis-riesgo-activos`: Endpoint y tab de reporte que enriquece `DetalleRiesgo` con nombres de amenaza/vulnerabilidad, aplicando filtros combinados y búsqueda full-text.

### Modified Capabilities
- None

## Approach

**Server-side + in-memory híbrido**: filtrar `macroProcesoId` y `nombreActivo` con `Prisma.where` (server-side), luego cargar `DetalleRiesgo` con `include: { valoracionActivo: true }`, enriquecer con catálogos `Amenaza` y `Vulnerabilidad` en memoria, y aplicar filtros de amenaza/vulnerabilidad parseando los arrays JSON. Esto aprovecha el índice de BD para el filtro más común (macroproceso) mientras evita raw SQL o cambios de schema.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/reportes/reportes.controller.ts` | New | Nuevo endpoint `GET /reportes/analisis-riesgo-activos` |
| `backend/src/reportes/reportes.service.ts` | New | Método `getAnalisisRiesgoActivos()` con lógica de enriquecimiento |
| `backend/src/reportes/dto/reporte-response.dto.ts` | New | DTO `AnalisisRiesgoActivoDto` |
| `frontend/pages/reportes.vue` | Modified | Tab "Análisis de Riesgo de Activos" con tabla, filtros y búsqueda |
| `frontend/types/api.d.ts` | New | Interface `AnalisisRiesgoActivoReporte` |
| `backend/src/reportes/reportes.controller.spec.ts` | New | Tests del nuevo endpoint |
| `backend/src/reportes/reportes.service.spec.ts` | New | Tests del nuevo método |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| JSON parseo de `amenazaIds`/`vulnerabilidadIds` falla | Low | DTO ya valida con `JSON.parse`; usar `try/catch` en servicio |
| Dataset > 10k filas causa latencia | Low | Filtro server-side de macroproceso reduce el conjunto primero |
| Prisma MariaDB no soporta `where` en campos JSON | High | Confirmado: usar in-memory filtering para amenaza/vulnerabilidad |
| Representación de múltiples amenazas por fila | Med | Concatenar nombres con ", "; mantener 1 fila = 1 `DetalleRiesgo` |

## Rollback Plan

1. Revertir commit del feature branch
2. Si ya se hizo merge: revertir el commit de merge en `main`
3. El endpoint nuevo no es consumido por otros módulos; no hay dependencias circulares
4. Frontend: eliminar tab de `reportes.vue` y restaurar estado anterior

## Dependencies

- Catálogos `Amenaza` y `Vulnerabilidad` deben estar poblados en BD (garantizado por `prisma/seed.ts`)

## Success Criteria

- [ ] Endpoint retorna datos enriquecidos con filtros combinados funcionando
- [ ] Tests unitarios pasan (`docker compose exec backend npm run test`)
- [ ] Tab frontend carga y filtra sin errores
- [ ] Búsqueda full-text parcial e insensible a mayúsculas funciona
- [ ] Escapado de `%` y `_` en búsqueda (consistente con `valoracion-activos`)
- [ ] Respuesta vacía retorna `[]` con HTTP 200 y muestra empty-state

## Proposal Question Round

Las siguientes preguntas buscan refinar el alcance antes de pasar a especificación:

1. **¿El usuario quiere que el reporte muestre también el nivel de riesgo calculado (`evaluacionRiesgo`, `nivelRiesgo`) por fila, o solo amenaza/vulnerabilidad/controles?** — Impacta en las columnas del DTO y la tabla.
2. **¿Se necesita ordenamiento por alguna columna específica (ej. nombre de activo ASC, nivel de riesgo DESC)?** — El reporte `valoracion-activos` ordena por nombre; este podría necesitar un orden diferente.
3. **¿Hay restricciones de quién puede ver este reporte (rol de auditor vs. responsable)?** — Impacta en permisos del endpoint.
4. **¿El filtro de búsqueda debe buscar también dentro de `controlesImplementados` o `controlesArea`?** — Actualmente el exploration menciona solo nombre de activo, amenaza y vulnerabilidad.
5. **¿Se requiere algún indicador visual de severidad (color coding) para las amenazas/vulnerabilidades, o solo texto?** — Afecta la UI del frontend.

**Assumptions basadas en el exploration:**
- 1 fila = 1 `DetalleRiesgo` (concatenación si múltiples amenazas/vulnerabilidades)
- Dataset pequeño (<1000), sin paginación
- No hay restricciones de permisos adicionales
- No se muestra nivel de riesgo calculado en este reporte (eso está en `riesgos-por-activo`)

¿Deseás corregir alguna assumption o responder las preguntas antes de continuar?
