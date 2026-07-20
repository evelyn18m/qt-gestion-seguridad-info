<script lang="ts" setup>
import type {CatalogoItem} from '~/types/api'

const route = useRoute()
const catalogoTipos = ref<CatalogoItem[]>([])
const selectedCatalogo = ref<CatalogoItem | null>(null)
const catalogoItems = ref<CatalogoItem[]>([])
const catalogoLoading = ref(false)
const catalogosError = ref('')

const {fetchCatalog} = useCatalog()

const loadCatalogoTipos = async () => {
  catalogosError.value = ''
  try {
    // fetchCatalog with comma-separated would hit /catalogos/tipos-activo,formatos,... which is wrong
    // Load tipos individually in parallel
    const tipos = ['tipos-activo', 'activos', 'tipos-datos-personales', 'formatos', 'macroprocesos', 'subprocesos', 'amenazas', 'vulnerabilidades', 'impactos', 'funcionarios', 'areas', 'riesgos', 'probabilidades', 'tipos-control', 'categorias-controles-implementar', 'controles-implementar', 'opciones-tratamiento', 'estados-plan-tratamiento', 'plazos-implementacion']
    await Promise.all(tipos.map(t => fetchCatalog(t)))
    // Also load the tipo list itself
    const {apiFetch} = useApi()
    catalogoTipos.value = await apiFetch<CatalogoItem[]>('/catalogos')
  } catch (e: any) {
    catalogosError.value = `Error al cargar catálogos: ${e.message}`
  }
}

