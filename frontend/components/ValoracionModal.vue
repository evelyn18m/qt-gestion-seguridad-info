<script setup lang="ts">
import type { CatalogoItem, DetalleRiesgo } from '~/types/api'

// ── Catalog Data ──────────────────────────────────────────────────────────────
interface CatalogData {
  valTipoActivo: CatalogoItem[]
  valFormatos: CatalogoItem[]
  valMacroprocesos: CatalogoItem[]
  valSubprocesos: CatalogoItem[]
  valAmenazas: CatalogoItem[]
  valVulnerabilidades: CatalogoItem[]
  valImpactos: CatalogoItem[]
  valFuncionarios: CatalogoItem[]
  valAreas: CatalogoItem[]
  valRiesgos: CatalogoItem[]
  valProbabilidades: CatalogoItem[]
  valTiposControl: CatalogoItem[]
}

// ── Form Data ─────────────────────────────────────────────────────────────────
interface ValFormData {
  nombreActivo: string
  tipoActivo: string
  formato: string
  macroProceso: string
  subProceso: string
  propietario: string
  custodio: string
  descripcion: string
  controlSeguridad: string
  ubicacion: string
  observaciones: string
  amenazas: number[]
  vulnerabilidades: number[]
  confidencialidad: string
  integridad: string
  disponibilidad: string
  tieneDatosPersonales: boolean
}

interface AnalisisFormData {
  macroProceso: string
  nombreActivo: string
  amenazas: number[]
  vulnerabilidades: number[]
  controlesImplementacion: string
}

interface EvaluacionFormData {
  probabilidadId: string
  amenazaRiesgoId: string
  vulnerabilidadRiesgoId: string
  controlesArea: string
}

interface TratamientoFormData {
  metodoTratamiento: string
  tipoControl: string
  controlesImplementar: string
  nivelAmenazaControl: string
  nivelVulnerabilidadControl: string
}

// ── Props & Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  modelValue: boolean
  editId: number | null
  catalogData: CatalogData
  valForm: ValFormData
  analisisForm: AnalisisFormData
  evaluacionForm: EvaluacionFormData
  tratamientoForm: TratamientoFormData
  detallesRiesgo: DetalleRiesgo[]
  activeTab: number
  valSaving: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'submit': []
  'tab-change': [index: number]
  'reset-form': []
}>()

// Legacy DetalleRiesgo (old API stored amenazaIds as JSON string)
interface LegacyDetalleRiesgo extends DetalleRiesgo {
  amenazaIdsStr?: string
  vulnerabilidadIdsStr?: string
}

// ── Computed Properties ───────────────────────────────────────────────────────
const subprocesosFiltrados = computed(() => {
  const mpId = props.valForm.macroProceso
  if (!mpId) return []
  return props.catalogData.valSubprocesos.filter((s: CatalogoItem) => s.macroProcesoId === Number(mpId))
})

const amenazaCategorias = computed(() => {
  const cats = new Set(props.catalogData.valAmenazas.map((a: CatalogoItem) => a.categoria))
  return Array.from(cats).sort()
})

const vulnerabilidadCategorias = computed(() => {
  const cats = new Set(props.catalogData.valVulnerabilidades.map((v: CatalogoItem) => v.categoria))
  return Array.from(cats).sort()
})

const amenazasFiltradas = computed(() => {
  if (!amenazaCategoria.value) return []
  return props.catalogData.valAmenazas.filter((a: CatalogoItem) => a.categoria === amenazaCategoria.value)
})

const vulnerabilidadesFiltradas = computed(() => {
  if (!vulnerabilidadCategoria.value) return []
  return props.catalogData.valVulnerabilidades.filter((v: CatalogoItem) => v.categoria === vulnerabilidadCategoria.value)
})

const ciaAverage = computed(() => {
  const c = getValorImpacto(props.valForm.confidencialidad)
  const i = getValorImpacto(props.valForm.integridad)
  const d = getValorImpacto(props.valForm.disponibilidad)
  const selected = [c, i, d].filter(v => v > 0)
  if (selected.length === 0) return 0
  return Math.round((selected.reduce((a, b) => a + b, 0) / selected.length) * 100) / 100
})

const macroProcesoName = computed(() => {
  const id = props.analisisForm.macroProceso
  if (!id) return 'No seleccionado en Pestaña 1'
  const found = props.catalogData.valMacroprocesos.find((m: CatalogoItem) => m.id === Number(id))
  return found ? found.nombre : `ID #${id}`
})

const detallesAmenazas = computed(() => props.detallesRiesgo.filter(d => d.tipo === 'amenaza'))
const detallesVulnerabilidades = computed(() => props.detallesRiesgo.filter(d => d.tipo === 'vulnerabilidad'))

