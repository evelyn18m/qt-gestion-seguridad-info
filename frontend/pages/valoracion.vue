<script lang="ts" setup>
import type {CatalogoItem, ControlesImplementarItem, DetalleRiesgo, ValoracionActivo} from '~/types/api'
import {SessionExpiredError} from '~/composables/useApi'
import SessionWarning from '~/components/SessionWarning.vue'
import ValoracionModal from '~/components/ValoracionModal.vue'
import ValoracionViewModal from '~/components/ValoracionViewModal.vue'

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
const valControlesImplementar = ref<ControlesImplementarItem[]>([])
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
const amenazaCategoria = ref('')
const vulnerabilidadCategoria = ref('')
const amenazaSeleccionada = ref('')
const vulnerabilidadSeleccionada = ref('')
const detallesRiesgo = ref<DetalleRiesgo[]>([])

const ciaAverage = computed(() => {
  const c = getValorImpacto(valForm.value.confidencialidad)
  const i = getValorImpacto(valForm.value.integridad)
  const d = getValorImpacto(valForm.value.disponibilidad)
  const selected = [c, i, d].filter(v => v && v > 0)
  if (selected.length === 0) return 0
  return Math.round((selected.reduce((a, b) => a + b, 0) / selected.length) * 100) / 100
})

const {fetchCatalog} = useCatalog()
const {login} = useAuth()
const {secondsRemaining, isWarning, isExpired, isRefreshing, refreshSession} = useSession()
const showSessionExpired = ref(false)

async function handleRefreshSession() {
    try {
        await refreshSession()
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'No se pudo refrescar la sesión'
        alert(message)
        showSessionExpired.value = true
    }
}

// Sincronizar Pestaña 1 → Pestaña 2 (macroproceso y nombre activo)
watch([() => valForm.value.macroProceso, () => valForm.value.nombreActivo], ([macro, nombre]) => {
  analisisForm.value.macroProceso = macro
  analisisForm.value.nombreActivo = nombre
}, {immediate: true})


// Limpiar subprocess cuando cambia macroproceso
watch(() => valForm.value.macroProceso, () => {
  valForm.value.subProceso = ''
})

function getCatalogoLabel(tipo: string, catalogoId: number) {
  if (tipo === 'amenaza') {
    const a = valAmenazas.value.find((x: CatalogoItem) => x.id === catalogoId)
    return a ? `${a.categoria} — ${a.nombre}` : `A#${catalogoId}`
  }
  const v = valVulnerabilidades.value.find((x: CatalogoItem) => x.id === catalogoId)
  return v ? `${v.categoria} — ${v.descripcion}` : `V#${catalogoId}`
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
        amenazaIds: [String(catalogoId)],
        vulnerabilidadIds: [],
        controlesImplementados: '',
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
        amenazaIds: [],
        vulnerabilidadIds: [String(catalogoId)],
        controlesImplementados: '',
      })
    }
  })

  detallesRiesgo.value = nuevos
}

const loadValoracionData = async () => {
  valLoading.value = true
  const tipos = ['tipos-activo', 'formatos', 'macroprocesos', 'subprocesos', 'amenazas', 'vulnerabilidades', 'impactos', 'funcionarios', 'areas', 'riesgos', 'probabilidades', 'tipos-control']
  try {
    const {apiFetch} = useApi()
    const [results, controlesItems] = await Promise.all([
      Promise.all(tipos.map(t => fetchCatalog(t))),
      apiFetch<ControlesImplementarItem[]>('/catalogos/controles-implementar').catch(() => [] as ControlesImplementarItem[]),
    ])
    valTipoActivo.value = results[0] as CatalogoItem[]
    valFormatos.value = results[1] as CatalogoItem[]
    valMacroprocesos.value = results[2] as CatalogoItem[]
    valSubprocesos.value = results[3] as CatalogoItem[]
    valAmenazas.value = results[4] as CatalogoItem[]
    valVulnerabilidades.value = results[5] as CatalogoItem[]
    valImpactos.value = results[6] as CatalogoItem[]
    valFuncionarios.value = results[7] as CatalogoItem[]
    valAreas.value = results[8] as CatalogoItem[]
    valRiesgos.value = results[9] as CatalogoItem[]
    valProbabilidades.value = results[10] as CatalogoItem[]
    valTiposControl.value = results[11] as CatalogoItem[]
    valControlesImplementar.value = controlesItems
  } catch (e) {
    if (e instanceof SessionExpiredError) {
      showSessionExpired.value = true
    } else {
      console.error('Error cargando datos de valoración', e)
    }
  } finally {
    valLoading.value = false
  }
}

