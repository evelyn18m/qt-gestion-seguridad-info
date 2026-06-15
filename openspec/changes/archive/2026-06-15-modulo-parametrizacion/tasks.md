# Tasks: Parametrización — Consolidated Risk View

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~130 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

> **TDD note**: `config.yaml` has `strict_tdd: true` but frontend has no test runner (`unit.available: false`). All verification is manual smoke testing per the design document.

## Phase 1: Page Creation (`parametrizacion.vue`)

- [x] 1.1 Create `frontend/pages/parametrizacion.vue` with `<script lang="ts" setup>`, importing `ValoracionActivo` from `~/types/api` and `useApi` + `SessionExpiredError` from `~/composables/useApi`
- [x] 1.2 Define reactive state: `valLoading(ref)`, `errorMessage(ref)`, `valSaved(ref: ValoracionActivo[])`, `showSessionExpired(ref)`
- [x] 1.3 Implement `onMounted` → `loadParametrizacion()` calling `useApi().apiFetch<ValoracionActivo[]>('/valoraciones')` with try/catch for 401 (show session-expired modal) vs other errors (set `errorMessage` + "Reintentar" button)
- [x] 1.4 Define `getNivelClass(nivel: string): string` mapping labels to CSS class names (`badge-bajo`, `badge-medio`, `badge-alto`, `badge-critico`, `badge-aceptable`, `badge-inaceptable`) using same hex colors as `getNivelStyle()` pattern from `valoracion.vue`
- [x] 1.5 Define `getMaxNivel(detalles: DetalleRiesgo[], field: string): string` returning the highest nivel across rows (ordered: Crítico > Alto > Medio > Bajo); return `"Sin evaluación"` if empty/undefined
- [x] 1.6 Define `getResidualRiesgo(va: ValoracionActivo): string` returning `"INACEPTABLE"` if any `detallesRiesgo[].riesgoResidual === 'INACEPTABLE'`, else `"ACEPTABLE"`, else `"Sin evaluación"`
- [x] 1.7 Render template: `<div class="parametrizacion-section">` containing loading indicator (`v-if="valLoading"`), error state (`v-if="errorMessage"`), empty state (`v-else-if="valSaved.length === 0"`), and 8-column `<table>`: Activo, Macroproceso, C (`va.confidencialidad?.nivel`), I (`va.integridad?.nivel`), D (`va.disponibilidad?.nivel`), Nivel Riesgo, Riesgo Control, Riesgo Residual — each risk cell as `<span :class="getNivelClass(...)">`
- [x] 1.8 Add session-expired modal (`v-if="showSessionExpired"`) with "Log In Again" button calling `useAuth().login()`
- [x] 1.9 Write scoped `<style>`: reuse `.val-table`, `.val-empty-state`, `.val-success` classes from `valoracion.vue`; define `.badge-*` classes with hex colors matching `getNivelStyle()` — green `#16a34a`, yellow `#ca8a04`, orange `#ea580c`, red `#dc2626`

## Phase 2: Navigation

- [x] 2.1 In `frontend/layouts/default.vue`, insert `<NuxtLink active-class="active" class="nav-item" to="/parametrizacion" @click="closeSidebar">` block between the Valoración de Activos link (line 111) and Reportes link (line 112), with an SVG icon and label "Parametrización"

## Phase 3: Verification (Manual)

- [x] 3.1 Start frontend dev server, navigate to `/parametrizacion`, confirm table renders with all 8 columns and correct badge colors for each risk level
- [ ] 3.2 Stop backend container, reload page, confirm error message + "Reintentar" button appears; re-enable backend, click retry, confirm data reloads
- [ ] 3.3 Navigate to `/parametrizacion` from sidebar, confirm link has `active` class and icon renders; verify link appears between "Valoración de Activos" and "Reportes"
- [ ] 3.4 Verify no edit/delete/create buttons exist on the page (read-only requirement)
