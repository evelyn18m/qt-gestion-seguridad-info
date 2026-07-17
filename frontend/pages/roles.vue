<script lang="ts" setup>
import type { Usuario } from '~/types/api'
import { ROLES_DISPONIBLES, ROLE_LABELS } from '~/types/roles'

definePageMeta({ layout: 'default' })

const auth = useAuth()

const usuarios = ref<Usuario[]>([])
const loading = ref(false)
const errorMsg = ref('')

function parseRoles(roles: string | undefined): string[] {
  if (!roles) return []
  try {
    const parsed = JSON.parse(roles)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function fetchUsuarios() {
  const { apiFetch } = useApi()
  loading.value = true
  errorMsg.value = ''
  try {
    const result = await apiFetch<Usuario[]>('/usuarios')
    usuarios.value = result ?? []
  } catch (e: unknown) {
    if (e instanceof Error && (e as any).statusCode === 403) {
      errorMsg.value = 'No tenés permisos para ver esta página'
      return
    }
    errorMsg.value = e instanceof Error ? e.message : 'Error al cargar usuarios'
  } finally {
    loading.value = false
  }
}

function tieneRolUsuario(usuario: Usuario, rol: string): boolean {
  return parseRoles(usuario.roles).includes(rol)
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
            <h2>Roles y Permisos</h2>
            <p class="subtitle">
              Definiciones de roles del sistema y asignaciones actuales.
            </p>
          </div>
        </div>

        <!-- Role Definitions (static) -->
        <section class="roles-section">
          <h3>Roles Disponibles</h3>
          <div class="roles-cards">
            <div class="role-card admin-card">
              <div class="role-icon">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="role-info">
                <h4>{{ ROLE_LABELS.administrador }}</h4>
                <p>Acceso completo — puede ver, crear, modificar y eliminar todos los recursos.</p>
              </div>
            </div>
            <div class="role-card user-card">
              <div class="role-icon">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="role-info">
                <h4>{{ ROLE_LABELS.usuario }}</h4>
                <p>Solo lectura — puede ver recursos pero no modificar, crear ni eliminar.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- User-Role Matrix -->
        <section class="roles-section">
          <h3>Asignaciones por Usuario</h3>

          <div v-if="loading" class="reportes-loading">
            <div class="spinner"></div>
            <p>Cargando usuarios...</p>
          </div>

          <div v-else-if="errorMsg" class="reportes-error">
            <div class="error-icon">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <p>{{ errorMsg }}</p>
            <button class="btn-retry" @click="fetchUsuarios">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Reintentar
            </button>
          </div>

          <div v-else-if="usuarios.length === 0" class="reportes-empty">
            No se encontraron usuarios.
          </div>

          <div v-else class="table-wrapper">
            <table class="reportes-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th v-for="rol in ROLES_DISPONIBLES" :key="rol">
                    {{ ROLE_LABELS[rol] || rol }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="usuario in usuarios" :key="usuario.id">
                  <td>
                    <span class="username-cell">{{ usuario.username }}</span>
                  </td>
                  <td class="email-cell">{{ usuario.email || '—' }}</td>
                  <td v-for="rol in ROLES_DISPONIBLES" :key="rol" class="check-cell">
                    <span v-if="tieneRolUsuario(usuario, rol)" class="check-mark">&#10003;</span>
                    <span v-else class="check-empty">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.reportes-page {
  display: flex;
  height: 100%;
  gap: 1.5rem;
}

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

/* ── Role Cards ────────────────────────────────────────────────────── */
.roles-section {
  margin-bottom: 2.5rem;
}

.roles-section h3 {
  font-size: 1.15rem;
  color: var(--text);
  margin-bottom: 1rem;
}

.roles-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.role-card {
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  transition: all 0.3s ease;
}

.role-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.admin-card {
  border-left: 3px solid #a855f7;
}

.user-card {
  border-left: 3px solid #22c55e;
}

.role-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
}

.role-icon svg {
  width: 100%;
  height: 100%;
}

.admin-card .role-icon {
  color: #a855f7;
}

.user-card .role-icon {
  color: #22c55e;
}

.role-info h4 {
  margin: 0 0 0.3rem;
  font-size: 1rem;
  color: var(--text);
}

.role-info p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* ── User-Role Matrix ──────────────────────────────────────────────── */
.table-wrapper {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
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

.reportes-table tbody tr:hover {
  background-color: rgba(99, 102, 241, 0.05);
}

.username-cell {
  font-weight: 600;
}

.email-cell {
  color: var(--text-muted);
}

.check-cell {
  text-align: center;
}

.check-mark {
  color: #22c55e;
  font-size: 1.1rem;
  font-weight: 700;
}

.check-empty {
  color: var(--text-muted);
}

/* ── Loading / Error / Empty ───────────────────────────────────────── */
.reportes-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
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

.reportes-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
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
</style>
