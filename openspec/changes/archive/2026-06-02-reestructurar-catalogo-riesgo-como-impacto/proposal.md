# Proposal: Reestructurar Catálogo Riesgo como Impacto

## Intent

Normalizar el modelo `Riesgo` para alinearlo con el patrón de catálogos como Impacto: reemplazar el campo combinado `evaluacion` (texto compuesto `"Alto (3)"`) por campos atómicos `tipo` y `nivel`. Elimina el anti-patrón de filtrar con `r.evaluacion?.toLowerCase().includes('amenaza')` y alinea el esquema Prisma con los demás catálogos. El `valor` (3=Alto, 2=Medio, 1=Bajo) mantiene semántica idéntica — cero cambios en el motor de cálculo.

## Scope

### In Scope
- Schema Prisma: reemplazar `evaluacion` (String) + `valor` (Int?) → `tipo` (String) + `nivel` (String) + `valor` (Int, required)
- Seed: parser section-aware que lee headers como `tipo` y data rows como `{tipo, nivel, valor}`
- Backend `FIELD_MAP`: `['tipo', 'nivel', 'valor']`
- Frontend `catalogos.vue` FIELD_MAP + `ValoracionModal.vue`: reemplazar `r.evaluacion` por `r.tipo`/`r.nivel`, filtros `r.tipo === 'Amenaza'`
- Limpiar `DetalleRiesgo` rows con FK huérfanas post-reseed

### Out of Scope
- Cambios en `valoraciones.service.ts` (compatible — `r?.valor ?? 1` no cambia)
- Migración con preservación de IDs (Approach A — innecesario en dev)

## Capabilities

### New Capabilities
None

### Modified Capabilities
None — el `valor` (3,2,1) mantiene semántica idéntica. `getValorRiesgo()` y `calculateRiesgo()` no requieren cambios. Los specs `calculo-riesgo` y `riesgo-preview` referencian `valorRiesgo`, no `evaluacion`. Sin modificación a nivel de requerimiento.

## Approach

**Approach B: db push + reseed** (recomendado para entorno dev).

1. Modificar `schema.prisma`: nuevo modelo Riesgo con `tipo`, `nivel`, `valor`
2. `prisma db push` — recreate table
3. Actualizar `seed.ts`: parser section-aware (similar al de Impacto)
4. Limpiar `DetalleRiesgo` (FKs huérfanas)
5. Reseed
6. Actualizar FIELD_MAPs en backend y frontend
7. Actualizar `ValoracionModal.vue`: filtros y display text

## Affected Areas

| Area | Impact |
|------|--------|
| `backend/prisma/schema.prisma` | Modificado: nuevo modelo Riesgo |
| `backend/prisma/seed.ts` | Modificado: parser Riesgo |
| `backend/src/catalogos/catalogos.service.ts` | Modificado: FIELD_MAP línea 38 |
| `backend/src/valoraciones/valoraciones.service.ts` | Sin cambios (valor forward-compatible) |
| `frontend/pages/catalogos.vue` | Modificado: FIELD_MAP línea 54 |
| `frontend/components/ValoracionModal.vue` | Modificado: líneas 814, 823, 898 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| FK huérfanas en DetalleRiesgo post-reseed | High | Limpiar todas las rows antes del reseed |
| Frontend break por deploy no sincronizado | Medium | Schema + frontend se despliegan juntos |
| Regresión en seed parser | Low | Usar lógica section-aware ya probada en impacto seed |

## Rollback Plan

Revertir `schema.prisma` al modelo anterior (`evaluacion` + `valor?`), `prisma db push`, restaurar seed.ts a parser previo, re-ejecutar reseed. Rollback completo < 5 minutos.

## Dependencies

Ninguna. Cambio autocontenido en el modelo Riesgo y sus consumidores directos.

## Success Criteria

- [ ] Riesgo table tiene columnas `tipo`, `nivel`, `valor` (non-nullable)
- [ ] Seed inserta 6 rows (Alto/Medio/Bajo × Amenaza/Vulnerabilidad)
- [ ] `GET /catalogos/riesgos` retorna `{tipo, nivel, valor}`
- [ ] ValoracionModal muestra niveles correctamente filtrados por tipo
- [ ] `calculateRiesgo()` produce mismos resultados que antes del cambio
