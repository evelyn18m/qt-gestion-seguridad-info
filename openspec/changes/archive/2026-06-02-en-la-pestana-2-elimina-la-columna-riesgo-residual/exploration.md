## Exploration: Eliminar columna "Riesgo Residual" de Pestaña 2 (Análisis de Riesgos)

### Current State

**¿Qué es "riesgo residual"?** Es un valor **derivado/computado**, no persistido. Se calcula como:
- `riesgoResidual = evaluacionRiesgoControl <= 3 ? 'ACEPTABLE' : 'INACEPTABLE'`
- Donde `evaluacionRiesgoControl = VA × nivelAmenazaControl × nivelVulnerabilidadControl`
- `evaluacionRiesgoControl` SÍ está persistido en la BD (tabla `DetalleRiesgo`, campo `evaluacionRiesgoControl`).

**¿Dónde aparece en Pestaña 2?** En `ValoracionModal.vue`, Tab 2 (Análisis de Riesgos):

1. **Header** (línea 678): `<th>Riesgo Residual</th>` — encabezado de la quinta columna.
2. **Celda** (líneas 756–771): Badge que muestra "ACEPTABLE" (verde) o "INACEPTABLE" (rojo) derivado localmente de `d.evaluacionRiesgoControl <= 3`. **No usa el campo `riesgoResidual` del tipo `DetalleRiesgo`** — computa directamente desde `evaluacionRiesgoControl`.

### Affected Areas

#### Frontend — Cambio directo (obligatorio)
- **`frontend/components/ValoracionModal.vue`** — líneas 678 (header `<th>`) y 756–771 (celda `<td>`) deben eliminarse. La tabla pasa de 5 a 4 columnas (Amenazas, Vulnerabilidades, Controles Implementados, Acción eliminar).

#### Frontend — Código muerto (opcional, baja prioridad)
- **`frontend/types/api.d.ts`** línea 57 — `riesgoResidual` en `RiesgoCalculado`. Lo sigue devolviendo el backend, pero Tab 2 no lo consume.
- **`frontend/types/api.d.ts`** línea 74 — `riesgoResidual?` en `DetalleRiesgo`. No se lee en ningún lado del frontend.
- **`frontend/pages/valoracion.vue`** línea 312 — `riesgoResidual: calculado.riesgoResidual` en `Object.assign`. Es código muerto: se asigna al payload pero el backend lo ignora (`DetalleRiesgoDto` no tiene ese campo).

#### Backend — NO requiere cambios
- `backend/src/valoraciones/calculo-riesgo.service.ts` — Función pura `calculateRiesgo()`. `riesgoResidual` es un output válido del cálculo de control. Puede ser útil para reportes futuros.
- `backend/src/valoraciones/calculo-riesgo.service.spec.ts` — 8 assertions que prueban `riesgoResidual`.
- `backend/src/valoraciones/valoraciones.service.ts` — `calcularDetalleRiesgo()` retorna `RiesgoCalculado` con `riesgoResidual`.
- `backend/src/valoraciones/valoraciones.controller.ts` — Endpoint `PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular`.
- `backend/src/valoraciones/dto/create-valoracion.dto.ts` y `update-valoracion.dto.ts` — No tienen campo `riesgoResidual` (confirmación de que no se persiste).
- `backend/prisma/schema.prisma` — Ni `DetalleRiesgo` ni `ValoracionActivo` tienen campo `riesgoResidual`.

#### No afectado
- **Tab 3** (Evaluación de Riesgo) — No muestra ni usa `riesgoResidual`.
- **Tab 4** (Tratamiento de Riesgo) — Muestra `evaluacionRiesgoControl` y `nivelRiesgoControl` pero NO el badge `riesgoResidual`.
- **ValoracionViewModal.vue** — No muestra `riesgoResidual`.
- **ValoracionActivo** (Prisma) — No tiene campo `riesgoResidual`.
- **DetalleRiesgo** (Prisma) — No tiene campo `riesgoResidual`.

### Approaches

1. **Enfoque A: Mínimo — Solo eliminar la columna de Tab 2 (Recomendado)**
   - Eliminar líneas 678 (`<th>Riesgo Residual</th>`) y 756–771 (celda badge) de `ValoracionModal.vue`.
   - 1 archivo modificado, ~15 líneas removidas.
   - Pros: Mínimo riesgo, cumple exactamente lo pedido, no rompe nada.
   - Cons: Deja código muerto en tipos y `valoracion.vue` (pero es inofensivo).
   - Esfuerzo: **Bajo**.

2. **Enfoque B: Limpieza completa — Columna + tipos + backend**
   - Eliminar columna de Tab 2, remover `riesgoResidual` de `api.d.ts`, limpiar la asignación muerta en `valoracion.vue`, y potencialmente remover del backend (`calculo-riesgo.service.ts` + tests).
   - 5+ archivos modificados.
   - Pros: Código más limpio, sin campos huérfanos.
   - Cons: Rompe el contrato del endpoint `calcular` (quita un campo del response), requiere actualizar 8 assertions de tests, sobre-ingeniería para un cambio que es puramente de UI.
   - Esfuerzo: **Medio**.

### Recommendation

**Enfoque A (mínimo, frontend-only).**

Razones:
1. El pedido es específico: "en la pestaña 2 elimina la columna riesgo residual". Es un cambio de UI, no de lógica de negocio.
2. El valor `riesgoResidual` es una derivación legítima del análisis de control (`evaluacionRiesgoControl ≤ 3`) — puede ser útil en reportes, exportaciones, o vistas futuras.
3. `evaluacionRiesgoControl` (el dato subyacente) sigue persistiéndose y mostrándose en Tab 4. Eliminar solo el badge de Tab 2 no pierde información.
4. La limpieza de tipos muertos se puede hacer en un refactor separado si se desea, pero no es necesaria para este cambio.

### Risks

- **Layout de tabla**: La tabla de Tab 2 pasa de 5 a 4 columnas. Verificar visualmente que las columnas restantes (Amenazas, Vulnerabilidades, Controles Implementados) mantengan buen aspecto.
- **Ningún riesgo funcional**: `riesgoResidual` no se persiste en BD, no afecta validaciones, no es input de ninguna otra columna o cálculo. Es puramente display.
- **Rollback trivial**: Revertir 1 archivo.

### Ready for Proposal

**Sí.** El cambio está perfectamente acotado: 1 archivo, solo frontend, sin dependencias con backend ni otras pestañas. Se puede proceder a `sdd-propose`.
