<script lang="ts" setup>
import type { AuditLogItem } from '~/types/api'

definePageMeta({ layout: 'default' })

const loadingAuditoria = ref(false)
const errorAuditoria = ref('')
const auditoriaLogs = ref<AuditLogItem[]>([])
const qAuditoria = ref('')
const selectedAccion = ref('')
const selectedModulo = ref('')
const selectedUsuarioId = ref('')
const fechaDesdeAuditoria = ref('')
const fechaHastaAuditoria = ref('')

let debounceTimerAuditoria: ReturnType<typeof setTimeout> | null = null

function debouncedFetchAuditoria() {
  if (debounceTimerAuditoria) clearTimeout(debounceTimerAuditoria)
  debounceTimerAuditoria = setTimeout(() => fetchAuditoria(), 300)
}

async function fetchAuditoria() {
  const { apiFetch } = useApi()
  const params = new URLSearchParams()
  if (qAuditoria.value) params.append('q', qAuditoria.value)
  if (selectedAccion.value) params.append('accion', selectedAccion.value)
  if (selectedModulo.value) params.append('modulo', selectedModulo.value)
  if (selectedUsuarioId.value) params.append('usuarioId', selectedUsuarioId.value)
  if (fechaDesdeAuditoria.value) params.append('fechaDesde', fechaDesdeAuditoria.value)
  if (fechaHastaAuditoria.value) params.append('fechaHasta', fechaHastaAuditoria.value)
  const qs = params.toString()
  const path = `/audit${qs ? '?' + qs : ''}`
  try {
    loadingAuditoria.value = true
    errorAuditoria.value = ''
    const result = await apiFetch<{ data: AuditLogItem[]; total: number }>(path)
    auditoriaLogs.value = result.data ?? []
  } catch (e: unknown) {
    errorAuditoria.value = e instanceof Error ? e.message : 'Error al cargar auditoría'
  } finally {
    loadingAuditoria.value = false
  }
}

async function exportExcel() {
  const params = new URLSearchParams()
  if (selectedAccion.value) params.append('accion', selectedAccion.value)
  if (selectedModulo.value) params.append('modulo', selectedModulo.value)
  if (selectedUsuarioId.value) params.append('usuarioId', selectedUsuarioId.value)
  if (fechaDesdeAuditoria.value) params.append('fechaDesde', fechaDesdeAuditoria.value)
  if (fechaHastaAuditoria.value) params.append('fechaHasta', fechaHastaAuditoria.value)
  const qs = params.toString()
  const path = `/audit/export${qs ? '?' + qs : ''}`

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
    a.download = 'auditoria.xlsx'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(urlBlob)
  } catch (e: unknown) {
    errorAuditoria.value = e instanceof Error ? e.message : 'Error al exportar Excel'
  }
}

function clearFiltersAuditoria() {
  qAuditoria.value = ''
  selectedAccion.value = ''
  selectedModulo.value = ''
  selectedUsuarioId.value = ''
  fechaDesdeAuditoria.value = ''
  fechaHastaAuditoria.value = ''
  fetchAuditoria()
}

watch([
  qAuditoria,
  selectedAccion,
  selectedModulo,
  selectedUsuarioId,
  fechaDesdeAuditoria,
  fechaHastaAuditoria,
], () => {
  debouncedFetchAuditoria()
}, { immediate: false })

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

onMounted(() => {
  fetchAuditoria()
})
</script>

