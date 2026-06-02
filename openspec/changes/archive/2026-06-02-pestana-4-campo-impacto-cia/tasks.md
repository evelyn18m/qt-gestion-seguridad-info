# Tasks: Añadir campo Impacto CIA en Pestaña 4

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~5 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Template Insertion

- [x] 1.1 Insertar bloque `<div class="form-group">` de Impacto CIA entre `<h3>` (l.854) y `<div v-if>` (l.855) en Tab 4 de `frontend/components/ValoracionModal.vue`

## Phase 2: Verification

- [x] 2.1 Backend: correr `docker compose exec backend npm run test` — sin regresiones
- [x] 2.2 Manual: verificar que Tab 4 muestra el campo Impacto CIA idéntico al de Tab 3 (mismo label, readonly input, lógica condicional)
- [x] 2.3 Manual: verificar que el campo aparece tanto con `riskRows.length === 0` como con filas presentes
- [x] 2.4 Manual: verificar que Tab 3 permanece sin cambios y funcional
