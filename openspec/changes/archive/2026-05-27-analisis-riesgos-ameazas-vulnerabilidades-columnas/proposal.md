# Proposal: Reestructurar análisis de riesgos en modo de columnas (filas combinadas amenaza/vulnerabilidad)

## Intent

Transformar el Tab 2 "Análisis de Riesgos" de layout flat chip-list a filas explícitas donde cada fila tiene: amenaza(s) + vulnerabilidad(es) + controlesImplementados propios. Actualmente `controlesImplementacion` es un solo campo compartido a nivel `ValoracionActivo`; debe moverse a cada fila `DetalleRiesgo`. Las combinaciones válidas por fila son: amenaza+vulnerabilidad, solo amenaza, o solo vulnerabilidad.

## Scope

### In Scope
- Agregar `amenazaIds String? @db.Text` y `vulnerabilidadIds String? @db.Text` y `controlesImplementados String? @db.Text` al modelo `DetalleRiesgo` en `backend/prisma/schema.prisma`
- Actualizar DTOs de `DetalleRiesgo` (Create + Update) para incluir los nuevos campos
- Actualizar `DetalleRiesgoService` y `DetalleRiesgoController` para parsear y persistir los arrays JSON por fila
- Migración de datos: el texto `controlesImplementacion` existente en `ValoracionActivo` debe backfillerse a cada fila `DetalleRiesgo` relacionada
- Refactorizar `ValoracionModal.vue` (Tab 2) para mostrar tabla con columnas: Amenazas | Vulnerabilidades | Controles Implementados
- Actualizar `frontend/pages/valoracion.vue`: lógica de submit, `rebuildDetalles()`, y carga de datos para edit
- Actualizar tipos en `frontend/types/api.d.ts`

### Out of Scope
- Cambios en Tab 3 (Evaluación de Riesgo) — sigue usando el mismo modelo por fila individual
- Tests unitarios del frontend (no hay test runner)
- Nuevos catálogos o entidades

## Capabilities

### New Capabilities
- `analisis-riesgo-fila`: Cada fila de análisis de riesgo tiene amenaza(s), vulnerabilidad(es) y controles propios. Una fila es válida si tiene al menos amenaza o vulnerabilidad (no ambas vacías).

### Modified Capabilities
- `valoracion-modal`: El Tab 2 ya no usa flat chip-lists sino tabla de filas explícitas. El prop `detallesRiesgo` ahoratransporta datos de amenazas/vulnerabilidades/controles por fila.

## Approach

**Backend-first**: (1) Modificar schema Prisma, (2) Generar migración, (3) Actualizar DTOs, (4) Actualizar service y controller. **Frontend después**: (1) Refactorizar Tab 2 a tabla de filas, (2) Conectar nuevo payload al API. La estrategia de almacenamiento es JSON arrays en `@db.Text` columns — mismo patrón existente para `amenazas`/`vulnerabilidades` en `ValoracionActivo`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/prisma/schema.prisma` | Modified | Añadir `amenazaIds`, `vulnerabilidadIds`, `controlesImplementados` a `DetalleRiesgo` |
| `backend/src/valoraciones/detalle-riesgo/dto/` | Modified | Crear/actualizar DTOs para nuevos campos |
| `backend/src/valoraciones/detalle-riesgo/detalle-riesgo.service.ts` | Modified | Parsear JSON arrays y persistir por fila |
| `backend/src/valoraciones/detalle-riesgo/detalle-riesgo.controller.ts` | Modified | Endpoint actualizado |
| `frontend/components/ValoracionModal.vue` | Modified | Tab 2 refactorizado a tabla de filas |
| `frontend/pages/valoracion.vue` | Modified | Submit, rebuildDetalles, edit loading |
| `frontend/types/api.d.ts` | Modified | Tipos `DetalleRiesgo` con nuevos campos |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migración de datos: `controlesImplementacion` existente en `ValoracionActivo` necesita backfill a filas `DetalleRiesgo` | Medium | Crear script de migración SQL que copie el texto a cada fila `DetalleRiesgo` de esa valoración |
| Breaking change en API para edit: payloads antiguos no tienen `amenazaIds`/`vulnerabilidadIds` por fila | Medium | Mantener backward compatibility en DTOs con campos opcionales; frontend envía ambos siempre |
| Performance: guardar muchos rows con arrays JSON grandes | Low | Limitar número de filas visibles; paginar si >50 filas |

## Rollback Plan

1. Revertir `DetalleRiesgo` schema al estado anterior (remover 3 columnas)
2. `npx prisma db push` para sincronizar
3. Backend redeploy
4. Frontend puede mantener la nueva UI si es mejor UX; rollback solo si hay errores críticos

## Dependencies

- Ninguna dependencia externa nueva

## Success Criteria

- [ ] Cada fila `DetalleRiesgo` tiene sus propias amenaza(s) + vulnerabilidad(es) + controlesImplementados
- [ ] Fila válida requiere al menos amenaza o vulnerabilidad (no ambas vacías)
- [ ] Migración SQL ejecuta sin errores y hace backfill correcto
- [ ] Tab 2 de `ValoracionModal.vue` muestra tabla de filas con las 3 columnas
- [ ] Editar una valoración existente carga los datos correctamente en la nueva estructura
