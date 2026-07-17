<script lang="ts" setup>
import type { TratamientoRiesgoReporte, CatalogoItem } from '~/types/api'

definePageMeta({ layout: 'default' })

const loading = ref(false)
const errorMsg = ref('')
const rows = ref<TratamientoRiesgoReporte[]>([])
const q = ref('')
const selectedMacroProceso = ref<number | ''>('')
const selectedTipoControl = ref<number | ''>('')
const selectedNivelRiesgoControl = ref<string>('')
const selectedRiesgoResidual = ref<string>('')

const macroProcesos = ref<CatalogoItem[]>([])
const tipoControles = ref<CatalogoItem[]>([])

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedFetch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchData(), 300)
}

async function fetchData() {
  const { apiFetch } = useApi()
  const params = new URLSearchParams()
  if (q.value) params.append('q', q.value)
  if (selectedMacroProceso.value) params.append('macroProcesoId', String(selectedMacroProceso.value))
  if (selectedTipoControl.value) params.append('tipoControlId', String(selectedTipoControl.value))
  if (selectedNivelRiesgoControl.value) params.append('nivelRiesgoControl', selectedNivelRiesgoControl.value)
  if (selectedRiesgoResidual.value) params.append('riesgoResidual', selectedRiesgoResidual.value)
  const qs = params.toString()
  const path = `/reportes/tratamiento-riesgo${qs ? '?' + qs : ''}`
  try {
    loading.value = true
    errorMsg.value = ''
    rows.value = await apiFetch<TratamientoRiesgoReporte[]>(path)
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Error al cargar tratamiento de riesgo'
  } finally {
    loading.value = false
  }
}

async function fetchCatalogs() {
  const { fetchCatalog } = useCatalog()
  const [mp, tc] = await Promise.all([
    fetchCatalog('macroprocesos').catch(() => [] as CatalogoItem[]),
    fetchCatalog('tipo-controles').catch(() => [] as CatalogoItem[]),
  ])
  macroProcesos.value = mp
  tipoControles.value = tc
}

function clearFilters() {
  q.value = ''
  selectedMacroProceso.value = ''
  selectedTipoControl.value = ''
  selectedNivelRiesgoControl.value = ''
  selectedRiesgoResidual.value = ''
  fetchData()
}

watch([
  q,
  selectedMacroProceso,
  selectedTipoControl,
  selectedNivelRiesgoControl,
  selectedRiesgoResidual,
], () => {
  debouncedFetch()
}, { immediate: false })

async function exportExcel() {
  const params = new URLSearchParams()
  if (q.value) params.append('q', q.value)
  if (selectedMacroProceso.value) params.append('macroProcesoId', String(selectedMacroProceso.value))
  if (selectedTipoControl.value) params.append('tipoControlId', String(selectedTipoControl.value))
  if (selectedNivelRiesgoControl.value) params.append('nivelRiesgoControl', selectedNivelRiesgoControl.value)
  if (selectedRiesgoResidual.value) params.append('riesgoResidual', selectedRiesgoResidual.value)
  const qs = params.toString()
  const path = `/reportes/tratamiento-riesgo/export${qs ? '?' + qs : ''}`

  try {
    const config = useRuntimeConfig()
    const { token } = useAuth()
    const url = `${config.public.apiBase}${path}`
    const headers: Record<string, string> = {}
    const currentToken = token.value
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }

    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`)
    }
    const blob = await response.blob()
    const urlBlob = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = urlBlob
    const date = new Date().toISOString().split('T')[0]
    a.download = `tratamiento-riesgo-${date}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(urlBlob)
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Error al exportar Excel'
  }
}

function nivelClass(nivel: string | null) {
  if (!nivel) return ''
  const n = nivel.toLowerCase()
  if (n.includes('alto') || n.includes('critico')) return 'nivel-alto'
  if (n.includes('medio')) return 'nivel-medio'
  return 'nivel-bajo'
}