function getValorImpacto(id: string | number): number {
  if (!id) return 0
  const found = valImpactos.value.find((i: CatalogoItem) => i.id === Number(id))
  return found?.valor ?? 0
}

function calculateRowCiaAverage(v: ValoracionActivo) {
  const c = getValorImpacto(v.confidencialidadId)
  const i = getValorImpacto(v.integridadId)
  const d = getValorImpacto(v.disponibilidadId)
  const selected: number[] = [c, i, d].filter(val => val && val > 0).map(Number)
  if (selected.length === 0) return 0
  return Math.round((selected.reduce((a, b) => a + b, 0) / selected.length) * 100) / 100
}

function getCiaLevel(avg: number) {
  if (avg >= 2.5) return 'Alto'
  if (avg >= 1.5) return 'Medio'
  return 'Bajo'
}

const valSaved = ref<ValoracionActivo[]>([])
const valSaving = ref(false)
const valSuccess = ref('')
const valEditId = ref<number | null>(null)
const showModalVal = ref(false)
const showViewModal = ref(false)
const viewItem = ref<ValoracionActivo | null>(null)
const activeTab = ref(0)

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
  valControlesImplementar: valControlesImplementar.value,
}))

async function loadValoraciones() {
  try {
    const {apiFetch} = useApi()
    valSaved.value = await apiFetch<ValoracionActivo[]>('/valoraciones')
  } catch (e) {
    if (e instanceof SessionExpiredError) {
      showSessionExpired.value = true
    }
  }
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
      vulnerabilidadRiesgoId: d.vulnerabilidadRiesgoId ? Number(d.vulnerabilidadRiesgoId) : null,
      evaluacionRiesgo: (d.evaluacionRiesgo || 0) > 0 ? d.evaluacionRiesgo : null,
      nivelRiesgo: d.nivelRiesgo || null,
      metodoTratamiento: d.metodoTratamiento || null,
      tipoControlId: Number(d.tipoControlId),
      riesgoControlId: d.riesgoControlId ? Number(d.riesgoControlId) : null,
      vulnerabilidadControlId: d.vulnerabilidadControlId ? Number(d.vulnerabilidadControlId) : null,
      evaluacionRiesgoControl: (d.evaluacionRiesgoControl || 0) > 0 ? d.evaluacionRiesgoControl : null,
      nivelRiesgoControl: d.nivelRiesgoControl || null,
      riesgoResidual: d.riesgoResidual || null,
      // New per-row fields (Tab 2 row-based model)
      amenazaIds: d.amenazaIds && d.amenazaIds.length > 0 ? JSON.stringify(d.amenazaIds) : null,
      vulnerabilidadIds: d.vulnerabilidadIds && d.vulnerabilidadIds.length > 0 ? JSON.stringify(d.vulnerabilidadIds) : null,
      controlesImplementados: d.controlesImplementados || null,
      controlesArea: d.controlesArea || null,
      // Tab 4 FK: selected catalog control
      controlesImplementarId: d.controlesImplementarId ?? null,
    }))

    // ── Propagation: copy treatment fields from first-matched entry to all row siblings ──
    const TREATMENT_FIELDS = ['metodoTratamiento', 'tipoControlId', 'riesgoControlId', 'evaluacionRiesgoControl', 'nivelRiesgoControl'] as const
    const riesgoRows: { amenazaIds: string[], vulnerabilidadIds: string[] }[] = []
    const seen = new Set<string>()
    detallesRiesgo.value.forEach(d => {
      if (!d.amenazaIds?.length && !d.vulnerabilidadIds?.length) return
      const key = JSON.stringify([...(d.amenazaIds ?? []), ...(d.vulnerabilidadIds ?? [])].sort())
      if (!seen.has(key)) {
        seen.add(key)
        riesgoRows.push({amenazaIds: d.amenazaIds ?? [], vulnerabilidadIds: d.vulnerabilidadIds ?? []})
      }
    })
    riesgoRows.forEach(row => {
      const matched = detallesRiesgo.value.find(d =>
          JSON.stringify(d.amenazaIds) === JSON.stringify(row.amenazaIds) &&
          JSON.stringify(d.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds)
      )
      if (!matched) return
      detallesRiesgo.value
          .filter(d => d !== matched &&
              JSON.stringify(d.amenazaIds) === JSON.stringify(row.amenazaIds) &&
              JSON.stringify(d.vulnerabilidadIds) === JSON.stringify(row.vulnerabilidadIds))
          .forEach(sibling => {
            TREATMENT_FIELDS.forEach(f => {
              (sibling as any)[f] = (matched as any)[f]
            })
          })
    })

    // ── Phase 3: Fetch server-computed risk fields via calculate endpoint ──
    const {apiFetch} = useApi()
    for (let i = 0; i < detallesPayload.length; i++) {
      const d = detallesPayload[i]
      // Resolve per-row nivel values from valRiesgos catalog via d.riesgoId / d.vulnerabilidadRiesgoId
      const nivelAmenaza = (() => {
        if (!d.riesgoId) return 1
        const found = valRiesgos.value.find((r: CatalogoItem) => r.id === d.riesgoId)
        return found?.valor ?? 1
      })()
      const nivelVulnerabilidad = (() => {
        if (!d.vulnerabilidadRiesgoId) return 1
        const found = valRiesgos.value.find((r: CatalogoItem) => r.id === d.vulnerabilidadRiesgoId)
        return found?.valor ?? 1
      })()
      // Resolve per-row control-level valors from valRiesgos catalog via riesgoControlId / vulnerabilidadControlId
      const nivelAmenazaControl = (() => {
        if (!d.riesgoControlId) return undefined
        const found = valRiesgos.value.find((r: CatalogoItem) => r.id === d.riesgoControlId)
        return found?.valor ?? undefined
      })()
      const nivelVulnerabilidadControl = (() => {
        if (!d.vulnerabilidadControlId) return undefined
        const found = valRiesgos.value.find((r: CatalogoItem) => r.id === d.vulnerabilidadControlId)
        return found?.valor ?? undefined
      })()
      const hasRiskInput = d.amenazaIds || d.vulnerabilidadIds
      if (hasRiskInput && d.id) {
        const calculado = await apiFetch<{
          evaluacionRiesgo: number;
          nivelRiesgo: string;
          metodoTratamiento: string;
          tipoControl: string;
          evaluacionRiesgoControl: number;
          nivelRiesgoControl: string;
          riesgoResidual: 'ACEPTABLE' | 'INACEPTABLE'
        }>(
            `/valoraciones/${valEditId.value}/detalles-riesgo/${d.id}/calcular`,
            {
              method: 'PATCH',
              body: JSON.stringify({ nivelAmenaza, nivelVulnerabilidad, nivelAmenazaControl, nivelVulnerabilidadControl }),
            },
        )
        Object.assign(d, {
          evaluacionRiesgo: calculado.evaluacionRiesgo,
          nivelRiesgo: calculado.nivelRiesgo,
          metodoTratamiento: calculado.metodoTratamiento,
          evaluacionRiesgoControl: calculado.evaluacionRiesgoControl,
          nivelRiesgoControl: calculado.nivelRiesgoControl,
          riesgoResidual: calculado.riesgoResidual,
        })
      }
    }

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

    const url = valEditId.value
        ? `/valoraciones/${valEditId.value}`
        : '/valoraciones'
    const method = valEditId.value ? 'PATCH' : 'POST'
    await apiFetch(url, {method, body: JSON.stringify(body)})

    valSuccess.value = valEditId.value ? 'Valoracion actualizada' : 'Valoracion guardada'
    showModalVal.value = false
    resetForm()
    await loadValoraciones()
  } catch (e: unknown) {
    if (e instanceof SessionExpiredError) {
      showSessionExpired.value = true
      return
    }
    alert('Error: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    valSaving.value = false
  }
}

