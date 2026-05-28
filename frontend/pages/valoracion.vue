<script setup lang="ts">
import type { CatalogoItem, ValoracionActivo } from '~/types/api'
import ValoracionModal from '~/components/ValoracionModal.vue'
const valTipoActivo = ref<CatalogoItem[]>([])
const valFormatos = ref<CatalogoItem[]>([])
const valMacroprocesos = ref<CatalogoItem[]>([])
const valSubprocesos = ref<CatalogoItem[]>([])
const valAmenazas = ref<CatalogoItem[]>([])
const valVulnerabilidades = ref<CatalogoItem[]>([])
const valImpactos = ref<CatalogoItem[]>([])
const valFuncionarios = ref<CatalogoItem[]>([])
const valAreas = ref<CatalogoItem[]>([])
const valRiesgos = ref<CatalogoItem[]>([])
const valProbabilidades = ref<CatalogoItem[]>([])
const valTiposControl = ref<CatalogoItem[]>([])
const valLoading = ref(false)

const valForm = ref({
  nombreActivo: '',
  tipoActivo: '',
  formato: '',
  macroProceso: '',
  subProceso: '',
  propietario: '',
  custodio: '',
  descripcion: '',
  controlSeguridad: '',
  ubicacion: '',
  observaciones: '',
  amenazas: [] as number[],
  vulnerabilidades: [] as number[],
  confidencialidad: '',
  integridad: '',
  disponibilidad: '',
  tieneDatosPersonales: false,
})

const analisisForm = ref({
  macroProceso: '',
  nombreActivo: '',
  amenazas: [] as number[],
  vulnerabilidades: [] as number[],
  controlesImplementacion: '',
})

const evaluacionForm = ref({
  probabilidadId: '',
  amenazaRiesgoId: '',
  vulnerabilidadRiesgoId: '',
  controlesArea: '',
})

const tratamientoForm = ref({
  metodoTratamiento: '',
  tipoControl: '',
  controlesImplementar: '',
  nivelAmenazaControl: '',
  nivelVulnerabilidadControl: '',
})

// Sincronizar Pestaña 1 → Pestaña 2 (macroproceso y nombre activo)
watch([() => valForm.value.macroProceso, () => valForm.value.nombreActivo], ([macro, nombre]) => {
  analisisForm.value.macroProceso = macro
  analisisForm.value.nombreActivo = nombre
}, { immediate: true })

const macroProcesoName = computed(() => {
  const id = analisisForm.value.macroProceso
  if (!id) return 'No seleccionado en Pestaña 1'
  const found = valMacroprocesos.value.find((m: any) => m.id === Number(id))
  return found ? found.nombre : `ID #${id}`
})

const subprocesosFiltrados = computed(() => {
  const mpId = valForm.value.macroProceso
  if (!mpId) return []
  return valSubprocesos.value.filter((s: any) => s.macroProcesoId === Number(mpId))
})

// Limpiar subprocess cuando cambia macroproceso
watch(() => valForm.value.macroProceso, () => {
  valForm.value.subProceso = ''
})

const amenazaCategoria = ref('')
const vulnerabilidadCategoria = ref('')
const amenazaSeleccionada = ref('')
const vulnerabilidadSeleccionada = ref('')

const amenazaCategorias = computed(() => {
  const cats = new Set(valAmenazas.value.map((a: any) => a.categoria))
  return Array.from(cats).sort()
})

const vulnerabilidadCategorias = computed(() => {
  const cats = new Set(valVulnerabilidades.value.map((v: any) => v.categoria))
  return Array.from(cats).sort()
})

const amenazasFiltradas = computed(() => {
  if (!amenazaCategoria.value) return []
  return valAmenazas.value.filter((a: any) => a.categoria === amenazaCategoria.value)
})

const vulnerabilidadesFiltradas = computed(() => {
  if (!vulnerabilidadCategoria.value) return []
  return valVulnerabilidades.value.filter((v: any) => v.categoria === vulnerabilidadCategoria.value)
})

const evaluacionRiesgo = computed(() => {
  const impacto = ciaAverage.value
  const amenaza = getValorRiesgo(evaluacionForm.value.amenazaRiesgoId)
  const vulnerabilidad = getValorRiesgo(evaluacionForm.value.vulnerabilidadRiesgoId)
  if (impacto === 0 || !amenaza || !vulnerabilidad) return 0
  return Math.round(impacto * amenaza * vulnerabilidad * 100) / 100
})

const nivelRiesgo = computed(() => {
  const er = evaluacionRiesgo.value
  if (er >= 18) return 'Crítico'
  if (er >= 9) return 'Alto'
  if (er >= 3) return 'Medio'
  return 'Bajo'
})

const evaluacionRiesgoControl = computed(() => {
  const impacto = ciaAverage.value
  const amenaza = getValorRiesgo(tratamientoForm.value.nivelAmenazaControl)
  const vulnerabilidad = getValorRiesgo(tratamientoForm.value.nivelVulnerabilidadControl)
  if (impacto === 0 || !amenaza || !vulnerabilidad) return 0
  return Math.round(impacto * amenaza * vulnerabilidad * 100) / 100
})

