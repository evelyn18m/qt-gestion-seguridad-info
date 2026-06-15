<script lang="ts" setup>
import type { DetalleRiesgo, ValoracionActivo } from '~/types/api'
import { SessionExpiredError } from '~/composables/useApi'

const { login } = useAuth()
const valLoading = ref(false)
const errorMessage = ref('')
const valSaved = ref<ValoracionActivo[]>([])
const showSessionExpired = ref(false)

async function loadParametrizacion() {
  valLoading.value = true
  errorMessage.value = ''
  try {
    const { apiFetch } = useApi()
    valSaved.value = await apiFetch<ValoracionActivo[]>('/valoraciones')
  } catch (e) {
    if (e instanceof SessionExpiredError) {
      showSessionExpired.value = true
    } else {
      errorMessage.value = e instanceof Error ? e.message : 'Error al cargar los datos'
    }
  } finally {
    valLoading.value = false
  }
}

// ─── Umbrales de riesgo (ISO 27005, alineados con calculo-riesgo.service.ts) ───

function getNivelFromValue(val: number | null | undefined): string {
  if (val == null) return 'Sin evaluación'
  if (val <= 3) return 'Bajo'
  if (val <= 9) return 'Medio'
  return 'Alto'
}

function getResidualFromValue(val: number | null | undefined): string {
  if (val == null) return 'Sin evaluación'
  if (val <= 3) return 'Aceptable'
  return 'Inaceptable'
}

function getMaxEvaluacion(
  detalles: DetalleRiesgo[] | undefined,
  field: 'evaluacionRiesgo' | 'evaluacionRiesgoControl',
): number | null {
  if (!detalles || detalles.length === 0) return null
  let max = -Infinity
  for (const d of detalles) {
    const val = d[field]
    if (typeof val === 'number' && val > max) max = val
  }
  return Number.isFinite(max) ? max : null
}

function getNivelClass(nivel: string): string {
  const n = (nivel || '').toLowerCase()
  if (n.includes('inaceptable'))
    return 'badge-critico'
  if (n.includes('alto'))
    return 'badge-alto'
  if (n.includes('medio'))
    return 'badge-medio'
  if (n.includes('bajo') || n.includes('aceptable'))
    return 'badge-bajo'
  return 'badge-sin-datos'
}

function handleLoginRedirect() {
  login()
}

onMounted(() => {
  loadParametrizacion()
})
</script>

<template>
  <div class="parametrizacion-section">
    <div class="welcome-banner">
      <h2>Parametrización</h2>
      <p>Vista consolidada de riesgos por activo de información.</p>
    </div>

    <div v-if="valLoading" class="catalogo-placeholder">Cargando datos...</div>

    <div v-else-if="errorMessage" class="val-error">
      <p>{{ errorMessage }}</p>
      <button class="btn-primary" type="button" @click="loadParametrizacion">Reintentar</button>
    </div>

    <div v-else-if="valSaved.length === 0" class="val-empty-state">
      No hay valoraciones registradas.
    </div>

    <div v-else class="val-card" style="padding:0; overflow:auto;">
      <table class="val-table">
        <thead>
          <tr>
            <th style="width:50px;">#</th>
            <th>Activo</th>
            <th>Macroproceso</th>
            <th>C</th>
            <th>I</th>
            <th>D</th>
            <th>Nivel Riesgo</th>
            <th>Riesgo Control</th>
            <th>Riesgo Residual</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(va, idx) in valSaved" :key="va.id">
            <td style="text-align:center;">{{ idx + 1 }}</td>
            <td>{{ va.nombreActivo || 'N/A' }}</td>
            <td>{{ va.macroProceso?.nombre || `MP#${va.macroProcesoId}` }}</td>
            <td>
              <span v-if="va.confidencialidad?.nivel" :class="getNivelClass(va.confidencialidad.nivel)" class="nivel-badge">
                {{ va.confidencialidad.nivel }}
              </span>
              <span v-else class="badge-sin-datos">—</span>
            </td>
            <td>
              <span v-if="va.integridad?.nivel" :class="getNivelClass(va.integridad.nivel)" class="nivel-badge">
                {{ va.integridad.nivel }}
              </span>
              <span v-else class="badge-sin-datos">—</span>
            </td>
            <td>
              <span v-if="va.disponibilidad?.nivel" :class="getNivelClass(va.disponibilidad.nivel)" class="nivel-badge">
                {{ va.disponibilidad.nivel }}
              </span>
              <span v-else class="badge-sin-datos">—</span>
            </td>
            <td>
              <span :class="getNivelClass(getNivelFromValue(getMaxEvaluacion(va.detallesRiesgo, 'evaluacionRiesgo')))" class="nivel-badge">
                {{ getNivelFromValue(getMaxEvaluacion(va.detallesRiesgo, 'evaluacionRiesgo')) }}
              </span>
            </td>
            <td>
              <span :class="getNivelClass(getNivelFromValue(getMaxEvaluacion(va.detallesRiesgo, 'evaluacionRiesgoControl')))" class="nivel-badge">
                {{ getNivelFromValue(getMaxEvaluacion(va.detallesRiesgo, 'evaluacionRiesgoControl')) }}
              </span>
            </td>
            <td>
              <span :class="getNivelClass(getResidualFromValue(getMaxEvaluacion(va.detallesRiesgo, 'evaluacionRiesgoControl')))" class="nivel-badge">
                {{ getResidualFromValue(getMaxEvaluacion(va.detallesRiesgo, 'evaluacionRiesgoControl')) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Session Expired Modal -->
    <div v-if="showSessionExpired" class="session-expired-overlay" @click.self="showSessionExpired = false">
      <div class="session-expired-modal">
        <h3>Session Expired</h3>
        <p>Your session has expired. Please log in again to continue.</p>
        <div class="session-expired-actions">
          <button class="btn-primary" type="button" @click="handleLoginRedirect">Log In Again</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.parametrizacion-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.welcome-banner {
  margin-bottom: 2rem;
}

.welcome-banner h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.welcome-banner p {
  color: var(--text-muted);
}

.catalogo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: var(--card-bg);
  border: 1px dashed var(--border);
  border-radius: 16px;
  color: var(--text-muted);
}

.val-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
}

.val-empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: 3rem 0;
}

.val-table {
  width: 100%;
  border-collapse: collapse;
}

.val-table th,
.val-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.val-table th {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.val-table td {
  color: var(--text);
  font-size: 0.95rem;
}

.val-table tbody tr {
  transition: background-color 0.2s ease;
}

.val-table tbody tr:hover {
  background-color: rgba(99, 102, 241, 0.05);
}

.val-error {
  text-align: center;
  color: #ef4444;
  padding: 2rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.val-error p {
  margin-bottom: 1rem;
}

/* Badge classes matching getNivelStyle() from valoracion.vue */
.nivel-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.badge-bajo {
  background: rgba(22, 163, 74, 0.15);
  color: #16a34a;
}

.badge-medio {
  background: rgba(202, 138, 4, 0.15);
  color: #ca8a04;
}

.badge-alto {
  background: rgba(234, 88, 12, 0.15);
  color: #ea580c;
}

.badge-critico {
  background: rgba(220, 38, 38, 0.15);
  color: #dc2626;
}

.badge-sin-datos {
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

/* Session expired modal — matching valoracion.vue pattern */
.session-expired-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.session-expired-modal {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.session-expired-modal h3 {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  color: #ef4444;
}

.session-expired-modal p {
  color: var(--text-muted);
  margin: 0 0 1.5rem;
  line-height: 1.5;
}

.session-expired-actions {
  display: flex;
  justify-content: center;
}
</style>
