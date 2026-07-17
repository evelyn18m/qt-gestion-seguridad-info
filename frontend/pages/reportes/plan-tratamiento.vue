<script lang="ts" setup>
import type { PlanTratamientoReporte, CatalogoItem, PlazoImplementacion } from '~/types/api'

definePageMeta({ layout: 'default' })

const loading = ref(false)
const errorMsg = ref('')
const rows = ref<PlanTratamientoReporte[]>([])
const q = ref('')
const selectedTipoActivo = ref<number | ''>('')
const selectedOpcionTratamiento = ref<number | ''>('')
const selectedEstado = ref<number | ''>('')
const selectedPlazo = ref<number | ''>('')
const selectedArea = ref<number | ''>('')

const tiposActivo = ref<CatalogoItem[]>([])
const opcionesTratamiento = ref<CatalogoItem[]>([])
const estados = ref<CatalogoItem[]>([])
const plazos = ref<PlazoImplementacion[]>([])
const areas = ref<CatalogoItem[]>([])

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedFetch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchData(), 300)
}

function buildParams() {
  const params = new URLSearchParams()
  if (q.value) params.append('q', q.value)
  if (selectedTipoActivo.value) params.append('tipoActivoId', String(selectedTipoActivo.value))
  if (selectedOpcionTratamiento.value) params.append('opcionTratamientoId', String(selectedOpcionTratamiento.value))
  if (selectedEstado.value) params.append('estadoId', String(selectedEstado.value))
  if (selectedPlazo.value) params.append('plazoImplementacionId', String(selectedPlazo.value))
  if (selectedArea.value) params.append('areaFuncionalId', String(selectedArea.value))
  return params
}

async function fetchData() {
  const { apiFetch } = useApi()
  const params = buildParams()
  const qs = params.toString()
  const path = `/reportes/plan-tratamiento${qs ? '?' + qs : ''}`
  try {
    loading.value = true
    errorMsg.value = ''
    rows.value = await apiFetch<PlanTratamientoReporte[]>(path)
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Error al cargar plan de tratamiento'
  } finally {
    loading.value = false
  }
}

async function fetchCatalogs() {
  const { fetchCatalog } = useCatalog()
  const { apiFetch } = useApi()

  const [ta, ot, ee, ar] = await Promise.all([
    fetchCatalog('tipos-activo').catch(() => [] as CatalogoItem[]),
    fetchCatalog('opciones-tratamiento').catch(() => [] as CatalogoItem[]),
    fetchCatalog('estados-plan-tratamiento').catch(() => [] as CatalogoItem[]),
    fetchCatalog('areas').catch(() => [] as CatalogoItem[]),
  ])
  tiposActivo.value = ta
  opcionesTratamiento.value = ot
  estados.value = ee
  areas.value = ar

  try {
    plazos.value = await apiFetch<PlazoImplementacion[]>('/catalogos/plazos-implementacion')
  } catch {
    plazos.value = []
  }
}

function clearFilters() {
  q.value = ''
  selectedTipoActivo.value = ''
  selectedOpcionTratamiento.value = ''
  selectedEstado.value = ''
  selectedPlazo.value = ''
  selectedArea.value = ''
  fetchData()
}

watch([
  q,
  selectedTipoActivo,
  selectedOpcionTratamiento,
  selectedEstado,
  selectedPlazo,
  selectedArea,
], () => {
  debouncedFetch()
}, { immediate: false })

async function exportExcel() {
  const params = buildParams()
  const qs = params.toString()
  const path = `/reportes/plan-tratamiento/export${qs ? '?' + qs : ''}`

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
    a.download = `plan-tratamiento-${date}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(urlBlob)
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Error al exportar Excel'
  }
}

function fmtDate(value: string | null) {
  if (!value) return '—'
  return value.split('T')[0]
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
            v-if="q || selectedTipoActivo || selectedOpcionTratamiento || selectedEstado || selectedPlazo || selectedArea"
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
            placeholder="Buscar en actividades u observaciones..."
            class="search-input"
          />
        </div>

        <div class="filter-group">
          <label class="filter-label">Tipo Activo</label>
          <select v-model="selectedTipoActivo" class="filter-select">
            <option value="">Todos</option>
            <option v-for="ta in tiposActivo" :key="ta.id" :value="ta.id">{{ ta.nombre }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Opción Tratamiento</label>
          <select v-model="selectedOpcionTratamiento" class="filter-select">
            <option value="">Todas</option>
            <option v-for="ot in opcionesTratamiento" :key="ot.id" :value="ot.id">{{ ot.nombre }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Estado</label>
          <select v-model="selectedEstado" class="filter-select">
            <option value="">Todos</option>
            <option v-for="e in estados" :key="e.id" :value="e.id">{{ e.nombre }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Plazo Implementación</label>
          <select v-model="selectedPlazo" class="filter-select">
            <option value="">Todos</option>
            <option v-for="p in plazos" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label">Área Funcional</label>
          <select v-model="selectedArea" class="filter-select">
            <option value="">Todas</option>
            <option v-for="a in areas" :key="a.id" :value="a.id">{{ a.nombre }}</option>
          </select>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="reportes-main">
        <div class="main-header">
          <div>
            <h2>Plan de Tratamiento</h2>
            <p class="subtitle">Vista del plan de tratamiento con catálogos enriquecidos y exportación Excel.</p>
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
          <p>Cargando plan de tratamiento...</p>
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
            No hay registros de plan de tratamiento para los filtros seleccionados.
          </div>
          <div v-else class="table-wrapper">
            <table class="reportes-table">
              <thead>
                <tr>
                  <th>Tipo Activo</th>
                  <th>Opción Tratamiento</th>
                  <th>Controles a Implementar</th>
                  <th>Descripción Actividades</th>
                  <th>Responsables</th>
                  <th>Área Funcional</th>
                  <th>Plazo</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Horas/Día</th>
                  <th>Monto USD</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.id">
                  <td>{{ r.tipoActivo || '—' }}</td>
                  <td>{{ r.opcionTratamiento || '—' }}</td>
                  <td>{{ r.controlesImplementar || '—' }}</td>
                  <td class="cell-name">{{ r.descripcionActividades || `Plan #${r.id}` }}</td>
                  <td>{{ r.responsablesImplementacion || '—' }}</td>
                  <td>{{ r.areaFuncional || '—' }}</td>
                  <td>{{ r.plazoImplementacion || '—' }}</td>
                  <td>{{ fmtDate(r.fechaInicioImplementacion) }}</td>
                  <td>{{ fmtDate(r.fechaFinImplementacion) }}</td>
                  <td>{{ r.horaDia }}</td>
                  <td>{{ r.montoUSD }}</td>
                  <td>{{ r.estado || '—' }}</td>
                  <td>{{ r.observaciones || '—' }}</td>
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
</style>