// ── Tab 3 Preview ──────────────────────────────────────────────────────────
const previewRiesgo = computed<PreviewRiesgo>(() => {
  const amenazaNivel = getValorRiesgo(props.evaluacionForm.amenazaRiesgoId)
  const vulnerabilidadNivel = getValorRiesgo(props.evaluacionForm.vulnerabilidadRiesgoId)
  if (ciaAverage.value === 0 || !amenazaNivel || !vulnerabilidadNivel) {
    return { evaluacionRiesgo: 0, nivelRiesgo: '' }
  }
  return localCalculateRiesgo(ciaAverage.value, amenazaNivel, vulnerabilidadNivel)
})

// ── Local State ──────────────────────────────────────────────────────────────
const amenazaCategoria = ref('')
const vulnerabilidadCategoria = ref('')
const amenazaSeleccionada = ref('')
const vulnerabilidadSeleccionada = ref('')

// ── Tab 2 Row State ─────────────────────────────────────────────────────────
// Each row: { amenazaIds: string[], vulnerabilidadIds: string[], controlesImplementados: string }
export interface RiskRow {
  amenazaIds: string[]
  vulnerabilidadIds: string[]
  controlesImplementados: string
  tempId?: number
}

const riskRows = ref<RiskRow[]>([])
let rowCounter = 0

function agregarFila() {
  riskRows.value.push({
    amenazaIds: [],
    vulnerabilidadIds: [],
    controlesImplementados: '',
    tempId: ++rowCounter,
  })
}

function eliminarFila(index: number) {
  riskRows.value.splice(index, 1)
  syncRowsToDetalles()
}

function removeAmenaza(row: RiskRow, idToRemove: string) {
  row.amenazaIds = row.amenazaIds.filter(id => id !== idToRemove)
  syncRowsToDetalles()
}

function removeVulnerabilidad(row: RiskRow, idToRemove: string) {
  row.vulnerabilidadIds = row.vulnerabilidadIds.filter(id => id !== idToRemove)
  syncRowsToDetalles()
}

function toggleAmenazaInRow(row: RiskRow, amenazaId: string) {
  const idx = row.amenazaIds.indexOf(amenazaId)
  if (idx >= 0) row.amenazaIds.splice(idx, 1)
  else row.amenazaIds.push(amenazaId)
  syncRowsToDetalles()
}

function toggleVulnerabilidadInRow(row: RiskRow, vulnerabilidadId: string) {
  const idx = row.vulnerabilidadIds.indexOf(vulnerabilidadId)
  if (idx >= 0) row.vulnerabilidadIds.splice(idx, 1)
  else row.vulnerabilidadIds.push(vulnerabilidadId)
  syncRowsToDetalles()
}

function hasAtLeastOne(row: RiskRow): boolean {
  return row.amenazaIds.length > 0 || row.vulnerabilidadIds.length > 0
}

function getAmenazaLabel(id: string) {
  const a = props.catalogData.valAmenazas.find((x: CatalogoItem) => x.id === Number(id))
  return a ? `${a.categoria} — ${a.nombre}` : `A#${id}`
}

function getVulnerabilidadLabel(id: string) {
  const v = props.catalogData.valVulnerabilidades.find((x: CatalogoItem) => x.id === Number(id))
  return v ? `${v.categoria} — ${v.descripcion}` : `V#${id}`
}

function parseIds(jsonStr: string | null | undefined): string[] {
  if (!jsonStr) return []
  try {
    const parsed = JSON.parse(jsonStr)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

// Sync riskRows to detallesRiesgo (for Tabs 3/4 backward compat)
function syncRowsToDetalles() {
  const entries: DetalleRiesgo[] = []
  riskRows.value.forEach(row => {
    row.amenazaIds.forEach(aId => {
      entries.push({
        tipo: 'amenaza' as const,
        catalogoId: Number(aId),
        riesgoId: '',
        evaluacionRiesgo: 0,
        nivelRiesgo: '',
        metodoTratamiento: '',
        tipoControlId: '',
        riesgoControlId: '',
        evaluacionRiesgoControl: 0,
        nivelRiesgoControl: '',
        amenazaIds: [...row.amenazaIds],
        vulnerabilidadIds: [...row.vulnerabilidadIds],
        controlesImplementados: row.controlesImplementados,
      })
    })
    row.vulnerabilidadIds.forEach(vId => {
      entries.push({
        tipo: 'vulnerabilidad' as const,
        catalogoId: Number(vId),
        riesgoId: '',
        evaluacionRiesgo: 0,
        nivelRiesgo: '',
        metodoTratamiento: '',
        tipoControlId: '',
        riesgoControlId: '',
        evaluacionRiesgoControl: 0,
        nivelRiesgoControl: '',
        amenazaIds: [...row.amenazaIds],
        vulnerabilidadIds: [...row.vulnerabilidadIds],
        controlesImplementados: row.controlesImplementados,
      })
    })
  })
  // Preserve entries with legacy fields only (from Tab 3/4 edits — no new row fields)
  const legacyEntries = props.detallesRiesgo.filter(d => !d.amenazaIds && !d.vulnerabilidadIds)
  props.detallesRiesgo.length = 0
  props.detallesRiesgo.push(...entries, ...legacyEntries)
}

// Load existing rows from detallesRiesgo (edit mode)
function loadExistingRows() {
  riskRows.value = []
  const seen = new Set<string>()
  props.detallesRiesgo.forEach(d => {
    const aIds = d.amenazaIds ?? parseIds((d as LegacyDetalleRiesgo).amenazaIdsStr ?? null)
    const vIds = d.vulnerabilidadIds ?? parseIds((d as LegacyDetalleRiesgo).vulnerabilidadIdsStr ?? null)
    const key = JSON.stringify([...aIds, ...vIds].sort())
    if (!seen.has(key) && (aIds.length > 0 || vIds.length > 0)) {
      seen.add(key)
      riskRows.value.push({
        amenazaIds: aIds,
        vulnerabilidadIds: vIds,
        controlesImplementados: d.controlesImplementados || '',
        tempId: ++rowCounter,
      })
    }
  })
}

// Watch for modal open to load rows
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadExistingRows()
  }
})

