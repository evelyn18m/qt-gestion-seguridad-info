<script lang="ts" setup>
import type { Usuario, CreateUsuarioResponse } from '~/types/api'
import { ROLES_DISPONIBLES, ROLE_LABELS } from '~/types/roles'

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

// ── Create Modal ──────────────────────────────────────────────────────────────

const showCreateModal = ref(false)
const createFormData = ref({ username: '', email: '' })
const generatedPassword = ref('')
const createError = ref('')
const creating = ref(false)
const passwordCopied = ref(false)

function openCreateModal() {
  createFormData.value = { username: '', email: '' }
  generatedPassword.value = ''
  createError.value = ''
  passwordCopied.value = false
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

const createFormValid = computed(() => {
  return createFormData.value.username.trim() !== '' && createFormData.value.email.trim() !== ''
})

async function saveCreate() {
  if (!createFormValid.value) return
  creating.value = true
  createError.value = ''
  try {
    const { apiFetch } = useApi()
    const result = await apiFetch<CreateUsuarioResponse>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(createFormData.value),
    })
    generatedPassword.value = result.contraseñaGenerada
    await fetchUsuarios()
  } catch (e: unknown) {
    createError.value = e instanceof Error ? e.message : 'Error al crear usuario'
  } finally {
    creating.value = false
  }
}

