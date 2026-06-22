<script lang="ts" setup>
import type { ConfiguracionRiesgo } from '~/types/api'
import { SessionExpiredError } from '~/composables/useApi'

// ─── Defaults (fallback si no hay config en BD) ───

const DEFAULTS: ConfiguracionRiesgo = {
  id: 0,
  riesgoBajoMax: 3,
  riesgoBajoDesde: 1,
  riesgoMedioMax: 9,
  riesgoMedioDesde: 4,
  riesgoAltoMax: 27,
  riesgoAltoDesde: 10,
  controlBajoMax: 3,
  controlBajoDesde: 1,
  controlMedioMax: 9,
  controlMedioDesde: 4,
  controlAltoMax: 27,
  controlAltoDesde: 10,
  residualAceptableMax: 3,
  residualAceptableDesde: 1,
  residualInaceptableDesde: 4,
  residualInaceptableMax: 27,
}

// ─── State ───

const { login } = useAuth()
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showSessionExpired = ref(false)
const config = ref<ConfiguracionRiesgo>({ ...DEFAULTS })

// ─── Validation ───

interface RangeError {
  row: number
  field: 'desde' | 'hasta'
  message: string
}

const rangeErrors = ref<RangeError[]>([])

function validateRanges(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  rangeErrors.value = []
  const cfg = config.value

  // Per-row: desde < hasta for each of the 9 rows
  const rows: { desdeKey: keyof ConfiguracionRiesgo; hastaKey: keyof ConfiguracionRiesgo; label: string; ri: number }[] = [
    { desdeKey: 'riesgoBajoDesde', hastaKey: 'riesgoBajoMax', label: 'Riesgo Bajo', ri: 0 },
    { desdeKey: 'riesgoMedioDesde', hastaKey: 'riesgoMedioMax', label: 'Riesgo Medio', ri: 1 },
    { desdeKey: 'riesgoAltoDesde', hastaKey: 'riesgoAltoMax', label: 'Riesgo Alto', ri: 2 },
    { desdeKey: 'controlBajoDesde', hastaKey: 'controlBajoMax', label: 'Control Bajo', ri: 0 },
    { desdeKey: 'controlMedioDesde', hastaKey: 'controlMedioMax', label: 'Control Medio', ri: 1 },
    { desdeKey: 'controlAltoDesde', hastaKey: 'controlAltoMax', label: 'Control Alto', ri: 2 },
    { desdeKey: 'residualAceptableDesde', hastaKey: 'residualAceptableMax', label: 'Residual Aceptable', ri: 0 },
    { desdeKey: 'residualInaceptableDesde', hastaKey: 'residualInaceptableMax', label: 'Residual Inaceptable', ri: 1 },
  ]

  for (const row of rows) {
    if ((cfg[row.desdeKey] as number) >= (cfg[row.hastaKey] as number)) {
      errors.push(`${row.label}: Desde debe ser menor que Hasta`)
      rangeErrors.value.push({ row: row.ri, field: 'desde', message: 'Desde ≥ Hasta' })
      rangeErrors.value.push({ row: row.ri, field: 'hasta', message: 'Hasta ≤ Desde' })
    }
  }

  // Cross-row per card: hastaN < desdeN+1 (no overlap, gaps allowed)
  // Riesgo card
  if (cfg.riesgoBajoMax >= cfg.riesgoMedioDesde) {
    errors.push('Riesgo: Bajo.Hasta debe ser menor que Medio.Desde')
    rangeErrors.value.push({ row: 0, field: 'hasta', message: '≤ Medio.Desde' })
    rangeErrors.value.push({ row: 1, field: 'desde', message: '≥ Bajo.Hasta' })
  }
  if (cfg.riesgoMedioMax >= cfg.riesgoAltoDesde) {
    errors.push('Riesgo: Medio.Hasta debe ser menor que Alto.Desde')
    rangeErrors.value.push({ row: 1, field: 'hasta', message: '≤ Alto.Desde' })
    rangeErrors.value.push({ row: 2, field: 'desde', message: '≥ Medio.Hasta' })
  }

  // Control card
  if (cfg.controlBajoMax >= cfg.controlMedioDesde) {
    errors.push('Control: Bajo.Hasta debe ser menor que Medio.Desde')
    rangeErrors.value.push({ row: 0, field: 'hasta', message: '≤ Medio.Desde' })
    rangeErrors.value.push({ row: 1, field: 'desde', message: '≥ Bajo.Hasta' })
  }
  if (cfg.controlMedioMax >= cfg.controlAltoDesde) {
    errors.push('Control: Medio.Hasta debe ser menor que Alto.Desde')
    rangeErrors.value.push({ row: 1, field: 'hasta', message: '≤ Alto.Desde' })
    rangeErrors.value.push({ row: 2, field: 'desde', message: '≥ Medio.Hasta' })
  }

  // Residual card
  if (cfg.residualAceptableMax >= cfg.residualInaceptableDesde) {
    errors.push('Residual: Aceptable.Hasta debe ser menor que Inaceptable.Desde')
    rangeErrors.value.push({ row: 0, field: 'hasta', message: '≤ Inaceptable.Desde' })
    rangeErrors.value.push({ row: 1, field: 'desde', message: '≥ Aceptable.Hasta' })
  }

  return { valid: errors.length === 0, errors }
}

