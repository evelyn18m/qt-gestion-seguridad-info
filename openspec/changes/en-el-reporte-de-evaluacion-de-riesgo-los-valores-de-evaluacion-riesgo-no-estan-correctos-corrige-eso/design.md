# Design: Corrección de Cálculo de Evaluación de Riesgo

## Technical Approach

Raíz del bug: `mapDetalleRiesgo()` hardcodea `VA=3` en vez de usar `ValoracionActivo.impacto` (promedio CIA). La solución: añadir parámetro `va` a `mapDetalleRiesgo()`, derivar VA del activo padre en todos los call-sites (create, update, recalcular). Unificar frontend a 3 niveles (BAJO/MEDIO/ALTO) y persistir `ValoracionActivo.evaluacionRiesgo`/`nivelRiesgo` como MAX de hijos.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| VA propagation | Parámetro `va: number` en `mapDetalleRiesgo()` | Leer BBDD dentro de `mapDetalleRiesgo` | Callers ya tienen el activo en memoria. Acoplar `mapDetalleRiesgo` a Prisma rompe testability. |
| `ValoracionActivo.evaluacionRiesgo` | MAX de todos los hijos | Weighted avg / sum | El reporting SGSI se gestiona sobre el peor riesgo. MAX protege contra subestimación. |
| `POST /:id/recalcular` | `$transaction` con N creates tras deleteMany | Row-by-row sin transacción | Atómico: o todo o nada. Si un hijo falla, no queda estado inconsistente. |
| NivelRiesgo frontend | `deriveNivelRiesgo` (≤3 BAJO, ≤8 MEDIO, ≤27 ALTO) | Mantener 4 niveles con "Crítico" | Debe coincidir con backend. El badge "Crítico" no debe aparecer en filas post-fix. |
| VA fallback en preview | `dto.VA ?? valoracionActivo.impacto ?? 3` | `dto.VA ?? 3` | Si el frontend no envía VA, debemos derivarlo del activo, no hardcodear. |

## Data Flow

```
Frontend valoracion.vue
  │  ciaAverage (C+I+D)/3 → impacto en PATCH body
  │  submitValoracion → PATCH /valoraciones/:id/detalles-riesgo/:detId/calcular
  │                     { nivelAmenaza, nivelVulnerabilidad, VA: ciaAverage }
  ▼
Backend calcularDetalleRiesgo()
  │  va = dto.VA ?? activo.impacto ?? 3  ← LEE impacto del padre
  │  calculateRiesgo(va, nivelAmenaza, nivelVulnerabilidad, ...)
  ▼
Result: evaluacionRiesgo = VA × amenaza × vulnerabilidad (corregido)

Backend create() / update()
  │  mapDetalleRiesgo(dto, activo.id, niveles..., VA=activo.impacto ?? 3)
  │  → calculateRiesgo(va, ...)  ← ya NO hardcoded 3
  │  → persiste DetalleRiesgo
  │  → calcula max(evaluacionRiesgo) de hijos
  │  → prisma.valoracionActivo.update({ evaluacionRiesgo, nivelRiesgo })
  ▼
POST /valoraciones/:id/recalcular
  │  Carga activo + sus detalles
  │  Para cada hijo: recalcula con VA=activo.impacto ?? 3
  │  $transaction([deleteMany, ...N creates])
  │  Actualiza padre con max(evaluacionRiesgo)
  ▼
Respuesta: { count: N, activo: ValoracionActivo enriquecido }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/valoraciones/valoraciones.service.ts` | Modify | `mapDetalleRiesgo` +param `va`; `create`/`update` persisten `ValoracionActivo.evaluacionRiesgo`; nuevo `recalcular()` |
| `backend/src/valoraciones/valoraciones.controller.ts` | Modify | Nuevo `@Post(':id/recalcular')` |
| `backend/src/valoraciones/dto/calcular-detalle.dto.ts` | Modify | `VA` ya existe (sin cambios). Fallback en service cambia. |
| `frontend/components/ValoracionModal.vue` | Modify | `updateControlDetalleRow` usa `deriveNivelRiesgo` en vez de `calcularNivelRiesgo` |
| `frontend/pages/valoracion.vue` | Modify | `submitValoracion` línea 361: añade `VA: ciaAverage.value` al body del PATCH |
| `backend/src/valoraciones/valoraciones.service.spec.ts` | Modify | Nuevos tests: VA=1 produce evaluacionRiesgo=1 (no 3); recalcular con 3 hijos |

## Interfaces

```typescript
// Recalcular response
interface RecalcularResponse {
  count: number;          // filas recalculadas
  activo: ValoracionActivo; // enriquecido (mismo formato GET /:id)
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `mapDetalleRiesgo` con VA=1 produce evaluacionRiesgo=1 (no 3) | Jest mock Prisma |
| Unit | `calcularDetalleRiesgo` deriva VA de `activo.impacto` cuando DTO sin VA | Jest mock Prisma |
| Unit | `recalcular()` recalcula N hijos con VA correcto | Jest mock Prisma + `$transaction` spy |
| Unit | `recalcular()` con impacto=null usa fallback VA=3 | Jest |
| Unit | `recalcular()` lanza 404 para id inexistente | Jest |
| Unit | `create()`/`update()` persisten `ValoracionActivo.evaluacionRiesgo` como MAX | Jest |

## Open Questions

- [ ] ¿Se necesita un botón "Recalcular" en el frontend o solo endpoint para corrección manual post-deploy?
