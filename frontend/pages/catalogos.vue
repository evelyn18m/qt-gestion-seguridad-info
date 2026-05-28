<script setup lang="ts">
const route = useRoute()
const catalogoTipos = ref<any[]>([])
const selectedCatalogo = ref<any>(null)
const catalogoItems = ref<any[]>([])
const catalogoLoading = ref(false)
const catalogosError = ref('')

const loadCatalogoTipos = async () => {
  catalogosError.value = ''
  try {
    const res = await fetch('http://localhost:3001/catalogos')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    catalogoTipos.value = await res.json()
  } catch (e: any) {
    catalogosError.value = `Error al cargar catálogos: ${e.message}`
  }
}

const selectCatalogo = async (tipo: any) => {
  selectedCatalogo.value = tipo
  catalogoLoading.value = true
  try {
    const res = await fetch(`http://localhost:3001/catalogos/${tipo.tipo}`)
    catalogoItems.value = await res.json()
  } catch (e) {
    console.error('Error cargando items', e)
    catalogoItems.value = []
  } finally {
    catalogoLoading.value = false
  }
}

const FIELD_MAP: Record<string, string[]> = {
  amenazas: ['categoria', 'nombre', 'tipoFuente'],
  vulnerabilidades: ['categoria', 'descripcion'],
  impactos: ['tipo', 'nivel', 'valor', 'criterio'],
  formatos: ['nombre'],
  subprocesos: ['nombre'],
  macroprocesos: ['nombre'],
  'tipos-activo': ['nombre', 'detalle'],
  valoraciones: ['nombre'],
  funcionarios: ['nombre'],
  areas: ['nombre'],
  'tipos-control': ['nombre'],
  riesgos: ['evaluacion', 'valor'],
  probabilidades: ['nombre'],
}

const catalogoFormVisible = ref(false)
const catalogoFormData = ref<Record<string, any>>({})
const catalogoEditingItem = ref<any>(null)
const catalogoSaving = ref(false)
const catalogoConfirmDelete = ref<any>(null)

function getFormFields() {
  if (!selectedCatalogo.value) return []
  return FIELD_MAP[selectedCatalogo.value.tipo] || []
}

function openCreateForm() {
  catalogoEditingItem.value = null
  const fields = getFormFields()
  const data: Record<string, any> = {}
  for (const f of fields) data[f] = ''
  if (selectedCatalogo.value?.tipo === 'impactos') {
    data.valor = 1
  }
  catalogoFormData.value = data
  catalogoFormVisible.value = true
}

function openEditForm(item: any) {
  catalogoEditingItem.value = item
  const fields = getFormFields()
  const data: Record<string, any> = {}
  for (const f of fields) data[f] = item[f] ?? ''
  catalogoFormData.value = data
  catalogoFormVisible.value = true
}

function closeCatalogoForm() {
  catalogoFormVisible.value = false
  catalogoFormData.value = {}
  catalogoEditingItem.value = null
}

async function saveCatalogoItem() {
  catalogoSaving.value = true
  try {
    const tipo = selectedCatalogo.value.tipo
    const url = catalogoEditingItem.value
      ? `http://localhost:3001/catalogos/${tipo}/${catalogoEditingItem.value.id}`
      : `http://localhost:3001/catalogos/${tipo}`
    const method = catalogoEditingItem.value ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catalogoFormData.value),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    closeCatalogoForm()
    await selectCatalogo(selectedCatalogo.value)
  } catch (e: any) {
    alert(`Error al guardar: ${e.message}`)
  } finally {
    catalogoSaving.value = false
  }
}

function confirmDelete(item: any) {
  catalogoConfirmDelete.value = item
}