function hasInputError(ri: number, field: 'desde' | 'hasta'): boolean {
  return rangeErrors.value.some((e) => e.row === ri && e.field === field)
}

const validation = computed(() => validateRanges())

// ─── Umbral UI helpers ───

interface CardRango {
  desde: number
  hasta: number
  clase: string
  etiqueta: string
  desdeKey: keyof ConfiguracionRiesgo
  hastaKey: keyof ConfiguracionRiesgo
}

interface UmbralCard {
  key: string
  label: string
  descripcion: string
  campo: string
  rangos: CardRango[]
}

const umbralCards = computed<UmbralCard[]>(() => {
  const cfg = config.value
  return [
    {
      key: 'riesgo',
      label: 'Nivel de Riesgo',
      descripcion: 'Riesgo inherente calculado como VA × Amenaza × Vulnerabilidad.',
      campo: 'evaluacionRiesgo',
      rangos: [
        { desde: cfg.riesgoBajoDesde, hasta: cfg.riesgoBajoMax, clase: 'bajo', etiqueta: 'Bajo', desdeKey: 'riesgoBajoDesde', hastaKey: 'riesgoBajoMax' },
        { desde: cfg.riesgoMedioDesde, hasta: cfg.riesgoMedioMax, clase: 'medio', etiqueta: 'Medio', desdeKey: 'riesgoMedioDesde', hastaKey: 'riesgoMedioMax' },
        { desde: cfg.riesgoAltoDesde, hasta: cfg.riesgoAltoMax, clase: 'alto', etiqueta: 'Alto', desdeKey: 'riesgoAltoDesde', hastaKey: 'riesgoAltoMax' },
      ],
    },
    {
      key: 'control',
      label: 'Riesgo con Control',
      descripcion: 'Riesgo residual tras aplicar controles.',
      campo: 'evaluacionRiesgoControl',
      rangos: [
        { desde: cfg.controlBajoDesde, hasta: cfg.controlBajoMax, clase: 'bajo', etiqueta: 'Bajo', desdeKey: 'controlBajoDesde', hastaKey: 'controlBajoMax' },
        { desde: cfg.controlMedioDesde, hasta: cfg.controlMedioMax, clase: 'medio', etiqueta: 'Medio', desdeKey: 'controlMedioDesde', hastaKey: 'controlMedioMax' },
        { desde: cfg.controlAltoDesde, hasta: cfg.controlAltoMax, clase: 'alto', etiqueta: 'Alto', desdeKey: 'controlAltoDesde', hastaKey: 'controlAltoMax' },
      ],
    },
    {
      key: 'residual',
      label: 'Riesgo Residual',
      descripcion: 'Clasificación final del riesgo después del tratamiento.',
      campo: 'evaluacionRiesgoControl',
      rangos: [
        { desde: cfg.residualAceptableDesde, hasta: cfg.residualAceptableMax, clase: 'bajo', etiqueta: 'Aceptable', desdeKey: 'residualAceptableDesde', hastaKey: 'residualAceptableMax' },
        { desde: cfg.residualInaceptableDesde, hasta: cfg.residualInaceptableMax, clase: 'alto', etiqueta: 'Inaceptable', desdeKey: 'residualInaceptableDesde', hastaKey: 'residualInaceptableMax' },
      ],
    },
  ]
})

// ─── API ───

