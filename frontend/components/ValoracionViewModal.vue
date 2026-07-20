<script lang="ts" setup>
import type {
  CatalogoItem,
  ControlesImplementarItem,
  DetalleRiesgo,
  ValoracionActivo,
} from '~/types/api'

const props = defineProps<{
  modelValue: boolean
  viewItem: ValoracionActivo | null
  catalogData?: {
    valAmenazas: CatalogoItem[]
    valVulnerabilidades: CatalogoItem[]
    valRiesgos: CatalogoItem[]
    valTiposControl: CatalogoItem[]
    valControlesImplementar: ControlesImplementarItem[]
    valImpactos: CatalogoItem[]
    valFuncionarios: CatalogoItem[]
    valAreas: CatalogoItem[]
    valTipoDatosPersonales: CatalogoItem[]
  }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function safeJsonParse(str: string | null | undefined, fallback: any[] = []): any[] {
  if (!str) return fallback
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return fallback
  }
}

function parseIds(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((v) => !Number.isNaN(v))
  }
  return safeJsonParse(value as string | null | undefined, [])
}

function getAmenazaLabel(id: number | string) {
  const a = props.catalogData?.valAmenazas.find((x: CatalogoItem) => x.id === Number(id))
  return a ? `${a.categoria} — ${a.nombre}` : `A#${id}`
}

function getVulnerabilidadLabel(id: number | string) {
  const v = props.catalogData?.valVulnerabilidades.find((x: CatalogoItem) => x.id === Number(id))
  return v ? `${v.categoria} — ${v.descripcion}` : `V#${id}`
}

function getRiesgoLabel(id: number | string | null | undefined) {
  if (!id) return '—'
  const r = props.catalogData?.valRiesgos.find((x: CatalogoItem) => x.id === Number(id))
  return r ? `${r.nivel} (${r.valor})` : `R#${id}`
}

function getTipoControlName(id: number | string | null | undefined) {
  if (!id) return '—'
  const t = props.catalogData?.valTiposControl.find((x: CatalogoItem) => x.id === Number(id))
  return t ? t.nombre : `TC#${id}`
}

function getControlImplementarLabel(item: ControlesImplementarItem | null | undefined) {
  if (!item) return '—'
  return `${item.seccion} — ${item.descripcion}`
}

function getAreaLabel(id: number | string | null | undefined) {
  if (!id) return '—'
  const a = props.catalogData?.valAreas.find((x: CatalogoItem) => x.id === Number(id))
  return a ? a.nombre : `Area#${id}`
}

function getFuncionarioLabel(id: number | string | null | undefined) {
  if (!id) return '—'
  const f = props.catalogData?.valFuncionarios.find((x: CatalogoItem) => x.id === Number(id))
  return f ? f.nombre : `Func#${id}`
}

function getTipoDatoPersonalLabel(id: number | string | null | undefined) {
  if (!id) return '—'
  const t = props.catalogData?.valTipoDatosPersonales.find((x: CatalogoItem) => x.id === Number(id))
  return t ? t.nombre : `TDP#${id}`
}

function calculateRowCiaAverage(v: ValoracionActivo) {
  const c = v.confidencialidad?.valor ?? 0
  const i = v.integridad?.valor ?? 0
  const d = v.disponibilidad?.valor ?? 0
  const selected = [c, i, d].filter((val) => val && val > 0)
  if (selected.length === 0) return 0
  return Math.round((selected.reduce((a, b) => a + b, 0) / selected.length) * 100) / 100
}

function getCiaLevel(avg: number) {
  if (avg >= 2.5) return 'Alto'
  if (avg >= 1.5) return 'Medio'
  return 'Bajo'
}

function getNivelStyle(nivel: string) {
  const n = (nivel || '').toLowerCase()
  if (n.includes('alto')) return {label: 'Alto', color: '#ea580c', bg: 'rgba(234,88,12,0.15)'}
  if (n.includes('medio')) return {label: 'Medio', color: '#ca8a04', bg: 'rgba(202,138,4,0.15)'}
  return {label: 'Bajo', color: '#16a34a', bg: 'rgba(22,163,74,0.15)'}
}