<template>
  <div>
    <!-- Página independiente de auditoría, sin tabs de reportes -->
    <div class="reportes-page">
      <!-- Sidebar: Filtros verticales -->
    <aside class="filters-sidebar">
      <div class="sidebar-header">
        <h3>Filtros</h3>
        <button v-if="qAuditoria || selectedAccion || selectedModulo || selectedUsuarioId || fechaDesdeAuditoria || fechaHastaAuditoria" class="btn-clear" @click="clearFiltersAuditoria">
          Limpiar
        </button>
      </div>

      <div class="filter-group">
        <label class="filter-label">Búsqueda</label>
        <input
          v-model="qAuditoria"
          type="text"
          placeholder="Buscar..."
          class="search-input"
        />
      </div>

      <div class="filter-group">
        <label class="filter-label">Acción</label>
        <select v-model="selectedAccion" class="filter-select">
          <option value="">Todas</option>
          <option value="login">login</option>
          <option value="CREAR">CREAR</option>
          <option value="ACTUALIZAR">ACTUALIZAR</option>
          <option value="ELIMINAR">ELIMINAR</option>
          <option value="EXPORTAR">EXPORTAR</option>
          <option value="REQUEST">REQUEST</option>
          <option value="page-visit">page-visit</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Módulo</label>
        <select v-model="selectedModulo" class="filter-select">
          <option value="">Todos</option>
          <option value="auth">auth</option>
          <option value="valoraciones">valoraciones</option>
          <option value="reportes">reportes</option>
          <option value="api">api</option>
          <option value="frontend">frontend</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">Usuario ID</label>
        <input
          v-model="selectedUsuarioId"
          type="text"
          placeholder="ID de usuario..."
          class="search-input"
        />
      </div>

      <div class="filter-group">
        <label class="filter-label">Fecha Desde</label>
        <input v-model="fechaDesdeAuditoria" type="date" class="search-input" />
      </div>

      <div class="filter-group">
        <label class="filter-label">Fecha Hasta</label>
        <input v-model="fechaHastaAuditoria" type="date" class="search-input" />
      </div>

    </aside>

    <!-- Main Content -->
    <main class="reportes-main">
      <div class="main-header">
        <div>
          <h2>Auditoría</h2>
          <p class="subtitle">Consulte y filtre los eventos de auditoría registrados en el sistema.</p>
        </div>
        <button class="btn-export" @click="exportExcel">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Exportar Excel
        </button>
      </div>

      <div v-if="loadingAuditoria" class="reportes-loading">
        <div class="spinner"></div>
        <p>Cargando auditoría...</p>
      </div>

      <div v-else-if="errorAuditoria" class="reportes-error">
        <div class="error-icon">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p>Error al cargar</p>
        <p class="error-detail">{{ errorAuditoria }}</p>
        <button class="btn-retry" @click="fetchAuditoria()">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Reintentar
        </button>
      </div>

      <template v-else>
        <div v-if="auditoriaLogs.length === 0" class="reportes-empty">
          No hay eventos de auditoría registrados.
        </div>
        <div v-else class="table-wrapper">
          <table class="reportes-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Usuario</th>
                <th>Entidad</th>
                <th>Detalle</th>
                <th>IP</th>
                <th>Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in auditoriaLogs" :key="log.id">
                <td>{{ formatDate(log.createdAt) }}</td>
                <td>
                  <span class="accion-badge" :class="'accion-' + (log.accion || '').toLowerCase()">
                    {{ log.accion }}
                  </span>
                </td>
                <td>{{ log.modulo }}</td>
                <td>{{ log.usuario || '—' }}</td>
                <td>{{ log.entidad || '—' }}</td>
                <td class="cell-detail">{{ log.detalle || '—' }}</td>
                <td>{{ log.ip || '—' }}</td>
                <td class="cell-device">{{ log.dispositivo || '—' }}</td>
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

.cell-detail {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-device {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Badges ────────────────────────────────────────────────────────────────── */
.accion-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.accion-login {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
}

.accion-crear {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
}

.accion-actualizar {
  background: rgba(234, 179, 8, 0.15);
  color: #fde047;
}

.accion-eliminar {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.accion-exportar {
  background: rgba(168, 85, 247, 0.15);
  color: #c4b5fd;
}

.accion-request {
  background: rgba(249, 115, 22, 0.15);
  color: #fdba74;
}

.accion-page-visit {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
}
</style>