const selectCatalogo = async (tipoItem: CatalogoItem) => {
  selectedCatalogo.value = tipoItem
  catalogoLoading.value = true
  try {
    const tipoStr = (tipoItem as any).tipo || ''
    catalogoItems.value = await fetchCatalog(tipoStr)
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
  subprocesos: ['nombre', 'macroProcesoId'],
  macroprocesos: ['nombre', 'codigo'],
  'tipos-activo': ['nombre', 'detalle'],
  activos: ['codigo', 'nombre'],
  'tipos-datos-personales': ['nombre'],
  valoraciones: ['nombre'],
  funcionarios: ['nombre', 'correo', 'areaId'],
  areas: ['nombre'],
  'tipos-control': ['nombre'],
  riesgos: ['tipo', 'nivel', 'valor'],
  probabilidades: ['nombre'],
  'controles-implementar': ['seccion', 'descripcion', 'categoriaId'],
  'categorias-controles-implementar': ['nombre'],
  'opciones-tratamiento': ['nombre'],
  'estados-plan-tratamiento': ['nombre'],
}

const catalogoFormVisible = ref(false)
const catalogoFormData = ref<Record<string, any>>({})
const catalogoEditingItem = ref<CatalogoItem | null>(null)
const catalogoSaving = ref(false)
const catalogoConfirmDelete = ref<CatalogoItem | null>(null)
const macroprocesos = ref<CatalogoItem[]>([])
const areas = ref<CatalogoItem[]>([])
const categoriasControlesImplementar = ref<CatalogoItem[]>([])

function getFormFields() {
  if (!selectedCatalogo.value) return []
  const tipo = (selectedCatalogo.value as any).tipo || selectedCatalogo.value
  return FIELD_MAP[tipo] || []
}

function openCreateForm() {
  catalogoEditingItem.value = null
  const fields = getFormFields()
  const data: Record<string, any> = {}
  for (const f of fields) data[f] = ''
  if ((selectedCatalogo.value as any)?.tipo === 'impactos') {
    data.valor = 1
  }
  catalogoFormData.value = data
  catalogoFormVisible.value = true
  // Load macroprocesos for subprocess dropdown
  if ((selectedCatalogo.value as any)?.tipo === 'subprocesos') {
    loadMacroprocesos()
  }
  // Load macroprocesos for subprocess dropdown
  if ((selectedCatalogo.value as any)?.tipo === 'funcionarios') {
    loadAreas()
  }
  // Load categorias for controles-implementar dropdown
  if ((selectedCatalogo.value as any)?.tipo === 'controles-implementar') {
    loadCategoriasControlesImplementar()
  }
}

function openEditForm(item: CatalogoItem) {
  catalogoEditingItem.value = item
  const fields = getFormFields()
  const data: Record<string, any> = {}
  for (const f of fields) data[f] = item[f] ?? ''
  catalogoFormData.value = data
  catalogoFormVisible.value = true
  // Load macroprocesos for subprocess dropdown
  if ((selectedCatalogo.value as any)?.tipo === 'subprocesos') {
    loadMacroprocesos()
  }
  // Load macroprocesos for subprocess dropdown
  if ((selectedCatalogo.value as any)?.tipo === 'funcionarios') {
    loadAreas()
  }
  // Load categorias for controles-implementar dropdown
  if ((selectedCatalogo.value as any)?.tipo === 'controles-implementar') {
    loadCategoriasControlesImplementar()
  }
}

async function loadMacroprocesos() {
  macroprocesos.value = await fetchCatalog('macroprocesos')
}

async function loadAreas() {
  areas.value = await fetchCatalog('areas')
}

async function loadCategoriasControlesImplementar() {
  categoriasControlesImplementar.value = await fetchCatalog('categorias-controles-implementar')
}

function closeCatalogoForm() {
  catalogoFormVisible.value = false
  catalogoFormData.value = {}
  catalogoEditingItem.value = null
}

async function saveCatalogoItem() {
  catalogoSaving.value = true
  try {
    const {apiFetch} = useApi()
    const tipo = (selectedCatalogo.value as any).tipo || selectedCatalogo.value
    const url = catalogoEditingItem.value
        ? `/catalogos/${tipo}/${catalogoEditingItem.value.id}`
        : `/catalogos/${tipo}`
    const method = catalogoEditingItem.value ? 'PATCH' : 'POST'
    await apiFetch(url, {method, body: JSON.stringify(catalogoFormData.value)})
    closeCatalogoForm()
    await selectCatalogo(selectedCatalogo.value!)
  } catch (e: any) {
    alert(`Error al guardar: ${e.message}`)
  } finally {
    catalogoSaving.value = false
  }
}

function confirmDelete(item: CatalogoItem) {
  catalogoConfirmDelete.value = item
}

async function deleteCatalogoItem() {
  const item = catalogoConfirmDelete.value
  if (!item || !selectedCatalogo.value) return
  try {
    const tipo = (selectedCatalogo.value as any).tipo || selectedCatalogo.value
    const {apiFetch} = useApi()
    await apiFetch(`/catalogos/${tipo}/${item.id}`, {method: 'DELETE'})
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

/**
 * Resolves a cell value for safe display in the table.
 * - Arrays (e.g. detallesRiesgo[]) → "(N)"
 * - Objects with nombre (e.g. categoria relation) → categoria.nombre
 * - Other objects → JSON string
 * - Primitives → string
 */
function displayCellValue(col: string, item: CatalogoItem): string {
  const val = (item as any)[col]
  if (Array.isArray(val)) return `(${val.length})`
  if (val !== null && val !== undefined && typeof val === 'object') {
    return (val as any).nombre ?? JSON.stringify(val)
  }
  return String(val ?? '')
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
            <th v-for="col in Object.keys(catalogoItems[0] || {}).filter(c => c !== 'id' && !c.includes('At') && !Array.isArray((catalogoItems[0] as any)[c]))"
                :key="col">{{ col }}
            </th>
            <th class="th-actions">Acciones</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="item in catalogoItems" :key="item.id">
            <td>{{ item.id }}</td>
            <td v-for="col in Object.keys(catalogoItems[0] || {}).filter(c => c !== 'id' && !c.includes('At') && !Array.isArray((catalogoItems[0] as any)[c]))"
                :key="col">
              <div class="cell-text">{{ displayCellValue(col, item) }}</div>
            </td>
            <td>
              <div class="row-actions">
                <button class="btn-icon btn-edit" title="Editar" @click="openEditForm(item)">
                  <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                       xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" stroke-linecap="round"
                          stroke-linejoin="round"/>
                  </svg>
                </button>
                <button class="btn-icon btn-delete" title="Eliminar" @click="confirmDelete(item)">
                  <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                       xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" stroke-linecap="round"
                          stroke-linejoin="round"/>
                  </svg>
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
            <select
                v-if="field === 'areaId'"
                :id="'f-' + field"
                v-model="catalogoFormData[field]"
                required
            >
              <option value="">Seleccionar área...</option>
              <option v-for="area in areas" :key="area.id" :value="area.id">
                {{ area.nombre }}
              </option>
            </select>
            <select
                v-else-if="field === 'macroProcesoId'"
                :id="'f-' + field"
                v-model="catalogoFormData[field]"
                required
            >
              <option value="">Seleccionar MacroProceso...</option>
              <option v-for="mp in macroprocesos" :key="mp.id" :value="mp.id">
                {{ (mp as any).codigo }} - {{ mp.nombre }}
              </option>
            </select>
            <select
                v-else-if="field === 'categoriaId'"
                :id="'f-' + field"
                v-model="catalogoFormData[field]"
                required
            >
              <option value="">Seleccionar Categoría...</option>
              <option v-for="cat in categoriasControlesImplementar" :key="cat.id" :value="cat.id">
                {{ cat.nombre }}
              </option>
            </select>
            <input
                v-else-if="field !== 'criterio' && field !== 'descripcion' && field !== 'detalle'"
                :id="'f-' + field"
                v-model="catalogoFormData[field]"
                :placeholder="field"
                :type="field === 'valor' ? 'number' : 'text'"
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
          <button :disabled="catalogoSaving" class="btn-primary" @click="saveCatalogoItem">
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
          <p class="confirm-detail">#{{ catalogoConfirmDelete.id }} — {{
              getFormFields().map(f => catalogoConfirmDelete && catalogoConfirmDelete[f]).filter(Boolean).join(' — ')
            }}</p>
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
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
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