const nivelRiesgoControl = computed(() => {
  const er = evaluacionRiesgoControl.value
  if (er >= 18) return 'Crítico'
  if (er >= 9) return 'Alto'
  if (er >= 3) return 'Medio'
  return 'Bajo'
})

interface DetalleRiesgo {
  id?: number
  tipo: string
  catalogoId: number
  riesgoId: string | number
  evaluacionRiesgo: number
  nivelRiesgo: string
  metodoTratamiento: string
  tipoControlId: string | number
  riesgoControlId: string | number
  evaluacionRiesgoControl: number
  nivelRiesgoControl: string
}

const detallesRiesgo = ref<DetalleRiesgo[]>([])

function getCatalogoLabel(tipo: string, catalogoId: number) {
  if (tipo === 'amenaza') {
    const a = valAmenazas.value.find((x: any) => x.id === catalogoId)
    return a ? `${a.categoria} — ${a.nombre}` : `A#${catalogoId}`
  }
  const v = valVulnerabilidades.value.find((x: any) => x.id === catalogoId)
  return v ? `${v.categoria} — ${v.descripcion}` : `V#${catalogoId}`
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

function rebuildDetalles() {
  const existing = detallesRiesgo.value
  const nuevos: DetalleRiesgo[] = []

  analisisForm.value.amenazas.forEach((catalogoId: number) => {
    const prev = existing.find(d => d.tipo === 'amenaza' && d.catalogoId === catalogoId)
    if (prev) {
      nuevos.push(prev)
    } else {
      nuevos.push({
        tipo: 'amenaza',
        catalogoId,
        riesgoId: '',
        evaluacionRiesgo: 0,
        nivelRiesgo: '',
        metodoTratamiento: '',
        tipoControlId: '',
        riesgoControlId: '',
        evaluacionRiesgoControl: 0,
        nivelRiesgoControl: '',
      })
    }
  })

  analisisForm.value.vulnerabilidades.forEach((catalogoId: number) => {
    const prev = existing.find(d => d.tipo === 'vulnerabilidad' && d.catalogoId === catalogoId)
    if (prev) {
      nuevos.push(prev)
    } else {
      nuevos.push({
        tipo: 'vulnerabilidad',
        catalogoId,
        riesgoId: '',
        evaluacionRiesgo: 0,
        nivelRiesgo: '',
        metodoTratamiento: '',
        tipoControlId: '',
        riesgoControlId: '',
        evaluacionRiesgoControl: 0,
        nivelRiesgoControl: '',
      })
    }
  })

  detallesRiesgo.value = nuevos
}

function recalcAllEvaluaciones() {
  const globalAmenazaId = evaluacionForm.value.amenazaRiesgoId
  const globalVulnerabilidadId = evaluacionForm.value.vulnerabilidadRiesgoId
  detallesRiesgo.value.forEach(d => {
    if (d.tipo === 'amenaza') {
      d.evaluacionRiesgo = calcularEvaluacionRiesgo(d.riesgoId, globalVulnerabilidadId)
    } else {
      d.evaluacionRiesgo = calcularEvaluacionRiesgo(globalAmenazaId, d.riesgoId)
    }
    d.nivelRiesgo = calcularNivelRiesgo(d.evaluacionRiesgo)
  })
}

function updateEvaluacionDetalle(_d?: DetalleRiesgo) {
  recalcAllEvaluaciones()
}

function updateControlDetalle(d: DetalleRiesgo) {
  d.evaluacionRiesgoControl = calcularEvaluacionRiesgo(d.riesgoControlId, evaluacionForm.value.vulnerabilidadRiesgoId)
  d.nivelRiesgoControl = calcularNivelRiesgo(d.evaluacionRiesgoControl)
}

const detallesAmenazas = computed(() => detallesRiesgo.value.filter(d => d.tipo === 'amenaza'))
const detallesVulnerabilidades = computed(() => detallesRiesgo.value.filter(d => d.tipo === 'vulnerabilidad'))

const { fetchCatalog } = useCatalog()

const loadValoracionData = async () => {
  valLoading.value = true
  const tipos = ['tipos-activo', 'formatos', 'macroprocesos', 'subprocesos', 'amenazas', 'vulnerabilidades', 'impactos', 'funcionarios', 'areas', 'riesgos', 'probabilidades', 'tipos-control']
  try {
    const results = await Promise.all(tipos.map(t => fetchCatalog(t)))
    valTipoActivo.value = results[0]
    valFormatos.value = results[1]
    valMacroprocesos.value = results[2]
    valSubprocesos.value = results[3]
    valAmenazas.value = results[4]
    valVulnerabilidades.value = results[5]
    valImpactos.value = results[6]
    valFuncionarios.value = results[7]
    valAreas.value = results[8]
    valRiesgos.value = results[9]
    valProbabilidades.value = results[10]
    valTiposControl.value = results[11]
  } catch (e) {
    console.error('Error cargando datos de valoración', e)
  } finally {
    valLoading.value = false
  }
}

function getNivelesImpacto(tipo: string) {
  return valImpactos.value.filter((i: any) => i.tipo === tipo)
}

function getValorImpacto(id: string | number) {
  if (!id) return 0
  const found = valImpactos.value.find((i: any) => i.id === Number(id))
  return found ? found.valor : 0
}

const ciaAverage = computed(() => {
  const c = getValorImpacto(valForm.value.confidencialidad)
  const i = getValorImpacto(valForm.value.integridad)
  const d = getValorImpacto(valForm.value.disponibilidad)
  const selected = [c, i, d].filter(v => v > 0)
  if (selected.length === 0) return 0
  return Math.round((selected.reduce((a, b) => a + b, 0) / selected.length) * 100) / 100
})

function calculateRowCiaAverage(v: any) {
  const c = getValorImpacto(v.confidencialidadId)
  const i = getValorImpacto(v.integridadId)
  const d = getValorImpacto(v.disponibilidadId)
  const selected = [c, i, d].filter(val => val > 0)
  if (selected.length === 0) return 0
  return Math.round((selected.reduce((a, b) => a + b, 0) / selected.length) * 100) / 100
}

function getCiaLevel(avg: number) {
  if (avg >= 2.5) return 'Alto'
  if (avg >= 1.5) return 'Medio'
  return 'Bajo'
}

function getValorRiesgo(id: string | number) {
  if (!id) return 0
  const found = valRiesgos.value.find((r: any) => r.id === Number(id))
  return found ? (found.valor || 0) : 0
}

function calculateEvaluacionRiesgo(v: any) {
  const impacto = calculateRowCiaAverage(v)
  const amenaza = getValorRiesgo(v.amenazaRiesgoId)
  const vulnerabilidad = getValorRiesgo(v.vulnerabilidadRiesgoId)
  if (impacto === 0 || !amenaza || !vulnerabilidad) return 0
  return Math.round(impacto * amenaza * vulnerabilidad * 100) / 100
}

const riesgosAmenaza = computed(() => {
  return valRiesgos.value.filter((r: any) => r.valor && r.evaluacion?.toLowerCase().includes('amenaza'))
})

const riesgosVulnerabilidad = computed(() => {
  return valRiesgos.value.filter((r: any) => r.valor && r.evaluacion?.toLowerCase().includes('vulnerabilidad'))
})

const valSaved = ref<ValoracionActivo[]>([])
const valSaving = ref(false)
const valSuccess = ref('')
const valEditId = ref<number | null>(null)
const showModalVal = ref(false)
const showViewModal = ref(false)
const viewItem = ref<ValoracionActivo | null>(null)
const activeTab = ref(0)

const tabs = [
  { label: 'Valoración de Activo' },
  { label: 'Análisis de Riesgos' },
  { label: 'Evaluación de Riesgo' },
  { label: 'Tratamiento de Riesgo' },
]

// ── CatalogData bundle for ValoracionModal ────────────────────────────────────
const catalogData = computed(() => ({
  valTipoActivo: valTipoActivo.value,
  valFormatos: valFormatos.value,
  valMacroprocesos: valMacroprocesos.value,
  valSubprocesos: valSubprocesos.value,
  valAmenazas: valAmenazas.value,
  valVulnerabilidades: valVulnerabilidades.value,
  valImpactos: valImpactos.value,
  valFuncionarios: valFuncionarios.value,
  valAreas: valAreas.value,
  valRiesgos: valRiesgos.value,
  valProbabilidades: valProbabilidades.value,
  valTiposControl: valTiposControl.value,
}))

async function loadValoraciones() {
  try {
    const { apiFetch } = useApi()
    valSaved.value = await apiFetch<ValoracionActivo[]>('/valoraciones')
  } catch { /* ignore */ }
}

async function submitValoracion() {
  valSaving.value = true
  valSuccess.value = ''
  try {
    const f = valForm.value
    const a = analisisForm.value
    const e = evaluacionForm.value
    const t = tratamientoForm.value

    if (!f.nombreActivo || !f.tipoActivo || !f.formato || !f.macroProceso || !f.subProceso || !f.propietario || !f.custodio || !f.descripcion || !f.controlSeguridad || !f.ubicacion || !f.confidencialidad || !f.integridad || !f.disponibilidad) {
      alert('Complete todos los campos obligatorios de Valoracion de Activo (Pestana 1).')
      return
    }

    const detallesPayload = detallesRiesgo.value.map((d) => ({
      id: d.id || undefined,
      tipo: d.tipo,
      catalogoId: Number(d.catalogoId),
      riesgoId: d.riesgoId ? Number(d.riesgoId) : null,
      evaluacionRiesgo: d.evaluacionRiesgo > 0 ? d.evaluacionRiesgo : null,
      nivelRiesgo: d.nivelRiesgo || null,
      metodoTratamiento: d.metodoTratamiento || null,
      tipoControlId: d.tipoControlId ? Number(d.tipoControlId) : null,
      riesgoControlId: d.riesgoControlId ? Number(d.riesgoControlId) : null,
      evaluacionRiesgoControl: d.evaluacionRiesgoControl > 0 ? d.evaluacionRiesgoControl : null,
      nivelRiesgoControl: d.nivelRiesgoControl || null,
    }))

    const body = {
      nombreActivo: f.nombreActivo,
      tipoActivoId: Number(f.tipoActivo),
      formatoId: Number(f.formato),
      macroProcesoId: Number(f.macroProceso),
      subProcesoId: Number(f.subProceso),
      propietarioId: Number(f.propietario),
      custodioId: Number(f.custodio),
      descripcion: f.descripcion,
      controlSeguridad: f.controlSeguridad,
      ubicacion: f.ubicacion,
      observaciones: f.observaciones,
      confidencialidadId: Number(f.confidencialidad),
      integridadId: Number(f.integridad),
      disponibilidadId: Number(f.disponibilidad),
      tieneDatosPersonales: Boolean(f.tieneDatosPersonales),
      amenazas: a.amenazas.length > 0 ? JSON.stringify(a.amenazas) : null,
      vulnerabilidades: a.vulnerabilidades.length > 0 ? JSON.stringify(a.vulnerabilidades) : null,
      controlesImplementacion: a.controlesImplementacion || null,
      impacto: ciaAverage.value || null,
      controlesArea: e.controlesArea || null,
      amenazaRiesgoId: e.amenazaRiesgoId ? Number(e.amenazaRiesgoId) : null,
      vulnerabilidadRiesgoId: e.vulnerabilidadRiesgoId ? Number(e.vulnerabilidadRiesgoId) : null,
      metodoTratamiento: t.metodoTratamiento || null,
      tipoControl: t.tipoControl ? Number(t.tipoControl) : null,
      controlesImplementar: t.controlesImplementar || null,
      detallesRiesgo: detallesPayload,
    }

    const { apiFetch } = useApi()
    const url = valEditId.value
      ? `/valoraciones/${valEditId.value}`
      : '/valoraciones'
    const method = valEditId.value ? 'PATCH' : 'POST'
    await apiFetch(url, { method, body: JSON.stringify(body) })

    valSuccess.value = valEditId.value ? 'Valoracion actualizada' : 'Valoracion guardada'
    showModalVal.value = false
    resetForm()
    await loadValoraciones()
  } catch (e: any) {
    alert('Error: ' + e.message)
  } finally {
    valSaving.value = false
  }
}

function editValoracion(item: any) {
  showModalVal.value = true
  activeTab.value = 0
  valEditId.value = item.id
  valForm.value = {
    nombreActivo: item.nombreActivo,
    tipoActivo: item.tipoActivoId,
    formato: item.formatoId,
    macroProceso: item.macroProcesoId,
    subProceso: item.subProcesoId,
    propietario: item.propietarioId,
    custodio: item.custodioId,
    descripcion: item.descripcion,
    controlSeguridad: item.controlSeguridad,
    ubicacion: item.ubicacion,
    observaciones: item.observaciones || '',
    amenazas: [],
    vulnerabilidades: [],
    confidencialidad: item.confidencialidadId,
    integridad: item.integridadId,
    disponibilidad: item.disponibilidadId,
    tieneDatosPersonales: item.tieneDatosPersonales || false,
  }

  // Cargar datos de Análisis de Riesgo (pestañas 2-4) si existen
  if (item.amenazas || item.vulnerabilidades) {
    analisisForm.value = {
      macroProceso: String(item.macroProcesoId || ''),
      nombreActivo: item.nombreActivo || '',
      amenazas: safeJsonParse(item.amenazas),
      vulnerabilidades: safeJsonParse(item.vulnerabilidades),
      controlesImplementacion: item.controlesImplementacion || '',
    }
    evaluacionForm.value = {
      probabilidadId: String(item.probabilidadId || ''),
      amenazaRiesgoId: String(item.amenazaRiesgoId || ''),
      vulnerabilidadRiesgoId: String(item.vulnerabilidadRiesgoId || ''),
      controlesArea: item.controlesArea || '',
    }
  }

  if (item.detallesRiesgo && Array.isArray(item.detallesRiesgo)) {
    detallesRiesgo.value = item.detallesRiesgo.map((d: any) => ({
      id: d.id,
      tipo: d.tipo,
      catalogoId: Number(d.catalogoId),
      riesgoId: d.riesgoId ? String(d.riesgoId) : '',
      evaluacionRiesgo: d.evaluacionRiesgo || 0,
      nivelRiesgo: d.nivelRiesgo || '',
      metodoTratamiento: d.metodoTratamiento || '',
      tipoControlId: d.tipoControlId ? String(d.tipoControlId) : '',
      riesgoControlId: d.riesgoControlId ? String(d.riesgoControlId) : '',
      evaluacionRiesgoControl: d.evaluacionRiesgoControl || 0,
      nivelRiesgoControl: d.nivelRiesgoControl || '',
    }))
  } else {
    detallesRiesgo.value = []
  }
}

async function viewValoracion(item: any) {
  const { apiFetch } = useApi()
  const enriched = await apiFetch<ValoracionActivo>(`/valoraciones/${item.id}`)
  viewItem.value = enriched
  showViewModal.value = true
}

async function deleteValoracion(id: number) {
  if (!confirm('¿Eliminar esta valoración?')) return
  try {
    const { apiFetch } = useApi()
    await apiFetch(`/valoraciones/${id}`, { method: 'DELETE' })
    await loadValoraciones()
  } catch { /* ignore */ }
}

function openNewValoracion() {
  resetForm()
  activeTab.value = 0
  showModalVal.value = true
}

function resetForm() {
  valEditId.value = null
  valForm.value = {
    nombreActivo: '', tipoActivo: '', formato: '', macroProceso: '', subProceso: '',
    propietario: '', custodio: '',
    descripcion: '', controlSeguridad: '', ubicacion: '', observaciones: '',
    amenazas: [], vulnerabilidades: [],
    confidencialidad: '', integridad: '', disponibilidad: '',
    tieneDatosPersonales: false,
  }
  analisisForm.value = {
    macroProceso: '', nombreActivo: '', amenazas: [], vulnerabilidades: [], controlesImplementacion: '',
  }
  evaluacionForm.value = {
    probabilidadId: '',
    amenazaRiesgoId: '',
    vulnerabilidadRiesgoId: '',
    controlesArea: '',
  }
  detallesRiesgo.value = []
  tratamientoForm.value = {
    metodoTratamiento: '', tipoControl: '', controlesImplementar: '', nivelAmenazaControl: '', nivelVulnerabilidadControl: '',
  }
  amenazaCategoria.value = ''
  vulnerabilidadCategoria.value = ''
  amenazaSeleccionada.value = '';
  vulnerabilidadSeleccionada.value = '';
}

function toggleAmenaza(id: number) {
  const idx = valForm.value.amenazas.indexOf(id)
  if (idx >= 0) valForm.value.amenazas.splice(idx, 1)
  else valForm.value.amenazas.push(id)
}

function toggleVulnerabilidad(id: number) {
  const idx = valForm.value.vulnerabilidades.indexOf(id)
  if (idx >= 0) valForm.value.vulnerabilidades.splice(idx, 1)
  else valForm.value.vulnerabilidades.push(id)
}

function agregarAmenaza() {
  const id = Number(amenazaSeleccionada.value)
  if (!id) return
  if (!analisisForm.value.amenazas.includes(id)) {
    analisisForm.value.amenazas.push(id)
  }
  amenazaSeleccionada.value = ''
  rebuildDetalles()
}

function quitarAmenaza(id: number) {
  const idx = analisisForm.value.amenazas.indexOf(id)
  if (idx >= 0) analisisForm.value.amenazas.splice(idx, 1)
  rebuildDetalles()
}

function agregarVulnerabilidad() {
  const id = Number(vulnerabilidadSeleccionada.value)
  if (!id) return
  if (!analisisForm.value.vulnerabilidades.includes(id)) {
    analisisForm.value.vulnerabilidades.push(id)
  }
  vulnerabilidadSeleccionada.value = ''
  rebuildDetalles()
}

function quitarVulnerabilidad(id: number) {
  const idx = analisisForm.value.vulnerabilidades.indexOf(id)
  if (idx >= 0) analisisForm.value.vulnerabilidades.splice(idx, 1)
  rebuildDetalles()
}

function safeJsonParse(str: string | null, fallback: any[] = []): any[] {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

function countFromJson(str: string | null): number {
  if (!str) return 0
  try { const arr = JSON.parse(str); return Array.isArray(arr) ? arr.length : 0 } catch { return 0 }
}

function getTipoControlName(id: number | string) {
  if (!id) return '—'
  const found = valTiposControl.value.find((tc: any) => tc.id === Number(id))
  return found ? found.nombre : `TC#${id}`
}

function getRiesgoEvaluacion(id: number | string) {
  if (!id) return '—'
  const found = valRiesgos.value.find((r: any) => r.id === Number(id))
  return found ? found.evaluacion : `R#${id}`
}

function getNivelStyle(nivel: string) {
  const n = (nivel || '').toLowerCase()
  if (n.includes('critico')) return { label: 'Critico', color: '#dc2626', bg: 'rgba(220,38,38,0.15)' }
  if (n.includes('alto')) return { label: 'Alto', color: '#ea580c', bg: 'rgba(234,88,12,0.15)' }
  if (n.includes('medio')) return { label: 'Medio', color: '#ca8a04', bg: 'rgba(202,138,4,0.15)' }
  return { label: 'Bajo', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' }
}

function getMaxNivelIndex(nivel: string) {
  const n = (nivel || '').toLowerCase()
  if (n.includes('critico')) return 4
  if (n.includes('alto')) return 3
  if (n.includes('medio')) return 2
  return 1
}

function getNivelFromIndex(idx: number) {
  if (idx >= 4) return 'Crítico'
  if (idx >= 3) return 'Alto'
  if (idx >= 2) return 'Medio'
  return 'Bajo'
}

function resumenEvaluacionRiesgo(v: any) {
  const detalles = v.detallesRiesgo || []
  if (detalles.length === 0) {
    return { evaluacion: v.evaluacionRiesgo || 0, nivel: v.nivelRiesgo || '' }
  }
  const conEval = detalles.filter((d: any) => d.evaluacionRiesgo > 0)
  const avg = conEval.length > 0
    ? Math.round((conEval.reduce((sum: number, d: any) => sum + d.evaluacionRiesgo, 0) / conEval.length) * 100) / 100
    : 0
  const maxNivel = conEval.reduce((max: number, d: any) => Math.max(max, getMaxNivelIndex(d.nivelRiesgo)), 0)
  return { evaluacion: avg, nivel: maxNivel > 0 ? getNivelFromIndex(maxNivel) : '' }
}

function resumenControl(v: any) {
  const detalles = v.detallesRiesgo || []
  if (detalles.length === 0) {
    return {
      tipoControl: v.tipoControl?.nombre || (v.tipoControl ? getTipoControlName(v.tipoControl) : '—'),
      evaluacion: v.evaluacionRiesgoControl || 0,
      nivel: v.nivelRiesgoControl || '',
    }
  }
  const conEval = detalles.filter((d: any) => d.evaluacionRiesgoControl > 0)
  const avg = conEval.length > 0
    ? Math.round((conEval.reduce((sum: number, d: any) => sum + d.evaluacionRiesgoControl, 0) / conEval.length) * 100) / 100
    : 0
  const maxNivel = conEval.reduce((max: number, d: any) => Math.max(max, getMaxNivelIndex(d.nivelRiesgoControl)), 0)
  const tipos = new Set(detalles.filter((d: any) => d.tipoControlId).map((d: any) => getTipoControlName(d.tipoControlId)))
  const tipoControl = tipos.size > 1 ? 'Múltiple' : (Array.from(tipos)[0] || '—')
  return { tipoControl, evaluacion: avg, nivel: maxNivel > 0 ? getNivelFromIndex(maxNivel) : '' }
}

function getAmenazaLabel(id: number) {
  const a = valAmenazas.value.find((x: any) => x.id === id)
  return a ? `${a.categoria} — ${a.nombre}` : `A#${id}`
}

function getVulnerabilidadLabel(id: number) {
  const v = valVulnerabilidades.value.find((x: any) => x.id === id)
  return v ? `${v.categoria} — ${v.descripcion}` : `V#${id}`
}

onMounted(() => {
  loadValoracionData()
  loadValoraciones()
})
</script>

<template>
  <div class="valoracion-section">
    <div class="welcome-banner" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
      <div>
        <h2>Valoración de Activos</h2>
        <p>Gestione las valoraciones de activos de información registradas en el sistema.</p>
      </div>
      <button type="button" class="btn-primary" @click="openNewValoracion" style="padding: 0.75rem 1.5rem; font-size: 1rem;">Nueva Valoración</button>
    </div>
    
    <div v-if="valLoading" class="catalogo-placeholder">Cargando datos de catálogos...</div>
    <template v-else>
      <div v-if="valSuccess" class="val-success">{{ valSuccess }}</div>

      <!-- MAIN CONTENT: TABLE -->
      <div class="val-card" style="padding:0; overflow:hidden;">
        <div v-if="valSaved.length === 0" class="val-empty-state">No hay valoraciones guardadas.</div>
        <table v-else class="val-table">
          <thead>
            <tr>
              <th>Nombre de Activo</th>
              <th>Macroproceso</th>
              <th>Valoración CIA</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in valSaved" :key="v.id">
              <td>{{ v.nombreActivo || 'N/A' }}</td>
              <td>{{ v.macroProceso?.nombre || `MP#${v.macroProcesoId}` }}</td>
              <td>
                <span class="cia-average-level" style="display:inline-block;" v-if="calculateRowCiaAverage(v) > 0">
                  {{ calculateRowCiaAverage(v).toFixed(2) }} — {{ getCiaLevel(calculateRowCiaAverage(v)) }}
                </span>
                <span v-else style="color:var(--text-muted); font-size:0.85rem;">Pendiente</span>
              </td>
              <td class="val-table-actions">
                <button class="btn-icon btn-view" title="Ver" @click="viewValoracion(v)"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                <button class="btn-icon btn-edit" title="Editar" @click="editValoracion(v)"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg></button>
                <button class="btn-icon btn-delete" title="Eliminar" @click="deleteValoracion(v.id)"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- RISK ANALYSIS TABLE -->
      <div v-if="valSaved.length > 0" class="val-card" style="padding:0; overflow:hidden; margin-top:1.5rem;">
        <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--border); background:rgba(99,102,241,0.05);">
          <h3 style="margin:0; font-size:1rem; color:var(--primary);">Análisis, Evaluación y Tratamiento de Riesgo</h3>
        </div>
        <table class="val-table">
          <thead>
            <tr>
              <th>Macroproceso</th>
              <th>Nombre de Activo</th>
              <th>Valoración CIA</th>
              <th>Cálculo de Evaluación de Riesgo</th>
              <th>Nivel de Riesgo</th>
              <th>Tipo de Control</th>
              <th>Evaluación de Riesgo con Control</th>
              <th>Nivel con Control</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in valSaved" :key="v.id">
              <td>{{ v.macroProceso?.nombre || `MP#${v.macroProcesoId}` }}</td>
              <td>{{ v.nombreActivo || 'N/A' }}</td>
              <td>
                <span v-if="calculateRowCiaAverage(v) > 0" class="cia-average-level" style="display:inline-block;">
                  {{ calculateRowCiaAverage(v).toFixed(2) }} — {{ getCiaLevel(calculateRowCiaAverage(v)) }}
                </span>
                <span v-else style="color:var(--text-muted); font-size:0.85rem;">Pendiente</span>
              </td>
              <td>
                <span v-if="resumenEvaluacionRiesgo(v).evaluacion > 0">{{ resumenEvaluacionRiesgo(v).evaluacion.toFixed(2) }}</span>
                <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
              </td>
              <td>
                <span v-if="resumenEvaluacionRiesgo(v).nivel" class="nivel-badge" :style="{ color: getNivelStyle(resumenEvaluacionRiesgo(v).nivel).color, background: getNivelStyle(resumenEvaluacionRiesgo(v).nivel).bg }">
                  {{ getNivelStyle(resumenEvaluacionRiesgo(v).nivel).label }}
                </span>
                <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
              </td>
              <td>{{ resumenControl(v).tipoControl }}</td>
              <td>
                <span v-if="resumenControl(v).evaluacion > 0">{{ resumenControl(v).evaluacion.toFixed(2) }}</span>
                <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
              </td>
              <td>
                <span v-if="resumenControl(v).nivel" class="nivel-badge" :style="{ color: getNivelStyle(resumenControl(v).nivel).color, background: getNivelStyle(resumenControl(v).nivel).bg }">
                  {{ getNivelStyle(resumenControl(v).nivel).label }}
                </span>
                <span v-else style="color:var(--text-muted); font-size:0.85rem;">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MODAL: ValoracionModal.vue -->
      <ValoracionModal
        v-model="showModalVal"
        :edit-id="valEditId"
        :catalog-data="catalogData"
        :val-form="valForm"
        :analisis-form="analisisForm"
        :evaluacion-form="evaluacionForm"
        :tratamiento-form="tratamientoForm"
        :detalles-riesgo="detallesRiesgo"
        :active-tab="activeTab"
        :val-saving="valSaving"
        @update:model-value="showModalVal = $event"
        @submit="submitValoracion"
        @tab-change="activeTab = $event"
        @reset-form="rebuildDetalles"
      />

      <!-- VIEW MODAL -->
      <div v-if="showViewModal && viewItem" class="val-modal-overlay" @click.self="showViewModal = false">
        <div class="val-modal-content" style="max-width: 700px;">
          <div class="val-modal-header">
            <h3>Detalle de Valoración #{{ viewItem.id }}</h3>
            <button class="btn-icon" @click="showViewModal = false" title="Cerrar">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div class="val-modal-body">
            <div class="val-grid" style="grid-template-columns: 1fr 1fr;">
              <div class="val-card" style="border:none; padding:0; background:transparent;">
                <h3 class="val-card-title">Información del Activo</h3>
                <div class="view-field"><span class="view-label">Nombre:</span> <span class="view-value">{{ viewItem.nombreActivo || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">Tipo:</span> <span class="view-value">{{ viewItem.tipoActivo?.nombre || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">Formato:</span> <span class="view-value">{{ viewItem.formato?.nombre || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">MacroProceso:</span> <span class="view-value">{{ viewItem.macroProceso?.nombre || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">Subproceso:</span> <span class="view-value">{{ viewItem.subProceso?.nombre || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">Propietario:</span> <span class="view-value">{{ viewItem.propietario?.nombre || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">Custodio:</span> <span class="view-value">{{ viewItem.custodio?.nombre || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">Ubicación:</span> <span class="view-value">{{ viewItem.ubicacion || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">Datos Personales:</span> <span class="view-value">{{ viewItem.tieneDatosPersonales ? 'SÍ' : 'NO' }}</span></div>
              </div>
              <div class="val-card" style="border:none; padding:0; background:transparent;">
                <h3 class="val-card-title">Valoración CIA</h3>
                <div class="view-field"><span class="view-label">Confidencialidad:</span> <span class="view-value">{{ viewItem.confidencialidad?.nivel || 'N/A' }} ({{ viewItem.confidencialidad?.valor || '-' }})</span></div>
                <div class="view-field"><span class="view-label">Integridad:</span> <span class="view-value">{{ viewItem.integridad?.nivel || 'N/A' }} ({{ viewItem.integridad?.valor || '-' }})</span></div>
                <div class="view-field"><span class="view-label">Disponibilidad:</span> <span class="view-value">{{ viewItem.disponibilidad?.nivel || 'N/A' }} ({{ viewItem.disponibilidad?.valor || '-' }})</span></div>
                <div class="view-field"><span class="view-label">Promedio CIA:</span>
                  <span class="view-value" v-if="calculateRowCiaAverage(viewItem) > 0">
                    <span class="cia-average-level" style="display:inline-block;">{{ calculateRowCiaAverage(viewItem).toFixed(2) }} — {{ getCiaLevel(calculateRowCiaAverage(viewItem)) }}</span>
                  </span>
                  <span class="view-value" v-else>Pendiente</span>
                </div>
                <div class="view-field"><span class="view-label">Descripción:</span> <span class="view-value">{{ viewItem.descripcion || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">Controles:</span> <span class="view-value">{{ viewItem.controlSeguridad || 'N/A' }}</span></div>
                <div class="view-field"><span class="view-label">Observaciones:</span> <span class="view-value">{{ viewItem.observaciones || 'N/A' }}</span></div>
              </div>
            </div>

            <!-- Tab 2: Análisis de Riesgos -->
            <div v-if="viewItem.amenazas || viewItem.vulnerabilidades" class="val-card" style="border:none; padding:0; background:transparent; margin-top:1.5rem;">
              <h3 class="val-card-title">Análisis de Riesgos</h3>
              <div class="view-field"><span class="view-label">Amenazas:</span> <span class="view-value">{{ safeJsonParse(viewItem.amenazas ?? null, []).length }} seleccionadas</span></div>
              <div class="view-field"><span class="view-label">Vulnerabilidades:</span> <span class="view-value">{{ safeJsonParse(viewItem.vulnerabilidades ?? null, []).length }} seleccionadas</span></div>
              <div class="view-field" v-if="viewItem.controlesImplementacion"><span class="view-label">Controles de Implementación:</span> <span class="view-value">{{ viewItem.controlesImplementacion }}</span></div>
            </div>

            <!-- Tab 3: Evaluación de Riesgo -->
            <div v-if="viewItem.detallesRiesgo && viewItem.detallesRiesgo.length > 0" class="val-card" style="border:none; padding:0; background:transparent; margin-top:1.5rem;">
              <h3 class="val-card-title">Evaluación de Riesgos</h3>
              <table class="val-table" style="margin-top:0.75rem;">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Item</th>
                    <th>Evaluación</th>
                    <th>Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in viewItem.detallesRiesgo" :key="d.id">
                    <td><span class="tag-count">{{ d.tipo === 'amenaza' ? 'A' : 'V' }}</span></td>
                    <td>{{ getCatalogoLabel(d.tipo, d.catalogoId) }}</td>
                    <td>{{ (d.evaluacionRiesgo ?? 0) > 0 ? (d.evaluacionRiesgo ?? 0).toFixed(2) : '—' }}</td>
                    <td>
                      <span v-if="d.nivelRiesgo" class="nivel-badge" :style="{ color: getNivelStyle(d.nivelRiesgo).color, background: getNivelStyle(d.nivelRiesgo).bg }">
                        {{ getNivelStyle(d.nivelRiesgo).label }}
                      </span>
                      <span v-else>—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Tab 4: Tratamiento de Riesgo -->
            <div v-if="viewItem.metodoTratamiento || viewItem.tipoControl || (viewItem.detallesRiesgo && viewItem.detallesRiesgo.some(d => d.metodoTratamiento || d.tipoControlId))" class="val-card" style="border:none; padding:0; background:transparent; margin-top:1.5rem;">
              <h3 class="val-card-title">Tratamiento de Riesgo</h3>
              <div v-if="viewItem.metodoTratamiento" class="view-field"><span class="view-label">Método:</span> <span class="view-value">{{ viewItem.metodoTratamiento }}</span></div>
              <div v-if="viewItem.tipoControl" class="view-field"><span class="view-label">Tipo de Control:</span> <span class="view-value">{{ viewItem.tipoControl?.nombre || getTipoControlName(viewItem.tipoControl) }}</span></div>
              <div v-if="viewItem.controlesImplementar" class="view-field"><span class="view-label">Controles a Implementar:</span> <span class="view-value">{{ viewItem.controlesImplementar }}</span></div>
              <div v-if="viewItem.detallesRiesgo && viewItem.detallesRiesgo.some(d => d.metodoTratamiento || d.tipoControlId)" style="margin-top:1rem;">
                <h4 style="font-size:0.9rem; color:var(--text-muted); margin:0 0 0.75rem 0;">Controles por Item</h4>
                <table class="val-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Método</th>
                      <th>Tipo Control</th>
                      <th>Eval. Control</th>
                      <th>Nivel Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="d in viewItem.detallesRiesgo.filter(d => d.metodoTratamiento || d.tipoControlId)" :key="d.id">
                      <td>{{ getCatalogoLabel(d.tipo, d.catalogoId) }}</td>
                      <td>{{ d.metodoTratamiento || '—' }}</td>
                      <td>{{ d.tipoControlId ? getTipoControlName(d.tipoControlId) : '—' }}</td>
                      <td>{{ (d.evaluacionRiesgoControl ?? 0) > 0 ? (d.evaluacionRiesgoControl ?? 0).toFixed(2) : '—' }}</td>
                      <td>
                        <span v-if="d.nivelRiesgoControl" class="nivel-badge" :style="{ color: getNivelStyle(d.nivelRiesgoControl).color, background: getNivelStyle(d.nivelRiesgoControl).bg }">
                          {{ getNivelStyle(d.nivelRiesgoControl).label }}
                        </span>
                        <span v-else>—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="val-actions" style="margin-top:1.5rem;">
              <button type="button" class="btn-cancel" @click="showViewModal = false">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </template>
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

.valoracion-section {
  height: 100%;
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

.val-success {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.val-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

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
}

.val-empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: 3rem 0;
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

.val-table tbody tr {
  transition: background-color 0.2s ease;
}

.val-table tbody tr:hover {
  background-color: rgba(99, 102, 241, 0.05);
}

.val-table-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.val-table-actions .btn-icon {
  width: 32px;
  height: 32px;
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

.val-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--text-muted);
  font-size: 0.95rem;
}

/* View modal styles */
.view-field {
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.view-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
  display: block;
  margin-bottom: 0.15rem;
}

.view-value {
  font-size: 0.95rem;
  color: var(--text);
}

.btn-view {
  color: #38bdf8;
}

.btn-view:hover {
  background: rgba(56, 189, 248, 0.1);
  color: #7dd3fc;
}
</style>