function editValoracion(item: ValoracionActivo) {
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
    detallesRiesgo.value = item.detallesRiesgo.map((d: DetalleRiesgo) => ({
      id: d.id,
      tipo: d.tipo,
      catalogoId: Number(d.catalogoId),
      riesgoId: d.riesgoId ? String(d.riesgoId) : '',
      evaluacionRiesgo: d.evaluacionRiesgo || 0,
      nivelRiesgo: d.nivelRiesgo || '',
      metodoTratamiento: d.metodoTratamiento || '',
      tipoControlId: d.tipoControlId ? String(d.tipoControlId) : '',
      riesgoControlId: d.riesgoControlId ? String(d.riesgoControlId) : '',
      vulnerabilidadControlId: d.vulnerabilidadControlId ?? null,
      evaluacionRiesgoControl: d.evaluacionRiesgoControl || 0,
      nivelRiesgoControl: d.nivelRiesgoControl || '',
      // New per-row fields (Tab 2 row-based model)
      amenazaIds: safeJsonParse((d.amenazaIds as unknown as string), []),
      vulnerabilidadIds: safeJsonParse((d.vulnerabilidadIds as unknown as string), []),
      controlesImplementados: d.controlesImplementados || '',
      controlesArea: d.controlesArea || '',
    }))
  } else {
    detallesRiesgo.value = []
  }
}