function getRiesgoResidualStyle(value: 'ACEPTABLE' | 'INACEPTABLE' | string | null | undefined) {
  const v = (value || '').toUpperCase()
  if (v === 'ACEPTABLE') return {label: 'Aceptable', color: '#16a34a', bg: 'rgba(22,163,74,0.15)'}
  if (v === 'INACEPTABLE') return {label: 'Inaceptable', color: '#dc2626', bg: 'rgba(220,38,38,0.15)'}
  return {label: value || '—', color: 'var(--text-muted)', bg: 'transparent'}
}

function formatNumber(n: number | null | undefined) {
  if (n === null || n === undefined || n === 0) return '—'
  return Number(n).toFixed(2)
}

function getAmenazaIds(d: DetalleRiesgo): number[] {
  const ids = d.amenazaIds ?? safeJsonParse((d as any).amenazaIdsStr ?? null, [])
  return parseIds(ids)
}

function getVulnerabilidadIds(d: DetalleRiesgo): number[] {
  const ids = d.vulnerabilidadIds ?? safeJsonParse((d as any).vulnerabilidadIdsStr ?? null, [])
  return parseIds(ids)
}

function getControlesImplementar(d: DetalleRiesgo): ControlesImplementarItem[] {
  if (Array.isArray(d.controlesImplementar) && d.controlesImplementar.length > 0) {
    return d.controlesImplementar as ControlesImplementarItem[]
  }
  const ids = parseIds(d.controlesImplementarId as unknown as string)
  return ids
      .map((id) => props.catalogData?.valControlesImplementar.find((c) => c.id === id))
      .filter(Boolean) as ControlesImplementarItem[]
}

function getDetalleTipoControlName(d: DetalleRiesgo) {
  if (d.tipoControl?.nombre) return d.tipoControl.nombre
  return getTipoControlName(d.tipoControlId)
}

function getDetalleRiesgoLabel(d: DetalleRiesgo) {
  if (d.riesgo?.nivel) return `${d.riesgo.nivel} (${d.riesgo.valor})`
  return getRiesgoLabel(d.riesgoId)
}

function getDetalleVulnerabilidadRiesgoLabel(d: DetalleRiesgo) {
  if (d.vulnerabilidadRiesgo?.nivel) return `${d.vulnerabilidadRiesgo.nivel} (${d.vulnerabilidadRiesgo.valor})`
  return getRiesgoLabel(d.vulnerabilidadRiesgoId)
}

function getDetalleRiesgoControlLabel(d: DetalleRiesgo) {
  if (d.riesgoControl?.nivel) return `${d.riesgoControl.nivel} (${d.riesgoControl.valor})`
  return getRiesgoLabel(d.riesgoControlId)
}

function getDetalleVulnerabilidadControlLabel(d: DetalleRiesgo) {
  if (d.vulnerabilidadControl?.nivel) return `${d.vulnerabilidadControl.nivel} (${d.vulnerabilidadControl.valor})`
  return getRiesgoLabel(d.vulnerabilidadControlId)
}
</script>

