# Proposal: Lógica de Cálculo de Riesgos — Matriz EGSI v1.4

## Intent

El Tab 3 (Evaluación de Riesgos) actualmente muestra campos vacíos que requieren cálculo automático: `evaluacionRiesgo`, `nivelRiesgo`, `metodoTratamiento`, `tipoControl`, `evaluacionRiesgoControl`, `nivelRiesgoControl`, y `riesgo residual`. El usuario introduce amenaza y vulnerabilidad, pero el sistema no deriva los valores-resultado. Este change implementa la lógica de cálculo en backend y una preview reactiva en frontend.

## Scope

### In Scope
- Backend: método `calculateRiesgo(va, nivelAmenaza, nivelVulnerabilidad)` en `DetalleRiesgoService` que computa todos los campos derivados
- Backend: invocar `calculateRiesgo()` al crear y al actualizar cualquier `DetalleRiesgo`
- Backend: endpoint `PATCH /detalle-riesgo/:id/calcular` que recalcula sin cambiar datos (para preview)
- Frontend: preview reactiva en Tab 3 — al cambiar amenaza/vulnerabilidad, mostrar `evaluacionRiesgo` y `nivelRiesgo` antes de guardar
- Frontend: badge `RIESGO RESIDUAL` (INACEPTABLE/ACEPTABLE) en la tabla de análisis (Tab 2)

### Out of Scope
- Cambios en Tab 2 (filas amenaza+vulnerabilidad ya existen del change anterior)
- Migración de datos o cambios de schema Prisma (schema ya tiene los campos necesarios)
- Modificación de catálogos o entidades nuevas

## Capabilities

### New Capabilities
- `calculo-riesgo-automatico`: El sistema calcula `evaluacionRiesgo = VA × nivelAmenaza × nivelVulnerabilidad` (rango 1-27), deriva `nivelRiesgo` (1-3=BAJO, 4-8=MEDIO, 9-27=ALTO), `metodoTratamiento` (1-3=RETENER, 4-27=MODIFICAR/PREVENIR/COMPARTIR), `tipoControl` (1-3=Monitoreo, 4-8=Preventivo, 9-27=Correctivo), y determina `riesgo residual` (≤3=ACEPTABLE) tras aplicar control.

### Modified Capabilities
- `analisis-riesgo-fila`: Cada fila `DetalleRiesgo` ahora tiene cálculo automático al crearse/editarse. El campo `controlesImplementados` ya existe; se usa para calcular `evaluacionRiesgoControl` y `nivelRiesgoControl`.

## Approach

**Backend primero**: (1) Crear `calculo-riesgo.service.ts` con lógica pura `calculateRiesgo()` — sin side effects, exportable para testing. (2) Integrar en `DetalleRiesgoService.create()` y `.update()`. (3) Exponer endpoint `PATCH /detalle-riesgo/:id/calcular` para preview. **Frontend después**: (1) En Tab 3, computar `evaluacionRiesgo` preview desde `amenazaIds` + `nivelVulnerabilidad` del formulario. (2) Añadir badge residual en Tab 2 usando `evaluacionRiesgoControl` y `nivelRiesgoControl`.

Fórmula según matriz EGSI:
```
evaluacionRiesgo = VA × nivelAmenaza × nivelVulnerabilidad
nivelRiesgo = 1-3→BAJO, 4-8→MEDIO, 9-27→ALTO
metodoTratamiento = 1-3→RETENER, 4-27→MODIFICAR
tipoControl = 1-3→Monitoreo, 4-8→Preventivo, 9-27→Correctivo
riesgo residual: evaluacionRiesgoControl ≤ 3 → ACEPTABLE
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/valoraciones/detalle-riesgo/calculo-riesgo.service.ts` | New | Lógica pura de cálculo — exportable, testeable |
| `backend/src/valoraciones/detalle-riesgo/detalle-riesgo.service.ts` | Modified | Llama `calculateRiesgo()` en create/update |
| `backend/src/valoraciones/detalle-riesgo/detalle-riesgo.controller.ts` | Modified | Nuevo endpoint `PATCH /:id/calcular` |
| `backend/src/valoraciones/detalle-riesgo/dto/` | Modified | DTOs actualizados con campos calculados |
| `frontend/components/ValoracionModal.vue` | Modified | Preview reactiva Tab 3 + badge residual Tab 2 |
| `frontend/pages/valoracion.vue` | Modified | Conectar preview al API de cálculo |
| `frontend/types/api.d.ts` | Modified | Tipos para campos calculados |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Umbral residual = 3 no confirmado por stakeholder | Medium | Incluir en spec como "requiere validación de usuario"; crear flag de configuración |
| VA (Valor del Activo) no está disponible en el create flow de DetalleRiesgo (per-row) | Medium | `evaluacionRiesgo` usa CIA promedio del formulario padre — pasar vía contexto o computar en frontend para preview |
| Breaking change si existing rows tienen null en campos derivados | Low | Hacer campos opcionales; no forzar cálculo en rows existentes sin cambios |

## Rollback Plan

1. Revertir `calculo-riesgo.service.ts` — eliminar archivo
2. Remover llamadas a `calculateRiesgo()` en `DetalleRiesgoService`
3. Eliminar endpoint `PATCH /:id/calcular`
4. Frontend: quitar preview y badge (revertir a estado anterior)
5. Ningún cambio de schema — sin migración necesaria

## Dependencies

- Ninguna dependencia externa nueva

## Success Criteria

- [ ] `calculateRiesgo()` produce evaluacionRiesgo 1-27 para cualquier combinación válida de inputs
- [ ] `nivelRiesgo` y `metodoTratamiento` derivan correctamente según tabla de la matriz EGSI
- [ ] `riesgo residual` muestra ACEPTABLE cuando evaluacionRiesgoControl ≤ 3
- [ ] Endpoint `PATCH /detalle-riesgo/:id/calcular` retorna los campos derivados sin persistir
- [ ] Preview reactiva en Tab 3 muestra resultado antes de guardar
- [ ] Badge residual visible en Tab 2 para cada fila con datos de control