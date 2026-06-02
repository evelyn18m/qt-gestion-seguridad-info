## Exploration: Añadir macroproceso y nombreActivo como columnas readonly en Pestaña 2

### Current State

**Ubicación del cambio**: `frontend/components/ValoracionModal.vue` — componente multi-tab wizard que contiene las 4 pestañas.

**Pestaña 1 (Tab 0) — Valoración de Activo**:
- `valForm.nombreActivo` = string (input de texto, línea 560)
- `valForm.macroProceso` = **ID como string** (select con `:value="m.id"`, líneas 578-581)

**Pestaña 2 (Tab 1) — Análisis de Riesgos**: Tabla actual con 4 columnas:

| Amenazas | Vulnerabilidades | Controles Implementados | × (delete) |
|----------|-----------------|------------------------|-----------|

**Sincronización existente** (`frontend/pages/valoracion.vue`, líneas 76-79):
El watch en la página padre ya sincroniza `valForm → analisisForm`:
```ts
watch([() => valForm.value.macroProceso, () => valForm.value.nombreActivo], ([macro, nombre]) => {
  analisisForm.value.macroProceso = macro    // ID como string
  analisisForm.value.nombreActivo = nombre   // string
}, { immediate: true })
```

**Datos ya disponibles en el componente**:
- `analisisForm` (prop, interface `AnalisisFormData`) tiene `macroProceso: string` (ID) y `nombreActivo: string`
- `macroProcesoName` computed (líneas 125-130 de ValoracionModal.vue) **ya existe** y resuelve el ID → nombre legible, pero NO está siendo usado en el template. Es un remanente de la implementación anterior.

### Affected Areas

- `frontend/components/ValoracionModal.vue` — Único archivo a modificar:
  - **Template**: Añadir 2 `<th>` en el `<thead>` (línea 674) y 2 `<td>` readonly en cada fila del `<tbody>` (antes de la celda Amenazas)
  - **Script**: Ningún cambio necesario — la `computed macroProcesoName` ya existe y `analisisForm` ya recibe los datos sincronizados
- **No se toca el backend** — es puramente display de datos ya existentes en el form state

### Approaches

1. **Añadir columnas antes de Amenazas (recomendado)** — Dos nuevas columnas readonly al inicio de la tabla, mostrando el contexto del activo antes de las amenazas/vulnerabilidades.
   - Pros: Flujo lógico — primero ves qué activo/macroproceso, luego sus riesgos. Orden coherente con otras pestañas (Tab 3 y 4 ya muestran Amenaza/Vulnerabilidad primero).
   - Cons: La tabla se vuelve más ancha (6 columnas en vez de 4).
   - Effort: **Muy bajo** — ~20 líneas de template. No requiere lógica nueva.

2. **Añadir columnas después de Amenazas** — Poner Nombre Activo y Macroproceso entre Amenazas y Vulnerabilidades.
   - Pros: Ninguno evidente.
   - Cons: Rompe la cohesión visual Amenazas↔Vulnerabilidades que son el par central de la pestaña.
   - Effort: Muy bajo.

3. **Mostrar como cabecera de tabla en lugar de columnas** — Poner `nombreActivo` y `macroProceso` como texto informativo arriba de la tabla, no como columnas.
   - Pros: No ensancha la tabla.
   - Cons: El usuario pidió explícitamente "campos" en la pestaña, y pierde la alineación visual fila-por-fila si la tabla es scrollable.
   - Effort: Muy bajo.

### Recommendation

**Approach 1** — Añadir 2 columnas readonly ANTES de Amenazas. La tabla pasará de 4 a 6 columnas:

| Nombre del Activo | Macroproceso | Amenazas | Vulnerabilidades | Controles Implementados | × |

Implementación:
1. En el `<thead>` (línea 674): añadir `<th>Nombre del Activo</th>` y `<th>Macroproceso</th>` antes de `<th>Amenazas</th>`
2. En cada fila del `<tbody>` (línea 682): añadir dos `<td>` con inputs readonly antes del `<td>` de Amenazas:
   - `nombreActivo` → `analisisForm.nombreActivo` (string directo)
   - `macroProceso` → `macroProcesoName` (computed ya existente que resuelve ID → nombre)
3. Después de la tabla, cada fila repite el mismo valor de nombreActivo y macroProceso (vienen de Tab 1, no de la fila individual). Esto es correcto porque estos campos describen el activo, no el riesgo individual.

### Risks

- **Ningún riesgo técnico** — es un cambio exclusivamente de template. Los datos ya fluyen correctamente desde Tab 1 vía `analisisForm`.
- **UX**: La tabla se ensancha (6 columnas). En pantallas pequeñas puede requerir scroll horizontal. Mitigación: usar `min-width` modesto (ej. 150px) en las nuevas columnas, consistente con el estilo existente.
- **Consistencia**: La memoria #51 menciona que en la implementación anterior los campos eran `<input readonly>`. Verificar si queremos mantener ese estilo o usar texto plano. La Pestaña 3 ya usa `<input readonly>` para el campo "Impacto" (línea 771), lo cual es un precedente consistente.

### Ready for Proposal

**Sí** — El cambio está perfectamente acotado. Es frontend-only, ~20 líneas de template. Los datos ya existen en `analisisForm`, la computed `macroProcesoName` ya está definida, solo falta exponerlos en la tabla.