function metodoClass(metodo: string | null) {
  if (!metodo) return ''
  const m = metodo.toLowerCase()
  if (m === 'mitigar') return 'nivel-bajo'
  if (m === 'transferir') return 'nivel-medio'
  if (m === 'evitar') return 'nivel-alto'
  return 'nivel-medio'
}

function residualClass(residual: string | null) {
  if (!residual) return ''
  const r = residual.toLowerCase()
  if (r === 'aceptable') return 'nivel-bajo'
  return 'nivel-alto'
}

onMounted(() => {
  fetchData()
  fetchCatalogs()
})
</script>

<template>
  <div>
    <ReportesTabs />
    <div class="reportes-page">
      <!-- Sidebar: Filtros verticales -->
      <aside class="filters-sidebar">
        <div class="sidebar-header">
          <h3>Filtros</h3>
          <button
            v-if="q || selectedMacroProceso || selectedTipoControl || selectedNivelRiesgoControl || selectedRiesgoResidual"
            class="btn-clear"
            @click="clearFilters"
          >
            Limpiar
          </button>
        </div>

        <div class="filter-group">
          <label class="filter-label">Búsqueda</label>
          <input
            v-model="q"
            type="text"
            placeholder="Buscar por activo o riesgo residual..."
            class="search-input"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label">Macroproceso</label>
          <select v-model="selectedMacroProceso" class="filter-select">
            <option value="">Todos</option>
            <option v-for="mp in macroProcesos" :key="mp.id" :value="mp.id">{{ mp.nombre }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Tipo Control</label>
          <select v-model="selectedTipoControl" class="filter-select">
            <option value="">Todos</option>
            <option v-for="tc in tipoControles" :key="tc.id" :value="tc.id">{{ tc.nombre }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Nivel Riesgo Control</label>
          <select v-model="selectedNivelRiesgoControl" class="filter-select">
            <option value="">Todos</option>
            <option value="Alto">ALTO</option>
            <option value="Medio">MEDIO</option>
            <option value="Bajo">BAJO</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Riesgo Residual</label>
          <select v-model="selectedRiesgoResidual" class="filter-select">
            <option value="">Todos</option>
            <option value="ACEPTABLE">ACEPTABLE</option>
            <option value="INACEPTABLE">INACEPTABLE</option>
          </select>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="reportes-main">
        <div class="main-header">
          <div>
            <h2>Tratamiento de Riesgo</h2>
            <p class="subtitle">Vista consolidada con método de tratamiento, controles, niveles y riesgo residual.</p>
          </div>
          <button class="btn-export" @click="exportExcel">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Exportar Excel
          </button>
        </div>

        <div v-if="loading" class="reportes-loading">
          <div class="spinner"></div>
          <p>Cargando tratamiento de riesgo...</p>
        </div>

        <div v-else-if="errorMsg" class="reportes-error">
          <div class="error-icon">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p>Error al cargar</p>
          <p class="error-detail">{{ errorMsg }}</p>
          <button class="btn-retry" @click="fetchData()">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Reintentar
          </button>
        </div>

        <template v-else>
          <div v-if="rows.length === 0" class="reportes-empty">
            No hay registros de tratamiento de riesgo para los filtros seleccionados.
          </div>
          <div v-else class="table-wrapper">
            <table class="reportes-table">
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Macroproceso</th>
                  <th>Amenaza</th>
                  <th>Vulnerabilidad</th>
                  <th>Nivel Amenaza</th>
                  <th>Nivel Vulnerabilidad</th>
                  <th>Impacto</th>
                  <th>Método Tratamiento</th>
                  <th>Eval. Riesgo Control</th>
                  <th>Nivel Riesgo Control</th>
                  <th>Tipo Control</th>
                  <th>Riesgo Residual</th>
                  <th>Controles a Implementar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.id">
                  <td class="cell-name">{{ r.nombreActivo || `Activo #${r.id}` }}</td>
                  <td>{{ r.macroProceso || '—' }}</td>
                  <td>{{ r.amenaza || '—' }}</td>
                  <td>{{ r.vulnerabilidad || '—' }}</td>
                  <td>
                    <span v-if="r.nivelAmenaza" :class="['nivel-badge', nivelClass(r.nivelAmenaza)]">
                      {{ r.nivelAmenaza }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td>
                    <span v-if="r.nivelVulnerabilidad" :class="['nivel-badge', nivelClass(r.nivelVulnerabilidad)]">
                      {{ r.nivelVulnerabilidad }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td>{{ r.impacto != null ? r.impacto.toFixed(2) : '—' }}</td>
                  <td>
                    <span v-if="r.metodoTratamiento" :class="['nivel-badge', metodoClass(r.metodoTratamiento)]">
                      {{ r.metodoTratamiento }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td>{{ r.evaluacionRiesgoControl != null ? r.evaluacionRiesgoControl.toFixed(2) : '—' }}</td>
                  <td>
                    <span v-if="r.nivelRiesgoControl" :class="['nivel-badge', nivelClass(r.nivelRiesgoControl)]">
                      {{ r.nivelRiesgoControl }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td>{{ r.tipoControl || '—' }}</td>
                  <td>
                    <span v-if="r.riesgoResidual" :class="['nivel-badge', residualClass(r.riesgoResidual)]">
                      {{ r.riesgoResidual }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td>{{ r.controlesImplementar || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ───────────────────────────────────────────────────────────────── */
.reportes-page {
  display: flex;
  height: 100%;
  gap: 1.5rem;
}

/* ── Sidebar ────────────────────────────────────────────────────────────────── */
.filters-sidebar {
  width: 260px;
  min-width: 260px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.sidebar-header h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

.btn-clear {
  padding: 0.35rem 0.75rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-input {
  width: 100%;
  padding: 0.6rem 0.85rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.filter-select {
  width: 100%;
  padding: 0.6rem 0.85rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  box-sizing: border-box;
}

/* ── Main Content ───────────────────────────────────────────────────────────── */
.reportes-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.main-header {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.main-header h2 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
  color: var(--text);
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin: 0;
}

/* ── Loading ───────────────────────────────────────────────────────────────── */
.reportes-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: var(--card-bg);
  border: 1px dashed var(--border);
  border-radius: 16px;
  color: var(--text-muted);
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Error ─────────────────────────────────────────────────────────────────── */
.reportes-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: var(--card-bg);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 16px;
  gap: 0.75rem;
  text-align: center;
  padding: 2rem;
}

.reportes-error p {
  color: #fca5a5;
  margin: 0;
}

.error-detail {
  font-size: 0.85rem;
  color: var(--text-muted) !important;
  max-width: 400px;
  word-break: break-word;
}

.error-icon {
  width: 48px;
  height: 48px;
  color: #ef4444;
}

.btn-retry {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
}

.btn-retry svg {
  width: 18px;
  height: 18px;
}

.btn-retry:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: var(--primary);
  border: none;
  border-radius: 10px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.btn-export svg {
  width: 18px;
  height: 18px;
}

.btn-export:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

/* ── Empty state ───────────────────────────────────────────────────────────── */
.reportes-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  background: var(--card-bg);
  border: 1px dashed var(--border);
  border-radius: 16px;
  color: var(--text-muted);
  font-size: 0.95rem;
}

/* ── Tables ────────────────────────────────────────────────────────────────── */
.table-wrapper {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  flex: 1;
  overflow-y: auto;
}

.reportes-table {
  width: 100%;
  border-collapse: collapse;
}

.reportes-table th,
.reportes-table td {
  padding: 0.85rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.reportes-table th {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(15, 23, 42, 0.4);
  position: sticky;
  top: 0;
  z-index: 1;
}

.reportes-table td {
  color: var(--text);
  font-size: 0.9rem;
}

.reportes-table tbody tr {
  transition: background-color 0.2s ease;
}

.reportes-table tbody tr:hover {
  background-color: rgba(99, 102, 241, 0.05);
}

.cell-name {
  font-weight: 600;
}

/* ── Nivel Risk Badges ──────────────────────────────────────────────────────── */
.nivel-badge {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.nivel-alto {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.nivel-medio {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.nivel-bajo {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
</style>