async function viewValoracion(item: ValoracionActivo) {
  try {
    const {apiFetch} = useApi()
    const enriched = await apiFetch<ValoracionActivo>(`/valoraciones/${item.id}`)
    viewItem.value = enriched
    showViewModal.value = true
  } catch (e) {
    if (e instanceof SessionExpiredError) {
      showSessionExpired.value = true
    }
  }
}

async function deleteValoracion(id: number) {
  if (!confirm('¿Eliminar esta valoración?')) return
  try {
    const {apiFetch} = useApi()
    await apiFetch(`/valoraciones/${id}`, {method: 'DELETE'})
    await loadValoraciones()
  } catch (e) {
    if (e instanceof SessionExpiredError) {
      showSessionExpired.value = true
    }
  }
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
    metodoTratamiento: '',
    tipoControl: '',
    controlesImplementar: '',
    nivelAmenazaControl: '',
    nivelVulnerabilidadControl: '',
  }
  amenazaCategoria.value = ''
  vulnerabilidadCategoria.value = ''
  amenazaSeleccionada.value = '';
  vulnerabilidadSeleccionada.value = '';
}

function safeJsonParse(str: string | null, fallback: any[] = []): any[] {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

function getTipoControlName(id: number | string) {
  if (!id) return '—'
  const found = valTiposControl.value.find((tc: CatalogoItem) => tc.id === Number(id))
  return found ? found.nombre : `TC#${id}`
}

function getNivelStyle(nivel: string) {
  const n = (nivel || '').toLowerCase()
  if (n.includes('critico')) return {label: 'Critico', color: '#dc2626', bg: 'rgba(220,38,38,0.15)'}
  if (n.includes('alto')) return {label: 'Alto', color: '#ea580c', bg: 'rgba(234,88,12,0.15)'}
  if (n.includes('medio')) return {label: 'Medio', color: '#ca8a04', bg: 'rgba(202,138,4,0.15)'}
  return {label: 'Bajo', color: '#16a34a', bg: 'rgba(22,163,74,0.15)'}
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

function resumenEvaluacionRiesgo(v: ValoracionActivo) {
  const detalles = v.detallesRiesgo || []
  if (detalles.length === 0) {
    return {evaluacion: v.evaluacionRiesgo || 0, nivel: v.nivelRiesgo || ''}
  }
  const conEval = detalles.filter((d: Record<string, unknown>) => d.evaluacionRiesgo > 0)
  const avg = conEval.length > 0
      ? Math.round((conEval.reduce((sum: number, d: Record<string, unknown>) => sum + (d.evaluacionRiesgo as number), 0) / conEval.length) * 100) / 100
      : 0
  const maxNivel = conEval.reduce((max: number, d: Record<string, unknown>) => Math.max(max, getMaxNivelIndex(d.nivelRiesgo as string)), 0)
  return {evaluacion: avg, nivel: maxNivel > 0 ? getNivelFromIndex(maxNivel) : ''}
}

function resumenControl(v: ValoracionActivo) {
  const detalles = v.detallesRiesgo || []
  if (detalles.length === 0) {
    return {
      tipoControl: v.tipoControl?.nombre || (v.tipoControl ? getTipoControlName(v.tipoControl) : '—'),
      evaluacion: v.evaluacionRiesgoControl || 0,
      nivel: v.nivelRiesgoControl || '',
    }
  }
  const conEval = detalles.filter((d: Record<string, unknown>) => d.evaluacionRiesgoControl > 0)
  const avg = conEval.length > 0
      ? Math.round((conEval.reduce((sum: number, d: Record<string, unknown>) => sum + (d.evaluacionRiesgoControl as number), 0) / conEval.length) * 100) / 100
      : 0
  const maxNivel = conEval.reduce((max: number, d: Record<string, unknown>) => Math.max(max, getMaxNivelIndex(d.nivelRiesgoControl as string)), 0)
  const tipos = new Set(detalles.filter((d: Record<string, unknown>) => d.tipoControlId).map((d: Record<string, unknown>) => getTipoControlName(d.tipoControlId as string)))
  const tipoControl = tipos.size > 1 ? 'Múltiple' : (Array.from(tipos)[0] || '—')
  return {tipoControl, evaluacion: avg, nivel: maxNivel > 0 ? getNivelFromIndex(maxNivel) : ''}
}

function handleLoginRedirect() {
  login()
}

onMounted(() => {
  loadValoracionData()
  loadValoraciones()
})
</script>

<template>
  <div class="valoracion-section">
    <SessionWarning
        :is-expired="isExpired"
        :is-warning="isWarning"
        :is-refreshing="isRefreshing"
        :seconds-remaining="secondsRemaining"
        @refresh="handleRefreshSession"
    />

    <div class="welcome-banner"
         style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
      <div>
        <h2>Valoración de Activos</h2>
        <p>Gestione las valoraciones de activos de información registradas en el sistema.</p>
      </div>
      <button class="btn-primary" style="padding: 0.75rem 1.5rem; font-size: 1rem;" type="button"
              @click="openNewValoracion">Nueva Valoración
      </button>
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
            <th style="width:60px;">Nro</th>
            <th>Nombre de Activo</th>
            <th>Macroproceso</th>
            <th>Valoración CIA</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="v in valSaved" :key="v.id">
            <td style="text-align:center;">{{ v.id }}</td>
            <td>{{ v.nombreActivo || 'N/A' }}</td>
            <td>{{ v.macroProceso?.nombre || `MP#${v.macroProcesoId}` }}</td>
            <td>
                <span v-if="calculateRowCiaAverage(v) > 0" class="cia-average-level" style="display:inline-block;">
                  {{ calculateRowCiaAverage(v).toFixed(2) }}
                </span>
              <span v-else style="color:var(--text-muted); font-size:0.85rem;">Pendiente</span>
            </td>
            <td class="val-table-actions">
              <button class="btn-icon btn-view" title="Ver" @click="viewValoracion(v)">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                     xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" stroke-linecap="round"
                        stroke-linejoin="round"/>
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="btn-icon btn-edit" title="Editar" @click="editValoracion(v)">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                     xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" stroke-linecap="round"
                        stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="btn-icon btn-delete" title="Eliminar" @click="deleteValoracion(v.id)">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                     xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" stroke-linecap="round"
                        stroke-linejoin="round"/>
                </svg>
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- MODAL: ValoracionModal.vue -->
      <ValoracionModal
          v-model="showModalVal"
          :analisis-form="analisisForm"
          :catalog-data="catalogData"
          :detalles-riesgo="detallesRiesgo"
          :edit-id="valEditId"
          :evaluacion-form="evaluacionForm"
          :tratamiento-form="tratamientoForm"
          :val-form="valForm"
          :val-saving="valSaving"
          @submit="submitValoracion"
          @update:model-value="showModalVal = $event"
          @reset-form="rebuildDetalles"
      />

      <!-- VIEW MODAL -->
      <ValoracionViewModal
          v-model="showViewModal"
          :catalog-data="catalogData"
          :view-item="viewItem"
      />

      <!-- SESSION EXPIRED MODAL -->
      <div v-if="showSessionExpired" class="session-expired-overlay" @click.self="showSessionExpired = false">
        <div class="session-expired-modal">
          <h3>Session Expired</h3>
          <p>Your session has expired. Please log in again to continue.</p>
          <div class="session-expired-actions">
            <button class="btn-primary" type="button" @click="handleLoginRedirect">Log In Again</button>
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

.cia-average-level {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary);
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

.btn-view {
  color: #38bdf8;
}

.btn-view:hover {
  background: rgba(56, 189, 248, 0.1);
  color: #7dd3fc;
}

.session-expired-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.session-expired-modal {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.session-expired-modal h3 {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  color: #ef4444;
}

.session-expired-modal p {
  color: var(--text-muted);
  margin: 0 0 1.5rem;
  line-height: 1.5;
}

.session-expired-actions {
  display: flex;
  justify-content: center;
}
</style>