async function loadConfig() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { apiFetch } = useApi()
    const data = await apiFetch<ConfiguracionRiesgo>('/parametros')
    config.value = data
  } catch (e) {
    if (e instanceof SessionExpiredError) {
      showSessionExpired.value = true
    } else {
      config.value = { ...DEFAULTS }
      errorMessage.value = 'Usando valores por defecto. No se pudo cargar la configuración.'
    }
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  // Re-validate before saving
  const v = validateRanges()
  if (!v.valid) {
    errorMessage.value = v.errors.join('. ')
    saving.value = false
    return
  }
  try {
    const { apiFetch } = useApi()
    const { id, ...data } = config.value
    await apiFetch('/parametros', {
      method: 'PUT',
      body: data,
    } as RequestInit)
    successMessage.value = 'Configuración guardada correctamente.'
    setTimeout(() => (successMessage.value = ''), 3000)
  } catch (e) {
    if (e instanceof SessionExpiredError) {
      showSessionExpired.value = true
    } else {
      errorMessage.value = e instanceof Error ? e.message : 'Error al guardar'
    }
  } finally {
    saving.value = false
  }
}

function handleLoginRedirect() {
  login()
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="parametrizacion-section">
    <div class="header-row">
      <div class="welcome-banner">
        <h2>Parametrización</h2>
        <p>Umbrales de clasificación de riesgos según ISO 27005.</p>
      </div>
      <button class="btn-save" :disabled="saving || loading || !validation.valid" @click="saveConfig">
        {{ saving ? 'Guardando...' : 'Guardar cambios' }}
      </button>
    </div>

    <div v-if="successMessage" class="success-msg">{{ successMessage }}</div>

    <div v-if="loading" class="catalogo-placeholder">Cargando configuración...</div>

    <div v-else-if="errorMessage && !config.id" class="val-error">
      <p>{{ errorMessage }}</p>
      <button class="btn-primary" type="button" @click="loadConfig">Reintentar</button>
    </div>

    <div v-else class="cards-grid">
      <div v-for="card in umbralCards" :key="card.key" class="param-card">
        <h3 class="card-title">{{ card.label }}</h3>
        <p class="card-desc">{{ card.descripcion }}</p>
        <p class="card-field">Campo: <code>{{ card.campo }}</code></p>

        <table class="umbral-table">
          <thead>
            <tr>
              <th>Clasificación</th>
              <th>Desde</th>
              <th>Hasta</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, ri) in card.rangos" :key="ri">
              <td>
                <span :class="`umbral-badge badge-${r.clase}`">{{ r.etiqueta }}</span>
              </td>
              <td>
                <input
                  type="number"
                  class="umbral-input"
                  :class="{ 'input-error': hasInputError(ri, 'desde') }"
                  :min="1"
                  :max="27"
                  :value="(config as any)[r.desdeKey]"
                  @input="(e: Event) => { (config as any)[r.desdeKey] = Number((e.target as HTMLInputElement).value) }"
                />
              </td>
              <td>
                <input
                  type="number"
                  class="umbral-input"
                  :class="{ 'input-error': hasInputError(ri, 'hasta') }"
                  :min="1"
                  :max="27"
                  :value="(config as any)[r.hastaKey]"
                  @input="(e: Event) => { (config as any)[r.hastaKey] = Number((e.target as HTMLInputElement).value) }"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div class="rango-preview">
          <span
            v-for="(r, ri) in card.rangos"
            :key="ri"
            :class="`umbral-badge badge-${r.clase}`"
            style="font-size:0.75rem;"
          >
            {{ r.etiqueta }}: {{ (config as any)[r.desdeKey] }}–{{ (config as any)[r.hastaKey] }}
          </span>
        </div>
      </div>
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

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.welcome-banner h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.welcome-banner p {
  color: var(--text-muted);
  margin: 0;
}

.btn-save {
  padding: 0.6rem 1.5rem;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
  white-space: nowrap;
}

.btn-save:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-msg {
  background: rgba(22, 163, 74, 0.1);
  border: 1px solid rgba(22, 163, 74, 0.3);
  color: #16a34a;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
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

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.param-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
}

.card-title {
  font-size: 1.15rem;
  margin: 0 0 0.5rem;
  color: var(--text);
}

.card-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem;
  line-height: 1.5;
}

.card-field {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 1rem;
}

.card-field code {
  background: rgba(99, 102, 241, 0.1);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #818cf8;
}

.umbral-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
}

.umbral-table th,
.umbral-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.umbral-table th {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.umbral-table td {
  color: var(--text);
  font-size: 0.9rem;
}

.umbral-input {
  width: 80px;
  padding: 0.35rem 0.6rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  text-align: center;
}

.umbral-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.umbral-input.input-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.umbral-fixed {
  display: inline-block;
  width: 80px;
  padding: 0.35rem 0.6rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  text-align: center;
}

.umbral-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
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
  background: rgba(220, 38, 38, 0.15);
  color: #dc2626;
}

.rango-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}

/* Session expired modal */
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

.btn-primary {
  padding: 0.6rem 1.8rem;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
