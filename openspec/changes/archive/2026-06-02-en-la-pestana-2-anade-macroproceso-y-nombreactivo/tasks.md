# Tasks: Añadir macroproceso y nombreActivo como columnas readonly en Pestaña 2

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~25 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Añadir columnas readonly a tabla Pestaña 2 | PR 1 | Template-only, ~25 líneas, 1 archivo |

## Phase 1: Implementación (Template)

- [x] 1.1 Añadir 2 `<th>` en `<thead>` de Pestaña 2 (~línea 675): `Nombre del Activo` (`min-width:160px`) y `Macroproceso` (`min-width:180px`), antes de `<th>Amenazas</th>`
- [x] 1.2 Añadir 2 `<td>` con `<input readonly>` en `<tbody>` (~línea 683): `:value="analisisForm.nombreActivo"` y `:value="macroProcesoName"`, antes del `<!-- Amenaza cell -->`. Estilo inline: `background:rgba(15,23,42,0.3); cursor:not-allowed; color:var(--text-muted)`

## Phase 2: Verificación

- [ ] 2.1 `docker compose up`: abrir modal, navegar a Pestaña 2, confirmar columnas `Nombre del Activo` y `Macroproceso` con valores correctos
- [ ] 2.2 Cambiar activo en Pestaña 1, volver a Pestaña 2, verificar que columnas readonly reflejan el nuevo activo
- [ ] 2.3 Confirmar que `macroProcesoName` muestra nombre legible (no ID numérico)
- [x] 2.4 `docker compose exec backend npm run test` — tests existentes deben pasar (sin cambios de lógica)
- [ ] 2.5 Verificar que funcionalidad existente (Agregar Riesgo, eliminar fila, navegación wizard) no está rota