<template>
  <div v-if="modelValue && viewItem" class="val-modal-overlay" @click.self="emit('update:modelValue', false)">
    <div class="val-modal-content">
      <div class="val-modal-header">
        <h3>Detalle de Valoración #{{ viewItem.id }}</h3>
        <button class="btn-icon" title="Cerrar" @click="emit('update:modelValue', false)">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
               xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="val-modal-body">
        <!-- PESTAÑA 1: Valoración de Activo -->
        <div class="val-card val-section">
          <h3 class="val-card-title">1. Valoración de Activo</h3>
          <div class="val-grid-2col">
            <div>
              <div class="view-field">
                <span class="view-label">Nombre del Activo</span>
                <span class="view-value">{{ viewItem.nombreActivo || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">Tipo de Activo</span>
                <span class="view-value">{{ viewItem.tipoActivo?.nombre || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">Formato</span>
                <span class="view-value">{{ viewItem.formato?.nombre || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">Macroproceso</span>
                <span class="view-value">{{ viewItem.macroProceso?.nombre || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">Subproceso</span>
                <span class="view-value">{{ viewItem.subProceso?.nombre || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">Propietario</span>
                <span class="view-value">{{ viewItem.propietario?.nombre || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">Custodio(s)</span>
                <span v-if="viewItem.custodio && viewItem.custodio.length > 0" class="view-value">
                  <span v-for="(c, idx) in viewItem.custodio" :key="c.id" class="chip selected" style="margin: 0.15rem;">
                    {{ c.nombre || getFuncionarioLabel(c.id) }}
                  </span>
                </span>
                <span v-else class="view-value">{{ getFuncionarioLabel(viewItem.custodioId) || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">Ubicación</span>
                <span class="view-value">{{ viewItem.ubicacion || 'N/A' }}</span>
              </div>
            </div>
            <div>
              <div class="view-field">
                <span class="view-label">Descripción</span>
                <span class="view-value">{{ viewItem.descripcion || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">Control de Seguridad Implementado</span>
                <span class="view-value">{{ viewItem.controlSeguridad || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">Observaciones</span>
                <span class="view-value">{{ viewItem.observaciones || 'N/A' }}</span>
              </div>
              <div class="view-field">
                <span class="view-label">¿Tiene Datos Personales?</span>
                <span class="view-value">{{ viewItem.tieneDatosPersonales ? 'SÍ' : 'NO' }}</span>
              </div>
              <div v-if="viewItem.tieneDatosPersonales" class="view-field">
                <span class="view-label">Tipos de Datos Personales</span>
                <span v-if="viewItem.tiposDatosPersonales && viewItem.tiposDatosPersonales.length > 0" class="view-value">
                  <span v-for="t in viewItem.tiposDatosPersonales" :key="t.id" class="chip selected" style="margin: 0.15rem;">
                    {{ t.nombre || getTipoDatoPersonalLabel(t.id) }}
                  </span>
                </span>
                <span v-else class="view-value">N/A</span>
              </div>
            </div>
          </div>

          <div class="val-section" style="margin-top: 1.5rem;">
            <h4 class="val-subtitle">Valoración CIA</h4>
            <div class="val-grid-4col">
              <div class="view-field">
                <span class="view-label">Confidencialidad</span>
                <span class="view-value">{{ viewItem.confidencialidad?.nivel || 'N/A' }} ({{ viewItem.confidencialidad?.valor ?? '-' }})</span>
              </div>
              <div class="view-field">
                <span class="view-label">Integridad</span>
                <span class="view-value">{{ viewItem.integridad?.nivel || 'N/A' }} ({{ viewItem.integridad?.valor ?? '-' }})</span>
              </div>
              <div class="view-field">
                <span class="view-label">Disponibilidad</span>
                <span class="view-value">{{ viewItem.disponibilidad?.nivel || 'N/A' }} ({{ viewItem.disponibilidad?.valor ?? '-' }})</span>
              </div>
              <div class="view-field">
                <span class="view-label">Promedio CIA</span>
                <span class="view-value">
                  <span v-if="calculateRowCiaAverage(viewItem) > 0" class="cia-average-level">
                    {{ calculateRowCiaAverage(viewItem).toFixed(2) }} — {{ getCiaLevel(calculateRowCiaAverage(viewItem)) }}
                  </span>
                  <span v-else>Pendiente</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- PESTAÑA 2: Análisis de Riesgos -->
        <div class="val-card val-section">
          <h3 class="val-card-title">2. Análisis de Riesgos</h3>
          <div v-if="!viewItem.detallesRiesgo || viewItem.detallesRiesgo.length === 0" class="view-empty">
            No se registraron filas de análisis de riesgo.
          </div>
          <div v-else>
            <table class="val-table">
              <thead>
              <tr>
                <th style="min-width: 220px;">Amenazas</th>
                <th style="min-width: 220px;">Vulnerabilidades</th>
                <th style="min-width: 180px;">Controles Implementados</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="d in viewItem.detallesRiesgo" :key="d.id">
                <td>
                  <div v-if="getAmenazaIds(d).length > 0" class="chip-list">
                    <span v-for="aId in getAmenazaIds(d)" :key="aId" class="chip selected" style="margin: 0.15rem 0;">
                      {{ getAmenazaLabel(aId) }}
                    </span>
                  </div>
                  <span v-else-if="d.tipo === 'amenaza'" class="view-value">{{ getAmenazaLabel(d.catalogoId) }}</span>
                  <span v-else class="view-value">—</span>
                </td>
                <td>
                  <div v-if="getVulnerabilidadIds(d).length > 0" class="chip-list">
                    <span v-for="vId in getVulnerabilidadIds(d)" :key="vId" class="chip selected" style="margin: 0.15rem 0;">
                      {{ getVulnerabilidadLabel(vId) }}
                    </span>
                  </div>
                  <span v-else-if="d.tipo === 'vulnerabilidad'" class="view-value">{{ getVulnerabilidadLabel(d.catalogoId) }}</span>
                  <span v-else class="view-value">—</span>
                </td>
                <td>
                  <span class="view-value">{{ d.controlesImplementados || '—' }}</span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- PESTAÑA 3: Evaluación de Riesgos -->
        <div class="val-card val-section">
          <h3 class="val-card-title">3. Evaluación de Riesgo</h3>
          <div v-if="!viewItem.detallesRiesgo || viewItem.detallesRiesgo.length === 0" class="view-empty">
            No se registraron filas de evaluación de riesgo.
          </div>
          <div v-else>
            <table class="val-table">
              <thead>
              <tr>
                <th>Amenaza</th>
                <th>Vulnerabilidad</th>
                <th>Nivel Amenaza</th>
                <th>Nivel Vulnerabilidad</th>
                <th>Evaluación</th>
                <th>Nivel</th>
                <th>Controles del Área</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="d in viewItem.detallesRiesgo" :key="d.id">
                <td>
                  <div v-if="getAmenazaIds(d).length > 0" class="chip-list">
                    <span v-for="aId in getAmenazaIds(d)" :key="aId" class="chip selected" style="margin: 0.15rem 0;">
                      {{ getAmenazaLabel(aId) }}
                    </span>
                  </div>
                  <span v-else-if="d.tipo === 'amenaza'" class="view-value">{{ getAmenazaLabel(d.catalogoId) }}</span>
                  <span v-else class="view-value">—</span>
                </td>
                <td>
                  <div v-if="getVulnerabilidadIds(d).length > 0" class="chip-list">
                    <span v-for="vId in getVulnerabilidadIds(d)" :key="vId" class="chip selected" style="margin: 0.15rem 0;">
                      {{ getVulnerabilidadLabel(vId) }}
                    </span>
                  </div>
                  <span v-else-if="d.tipo === 'vulnerabilidad'" class="view-value">{{ getVulnerabilidadLabel(d.catalogoId) }}</span>
                  <span v-else class="view-value">—</span>
                </td>
                <td>{{ getDetalleRiesgoLabel(d) }}</td>
                <td>{{ getDetalleVulnerabilidadRiesgoLabel(d) }}</td>
                <td>{{ formatNumber(d.evaluacionRiesgo) }}</td>
                <td>
                  <span v-if="d.nivelRiesgo" :style="{ color: getNivelStyle(d.nivelRiesgo).color, background: getNivelStyle(d.nivelRiesgo).bg }" class="nivel-badge">
                    {{ getNivelStyle(d.nivelRiesgo).label }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>{{ d.controlesArea || '—' }}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- PESTAÑA 4: Tratamiento de Riesgo -->
        <div class="val-card val-section">
          <h3 class="val-card-title">4. Tratamiento de Riesgo</h3>
          <div v-if="!viewItem.detallesRiesgo || viewItem.detallesRiesgo.length === 0" class="view-empty">
            No se registraron filas de tratamiento de riesgo.
          </div>
          <div v-else>
            <table class="val-table">
              <thead>
              <tr>
                <th>Amenaza</th>
                <th>Vulnerabilidad</th>
                <th>Método de Tratamiento</th>
                <th>Tipo de Control</th>
                <th>Controles a Implementar</th>
                <th>Nivel Amenaza Control</th>
                <th>Nivel Vulnerabilidad Control</th>
                <th>Eval. Control</th>
                <th>Nivel Control</th>
                <th>Riesgo Residual</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="d in viewItem.detallesRiesgo" :key="d.id">
                <td>
                  <div v-if="getAmenazaIds(d).length > 0" class="chip-list">
                    <span v-for="aId in getAmenazaIds(d)" :key="aId" class="chip selected" style="margin: 0.15rem 0;">
                      {{ getAmenazaLabel(aId) }}
                    </span>
                  </div>
                  <span v-else-if="d.tipo === 'amenaza'" class="view-value">{{ getAmenazaLabel(d.catalogoId) }}</span>
                  <span v-else class="view-value">—</span>
                </td>
                <td>
                  <div v-if="getVulnerabilidadIds(d).length > 0" class="chip-list">
                    <span v-for="vId in getVulnerabilidadIds(d)" :key="vId" class="chip selected" style="margin: 0.15rem 0;">
                      {{ getVulnerabilidadLabel(vId) }}
                    </span>
                  </div>
                  <span v-else-if="d.tipo === 'vulnerabilidad'" class="view-value">{{ getVulnerabilidadLabel(d.catalogoId) }}</span>
                  <span v-else class="view-value">—</span>
                </td>
                <td>{{ d.metodoTratamiento || '—' }}</td>
                <td>{{ getDetalleTipoControlName(d) }}</td>
                <td>
                  <div v-if="getControlesImplementar(d).length > 0" class="chip-list">
                    <span v-for="c in getControlesImplementar(d)" :key="c.id" class="chip selected" style="margin: 0.15rem 0;">
                      {{ getControlImplementarLabel(c) }}
                    </span>
                  </div>
                  <span v-else class="view-value">—</span>
                </td>
                <td>{{ getDetalleRiesgoControlLabel(d) }}</td>
                <td>{{ getDetalleVulnerabilidadControlLabel(d) }}</td>
                <td>{{ formatNumber(d.evaluacionRiesgoControl) }}</td>
                <td>
                  <span v-if="d.nivelRiesgoControl" :style="{ color: getNivelStyle(d.nivelRiesgoControl).color, background: getNivelStyle(d.nivelRiesgoControl).bg }" class="nivel-badge">
                    {{ getNivelStyle(d.nivelRiesgoControl).label }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>
                  <span :style="{ color: getRiesgoResidualStyle(d.riesgoResidual).color, background: getRiesgoResidualStyle(d.riesgoResidual).bg }" class="nivel-badge">
                    {{ getRiesgoResidualStyle(d.riesgoResidual).label }}
                  </span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="val-actions">
        <button class="btn-cancel" type="button" @click="emit('update:modelValue', false)">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  min-height: 0;
}

.val-actions {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: var(--card-bg);
}

.val-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.val-grid-4col {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.val-section {
  margin-top: 1.5rem;
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

.val-subtitle {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: var(--text);
}

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

.view-empty {
  color: var(--text-muted);
  font-style: italic;
  padding: 1rem 0;
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

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.25);
  color: var(--primary);
}

.chip.selected {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
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

.cia-average-level {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary);
}

@media (max-width: 900px) {
  .val-grid-2col,
  .val-grid-4col {
    grid-template-columns: 1fr;
  }
}
</style>
