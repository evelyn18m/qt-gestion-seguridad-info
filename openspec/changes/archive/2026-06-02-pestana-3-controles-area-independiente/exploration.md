## Exploration: Pestaña 3 — Columna "Controles Area" independiente

### Current State

`ValoracionModal.vue` tiene una columna **"Controles"** en la Pestaña 3 (Evaluación de Riesgo) cuyo `<textarea>` está bindeado a `row.controlesImplementados` — el MISMO campo que la Pestaña 2 usa en su columna "Controles Implementados". Esto significa que cualquier texto escrito en la Pestaña 3 **sobrescribe** lo ingresado en la Pestaña 2 y viceversa.

Ambos tabs comparten la misma instancia de `RiskRow` (definida en línea 154-160), que solo tiene el campo `controlesImplementados: string`.

**Doble esquema de guardado**:
- `ValoracionActivo.controlesArea` — campo a nivel del registro padre, seteado desde `evaluacionForm.controlesArea` en `valoracion.vue` línea 337. NO tiene UI visible en el modal.
- `DetalleRiesgo.controlesImplementados` — campo per-row, compartido entre Tab 2 y Tab 3.

El usuario quiere que la Pestaña 3 tenga su **propio** campo per-row independiente, llamado `controlesArea`, con encabezado "Controles Area".

### Affected Areas

| Archivo | Línea(s) | Qué cambia |
|---------|----------|------------|
| `backend/prisma/schema.prisma` | ~155 (DetalleRiesgo) | Agregar `controlesArea String? @db.Text` después de `controlesImplementados` |
| `backend/src/valoraciones/dto/create-valoracion.dto.ts` | ~105 (DetalleRiesgoDto) | Agregar `controlesArea?: string` después de `controlesImplementados` |
| `backend/src/valoraciones/valoraciones.service.ts` | 49-51 (mapDetalleRiesgo) | Agregar spread para `controlesArea` después del bloque de `controlesImplementados` |
| `frontend/types/api.d.ts` | ~78 (DetalleRiesgo) | Agregar `controlesArea?: string` |
| `frontend/components/ValoracionModal.vue` | 154-160 (RiskRow) | Agregar `controlesArea: string` |
| `frontend/components/ValoracionModal.vue` | 165-172 (agregarFila) | Inicializar `controlesArea: ''` |
| `frontend/components/ValoracionModal.vue` | 230-277 (syncRowsToDetalles) | Mapear `controlesArea: row.controlesArea` en cada entrada generada |
| `frontend/components/ValoracionModal.vue` | 280-297 (loadExistingRows) | Cargar `controlesArea: d.controlesArea \|\| ''` |
| `frontend/components/ValoracionModal.vue` | 797 (header Tab 3) | Renombrar `Controles` → `Controles Area` |
| `frontend/components/ValoracionModal.vue` | 843 (textarea Tab 3) | Cambiar `v-model="row.controlesImplementados"` → `v-model="row.controlesArea"` |
| `frontend/pages/valoracion.vue` | 249 (save payload) | Agregar `controlesArea: d.controlesArea \|\| null` al payload de `detallesRiesgo` |
| `frontend/pages/valoracion.vue` | 419 (edit load) | Agregar `controlesArea: d.controlesArea \|\| ''` al mapeo de carga |
| DB | — | `npx prisma db push` para sincronizar el nuevo campo |

**No afectados** (sin cambios necesarios):
- `backend/src/valoraciones/dto/update-valoracion.dto.ts` — extiende de `CreateValoracionDto`, hereda cambios automáticamente.
- `backend/src/valoraciones/valoraciones.service.spec.ts` — los tests solo verifican conteos de `$transaction`, no aserciones sobre campos específicos de `DetalleRiesgo`.
- `ValoracionActivo.controlesArea` — campo a nivel padre, no se toca. Coexiste sin conflicto con el nuevo `DetalleRiesgo.controlesArea` porque están en tablas distintas.

### Approaches

Solo hay un enfoque viable dado que el usuario quiere un campo nuevo e independiente:

1. **Agregar `controlesArea` a `DetalleRiesgo` (full-stack)** — Nuevo campo en schema Prisma → DTO → Service → frontend type → RiskRow → UI.
   - **Pros**: Respetamos el diseño existente. Tab 2 y Tab 3 tienen campos independientes sin fricción. El campo `controlesArea` del padre (`ValoracionActivo`) sigue existiendo sin cambios (backward compatible).
   - **Cons**: Requiere `db push` para crear la columna en MySQL. Una migración adicional en el esquema.
   - **Effort**: Bajo — ~12 líneas de código + 1 línea de encabezado HTML.

   **Alternativa descartada — renombrar el campo padre**: Poner `ValoracionActivo.controlesArea` como texto en Tab 3. Esto requeriría hacerlo per-row de alguna forma, lo cual rompe el diseño row-based y el usuario explícitamente pidió independencia de Tab 2, no del campo padre.

### Recommendation

Implementar el **Approach 1** — agregar `controlesArea` a `DetalleRiesgo`. Es la solución más limpia, alineada con la arquitectura row-based existente, y de mínimo riesgo.

### Risks

- **Colisión de nombre**: `controlesArea` ya existe en `ValoracionActivo` (nivel padre, guardado desde `evaluacionForm.controlesArea`). El nuevo campo en `DetalleRiesgo` usa el mismo nombre pero en tabla distinta. No hay riesgo de conflicto porque son tablas y contextos diferentes, pero documentar esta distinción es importante para futuros mantenedores.
- **Datos existentes**: Las filas existentes de `DetalleRiesgo` tendrán `controlesArea = NULL`. El frontend ya maneja `|| ''` para campos opcionales, así que no hay riesgo de crashes.
- **db push**: Requiere acceso al contenedor Docker del backend. Si los contenedores no están corriendo, hay que levantarlos primero.

### Ready for Proposal

Sí — el scope es claro, la solución es directa, y todos los archivos afectados están identificados.