// ── Helper Functions ─────────────────────────────────────────────────────────
function getNivelesImpacto(tipo: string) {
  return props.catalogData.valImpactos.filter((i: CatalogoItem) => i.tipo === tipo)
}

function getValorImpacto(id: string | number) {
  if (!id) return 0
  const found = props.catalogData.valImpactos.find((i: CatalogoItem) => i.id === Number(id))
  return found ? found.valor : 0
}

function getValorRiesgo(id: string | number) {
  if (!id) return 0
  const found = props.catalogData.valRiesgos.find((r: CatalogoItem) => r.id === Number(id))
  return found ? (found.valor || 0) : 0
}

function calcularEvaluacionRiesgo(amenazaRiesgoId: string | number, vulnerabilidadRiesgoId: string | number) {
  const impacto = ciaAverage.value
  const amenaza = getValorRiesgo(amenazaRiesgoId)
  const vulnerabilidad = getValorRiesgo(vulnerabilidadRiesgoId)
  if (impacto === 0 || !amenaza || !vulnerabilidad) return 0
  return Math.round(impacto * amenaza * vulnerabilidad * 100) / 100
}

function calcularNivelRiesgo(evaluacion: number) {
  if (evaluacion >= 18) return 'Crítico'
  if (evaluacion >= 9) return 'Alto'
  if (evaluacion >= 3) return 'Medio'
  return 'Bajo'
}

