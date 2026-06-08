# Design: Añadir columnas Macroproceso y Nombre del Activo en Pestañas 3 y 4

## Technical Approach

Template-only change (~30 líneas HTML) en `ValoracionModal.vue`. Copiar el patrón exacto ya probado en Pestaña 2 (líneas 741-761): columnas readonly `Nombre del Activo` y `Macroproceso` insertadas ANTES de `Amenaza` en las tablas de Pestaña 3 y Pestaña 4. Los datos (`analisisForm.nombreActivo`, `macroProcesoName`) ya están en scope del componente.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `<input readonly>` (mismo patrón Tab 2) | Inline styles verbosos pero consistente con el código existente | **Elegido** — consistencia > brevedad |
| `<span>` simple | Más limpio pero inconsistente con Pestaña 2 | Rechazado |
| Columnas al final de la tabla | No interrumpe el flujo visual actual pero rompe "activo → riesgos" | Rechazado |
| Una sola fila de cabecera fuera de la tabla | Menos repetición pero el usuario pidió columnas explícitas por fila | Rechazado |

## Data Flow

El `v-for="row in riskRows"` en Pestañas 3 y 4 comparte el mismo `row` iterador que Pestaña 2. `analisisForm` es prop recibida del padre, `macroProcesoName` es computed global al `<script setup>`. Ambos son accesibles sin cambios:

```
analisisForm.nombreActivo (prop) ────> <input readonly> en cada <tr>
macroProcesoName (computed: ID→nombre) ──> <input readonly> en cada <tr>
```

## Placement

### Pestaña 3 (lines 876-950)

| Ubicación | Línea actual | Inserción |
|-----------|-------------|-----------|
| `<thead>` | 877 (`<th>Amenaza</th>`) | 2 `<th>` ANTES |
| `<tbody>` por fila | 888 (`<td>` Amenaza chips) | 2 `<td>` ANTES |

### Pestaña 4 (lines 971-1090)

| Ubicación | Línea actual | Inserción |
|-----------|-------------|-----------|
| `<thead>` | 972 (`<th>Amenaza</th>`) | 2 `<th>` ANTES |
| `<tbody>` por fila | 988 (`<td>` Amenaza chips) | 2 `<td>` ANTES |

## Pattern to Replicate (from Tab 2, lines 751-761)

```html
<!-- Nombre del Activo (readonly, mismo valor en todas las filas) -->
<td>
  <input :value="analisisForm.nombreActivo" readonly type="text"
    style="background:rgba(15,23,42,0.3); cursor:not-allowed; width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; color:var(--text-muted); font-size:0.85rem;" />
</td>

<!-- Macroproceso (readonly, resuelto por computed) -->
<td>
  <input :value="macroProcesoName" readonly type="text"
    style="background:rgba(15,23,42,0.3); cursor:not-allowed; width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; color:var(--text-muted); font-size:0.85rem;" />
</td>
```

## Column Layout — After Change

**Tab 3** (7 → 9 columns):
Nombre del Activo | Macroproceso | Amenaza | Vulnerabilidad | Nivel Amenaza | Nivel Vulnerabilidad | Evaluación | Nivel | Controles Area

**Tab 4** (10 → 12 columns):
Nombre del Activo | Macroproceso | Amenaza | Vulnerabilidad | Nivel Amenaza | Nivel Vulnerabilidad | Método | Tipo Control | Controles a Implementar | Eval. (Ctrl) | Nivel (Ctrl) | Riesgo Residual

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modify | +2 `<th>` + 2 `<td>`/fila en Tab 3 (líneas 876-950), +2 `<th>` + 2 `<td>`/fila en Tab 4 (líneas 971-1090) |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Smoke | Columnas visibles con valores correctos en Pestañas 3 y 4 | `docker compose up`, abrir valoración con datos, navegar wizard |
| Smoke | `macroProcesoName` muestra nombre legible (no ID) | Inspeccionar tabla con macroproceso seleccionado |
| Regression | Navegación wizard, submit, y validación no afectados | Navegar wizard completo, crear/editar valoración |
| Regression | Backend tests pasan | `docker compose exec backend npm run test` (sin cambios de lógica) |

## Migration / Rollout

No migration required. Rollback: revertir ~30 líneas de template añadidas con `git revert`.

## Open Questions

None.
