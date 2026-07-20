<script lang="ts" setup>
import type {CatalogoItem, ControlesImplementarItem, PlanTratamiento, PlazoImplementacion} from '~/types/api'

definePageMeta({layout: 'default'})

const planes = ref<PlanTratamiento[]>([])
const loading = ref(false)
const error = ref('')

// Catalogs
const catalogos = ref<Record<string, CatalogoItem[]>>({})
const plazosImplementacion = ref<PlazoImplementacion[]>([])
const controlesImplementar = ref<ControlesImplementarItem[]>([])

async function fetchCatalogs() {
  const {fetchCatalog} = useCatalog()
  const types = [
    'tipos-activo',
    'activos',
    'riesgos',
    'opciones-tratamiento',
    'estados-plan-tratamiento',
    'areas',
  ]
  const results = await Promise.all(types.map((t) => fetchCatalog(t).catch(() => [] as CatalogoItem[])))
  types.forEach((t, i) => {
    catalogos.value[t] = results[i] as CatalogoItem[]
  })

  // plazos-implementacion has special endpoint (read-only catalog)
  try {
    const {apiFetch} = useApi()
    plazosImplementacion.value = await apiFetch<PlazoImplementacion[]>('/catalogos/plazos-implementacion')
  } catch {
    plazosImplementacion.value = []
  }

  // controles-implementar has special endpoint
  try {
    const {apiFetch} = useApi()
    controlesImplementar.value = await apiFetch<ControlesImplementarItem[]>('/catalogos/controles-implementar')
  } catch {
    controlesImplementar.value = []
  }
}

async function fetchPlanes() {
  const {apiFetch} = useApi()
  try {
    loading.value = true
    error.value = ''
    planes.value = await apiFetch<PlanTratamiento[]>('/plan-tratamiento')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al cargar planes'
  } finally {
    loading.value = false
  }
}

const showModal = ref(false)
const editingId = ref<number | null>(null)
const form = ref<{
  id: number | undefined,
  tipoActivoId: number | null,
  activoId: number | null,
  nivelRiesgoId: number | null,
  opcionTratamientoId: number | null,
  controlesImplementarId: number[],
  descripcionActividades: string,
  responsableImplementacionId: number[],
  areaFuncionalId: number | null,
  plazoImplementacionId: number | null,
  fechaInicioImplementacion: string,
  fechaFinImplementacion: string,
  horaDia: string,
  montoUSD: string,
  estadoId: number | null,
  observaciones: string,
}>({
  id: undefined,
  tipoActivoId: null as number | null,
  nivelRiesgoId: null as number | null,
  opcionTratamientoId: null as number | null,
  controlesImplementarId: [],
  descripcionActividades: '',
  responsableImplementacionId: [],
  areaFuncionalId: null as number | null,
  plazoImplementacionId: null as number | null,
  fechaInicioImplementacion: '',
  fechaFinImplementacion: '',
  horaDia: '',
  montoUSD: '',
  estadoId: null as number | null,
  observaciones: '',
})
const modalError = ref('')
const saving = ref(false)

function openCreateModal() {
  editingId.value = null
  form.value = {
    id: undefined,
    tipoActivoId: null,
    activoId: null,
    nivelRiesgoId: null,
    opcionTratamientoId: null,
    controlesImplementarId: [],
    descripcionActividades: '',
    responsableImplementacionId: [],
    areaFuncionalId: null,
    plazoImplementacionId: null,
    fechaInicioImplementacion: '',
    fechaFinImplementacion: '',
    horaDia: '',
    montoUSD: '',
    estadoId: null,
    observaciones: '',
  }
  modalError.value = ''
  showModal.value = true
}

