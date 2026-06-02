# Design: Eliminar columna "Riesgo Residual" de Pestaña 2

## Technical Approach

Remover 2 bloques de template en `ValoracionModal.vue` — el `<th>` del encabezado (línea 678) y el `<td>` del badge (líneas 756-771). La tabla de Tab 2 pasa de 5 a 4 columnas: Amenazas, Vulnerabilidades, Controles Implementados, Acción eliminar. Sin cambios de lógica, sin nuevas dependencias, sin tocar backend.

El dato subyacente (`evaluacionRiesgoControl`) sigue computándose en `calcularDetalle()` (líneas 510-518) y persistiéndose normalmente — solo se elimina su visualización derivada en Tab 2.

## Architecture Decisions

### Decision 1: Frontend-only removal

| Option | Tradeoff | Decision |
|--------|----------|----------|
| A. Solo eliminar columna de UI | Cambio mínimo, `riesgoResidual` sigue en response de API. Código "muerto" inofensivo. | **Elegido** |
| B. Remover columna + limpiar backend + tipos | Código más limpio, pero rompe contrato de endpoint, requiere actualizar 8 assertions de tests, sobre-ingeniería para un cambio de UI. | Rechazado |

**Rationale**: El pedido es específicamente de UI. `riesgoResidual` es una derivación legítima del análisis de control que puede aprovecharse en reportes futuros. El costo de romper el contrato del endpoint `calcular` supera el beneficio de limpiar un campo que no molesta. Si en el futuro se quiere hacer limpieza de tipos muertos (`api.d.ts`, `valoracion.vue`), se hará en un refactor separado con su propio scope.

### Decision 2: Sin nuevas abstracciones

**Choice**: Eliminar las líneas directamente del template — sin extraer configuraciones de columnas ni crear componentes reutilizables.

**Rationale**: El cambio es puntual (1 columna de 1 tabla en 1 pestaña). Introducir un array de columnas configurable o un componente `<RiskTable>` sería sobre-ingeniería para este scope. El patrón actual (template inline con `<table>`) es consistente con el resto del componente y del proyecto.

## Data Flow

**Sin cambios.** El flujo de datos existente se mantiene intacto:

```
Tab 1 (Ident. Riesgos) ──→ Tab 2 (Análisis)
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                   ▼
        Amenaza select    Vulnerabilidad select   Controles textarea
              │                 │                   │
              └────────────┬────┘                   │
                           ▼                        │
                    calcularDetalle()               │
                    ├→ evaluacionRiesgoControl      │
                    └→ nivelRiesgoControl           │
                                │                   │
                                ▼                   ▼
                        Tab 3 (Evaluación)    Tab 4 (Tratamiento)
```

Lo único que se elimina es el paso de display: `evaluacionRiesgoControl → badge ACEPTABLE/INACEPTABLE` en Tab 2. El cómputo y persistencia de `evaluacionRiesgoControl` siguen igual — Tab 3 y Tab 4 lo muestran sin cambios.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/components/ValoracionModal.vue` | Modify | Eliminar `<th>Riesgo Residual</th>` (L678) y `<td>` badge completo (L756-771). Sin cambios en `<script>` ni `<style>`. |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Visual (manual) | Tab 2 muestra 4 columnas sin "Riesgo Residual" | Abrir valoración con al menos 1 fila de riesgo, verificar encabezados y celdas |
| Visual (manual) | Navegación Step 2 → Step 3 funciona | Verificar que el botón "Siguiente" sigue habilitado cuando `riskRows.length > 0` |
| Visual (manual) | No hay regresión en Tabs 1, 3, 4 | Navegar por todas las pestañas, verificar que renderizan normalmente |
| Backend unit | `calculo-riesgo.service.spec.ts` sigue verde | `docker compose exec backend npm run test` — 8 assertions de `riesgoResidual` siguen pasando (backend sin cambios) |

**Nota**: El frontend no tiene test runner configurado. La verificación es puramente manual/visual.

## Migration / Rollout

No migration required. Sin cambios en BD ni en contratos de API.

**Rollback**: `git revert` del commit que modifica `ValoracionModal.vue`. Instantáneo, sin side effects.

## Open Questions

Ninguna.