async function deleteCatalogoItem() {
  const item = catalogoConfirmDelete.value
  if (!item) return
  try {
    const tipo = selectedCatalogo.value.tipo
    const res = await fetch(`http://localhost:3001/catalogos/${tipo}/${item.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    catalogoConfirmDelete.value = null
    await selectCatalogo(selectedCatalogo.value)
  } catch (e: any) {
    alert(`Error al eliminar: ${e.message}`)
  }
}

onMounted(async () => {
  await loadCatalogoTipos()
  checkTipoFromRoute()
})

watch(() => route.query.tipo, () => {
  checkTipoFromRoute()
})

function checkTipoFromRoute() {
  const tipo = route.query.tipo as string
  if (tipo) {
    const match = catalogoTipos.value.find((t: any) => t.tipo === tipo)
    if (match) selectCatalogo(match)
  }
}
</script>

<template>
  <div class="catalogos-section">
    <div class="welcome-banner">
      <h2>Catálogos del Sistema</h2>
      <p v-if="selectedCatalogo">{{ selectedCatalogo.tipo }} — {{ selectedCatalogo.modelo }}</p>
      <p v-else>Seleccioná un catálogo desde el menú lateral.</p>
    </div>
    <div v-if="catalogosError" class="error-msg" style="margin-bottom:1rem">{{ catalogosError }}</div>
    <div class="catalogo-items">
      <div v-if="!selectedCatalogo" class="catalogo-placeholder">
        Seleccioná un catálogo desde el menú lateral
      </div>
      <template v-else-if="!catalogoLoading">
        <div class="catalogo-toolbar">
          <span class="catalogo-count">{{ catalogoItems.length }} registro(s)</span>
          <button class="btn-primary btn-sm" @click="openCreateForm">+ Nuevo</button>
        </div>
        <div v-if="catalogoItems.length === 0" class="catalogo-placeholder">
          Sin registros
        </div>
        <table v-else class="catalogo-table">
          <thead>
            <tr>
              <th>#</th>
              <th v-for="col in Object.keys(catalogoItems[0] || {}).filter(c => c !== 'id' && !c.includes('At'))" :key="col">{{ col }}</th>
              <th class="th-actions">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in catalogoItems" :key="item.id">
              <td>{{ item.id }}</td>
              <td v-for="col in Object.keys(catalogoItems[0] || {}).filter(c => c !== 'id' && !c.includes('At'))" :key="col">
                <div class="cell-text">{{ item[col] }}</div>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-icon btn-edit" title="Editar" @click="openEditForm(item)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                  </button>
                  <button class="btn-icon btn-delete" title="Eliminar" @click="confirmDelete(item)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="catalogo-placeholder">Cargando...</div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="catalogoFormVisible" class="modal-overlay" @click.self="closeCatalogoForm">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ catalogoEditingItem ? 'Editar' : 'Nuevo' }} {{ selectedCatalogo?.tipo }}</h3>
          <button class="modal-close" @click="closeCatalogoForm">&times;</button>
        </div>
        <div class="modal-body">
          <div v-for="field in getFormFields()" :key="field" class="form-group">
            <label :for="'f-' + field">{{ field }}</label>
            <input
              v-if="field !== 'criterio' && field !== 'descripcion' && field !== 'detalle'"
              :id="'f-' + field"
              v-model="catalogoFormData[field]"
              :type="field === 'valor' ? 'number' : 'text'"
              :placeholder="field"
            />
            <textarea
              v-else
              :id="'f-' + field"
              v-model="catalogoFormData[field]"
              :placeholder="field"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeCatalogoForm">Cancelar</button>
          <button class="btn-primary" :disabled="catalogoSaving" @click="saveCatalogoItem">
            {{ catalogoSaving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div v-if="catalogoConfirmDelete" class="modal-overlay" @click.self="catalogoConfirmDelete = null">
      <div class="modal-card modal-confirm">
        <div class="modal-header">
          <h3>Confirmar eliminación</h3>
        </div>
        <div class="modal-body">
          <p>¿Eliminar este registro de <strong>{{ selectedCatalogo?.tipo }}</strong>?</p>
          <p class="confirm-detail">#{{ catalogoConfirmDelete.id }} — {{ getFormFields().map(f => catalogoConfirmDelete[f]).filter(Boolean).join(' — ') }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="catalogoConfirmDelete = null">Cancelar</button>
          <button class="btn-danger" @click="deleteCatalogoItem">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-banner {
  margin-bottom: 3rem;
}

.welcome-banner h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.welcome-banner p {
  color: var(--text-muted);
}

.catalogos-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.catalogo-items {
  flex: 1;
  overflow: auto;
  min-height: 0;
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

.catalogo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.catalogo-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: capitalize;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg);
}

.catalogo-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}

.catalogo-table tr:hover td {
  background: rgba(99, 102, 241, 0.05);
}

.cell-text {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalogo-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.catalogo-count {
  font-size: 0.85rem;
  color: var(--text-muted);
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

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
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
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  animation: fadeIn 0.2s ease-out;
}

.modal-confirm {
  max-width: 420px;
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

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 0 1.5rem 1.5rem;
}

.modal-footer .btn-primary,
.modal-footer .btn-danger,
.modal-footer .btn-cancel {
  padding: 0.6rem 1.5rem;
  font-size: 0.9rem;
}

.confirm-detail {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
