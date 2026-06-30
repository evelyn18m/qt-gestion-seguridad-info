<script lang="ts" setup>
import type { Usuario } from '~/types/api'

definePageMeta({ layout: 'default' })

const usuarios = ref<Usuario[]>([])
const loadingUsuarios = ref(false)
const errorUsuarios = ref('')

async function fetchUsuarios() {
  const { apiFetch } = useApi()
  try {
    loadingUsuarios.value = true
    errorUsuarios.value = ''
    const result = await apiFetch<Usuario[]>('/usuarios')
    usuarios.value = result ?? []
  } catch (e: unknown) {
    errorUsuarios.value = e instanceof Error ? e.message : 'Error al cargar usuarios'
  } finally {
    loadingUsuarios.value = false
  }
}

function parseRoles(roles: string | undefined): string[] {
  if (!roles) return []
  try {
    const parsed = JSON.parse(roles)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatRoles(roles: string[] | undefined): string {
  if (!roles || roles.length === 0) return '—'
  return roles.join(', ')
}

onMounted(() => {
  fetchUsuarios()
})
</script>

<template>
  <div>
    <div class="reportes-page">
      <main class="reportes-main">
        <div class="main-header">
          <div>
            <h2>Usuarios</h2>
            <p class="subtitle">Listado de usuarios registrados en el sistema.</p>
          </div>
        </div>

        <div v-if="loadingUsuarios" class="reportes-loading">
          <div class="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>

        <div v-else-if="errorUsuarios" class="reportes-error">
          <div class="error-icon">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p>Error al cargar</p>
          <p class="error-detail">{{ errorUsuarios }}</p>
          <button class="btn-retry" @click="fetchUsuarios()">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Reintentar
          </button>
        </div>

        <template v-else>
          <div v-if="usuarios.length === 0" class="reportes-empty">
            No se encontraron usuarios.
          </div>
          <div v-else class="table-wrapper">
            <table class="reportes-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Roles</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="usuario in usuarios" :key="usuario.id">
                  <td>{{ usuario.username }}</td>
                  <td>{{ usuario.email || '—' }}</td>
                  <td>—</td>
                  <td>{{ formatRoles(parseRoles(usuario.roles)) }}</td>
                  <td>
                    <span class="estado-badge" :class="usuario.habilitado ? 'estado-activo' : 'estado-inactivo'">
                      {{ usuario.habilitado ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
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

/* ── Estado badges ─────────────────────────────────────────────────────────── */
.estado-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.estado-activo {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
}

.estado-inactivo {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}
</style>
