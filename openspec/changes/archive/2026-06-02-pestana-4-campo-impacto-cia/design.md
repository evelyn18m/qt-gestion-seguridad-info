# Design: Añadir campo Impacto CIA en Pestaña 4

## Technical Approach

Replicar el bloque HTML exacto `<div class="form-group">` de la Pestaña 3 (líneas 783–786 de `ValoracionModal.vue`) en la Pestaña 4, entre el `<h3 class="val-card-title">` (línea 854) y el `<div v-if="riskRows.length === 0">` (línea 855). Sin cambios en `<script>`, sin nuevas dependencias, sin backend.

## Architecture Decisions

No se requieren decisiones de arquitectura. Es un copy-paste aditivo de template con cero impacto en lógica, estado, o flujo de datos.

## Data Flow

Sin cambios. `ciaAverage` (computed, líneas 116–123) y `getCiaLevel()` (función, líneas 460–464) ya existen en el scope del componente y son accesibles en el template de Tab 4.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modify | Insertar 4 líneas de template entre `<h3>` (l.854) y `<div v-if>` (l.855) en Tab 4 |

## Template Change (Exact)

Entre línea 854 y 855 de `ValoracionModal.vue`, insertar:

```html
              <div class="form-group">
                <label>Impacto (Extraído de Valoración CIA - Pestaña 1)</label>
                <input type="text" :value="ciaAverage > 0 ? ciaAverage.toFixed(2) + ' — ' + getCiaLevel(ciaAverage) : 'Complete Valoración CIA en Pestaña 1'" readonly style="background:rgba(15,23,42,0.3); cursor:not-allowed;" />
              </div>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Campo visible en Tab 4 con y sin filas | Navegar al paso 4 del wizard, verificar que el campo aparece idéntico al de Tab 3 |
| Manual | Tab 3 permanece sin cambios | Navegar al paso 3 del wizard, verificar funcionalidad intacta |

> El frontend no tiene runner de tests automatizados (`config.yaml`: unit/e2e `available: false`).

## Migration / Rollout

No migration required. Rollback: eliminar las 4 líneas insertadas.

## Open Questions

Ninguna — cambio trivial confirmado en exploration.