function openEditModal(plan: PlanTratamiento) {
  editingId.value = plan.id
  form.value = {
    id: plan.id,
    tipoActivoId: plan.tipoActivoId,
    activoId: plan.activoId ?? null,
    nivelRiesgoId: plan.nivelRiesgoId,
    opcionTratamientoId: plan.opcionTratamientoId,
    controlesImplementarId: JSON.parse(plan.controlesImplementarId) ?? [],
    descripcionActividades: plan.descripcionActividades,
    responsableImplementacionId: JSON.parse(plan.responsableImplementacionId) ?? [],
    areaFuncionalId: plan.areaFuncionalId ?? null,
    plazoImplementacionId: plan.plazoImplementacionId ?? null,
    fechaInicioImplementacion: plan.fechaInicioImplementacion ? (String(plan.fechaInicioImplementacion).split('T')[0] || '') : '',
    fechaFinImplementacion: plan.fechaFinImplementacion ? (String(plan.fechaFinImplementacion).split('T')[0] || '') : '',
    horaDia: plan.horaDia ?? '',
    montoUSD: plan.montoUSD ?? '',
    estadoId: plan.estadoId,
    observaciones: plan.observaciones ?? '',
  }
  modalError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

function formatPlazoLabel(item: PlazoImplementacion): string {
  return `[${item.codigo}] ${item.nombre}`
}

const hasPlazo = computed(() => form.value.plazoImplementacionId !== null)

const timeframeValidation = computed(() => {
  if (!hasPlazo.value) return {valid: true, message: ''}
  if (!form.value.fechaInicioImplementacion || !form.value.fechaFinImplementacion) {
    return {valid: false, message: 'Debe indicar la fecha de inicio y la fecha de fin cuando selecciona un plazo.'}
  }
  const start = new Date(form.value.fechaInicioImplementacion)
  const end = new Date(form.value.fechaFinImplementacion)
  if (end.getTime() <= start.getTime()) {
    return {valid: false, message: 'La fecha de fin debe ser posterior a la fecha de inicio.'}
  }
  return {valid: true, message: ''}
})

const formValid = computed(() => {
  return (
      form.value.controlesImplementarId.length > 0 &&
      form.value.tipoActivoId !== null &&
      form.value.activoId !== null &&
      form.value.nivelRiesgoId !== null &&
      form.value.opcionTratamientoId !== null &&
      form.value.descripcionActividades.trim() !== '' &&
      form.value.estadoId !== null &&
      timeframeValidation.value.valid
  )
})

async function savePlan() {
  if (!formValid.value) return
  saving.value = true
  modalError.value = ''
  const {apiFetch} = useApi()
  const body: Record<string, unknown> = {
    id: form.value.id,
    tipoActivoId: form.value.tipoActivoId,
    activoId: form.value.activoId,
    nivelRiesgoId: form.value.nivelRiesgoId,
    opcionTratamientoId: form.value.opcionTratamientoId,
    descripcionActividades: form.value.descripcionActividades,
    estadoId: form.value.estadoId,
  }
  if (form.value.controlesImplementarId !== null)
    body.controlesImplementarId = JSON.stringify(form.value.controlesImplementarId)
  if (form.value.responsableImplementacionId !== null)
    body.responsableImplementacionId = JSON.stringify(form.value.responsableImplementacionId)
  if (form.value.areaFuncionalId !== null) body.areaFuncionalId = form.value.areaFuncionalId
  if (form.value.plazoImplementacionId !== null) body.plazoImplementacionId = form.value.plazoImplementacionId
  if (form.value.fechaInicioImplementacion) body.fechaInicioImplementacion = form.value.fechaInicioImplementacion
  if (form.value.fechaFinImplementacion) body.fechaFinImplementacion = form.value.fechaFinImplementacion
  if (form.value.horaDia) body.horaDia = form.value.horaDia
  if (form.value.montoUSD) body.montoUSD = String(form.value.montoUSD)
  if (form.value.observaciones) body.observaciones = form.value.observaciones

  try {
    if (editingId.value !== null) {
      await apiFetch(`/plan-tratamiento/${editingId.value}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    } else {
      await apiFetch('/plan-tratamiento', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    }
    closeModal()
    await fetchPlanes()
  } catch (e: unknown) {
    modalError.value = e instanceof Error ? e.message : 'Error al guardar'
  } finally {
    saving.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteConfirm = ref<PlanTratamiento | null>(null)
const deleteError = ref('')
const deleting = ref(false)

function confirmDelete(plan: PlanTratamiento) {
  deleteConfirm.value = plan
  deleteError.value = ''
}

function cancelDelete() {
  deleteConfirm.value = null
}

function getControlLabel(controlId: number) {
  const control = controlesImplementar.value.find((item) => item.id === controlId)
  if (!control) return 'C#' + controlId
  return `${control.seccion} - ${control.descripcion}`
}

function removeControl(controlId: number) {
  form.value.controlesImplementarId = form.value.controlesImplementarId.filter((id) => id !== controlId)
}

function toggleControlesImplementarId(event: Event) {
  const select = event.target as HTMLSelectElement
  const controlId: number = parseInt(select.value)
  if (controlId) {
    if (form.value.controlesImplementarId.includes(controlId as never)) {
      removeControl(controlId)
    } else {
      form.value.controlesImplementarId.push(controlId as never)
    }
  }

  select.value = ''
}

function getResponsableLabel(responsableId: number) {
  const responsable = catalogos.value['areas']?.find((item) => item.id === responsableId)

  if (!responsable) return 'R#' + responsableId
  return `${responsable.nombre}`
}

function removeResponsable(responsableId: number) {
  form.value.responsableImplementacionId = form.value.responsableImplementacionId.filter((id) => id !== responsableId)
}

function toggleResponsableImplementacionId(event: Event) {
  const select = event.target as HTMLSelectElement
  const responsableId: number = parseInt(select.value)
  if (responsableId) {
    if (form.value.responsableImplementacionId.includes(responsableId as never)) {
      removeResponsable(responsableId)
    } else {
      form.value.responsableImplementacionId.push(responsableId as never)
    }
  }

  select.value = ''
}

async function executeDelete() {
  if (!deleteConfirm.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    const {apiFetch} = useApi()
    await apiFetch(`/plan-tratamiento/${deleteConfirm.value.id}`, {method: 'DELETE'})
    deleteConfirm.value = null
    await fetchPlanes()
  } catch (e: unknown) {
    deleteError.value = e instanceof Error ? e.message : 'Error al eliminar'
  } finally {
    deleting.value = false
  }
}

function getResponsablesLabel(idsStr: string) {
  const ids = JSON.parse(idsStr) as number[]

  const responsables = catalogos.value['areas']?.filter((item) => ids.includes(item.id))

  return responsables?.map((res) => res.nombre).join(',\n')
}

onMounted(() => {
  fetchCatalogs()
  fetchPlanes()
})
</script>

<template>
  <div>
    <div class="reportes-page">
      <main class="reportes-main">
        <div class="main-header">
          <div>
            <h2>Plan de Tratamiento</h2>
            <p class="subtitle">Gestión de planes de tratamiento de riesgos.</p>
          </div>
        </div>

        <div v-if="loading" class="reportes-loading">
          <div class="spinner"></div>
          <p>Cargando planes...</p>
        </div>

        <div v-else-if="error" class="reportes-error">
          <div class="error-icon">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" stroke-linecap="round"
                    stroke-linejoin="round"/>
            </svg>
          </div>
          <p>Error al cargar</p>
          <p class="error-detail">{{ error }}</p>
          <button class="btn-retry" @click="fetchPlanes">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                 xmlns="http://www.w3.org/2000/svg">
              <path
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                  stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Reintentar
          </button>
        </div>

        <template v-else>
          <div class="usuarios-toolbar"
               style="margin-bottom: 1rem; border: 1px solid var(--border); border-radius: 16px; background: var(--card-bg);">
            <span class="usuarios-count">{{ planes.length }} plan(es)</span>
            <button class="btn-primary btn-sm" @click="openCreateModal">+ Nuevo</button>
          </div>
          <div v-if="planes.length === 0" class="reportes-empty">
            No se encontraron planes de tratamiento.
          </div>
          <div v-else class="table-wrapper">
            <table class="reportes-table">
              <thead>
              <tr>
                <th class="th-actions">Acciones</th>
                <th>ID Riesgo</th>
                <th>Tipo Activo</th>
                <th>Nombre Activo</th>
                <th>Nivel Riesgo</th>
                <th>Opción Tratamiento</th>
                <th>Plazo</th>
                <th>Estado</th>
                <th>Responsables</th>
                <th>Área</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="plan in planes" :key="plan.id">
                <td>
                  <div class="row-actions">
                    <button class="btn-icon btn-edit" title="Editar" @click="openEditModal(plan)">
                      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                           xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                            stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                    <button class="btn-icon btn-delete" title="Eliminar" @click="confirmDelete(plan)">
                      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                           xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                            stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </td>
                <td>{{ plan.id }}</td>
                <td>{{ plan.tipoActivo?.nombre || '—' }}</td>
                <td>{{ plan.activo?.nombre || '—' }}</td>
                <td>{{ plan.nivelRiesgo?.nivel || '—' }}</td>
                <td>{{ plan.opcionTratamiento?.nombre || '—' }}</td>
                <td>{{ plan.plazoImplementacion ? formatPlazoLabel(plan.plazoImplementacion) : '—' }}</td>
                <td>
                    <span class="estado-badge" :class="'estado-' + (plan.estado?.nombre?.toLowerCase() || 'default')">
                      {{ plan.estado?.nombre || '—' }}
                    </span>
                </td>
                <td>
                  <div style="white-space: pre">{{ getResponsablesLabel(plan.responsableImplementacionId) || '—' }}</div>
                </td>
                <td>{{ plan.area?.nombre || '—' }}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </template>
      </main>
    </div>

    <!-- ── Create / Edit Modal ─────────────────────────────────────────────── -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal" >
      <div class="modal-card modal-wide">
        <div class="modal-header">
          <h3>{{ editingId !== null ? 'Editar Plan' : 'Nuevo Plan de Tratamiento' }}</h3>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="pt-tipo-activo">Tipo de Activo <span class="required">*</span></label>
              <select id="pt-tipo-activo" v-model="form.tipoActivoId">
                <option :value="null">Seleccionar...</option>
                <option v-for="item in catalogos['tipos-activo']" :key="item.id" :value="item.id">
                  {{ item.nombre }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="pt-activo">Nombre Activo <span class="required">*</span></label>
              <select id="pt-activo" v-model="form.activoId">
                <option :value="null">Seleccionar...</option>
                <option v-for="item in catalogos['activos']" :key="item.id" :value="item.id">
                  {{ item.nombre }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="pt-nivel-riesgo">Nivel de Riesgo <span class="required">*</span></label>
              <select id="pt-nivel-riesgo" v-model="form.nivelRiesgoId">
                <option :value="null">Seleccionar...</option>
                <option v-for="item in catalogos['riesgos']?.filter((item) => item.tipo === 'Amenaza')" :key="item.id" :value="item.id">{{ item.nivel }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="pt-opcion">Opción de Tratamiento <span class="required">*</span></label>
              <select id="pt-opcion" v-model="form.opcionTratamientoId">
                <option :value="null">Seleccionar...</option>
                <option v-for="item in catalogos['opciones-tratamiento']" :key="item.id" :value="item.id">
                  {{ item.nombre }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="pt-controles">Controles a Implementar</label>
            <select
                id="pt-controles"
                @change="toggleControlesImplementarId"
            >
              <option value="">Agregar o quitar controles</option>
              <option
                  v-for="item in controlesImplementar"
                  :key="item.id"
                  :value="item.id"
                  :disabled="form.controlesImplementarId.includes(item.id)"
              >
                {{ item.seccion }} — {{ item.descripcion }}
              </option>
            </select>
            <div class="chip-list" style="max-height:140px;">
              <span
                  v-for="control in form.controlesImplementarId"
                  :key="control"
                  class="chip selected"
                  style="display:flex; align-items:center; gap:0.3rem; cursor:default;"
              >
                {{ getControlLabel(control) }}
                <button
                    style="width:16px; height:16px; padding:0; background:transparent; border:none; color:currentColor; cursor:pointer; display:flex; align-items:center;"
                    type="button"
                    @click="removeControl(control)"
                >
                  <svg
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      style="width:10px; height:10px;"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </span>
            </div>
          </div>
          <div class="form-group form-group-full">
            <label for="pt-descripcion">Descripción de Actividades <span class="required">*</span></label>
            <textarea id="pt-descripcion" v-model="form.descripcionActividades" rows="5"
                      placeholder="Describa las actividades a realizar..."></textarea>
          </div>
          <div class="form-group">
            <label for="pt-plazo">Plazo de Implementación</label>
            <select id="pt-plazo" v-model="form.plazoImplementacionId">
              <option :value="null">Seleccionar...</option>
              <option v-for="item in plazosImplementacion" :key="item.id" :value="item.id">{{
                  formatPlazoLabel(item)
                }}
              </option>
            </select>
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label for="pt-fecha-inicio">Fecha de inicio</label>
              <input id="pt-fecha-inicio" v-model="form.fechaInicioImplementacion" type="date"/>
            </div>
            <div class="form-group">
              <label for="pt-fecha-fin">Fecha de fin</label>
              <input id="pt-fecha-fin" v-model="form.fechaFinImplementacion" type="date"/>
            </div>
          </div>

          <div class="form-group">
            <label for="pt-responsable">Responsables</label>
            <select
                id="pt-responsable"
                @change="toggleResponsableImplementacionId"
            >
              <option value="">Agregar o quitar área responsable</option>
              <option
                  v-for="item in catalogos['areas']"
                  :key="item.id"
                  :value="item.id"
                  :disabled="form.responsableImplementacionId.includes(item.id)"
              >
                {{ item.nombre }}
              </option>
            </select>
            <div class="chip-list" style="max-height:160px;">
              <span
                  v-for="responsable in form.responsableImplementacionId"
                  :key="responsable"
                  class="chip selected"
                  style="display:flex; align-items:center; gap:0.3rem; cursor:default;"
              >
                {{ getResponsableLabel(responsable) }}
                <button
                    style="width:16px; height:16px; padding:0; background:transparent; border:none; color:currentColor; cursor:pointer; display:flex; align-items:center;"
                    type="button"
                    @click="removeResponsable(responsable)"
                >
                  <svg
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      style="width:10px; height:10px;"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </span>
            </div>
          </div>
          <div class="form-group">
            <label for="pt-area">Área Funcional</label>
            <select id="pt-area" v-model="form.areaFuncionalId">
              <option :value="null">Seleccionar área funcional</option>
              <option v-for="item in catalogos['areas']" :key="item.id" :value="item.id">{{ item.nombre }}</option>
            </select>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="pt-hora-dia">Hora hombre por día</label>
              <input id="pt-hora-dia" v-model="form.horaDia" type="number" step="1" />
            </div>
            <div class="form-group">
              <label for="pt-monto-usd">Monto USD</label>
              <input id="pt-monto-usd" v-model="form.montoUSD" type="number" step="0.01"/>
            </div>
            <div class="form-group">
              <label for="pt-estado">Estado <span class="required">*</span></label>
              <select id="pt-estado" v-model="form.estadoId">
                <option :value="null">Seleccionar...</option>
                <option v-for="item in catalogos['estados-plan-tratamiento']" :key="item.id" :value="item.id">
                  {{ item.nombre }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-group form-group-full">
            <label for="pt-observaciones">Observaciones</label>
            <textarea id="pt-observaciones" v-model="form.observaciones" rows="2"
                      placeholder="Observaciones adicionales..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">Cancelar</button>
          <button :disabled="!formValid || saving" class="btn-primary" @click="savePlan">
            {{ saving ? 'Guardando...' : (editingId !== null ? 'Guardar' : 'Crear') }}
          </button>
        </div>
        <div v-if="timeframeValidation.message" class="modal-error">{{ timeframeValidation.message }}</div>
        <div v-if="modalError" class="modal-error">{{ modalError }}</div>
      </div>

    </div>
  </div>

  <!-- ── Delete Confirm Modal ────────────────────────────────────────────── -->
  <div v-if="deleteConfirm" class="modal-overlay" @click.self="cancelDelete">
    <div class="modal-card modal-confirm">
      <div class="modal-header">
        <h3>Confirmar eliminación</h3>
      </div>
      <div class="modal-body">
        <p>¿Estás seguro de eliminar este plan de tratamiento?</p>
        <p class="confirm-detail">
          <strong>{{ deleteConfirm.id }}</strong>
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
  to {
    transform: rotate(360deg);
  }
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
  flex: 1;
  overflow-y: auto;
}

.table-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.4);
  border-radius: 10px;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  max-width: 100%;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.5);
}

.reportes-table {
  border-collapse: collapse;
}

.reportes-table th,
.reportes-table td {
  padding: 0.85rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: pre;
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
  display: grid;
  grid-template-rows: auto 1fr auto;
  max-height: 95vh;
}

.modal-wide {
  max-width: 720px;
}

.modal-confirm {
  max-width: 420px;
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

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
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
  overflow-y: auto;
  flex: 1;
}

.modal-body::-webkit-scrollbar, .chip-list::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track, .chip-list::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.4);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb, .chip-list::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 10px;
}

.modal-body::-webkit-scrollbar-thumb:hover, .chip-list::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.5);
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
  padding: 1.5rem;
  border-top: 1px solid var(--border);
}

.confirm-detail {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

/* ── Form Grid ─────────────────────────────────────────────────────────────── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

.form-group .required {
  color: #ef4444;
}

.form-group input,
.form-group textarea {
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

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group-full {
  grid-column: 1 / -1;
}
</style>