function getNivelStyle(nivel: string) {
  const n = (nivel || '').toLowerCase()
  if (n.includes('critico')) return { label: 'Crítico', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' }
  if (n.includes('alto')) return { label: 'Alto', color: '#ea580c', bg: 'rgba(234,88,12,0.15)' }
  if (n.includes('medio')) return { label: 'Medio', color: '#ca8a04', bg: 'rgba(202,138,4,0.15)' }
  return { label: 'Bajo', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' }
}

function getCatalogoLabel(tipo: string, catalogoId: number) {
  if (tipo === 'amenaza') {
    const a = props.catalogData.valAmenazas.find((x: CatalogoItem) => x.id === catalogoId)
    return a ? `${a.categoria} — ${a.nombre}` : `A#${catalogoId}`
  }
  const v = props.catalogData.valVulnerabilidades.find((x: CatalogoItem) => x.id === catalogoId)
  return v ? `${v.categoria} — ${v.descripcion}` : `V#${catalogoId}`
}

function getAmenazaLabelNum(id: number) {
  const a = props.catalogData.valAmenazas.find((x: CatalogoItem) => x.id === id)
  return a ? `${a.categoria} — ${a.nombre}` : `A#${id}`
}

function getVulnerabilidadLabelNum(id: number) {
  const v = props.catalogData.valVulnerabilidades.find((x: CatalogoItem) => x.id === id)
  return v ? `${v.categoria} — ${v.descripcion}` : `V#${id}`
}

// ── Pure risk calculation (mirrors backend calculo-riesgo.service.ts) ────────
interface PreviewRiesgo {
  evaluacionRiesgo: number
  nivelRiesgo: string
}

function deriveNivelRiesgo(evaluacion: number): string {
  if (evaluacion <= 3) return 'BAJO'
  if (evaluacion <= 8) return 'MEDIO'
  return 'ALTO'
}

function localCalculateRiesgo(va: number, nivelAmenaza: number, nivelVulnerabilidad: number): PreviewRiesgo {
  const evaluacionRiesgo = va * nivelAmenaza * nivelVulnerabilidad
  const nivelRiesgo = deriveNivelRiesgo(evaluacionRiesgo)
  return { evaluacionRiesgo, nivelRiesgo }
}

function getRowPreview(d: DetalleRiesgo): PreviewRiesgo {
  const va = ciaAverage.value
  const nivelA = getValorRiesgo(d.riesgoId)
  const nivelV = getValorRiesgo(d.vulnerabilidadRiesgoId)
  if (va === 0 || !nivelA || !nivelV) {
    return { evaluacionRiesgo: 0, nivelRiesgo: '' }
  }
  return localCalculateRiesgo(va, nivelA, nivelV)
}

function findMatchedDetalle(row: RiskRow): DetalleRiesgo | undefined {
  if (!row.amenazaIds[0]) return undefined
  return props.detallesRiesgo.find(d =>
    d.tipo === 'amenaza' &&
    d.catalogoId === Number(row.amenazaIds[0]) &&
    JSON.stringify(d.amenazaIds) === JSON.stringify(row.amenazaIds) &&
    JSON.stringify(d.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds)
  )
}

function getCiaLevel(avg: number) {
  if (avg >= 2.5) return 'Alto'
  if (avg >= 1.5) return 'Medio'
  return 'Bajo'
}

function getTipoControlName(id: number | string) {
  if (!id) return '—'
  const found = props.catalogData.valTiposControl.find((tc: CatalogoItem) => tc.id === Number(id))
  return found ? found.nombre : `TC#${id}`
}

function agregarAmenaza() {
  const id = Number(amenazaSeleccionada.value)
  if (!id) return
  if (!props.analisisForm.amenazas.includes(id)) {
    props.analisisForm.amenazas.push(id)
  }
  amenazaSeleccionada.value = ''
  emit('reset-form')
}

function quitarAmenaza(id: number) {
  const idx = props.analisisForm.amenazas.indexOf(id)
  if (idx >= 0) props.analisisForm.amenazas.splice(idx, 1)
  emit('reset-form')
}

function agregarVulnerabilidad() {
  const id = Number(vulnerabilidadSeleccionada.value)
  if (!id) return
  if (!props.analisisForm.vulnerabilidades.includes(id)) {
    props.analisisForm.vulnerabilidades.push(id)
  }
  vulnerabilidadSeleccionada.value = ''
  emit('reset-form')
}

function quitarVulnerabilidad(id: number) {
  const idx = props.analisisForm.vulnerabilidades.indexOf(id)
  if (idx >= 0) props.analisisForm.vulnerabilidades.splice(idx, 1)
  emit('reset-form')
}

function updateEvaluacionDetalle(_d?: DetalleRiesgo) {
  // No longer emit reset-form — Tab 2 manages its own riskRows which syncs to detallesRiesgo
  // Tab 3 riesgo changes are tracked directly in detallesRiesgo entries
}

function updateControlDetalle(d: DetalleRiesgo) {
  d.evaluacionRiesgoControl = calcularEvaluacionRiesgo(d.riesgoControlId, props.evaluacionForm.vulnerabilidadRiesgoId)
  d.nivelRiesgoControl = calcularNivelRiesgo(d.evaluacionRiesgoControl)
}

const tabs = [
  { label: 'Valoración de Activo' },
  { label: 'Análisis de Riesgos' },
  { label: 'Evaluación de Riesgo' },
  { label: 'Tratamiento de Riesgo' },
]
</script>

<template>
  <!-- MODAL CONTENT: FORM -->
  <div v-if="modelValue" class="val-modal-overlay" @click.self="emit('update:modelValue', false)">
    <div class="val-modal-content">
      <div class="val-modal-header">
        <h3>{{ editId ? 'Editar' : 'Nueva' }} Valoración</h3>
        <button class="btn-icon" @click="emit('update:modelValue', false)" title="Cerrar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- TABS -->
      <div class="val-tabs">
        <button
          v-for="(tab, idx) in tabs"
          :key="idx"
          type="button"
          class="val-tab"
          :class="{ active: activeTab === idx }"
          @click="emit('tab-change', idx)"
        >{{ tab.label }}</button>
      </div>

      <div class="val-modal-body">
        <form class="val-form" @submit.prevent="emit('submit')" novalidate>
          <!-- TAB 1: Valoración de Activo -->
          <div v-show="activeTab === 0">
            <div class="val-grid">
              <div class="val-card" style="border:none; padding:0; background:transparent;">
                <h3 class="val-card-title">Identificación del Activo</h3>
                <div class="form-group">
                  <label>Nombre del Activo</label>
                  <input v-model="valForm.nombreActivo" type="text" placeholder="Nombre del activo de información" required />
                </div>
                <div class="form-group">
                  <label>Tipo de Activo</label>
                  <select v-model="valForm.tipoActivo" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="t in catalogData.valTipoActivo" :key="t.id" :value="t.id">{{ t.nombre }} — {{ t.detalle }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Formato</label>
                  <select v-model="valForm.formato" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="f in catalogData.valFormatos" :key="f.id" :value="f.id">{{ f.nombre }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Macro Proceso</label>
                  <select v-model="valForm.macroProceso" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="m in catalogData.valMacroprocesos" :key="m.id" :value="m.id">{{ m.nombre }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Sub Proceso</label>
                  <select v-model="valForm.subProceso" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="s in subprocesosFiltrados" :key="s.id" :value="s.id">{{ s.nombre }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Propietario del Activo</label>
                  <select v-model="valForm.propietario" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="a in catalogData.valAreas" :key="a.id" :value="a.id">{{ a.nombre }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Custodio del Activo</label>
                  <select v-model="valForm.custodio" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="f in catalogData.valFuncionarios" :key="f.id" :value="f.id">{{ f.nombre }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Descripción del Activo</label>
                  <textarea v-model="valForm.descripcion" placeholder="Describa el activo de información" rows="2" required></textarea>
                </div>
                <div class="form-group">
                  <label>Control de Seguridad Implementado</label>
                  <textarea v-model="valForm.controlSeguridad" placeholder="Controles de seguridad existentes" rows="2" required></textarea>
                </div>
                <div class="form-group">
                  <label>Ubicación</label>
                  <input v-model="valForm.ubicacion" type="text" placeholder="Ubicación física o lógica del activo" required />
                </div>
                <div class="form-group">
                  <label>¿Tiene Datos Personales?</label>
                  <select v-model="valForm.tieneDatosPersonales" required>
                    <option :value="false">NO</option>
                    <option :value="true">SÍ</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Observaciones</label>
                  <textarea v-model="valForm.observaciones" placeholder="Observaciones adicionales" rows="3"></textarea>
                </div>
              </div>

              <div class="val-card" style="border:none; padding:0; background:transparent;">
                <h3 class="val-card-title">Valoración CIA</h3>
                <div class="form-group">
                  <label>Confidencialidad</label>
                  <select v-model="valForm.confidencialidad" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="n in getNivelesImpacto('confidencialidad')" :key="n.id" :value="n.id">{{ n.nivel }} ({{ n.valor }}) — {{ n.criterio }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Integridad</label>
                  <select v-model="valForm.integridad" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="n in getNivelesImpacto('integridad')" :key="n.id" :value="n.id">{{ n.nivel }} ({{ n.valor }}) — {{ n.criterio }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Disponibilidad</label>
                  <select v-model="valForm.disponibilidad" required>
                    <option value="">Seleccionar...</option>
                    <option v-for="n in getNivelesImpacto('disponibilidad')" :key="n.id" :value="n.id">{{ n.nivel }} ({{ n.valor }}) — {{ n.criterio }}</option>
                  </select>
                </div>
                <div class="cia-average" v-if="ciaAverage > 0">
                  <span class="cia-average-label">Promedio CIA</span>
                  <span class="cia-average-value">{{ ciaAverage.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: Análisis de Riesgos (row-based) -->
          <div v-show="activeTab === 1" class="val-tab-panel">
            <div class="val-card" style="border:none; padding:0; background:transparent;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
                <h3 class="val-card-title" style="margin:0; border:none; padding:0;">Análisis de Riesgos — Filas de Riesgo</h3>
                <button type="button" class="btn-primary" @click="agregarFila" style="padding:0.5rem 1rem; font-size:0.85rem;">+ Agregar fila</button>
              </div>

              <div v-if="riskRows.length === 0" class="chip-empty" style="text-align:center; padding:2rem 0;">
                Sin filas de riesgo. Haga clic en "+ Agregar fila" para comenzar.
              </div>

              <table v-else class="val-table">
                <thead>
                  <tr>
                    <th style="min-width:220px;">Amenazas</th>
                    <th style="min-width:220px;">Vulnerabilidades</th>
                    <th>Controles Implementados</th>
                    <th>Riesgo Residual</th>
                    <th style="width:48px;"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in riskRows" :key="row.tempId">
                    <!-- Amenaza cell -->
                    <td>
                      <!-- Category + select for adding threats -->
                      <select
                        v-model="amenazaCategoria"
                        class="row-select"
                        style="margin-bottom:0.4rem;"
                      >
                        <option value="">+ Agregar amenaza...</option>
                        <option v-for="cat in amenazaCategorias" :key="cat" :value="cat">{{ cat }}</option>
                      </select>
                      <select
                        v-if="amenazaCategoria"
                        class="row-select"
                        @change="(e) => { const s = (e.target as HTMLSelectElement).value; if (s) { toggleAmenazaInRow(row, s); amenazaCategoria = ''; (e.target as HTMLSelectElement).value = '' } }"
                        style="margin-bottom:0.4rem;"
                      >
                        <option value="">Seleccionar...</option>
                        <option v-for="a in amenazasFiltradas" :key="a.id" :value="String(a.id)">{{ a.nombre }}</option>
                      </select>
                      <!-- Selected amenaza chips -->
                      <div class="chip-list" style="max-height:140px;">
                        <span v-for="aId in row.amenazaIds" :key="aId" class="chip selected" style="display:flex; align-items:center; gap:0.3rem; cursor:default;">
                          {{ getAmenazaLabel(aId) }}
                          <button type="button" @click="removeAmenaza(row, aId)" style="width:16px; height:16px; padding:0; background:transparent; border:none; color:currentColor; cursor:pointer; display:flex; align-items:center;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width:10px; height:10px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </span>
                      </div>
                    </td>

                    <!-- Vulnerabilidad cell -->
                    <td>
                      <!-- Category + select for adding vulnerabilities -->
                      <select
                        v-model="vulnerabilidadCategoria"
                        class="row-select"
                        style="margin-bottom:0.4rem;"
                      >
                        <option value="">+ Agregar vulnerabilidad...</option>
                        <option v-for="cat in vulnerabilidadCategorias" :key="cat" :value="cat">{{ cat }}</option>
                      </select>
                      <select
                        v-if="vulnerabilidadCategoria"
                        class="row-select"
                        @change="(e) => { const s = (e.target as HTMLSelectElement).value; if (s) { toggleVulnerabilidadInRow(row, s); vulnerabilidadCategoria = ''; (e.target as HTMLSelectElement).value = '' } }"
                        style="margin-bottom:0.4rem;"
                      >
                        <option value="">Seleccionar...</option>
                        <option v-for="v in vulnerabilidadesFiltradas" :key="v.id" :value="String(v.id)">{{ v.descripcion }}</option>
                      </select>
                      <!-- Selected vulnerabilidad chips -->
                      <div class="chip-list" style="max-height:140px;">
                        <span v-for="vId in row.vulnerabilidadIds" :key="vId" class="chip selected" style="display:flex; align-items:center; gap:0.3rem; cursor:default;">
                          {{ getVulnerabilidadLabel(vId) }}
                          <button type="button" @click="removeVulnerabilidad(row, vId)" style="width:16px; height:16px; padding:0; background:transparent; border:none; color:currentColor; cursor:pointer; display:flex; align-items:center;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" style="width:10px; height:10px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </span>
                      </div>
                    </td>

                    <!-- Controles Implementados cell -->
                    <td>
                      <textarea
                        v-model="row.controlesImplementados"
                        placeholder="Controles implementados para esta combinación..."
                        rows="3"
                        style="resize:vertical; min-width:180px;"
                      ></textarea>
                    </td>

                    <!-- Riesgo Residual cell: show ACEPTABLE/INACEPTABLE based on evaluacionRiesgoControl -->
                    <td style="text-align:center;">
                      <template v-for="d in detallesRiesgo.filter(dd => JSON.stringify(dd.amenazaIds) === JSON.stringify(row.amenazaIds) && JSON.stringify(dd.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds))" :key="d.tipo + d.catalogoId">
                        <span
                          v-if="d.evaluacionRiesgoControl > 0"
                          class="nivel-badge"
                          :style="{
                            color: d.evaluacionRiesgoControl <= 3 ? '#16a34a' : '#dc2626',
                            background: d.evaluacionRiesgoControl <= 3 ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)'
                          }"
                        >
                          {{ d.evaluacionRiesgoControl <= 3 ? 'ACEPTABLE' : 'INACEPTABLE' }}
                        </span>
                        <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
                      </template>
                    </td>

                    <!-- Remove row -->
                    <td>
                      <button type="button" @click="eliminarFila(index)" style="background:transparent; border:none; color:#dc2626; cursor:pointer; font-size:1.2rem; padding:0.25rem; line-height:1;" title="Eliminar fila">×</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 3: Evaluación de Riesgo -->
          <div v-show="activeTab === 2" class="val-tab-panel">
            <div class="val-card" style="border:none; padding:0; background:transparent;">
              <h3 class="val-card-title">Evaluación de Riesgo por Item</h3>
              <div class="form-group">
                <label>Impacto (Extraído de Valoración CIA - Pestaña 1)</label>
                <input type="text" :value="ciaAverage > 0 ? ciaAverage.toFixed(2) + ' — ' + getCiaLevel(ciaAverage) : 'Complete Valoración CIA en Pestaña 1'" readonly style="background:rgba(15,23,42,0.3); cursor:not-allowed;" />
              </div>
              <div v-if="riskRows.length === 0" class="chip-empty">No hay amenazas ni vulnerabilidades seleccionadas en la Pestaña 2.</div>
              <table v-else class="val-table" style="margin-top:1rem;">
                <thead>
                  <tr>
                    <th>Amenaza</th>
                    <th>Vulnerabilidad</th>
                    <th>Nivel Amenaza</th>
                    <th>Nivel Vulnerabilidad</th>
                    <th>Evaluación</th>
                    <th>Nivel</th>
                    <th>Controles</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in riskRows" :key="row.tempId ?? (row.amenazaIds[0] + '-' + row.vulnerabilidadIds[0])">
                    <td>
                      <span v-for="aId in row.amenazaIds" :key="'a-' + aId" class="chip selected" style="display:flex; align-items:center; gap:0.3rem; margin-bottom:0.25rem; cursor:default;">{{ getAmenazaLabel(aId) }}</span>
                      <span v-if="row.amenazaIds.length === 0" style="color:var(--text-muted);">—</span>
                    </td>
                    <td>
                      <span v-for="vId in row.vulnerabilidadIds" :key="'v-' + vId" class="chip selected" style="display:flex; align-items:center; gap:0.3rem; margin-bottom:0.25rem; cursor:default;">{{ getVulnerabilidadLabel(vId) }}</span>
                      <span v-if="row.vulnerabilidadIds.length === 0" style="color:var(--text-muted);">—</span>
                    </td>
                    <td>
                      <select v-model="findMatchedDetalle(row)!.riesgoId" @change="updateEvaluacionDetalle(findMatchedDetalle(row))" style="min-width:130px;">
                        <option value="">Seleccionar...</option>
                        <option v-for="r in catalogData.valRiesgos.filter((r: CatalogoItem) => r.evaluacion?.toLowerCase().includes('amenaza'))" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
                      </select>
                    </td>
                    <td>
                      <select v-model="findMatchedDetalle(row)!.vulnerabilidadRiesgoId" @change="updateEvaluacionDetalle(findMatchedDetalle(row))" style="min-width:130px;">
                        <option value="">Seleccionar...</option>
                        <option v-for="r in catalogData.valRiesgos.filter((r: CatalogoItem) => r.evaluacion?.toLowerCase().includes('vulnerabilidad'))" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
                      </select>
                    </td>
                    <td>
                      <template v-if="findMatchedDetalle(row)">
                        <span v-if="getRowPreview(findMatchedDetalle(row)!).evaluacionRiesgo > 0">{{ getRowPreview(findMatchedDetalle(row)!).evaluacionRiesgo.toFixed(2) }}</span>
                        <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
                      </template>
                      <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
                    </td>
                    <td>
                      <template v-if="findMatchedDetalle(row)">
                        <span v-if="getRowPreview(findMatchedDetalle(row)!).nivelRiesgo" class="nivel-badge" :style="{ color: getNivelStyle(getRowPreview(findMatchedDetalle(row)!).nivelRiesgo).color, background: getNivelStyle(getRowPreview(findMatchedDetalle(row)!).nivelRiesgo).bg }">{{ getNivelStyle(getRowPreview(findMatchedDetalle(row)!).nivelRiesgo).label }}</span>
                        <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
                      </template>
                      <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
                    </td>
                    <td>
                      <textarea v-model="row.controlesImplementados" placeholder="Controles implementados..." rows="2" style="resize:vertical; min-width:120px;"></textarea>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 4: Tratamiento de Riesgo -->
          <div v-show="activeTab === 3" class="val-tab-panel">
            <div class="val-card" style="border:none; padding:0; background:transparent;">
              <h3 class="val-card-title">Tratamiento de Riesgo por Item</h3>
              <div v-if="detallesRiesgo.length === 0" class="chip-empty">No hay items para tratar. Complete la Pestaña 2 y evalúe en la Pestaña 3.</div>
              <div v-else class="val-grid" style="grid-template-columns: 1fr 1fr; gap:1.5rem; margin-top:1rem;">
                <!-- COLUMNA: Amenazas -->
                <div>
                  <h4 style="margin:0 0 0.75rem 0; font-size:0.95rem; color:var(--text-muted);">Amenazas</h4>
                  <table class="val-table" v-if="detallesAmenazas.length > 0">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Método</th>
                        <th>Tipo Control</th>
                        <th>Riesgo (Ctrl)</th>
                        <th>Eval. (Ctrl)</th>
                        <th>Nivel (Ctrl)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="d in detallesAmenazas" :key="d.catalogoId">
                        <td>{{ getCatalogoLabel(d.tipo, d.catalogoId) }}</td>
                        <td><input v-model="d.metodoTratamiento" type="text" placeholder="Método" style="min-width:100px;" /></td>
                        <td>
                          <select v-model="d.tipoControlId" style="min-width:110px;">
                            <option value="">Seleccionar...</option>
                            <option v-for="tc in catalogData.valTiposControl" :key="tc.id" :value="tc.id">{{ tc.nombre }}</option>
                          </select>
                        </td>
                        <td>
                          <select v-model="d.riesgoControlId" @change="updateControlDetalle(d)" style="min-width:110px;">
                            <option value="">Seleccionar...</option>
                            <option v-for="r in catalogData.valRiesgos" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
                            </select>
                        </td>
                        <td>
                          <span v-if="d.evaluacionRiesgoControl > 0">{{ d.evaluacionRiesgoControl.toFixed(2) }}</span>
                          <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
                        </td>
                        <td>
                          <span v-if="d.nivelRiesgoControl" class="nivel-badge" :style="{ color: getNivelStyle(d.nivelRiesgoControl).color, background: getNivelStyle(d.nivelRiesgoControl).bg }">
                            {{ getNivelStyle(d.nivelRiesgoControl).label }}
                          </span>
                          <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="chip-empty" style="margin-top:0.5rem;">Sin amenazas</div>
                </div>

                <!-- COLUMNA: Vulnerabilidades -->
                <div>
                  <h4 style="margin:0 0 0.75rem 0; font-size:0.95rem; color:var(--text-muted);">Vulnerabilidades</h4>
                  <table class="val-table" v-if="detallesVulnerabilidades.length > 0">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Método</th>
                        <th>Tipo Control</th>
                        <th>Riesgo (Ctrl)</th>
                        <th>Eval. (Ctrl)</th>
                        <th>Nivel (Ctrl)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="d in detallesVulnerabilidades" :key="d.catalogoId">
                        <td>{{ getCatalogoLabel(d.tipo, d.catalogoId) }}</td>
                        <td><input v-model="d.metodoTratamiento" type="text" placeholder="Método" style="min-width:100px;" /></td>
                        <td>
                          <select v-model="d.tipoControlId" style="min-width:110px;">
                            <option value="">Seleccionar...</option>
                            <option v-for="tc in catalogData.valTiposControl" :key="tc.id" :value="tc.id">{{ tc.nombre }}</option>
                          </select>
                        </td>
                        <td>
                          <select v-model="d.riesgoControlId" @change="updateControlDetalle(d)" style="min-width:110px;">
                            <option value="">Seleccionar...</option>
                            <option v-for="r in catalogData.valRiesgos" :key="r.id" :value="r.id">{{ r.evaluacion }}</option>
                          </select>
                        </td>
                        <td>
                          <span v-if="d.evaluacionRiesgoControl > 0">{{ d.evaluacionRiesgoControl.toFixed(2) }}</span>
                          <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
                        </td>
                        <td>
                          <span v-if="d.nivelRiesgoControl" class="nivel-badge" :style="{ color: getNivelStyle(d.nivelRiesgoControl).color, background: getNivelStyle(d.nivelRiesgoControl).bg }">
                            {{ getNivelStyle(d.nivelRiesgoControl).label }}
                          </span>
                          <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-else class="chip-empty" style="margin-top:0.5rem;">Sin vulnerabilidades</div>
                </div>
              </div>
            </div>
          </div>

          <div class="val-actions">
            <button type="button" class="btn-cancel" @click="emit('update:modelValue', false)" style="margin-right:1rem;">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="valSaving" style="padding:0.75rem 2rem;font-size:1rem">{{ valSaving ? 'Guardando...' : editId ? 'Actualizar Valoración' : 'Guardar Valoración' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reused styles from valoracion.vue — duplicated here for component isolation */
.val-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.val-modal-content {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.val-modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.val-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--primary);
}

.val-modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.val-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.val-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 1.5rem;
  flex: 1;
}

.val-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
}

.val-card-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
  color: var(--primary);
}

.val-card select {
  width: 100%;
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
}

.val-card select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.val-card select option {
  background: #1e293b;
  color: white;
}

.row-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: white;
  font-family: inherit;
  font-size: 0.8rem;
  box-sizing: border-box;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1rem;
  cursor: pointer;
}

.row-select:focus {
  outline: none;
  border-color: var(--primary);
}

.row-select option {
  background: #1e293b;
  color: white;
}

.val-card input,
.val-card textarea {
  width: 100%;
  padding: 0.75rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.val-card input:focus,
.val-card textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.val-card textarea {
  resize: vertical;
}

.cia-average {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cia-average-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cia-average-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.cia-average-level {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary);
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-height: 280px;
  overflow-y: auto;
}

.chip {
  padding: 0.5rem 0.85rem;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 0.8rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.chip:hover {
  border-color: var(--primary);
  color: var(--text);
}

.chip.selected {
  background: rgba(99, 102, 241, 0.15);
  border-color: var(--primary);
  color: white;
}

.chip-empty {
  font-size: 0.85rem;
  color: var(--text-muted);
  padding: 1rem 0;
}

.val-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.val-table {
  width: 100%;
  border-collapse: collapse;
}

.val-table th,
.val-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.val-table th {
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.val-table td {
  color: var(--text);
  font-size: 0.95rem;
}

.tag-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 0.15rem 0.5rem;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
}

.nivel-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Tabs */
.val-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: rgba(15, 23, 42, 0.4);
  padding: 0 1.5rem;
  gap: 0.25rem;
}

.val-tab {
  padding: 0.85rem 1.25rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  white-space: nowrap;
}

.val-tab:hover {
  color: var(--text);
}

.val-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.val-tab-panel {
  min-height: 200px;
}
</style>