async function copyPassword() {
  try {
    await navigator.clipboard.writeText(generatedPassword.value)
    passwordCopied.value = true
    setTimeout(() => { passwordCopied.value = false }, 2000)
  } catch {
    // fallback: clipboard API not available
  }
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

const showEditModal = ref(false)
const editingUsuario = ref<Usuario | null>(null)
const editFormData = ref({ email: '', password: '', habilitado: true })
const selectedRoles = ref<Set<string>>(new Set())
const editError = ref('')
const saving = ref(false)

function openEditModal(usuario: Usuario) {
  editingUsuario.value = usuario
  editFormData.value = {
    email: usuario.email || '',
    password: '',
    habilitado: usuario.habilitado,
  }
  selectedRoles.value = new Set(parseRoles(usuario.roles))
  editError.value = ''
  showEditModal.value = true
}

function toggleRole(rol: string) {
  const roles = new Set(selectedRoles.value)
  if (roles.has(rol)) {
    roles.delete(rol)
  } else {
    roles.add(rol)
  }
  selectedRoles.value = roles
}

function closeEditModal() {
  showEditModal.value = false
  editingUsuario.value = null
}

async function saveEdit() {
  if (!editingUsuario.value) return
  saving.value = true
  editError.value = ''
  const rolesArr = [...selectedRoles.value]

  try {
    const { apiFetch } = useApi()
    const patchBody: Record<string, unknown> = {
      email: editFormData.value.email || undefined,
      habilitado: editFormData.value.habilitado,
      roles: rolesArr,
    }
    if (!patchBody.email) delete patchBody.email
    if (editFormData.value.password && editFormData.value.password.length >= 6) {
      patchBody.password = editFormData.value.password
    }
    await apiFetch(`/usuarios/${editingUsuario.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patchBody),
    })
    closeEditModal()
    await fetchUsuarios()
  } catch (e: unknown) {
    if (e instanceof Error && (e as any).statusCode === 403) {
      editError.value = 'No tenés permisos para realizar esta acción'
    } else {
      editError.value = e instanceof Error ? e.message : 'Error al guardar'
    }
  } finally {
    saving.value = false
  }
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

const deleteConfirmUsuario = ref<Usuario | null>(null)
const deleteError = ref('')
const deleting = ref(false)

function confirmDelete(usuario: Usuario) {
  deleteConfirmUsuario.value = usuario
  deleteError.value = ''
}

function cancelDelete() {
  deleteConfirmUsuario.value = null
}

async function executeDelete() {
  if (!deleteConfirmUsuario.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    const { apiFetch } = useApi()
    await apiFetch(`/usuarios/${deleteConfirmUsuario.value.id}`, { method: 'DELETE' })
    deleteConfirmUsuario.value = null
    await fetchUsuarios()
  } catch (e: unknown) {
    deleteError.value = e instanceof Error ? e.message : 'Error al eliminar'
  } finally {
    deleting.value = false
  }
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
            <div class="usuarios-toolbar">
              <span class="usuarios-count">{{ usuarios.length }} usuario(s)</span>
              <button class="btn-primary btn-sm" @click="openCreateModal">+ Nuevo</button>
            </div>
            <table class="reportes-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th class="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="usuario in usuarios" :key="usuario.id">
                  <td>{{ usuario.username }}</td>
                  <td>{{ usuario.email || '—' }}</td>
                  <td>{{ formatRoles(parseRoles(usuario.roles)) }}</td>
                  <td>
                    <span class="estado-badge" :class="usuario.habilitado ? 'estado-activo' : 'estado-inactivo'">
                      {{ usuario.habilitado ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="btn-icon btn-edit" title="Editar" @click="openEditModal(usuario)">
                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <button class="btn-icon btn-delete" title="Eliminar" @click="confirmDelete(usuario)">
                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </main>
    </div>

    <!-- ── Create Modal ────────────────────────────────────────────────────── -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Nuevo Usuario</h3>
          <button class="modal-close" @click="closeCreateModal">&times;</button>
        </div>
        <div class="modal-body">
          <template v-if="!generatedPassword">
            <div class="form-group">
              <label for="create-username">Username</label>
              <input id="create-username" v-model="createFormData.username" placeholder="Username" />
            </div>
            <div class="form-group">
              <label for="create-email">Email</label>
              <input id="create-email" v-model="createFormData.email" type="email" placeholder="Email" />
            </div>
            <div v-if="createError" class="modal-error">{{ createError }}</div>
          </template>
          <template v-else>
            <div class="password-banner">
              <div class="password-icon">&#128274;</div>
              <p class="password-label">Contraseña generada</p>
              <p class="password-warning">Copiá y guardá esta contraseña. No se mostrará nuevamente.</p>
              <div class="password-value-row">
                <code class="password-value">{{ generatedPassword }}</code>
                <button class="btn-copy" @click="copyPassword">
                  <svg v-if="!passwordCopied" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke-linecap="round" stroke-linejoin="round"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <svg v-else fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                    <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  {{ passwordCopied ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <template v-if="!generatedPassword">
            <button class="btn-cancel" @click="closeCreateModal">Cancelar</button>
            <button :disabled="!createFormValid || creating" class="btn-primary" @click="saveCreate">
              {{ creating ? 'Creando...' : 'Crear' }}
            </button>
          </template>
          <template v-else>
            <button class="btn-primary" @click="closeCreateModal">Cerrar</button>
          </template>
        </div>
      </div>
    </div>

    <!-- ── Edit Modal ──────────────────────────────────────────────────────── -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Editar Usuario</h3>
          <button class="modal-close" @click="closeEditModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Username</label>
            <input :value="editingUsuario?.username" disabled class="input-disabled" />
          </div>
          <div class="form-group">
            <label for="edit-email">Email</label>
            <input id="edit-email" v-model="editFormData.email" type="email" placeholder="Email" />
          </div>
          <div class="form-group">
            <label for="edit-password">Contraseña</label>
            <input id="edit-password" v-model="editFormData.password" type="password" placeholder="Mínimo 6 caracteres — dejar en blanco para no cambiar" />
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="editFormData.habilitado" />
              <span>Habilitado</span>
            </label>
          </div>
          <div class="form-group">
            <label>Roles</label>
            <div class="roles-checkboxes">
              <label
                v-for="rol in ROLES_DISPONIBLES"
                :key="rol"
                class="checkbox-label role-checkbox"
              >
                <input
                  type="checkbox"
                  :checked="selectedRoles.has(rol)"
                  @change="toggleRole(rol)"
                />
                <span>{{ ROLE_LABELS[rol] || rol }}</span>
              </label>
            </div>
          </div>
          <div v-if="editError" class="modal-error">{{ editError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeEditModal">Cancelar</button>
          <button :disabled="saving" class="btn-primary" @click="saveEdit">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Delete Confirm Modal ────────────────────────────────────────────── -->
    <div v-if="deleteConfirmUsuario" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal-card modal-confirm">
        <div class="modal-header">
          <h3>Confirmar eliminaci&oacute;n</h3>
        </div>
        <div class="modal-body">
          <p>&iquest;Est&aacute;s seguro de eliminar este usuario?</p>
          <p class="confirm-detail">
            <strong>{{ deleteConfirmUsuario.username }}</strong>
            <template v-if="deleteConfirmUsuario.email"> — {{ deleteConfirmUsuario.email }}</template>
          </p>
          <div v-if="deleteError" class="modal-error">{{ deleteError }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="cancelDelete">Cancelar</button>
          <button :disabled="deleting" class="btn-danger" @click="executeDelete">
            {{ deleting ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
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

/* ── Toolbar ───────────────────────────────────────────────────────────────── */
.usuarios-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border);
}

.usuarios-count {
  font-size: 0.85rem;
  color: var(--text-muted);
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

/* ── Button Styles ─────────────────────────────────────────────────────────── */
.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0.6rem 1.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.45rem 1rem;
  font-size: 0.8rem;
}

.btn-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  padding: 0.6rem 1.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.25);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-warning {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  padding: 0.6rem 1.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-warning:hover {
  background: rgba(245, 158, 11, 0.25);
}

.btn-warning:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 1.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.2);
}

.th-actions {
  width: 100px;
  text-align: center;
}

.row-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.btn-icon svg {
  width: 18px;
  height: 18px;
}

.btn-edit {
  color: var(--text-muted);
}

.btn-edit:hover {
  color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.btn-delete {
  color: var(--text-muted);
}

.btn-delete:hover {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
}

/* ── Modals ────────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}

.modal-card {
  background: #1e293b;
  border: 1px solid var(--border);
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.2s ease-out;
}

.modal-confirm {
  max-width: 420px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.75rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 1.5rem;
}

.modal-body textarea {
  width: 100%;
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
}

.modal-body textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.modal-error {
  color: #fca5a5;
  font-size: 0.85rem;
  margin-top: 0.75rem;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 0 1.5rem 1.5rem;
}

.confirm-detail {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

/* ── Form ──────────────────────────────────────────────────────────────────── */
.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

.input-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.roles-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.role-checkbox {
  padding: 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.role-checkbox:hover {
  background: rgba(99, 102, 241, 0.05);
}

/* ── Password Banner ───────────────────────────────────────────────────────── */
.password-banner {
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
}

.password-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.password-label {
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin: 0 0 0.25rem;
}

.password-warning {
  font-size: 0.8rem;
  color: #fbbf24;
  margin: 0 0 0.75rem;
}

.password-value-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.password-value {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-family: 'Courier New', monospace;
  font-size: 0.95rem;
  color: #a5b4fc;
  word-break: break-all;
}

.btn-copy {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.8rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-copy:hover {
  background: var(--primary-hover);
}
</style>
