# Proposal: Correccion de Calculo de Evaluacion de Riesgo

## Intent

Los valores evaluacionRiesgo y nivelRiesgo en todos los reportes son incorrectos. Causa raiz: mapDetalleRiesgo() hardcodea VA=3 en vez de usar el promedio CIA real del activo (campo impacto). Tres bugs adicionales agravan la inconsistencia.

## Scope

### In Scope
- mapDetalleRiesgo() recibe parametro va con ValoracionActivo.impacto (no hardcoded 3)
- calcularDetalleRiesgo() lee impacto del activo padre como VA fallback
- Frontend calcularNivelRiesgo unificado a 3 niveles (BAJO, MEDIO, ALTO) segun deriveNivelRiesgo
- ValoracionActivo.evaluacionRiesgo y nivelRiesgo persistidos en create/update
- POST /valoraciones/:id/recalcular para corregir datos existentes inflados

### Out of Scope
- Cambio de la formula de calculo (ya es correcta: VA x amenaza x vulnerabilidad)
- Recalculo automatico masivo sin intervencion
- Cambio de badges/niveles en el reporte (ya leen columnas persistidas correctamente)

## Capabilities

### New Capabilities
- recalculo-riesgo: POST endpoint que recalcula todos los DetalleRiesgo y ValoracionActivo de un activo usando sus inputs actuales (CIA, riesgoId, vulnerabilidadRiesgoId). No modifica DTOs del usuario — solo re-ejecuta calculateRiesgo con VA correcto.

### Modified Capabilities
- calculo-riesgo: VA derivation MUST use ValoracionActivo.impacto field (CIA average populated by frontend). Fallback to 3 only when impacto is null. Callers (mapDetalleRiesgo, calcularDetalleRiesgo) MUST read VA from parent activo, not hardcode.

## Approach

1. Add va parameter to mapDetalleRiesgo() — callers pass item.impacto ?? 3
2. calcularDetalleRiesgo() reads impacto from valoracionActivo when DTO.VA is null
3. Replace frontend calcularNivelRiesgo thresholds with backend-compatible 3-level logic
4. After DetalleRiesgo create/update, compute ValoracionActivo.evaluacionRiesgo as max of child rows and persist via prisma.valoracionActivo.update()
5. Recalcular endpoint: load activo, re-run create/update logic on all detalles without changing inputs

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| backend/src/valoraciones/valoraciones.service.ts | Modified | mapDetalleRiesgo receives va; recalculo in create/update; new recalcular method |
| backend/src/valoraciones/valoraciones.controller.ts | Modified | New POST /:id/recalcular endpoint |
| frontend/components/ValoracionModal.vue | Modified | Replace calcularNivelRiesgo 4-level thresholds with 3-level |
| frontend/pages/valoracion.vue | Modified | Add VA to calcularPreview PATCH body |
| backend/src/valoraciones/dto/calcular-detalle.dto.ts | Modified | Add optional VA field to CalcularDetalleDto |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Datos existentes inflados (VA=3 siempre) | Alto | Endpoint recalcular + release notes para re-edicion |
| Badge "Critico" desaparece del frontend | Bajo | Release note documenta cambio a 3 niveles |
| Agregacion de ValoracionActivo.evaluacionRiesgo (max vs weighted avg) | Med | Resolver en design; default a max de filas hijo |
| Tests existentes asumen VA=3 | Medio | Actualizar specs para cubrir VA=1, VA=2 |

## Rollback Plan

Revert commit. Sin migracion DB — campos siguen nullable. Los activos editados post-fix mantienen valores correctos (no empeoran). Los no-editados siguen con valores inflados (estado pre-fix).

## Dependencies

Ninguna externa. ValoracionActivo.impacto ya es poblado por el frontend (valoracion.vue line 397). El catálogo Impacto ya esta sembrado.

## Success Criteria

- [ ] GET /reportes/evaluacion-riesgo retorna evaluacionRiesgo = VA real x amenaza x vulnerabilidad para activos con CIA = 1 o 2 (no inflado 3x)
- [ ] GET /reportes/riesgos-por-activo retorna evaluacionRiesgo no-null para activos editados post-fix
- [ ] Previews Tab 3/4 coinciden con valores persistidos (mismos thresholds)
- [ ] POST /valoraciones/:id/recalcular corrige filas existentes infladas a valores correctos
- [ ] Backend unit tests: spec con activo CIA=1 produce evaluacionRiesgo=1x1x1=1 (no 3x1x1=3)
