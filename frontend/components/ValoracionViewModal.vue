<script lang="ts" setup>
import type {CatalogoItem, ValoracionActivo} from '~/types/api'

const props = defineProps<{
  modelValue: boolean
  viewItem: ValoracionActivo | null
  catalogData?: {
    valAmenazas: CatalogoItem[]
    valVulnerabilidades: CatalogoItem[]
  }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function getCatalogoLabel(tipo: string, catalogoId: number) {
  if (tipo === 'amenaza') {
    const a = props.catalogData?.valAmenazas.find((x: CatalogoItem) => x.id === catalogoId)
    return a ? `${a.categoria} — ${a.nombre}` : `A#${catalogoId}`
  }
  const v = props.catalogData?.valVulnerabilidades.find((x: CatalogoItem) => x.id === catalogoId)
  return v ? `${v.categoria} — ${v.descripcion}` : `V#${catalogoId}`
}

function getValorImpacto(id: string | number | null | undefined): number {
  if (!id) return 0
  return 0 // populated via viewItem.confidencialidad?.valor etc.
}

function calculateRowCiaAverage(v: ValoracionActivo) {
  const c = v.confidencialidad?.valor ?? 0
  const i = v.integridad?.valor ?? 0
  const d = v.disponibilidad?.valor ?? 0
  const selected = [c, i, d].filter(val => val && val > 0)
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

function getMaxNivelIndex(nivel: string) {
  const n = (nivel || '').toLowerCase()
  if (n.includes('alto')) return 3
  if (n.includes('medio')) return 2
  return 1
}

function getNivelFromIndex(idx: number) {
  if (idx >= 3) return 'Alto'
  if (idx >= 2) return 'Medio'
  return 'Bajo'
}

function safeJsonParse(str: string | null, fallback: any[] = []): any[] {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

function getTipoControlName(id: number | string | null | undefined) {
  if (!id) return '—'
  const tipoControl = (props.viewItem as any)?.tipoControl
  if (tipoControl?.nombre) return tipoControl.nombre
  return `TC#${id}`
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
        <!-- Activo Info + CIA side by side -->
        <div class="val-grid-2col">
          <div class="val-card" style="border:none; padding:0; background:transparent;">
            <h3 class="val-card-title">Información del Activo</h3>
            <div class="view-field"><span class="view-label">Nombre:</span> <span
                class="view-value">{{ viewItem.nombreActivo || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Tipo:</span> <span
                class="view-value">{{ viewItem.tipoActivo?.nombre || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Formato:</span> <span
                class="view-value">{{ viewItem.formato?.nombre || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Macroproceso:</span> <span
                class="view-value">{{ viewItem.macroProceso?.nombre || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Subproceso:</span> <span
                class="view-value">{{ viewItem.subProceso?.nombre || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Propietario:</span> <span
                class="view-value">{{ viewItem.propietario?.nombre || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Custodio:</span> <span
                class="view-value">{{ viewItem.custodio?.nombre || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Ubicación:</span> <span
                class="view-value">{{ viewItem.ubicacion || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Datos Personales:</span> <span
                class="view-value">{{ viewItem.tieneDatosPersonales ? 'SÍ' : 'NO' }}</span></div>
          </div>

          <div class="val-card" style="border:none; padding:0; background:transparent;">
            <h3 class="val-card-title">Valoración CIA</h3>
            <div class="view-field"><span class="view-label">Confidencialidad:</span> <span class="view-value">{{
                viewItem.confidencialidad?.nivel || 'N/A'
              }} ({{ viewItem.confidencialidad?.valor || '-' }})</span></div>
            <div class="view-field"><span class="view-label">Integridad:</span> <span
                class="view-value">{{ viewItem.integridad?.nivel || 'N/A' }} ({{
                viewItem.integridad?.valor || '-'
              }})</span></div>
            <div class="view-field"><span class="view-label">Disponibilidad:</span> <span class="view-value">{{
                viewItem.disponibilidad?.nivel || 'N/A'
              }} ({{ viewItem.disponibilidad?.valor || '-' }})</span></div>
            <div class="view-field"><span class="view-label">Promedio CIA:</span>
              <span v-if="calculateRowCiaAverage(viewItem) > 0" class="view-value">
                <span class="cia-average-level" style="display:inline-block;">{{
                    calculateRowCiaAverage(viewItem).toFixed(2)
                  }}</span>
              </span>
              <span v-else class="view-value">Pendiente</span>
            </div>
            <div class="view-field"><span class="view-label">Descripción:</span> <span
                class="view-value">{{ viewItem.descripcion || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Controles:</span> <span
                class="view-value">{{ viewItem.controlSeguridad || 'N/A' }}</span></div>
            <div class="view-field"><span class="view-label">Observaciones:</span> <span
                class="view-value">{{ viewItem.observaciones || 'N/A' }}</span></div>
          </div>
        </div>

        <!-- Análisis de Riesgos -->
        <div v-if="viewItem.amenazas || viewItem.vulnerabilidades" class="val-card val-section">
          <h3 class="val-card-title">Análisis de Riesgos</h3>
          <div class="view-field"><span class="view-label">Amenazas:</span> <span
              class="view-value">{{ safeJsonParse(viewItem.amenazas ?? null, []).length }} seleccionadas</span></div>
          <div class="view-field"><span class="view-label">Vulnerabilidades:</span> <span
              class="view-value">{{ safeJsonParse(viewItem.vulnerabilidades ?? null, []).length }} seleccionadas</span>
          </div>
          <div v-if="viewItem.controlesImplementacion" class="view-field"><span class="view-label">Controles de Implementación:</span>
            <span class="view-value">{{ viewItem.controlesImplementacion }}</span></div>
        </div>

        <!-- Evaluación de Riesgos -->
        <div v-if="viewItem.detallesRiesgo && viewItem.detallesRiesgo.length > 0" class="val-card val-section">
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
                  <span v-if="d.nivelRiesgo" :style="{ color: getNivelStyle(d.nivelRiesgo).color, background: getNivelStyle(d.nivelRiesgo).bg }"
                        class="nivel-badge">
                    {{ getNivelStyle(d.nivelRiesgo).label }}
                  </span>
                <span v-else>—</span>
              </td>
            </tr>
            </tbody>
          </table>
        </div>

        <!-- Tratamiento de Riesgo -->
        <div
            v-if="viewItem.metodoTratamiento || viewItem.tipoControl || (viewItem.detallesRiesgo && viewItem.detallesRiesgo.some((d: any) => d.metodoTratamiento || d.tipoControlId))"
            class="val-card val-section">
          <h3 class="val-card-title">Tratamiento de Riesgo</h3>
          <div v-if="viewItem.metodoTratamiento" class="view-field"><span class="view-label">Método:</span> <span
              class="view-value">{{ viewItem.metodoTratamiento }}</span></div>
          <div v-if="viewItem.tipoControl" class="view-field"><span class="view-label">Tipo de Control:</span> <span
              class="view-value">{{ viewItem.tipoControl?.nombre || getTipoControlName(viewItem.tipoControl) }}</span>
          </div>
          <div v-if="viewItem.controlesImplementar" class="view-field"><span
              class="view-label">Controles a Implementar:</span> <span
              class="view-value">{{ viewItem.controlesImplementar }}</span></div>
          <div
              v-if="viewItem.detallesRiesgo && viewItem.detallesRiesgo.some((d: any) => d.metodoTratamiento || d.tipoControlId || d.controlesImplementarId)"
              style="margin-top:1rem;">
            <h4 style="font-size:0.9rem; color:var(--text-muted); margin:0 0 0.75rem 0;">Controles por Item</h4>
            <table class="val-table">
              <thead>
              <tr>
                <th>Item</th>
                <th>Método</th>
                <th>Tipo Control</th>
                <th>Control a Implementar</th>
                <th>Eval. Control</th>
                <th>Nivel Control</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="d in viewItem.detallesRiesgo.filter((d: any) => d.metodoTratamiento || d.tipoControlId || d.controlesImplementarId)"
                  :key="d.id">
                <td>{{ getCatalogoLabel(d.tipo, d.catalogoId) }}</td>
                <td>{{ d.metodoTratamiento || '—' }}</td>
                <td>{{ d.tipoControlId ? getTipoControlName(d.tipoControlId) : '—' }}</td>
                <td>{{ (d as any).controlesImplementar?.descripcion ?? '—' }}</td>
                <td>{{ (d.evaluacionRiesgoControl ?? 0) > 0 ? (d.evaluacionRiesgoControl ?? 0).toFixed(2) : '—' }}</td>
                <td>
                    <span v-if="d.nivelRiesgoControl" :style="{ color: getNivelStyle(d.nivelRiesgoControl).color, background: getNivelStyle(d.nivelRiesgoControl).bg }"
                          class="nivel-badge">
                      {{ getNivelStyle(d.nivelRiesgoControl).label }}
                    </span>
                  <span v-else>—</span>
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

.cia-average-level {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary);
}
</style>
