# Design: Añadir macroproceso y nombreActivo como columnas readonly en Pestaña 2

## Technical Approach

Template-only change (~20 lineas) en `ValoracionModal.vue`. Se añaden 2 columnas readonly (Nombre del Activo, Macroproceso) ANTES de Amenazas en la tabla de la Pestaña 2. Los datos ya existen en `analisisForm` (prop) y `macroProcesoName` (computed). No se modifica logica, solo se expone lo que ya fluye al componente.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Columnas antes de Amenazas | Tabla mas ancha (6 cols), pero flujo logico: activo -> sus riesgos | **Elegido** — coherente con proposal y Pestanas 3/4 |
| Columnas despues de Amenazas | Rompe cohesion Amenazas<->Vulnerabilidades | Rechazado |
| Cabecera fuera de tabla | No ensancha tabla, pero el usuario pidio columnas explicitamente | Rechazado |
| `<input readonly>` vs `<span>` | `<input readonly>` consistente con Pestana 3 (linea 771), styling CSS unificado | **Elegido** |
| Repetir valor por fila vs una sola fila de cabecera | Mismo valor en todas las filas describe el activo, no el riesgo individual | **Elegido** — repeticion intencional |

## Data Flow

```
valoracion.vue (parent)                ValoracionModal.vue (child)
─────────────────────                  ──────────────────────────
valForm.macroProceso ──watch──> analisisForm.macroProceso ──prop──> analisisForm (prop)
valForm.nombreActivo  ──watch──> analisisForm.nombreActivo  ──prop──> analisisForm (prop)
                                                                    │
                                            catalogData.valMacroprocesos ──> macroProcesoName (computed, ID->nombre)
                                                                    │
                                            ┌─ <td><input readonly :value="analisisForm.nombreActivo" />
                                            │
                                            └─ <td><input readonly :value="macroProcesoName" />
```

El watch en la pagina padre (lineas 76-79) ya sincroniza ambos campos con `immediate: true`. La computed `macroProcesoName` (lineas 125-130) ya resuelve ID->nombre desde el catalogo. Ambos valores ya estan en el componente cuando la Pestana 2 se renderiza.

## Table Column Layout

Antes (4 columnas):
| Amenazas | Vulnerabilidades | Controles Implementados | x |

Despues (6 columnas):
| Nombre del Activo | Macroproceso | Amenazas | Vulnerabilidades | Controles Implementados | x |

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modify | Anadir 2 `<th>` al `<thead>` (antes de Amenazas) + 2 `<td>` readonly por fila en `<tbody>` |

## Implementation Detail

### `<thead>` (lineas 674-679)

Anadir antes de `<th>Amenazas</th>`:
```html
<th style="min-width:160px;">Nombre del Activo</th>
<th style="min-width:180px;">Macroproceso</th>
```

### `<tbody>` (lineas 682-759)

Anadir antes del `<td>` de Amenaza (linea 684):
```html
<!-- Nombre del Activo (readonly, mismo valor en todas las filas) -->
<td>
  <input type="text" :value="analisisForm.nombreActivo" readonly
    style="background:rgba(15,23,42,0.3); cursor:not-allowed; width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; color:var(--text-muted); font-size:0.85rem;" />
</td>

<!-- Macroproceso (readonly, resuelto por computed) -->
<td>
  <input type="text" :value="macroProcesoName" readonly
    style="background:rgba(15,23,42,0.3); cursor:not-allowed; width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; color:var(--text-muted); font-size:0.85rem;" />
</td>
```

### Styling

- `min-width` en `<th>`: 160px para Nombre del Activo, 180px para Macroproceso — consistente con las columnas existentes (`min-width:220px`)
- Los `<input readonly>` heredan el estilo `.val-card input` del CSS scoped. Estilo inline adicional para `background`, `cursor`, y `color` que indique readonly.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Visual | Las 2 columnas aparecen en la Pestana 2 con valores correctos | `docker compose up`, abrir modal, ir a Tab 2 |
| Visual | Cambiar activo en Pestana 1 -> volver a Pestana 2 -> columnas reflejan nuevo valor | Navegacion manual wizard |
| Visual | macroProcesoName resuelve nombre legible (no ID numerico) | Inspeccionar tabla con macroproceso seleccionado |
| Backend | Tests existentes pasan (`docker compose exec backend npm run test`) | Ningun cambio de logica — deben seguir verdes |

## Migration / Rollout

No migration required. Template-only change. Rollback: `git revert` del commit.

## Open Questions

None.
