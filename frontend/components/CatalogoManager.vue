<script setup lang="ts">
interface Props {
  tipo: string
  titulo: string
  campos: string[]
}

const props = defineProps<Props>()

const items = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const formVisible = ref(false)
const formData = ref<Record<string, any>>({})
const editingItem = ref<any>(null)
const confirmDeleteItem = ref<any>(null)

async function loadItems() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`http://localhost:3001/catalogos/${props.tipo}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    items.value = await res.json()
  } catch (e: any) {
    error.value = `Error al cargar: ${e.message}`
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingItem.value = null
  const data: Record<string, any> = {}
  for (const f of props.campos) data[f] = ''
  if (props.tipo === 'impactos') data.valor = 1
  formData.value = data
  formVisible.value = true
}

function openEdit(item: any) {
  editingItem.value = item
  const data: Record<string, any> = {}
  for (const f of props.campos) data[f] = item[f] ?? ''
  formData.value = data
  formVisible.value = true
}

function closeForm() {
  formVisible.value = false
  formData.value = {}
  editingItem.value = null
}

async function saveItem() {
  saving.value = true
  try {
    const url = editingItem.value
      ? `http://localhost:3001/catalogos/${props.tipo}/${editingItem.value.id}`
      : `http://localhost:3001/catalogos/${props.tipo}`
    const method = editingItem.value ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    closeForm()
    await loadItems()
  } catch (e: any) {
    alert(`Error al guardar: ${e.message}`)
  } finally {
    saving.value = false
  }
}

function confirmDelete(item: any) {
  confirmDeleteItem.value = item
}

async function deleteItem() {
  const item = confirmDeleteItem.value
  if (!item) return
  try {
    const res = await fetch(`http://localhost:3001/catalogos/${props.tipo}/${item.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    confirmDeleteItem.value = null
    await loadItems()
  } catch (e: any) {
    alert(`Error al eliminar: ${e.message}`)
  }
}

onMounted(() => {
  loadItems()
})
</script>

<template>
  <div class="catalogo-page">
    <div class="page-header">
      <h1>{{ titulo }}</h1>
      <button class="btn-primary btn-sm" @click="openCreate">+ Nuevo</button>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div v-if="loading" class="catalogo-placeholder">Cargando...</div>
    <div v-else-if="items.length === 0" class="catalogo-placeholder">Sin registros</div>
    <table v-else class="catalogo-table">
      <thead>
        <tr>
          <th>#</th>
          <th v-for="col in campos" :key="col">{{ col }}</th>
          <th class="th-actions">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.id }}</td>
          <td v-for="col in campos" :key="col">
            <div class="cell-text">{{ item[col] }}</div>
          </td>
          <td>
            <div class="row-actions">
              <button class="btn-icon btn-edit" title="Editar" @click="openEdit(item)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
              </button>
              <button class="btn-icon btn-delete" title="Eliminar" @click="confirmDelete(item)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244-2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Create/Edit Modal -->
    <div v-if="formVisible" class="modal-overlay" @click.self="closeForm">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ editingItem ? 'Editar' : 'Nuevo' }} {{ titulo }}</h3>
          <button class="modal-close" @click="closeForm">&times;</button>
        </div>
        <div class="modal-body">
          <div v-for="field in campos" :key="field" class="form-group">
            <label :for="'f-' + field">{{ field }}</label>
            <input v-if="field !== 'descripcion' && field !== 'criterio' && field !== 'observaciones'" :id="'f-' + field" v-model="formData[field]" type="text" />
            <textarea v-else :id="'f-' + field" v-model="formData[field]" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeForm">Cancelar</button>
          <button class="btn-primary" :disabled="saving" @click="saveItem">
            {{ saving ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Guardar') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Delete -->
    <div v-if="confirmDeleteItem" class="modal-overlay" @click.self="confirmDeleteItem = null">
      <div class="modal-confirm">
        <div class="modal-header">
          <h3>Confirmar eliminaci&oacute;n</h3>
          <button class="modal-close" @click="confirmDeleteItem = null">&times;</button>
        </div>
        <div class="modal-body">
          <p>&iquest;Eliminar este registro permanentemente?</p>
          <p class="confirm-detail">#{{ confirmDeleteItem.id }} &mdash; {{ campos.map(f => confirmDeleteItem[f]).filter(Boolean).join(' &mdash; ') }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="confirmDeleteItem = null">Cancelar</button>
          <button class="btn-danger" @click="deleteItem">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.catalogo-page {
  padding: 1.5rem;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.page-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}
.catalogo-placeholder {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}
.catalogo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.catalogo-table th,
.catalogo-table td {
  padding: 0.6rem 0.8rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}
.catalogo-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  text-transform: capitalize;
}
.catalogo-table tr:hover td {
  background: #f3f4f6;
}
.cell-text {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.btn-icon svg {
  width: 16px;
  height: 16px;
}
.btn-edit {
  background: #dbeafe;
  color: #1d4ed8;
}
.btn-edit:hover {
  background: #bfdbfe;
}
.btn-delete {
  background: #fee2e2;
  color: #b91c1c;
}
.btn-delete:hover {
  background: #fecaca;
}
.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}
.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}
.btn-cancel {
  background: #e5e7eb;
  color: #374151;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-cancel:hover {
  background: #d1d5db;
}
.btn-danger {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-danger:hover {
  background: #b91c1c;
}
.error-msg {
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.modal-card {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
}
.modal-confirm {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}
.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}
.modal-close:hover {
  color: #111827;
}
.modal-body {
  padding: 1.25rem;
}
.modal-body .form-group {
  margin-bottom: 1rem;
}
.modal-body .form-group:last-child {
  margin-bottom: 0;
}
.modal-body label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  text-transform: capitalize;
}
.modal-body input,
.modal-body textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
}
.modal-body input:focus,
.modal-body textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
}
.confirm-detail {
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 0.5rem;
}
</style>
