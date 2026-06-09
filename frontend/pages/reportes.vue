<script lang="ts" setup>
import type { ReporteResumen, RiesgoPorActivo, RiesgoPorMacroProceso, ReporteTratamiento, ReporteCIA } from '~/types/api'

const activeTab = ref(0)
const loading = ref(false)
const error = ref('')

const resumen = ref<ReporteResumen | null>(null)
const riesgosPorActivo = ref<RiesgoPorActivo[]>([])
const riesgosPorMacroproceso = ref<RiesgoPorMacroProceso[]>([])
const tratamiento = ref<ReporteTratamiento | null>(null)
const cia = ref<ReporteCIA | null>(null)

const tabs = [
  { label: 'Resumen', icon: 'M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z' },
  { label: 'Riesgos por Activo', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5' },
  { label: 'Riesgos por MacroProceso', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
  { label: 'Tratamiento', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  { label: 'CIA', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
]

// ── Load all reportes endpoints ─────────────────────────────────────────────────
async function fetchReportes() {
  loading.value = true
  error.value = ''
  try {
    const { apiFetch } = useApi()
    const [r, ra, rmp, t, c] = await Promise.all([
      apiFetch<ReporteResumen>('/reportes/resumen'),
      apiFetch<RiesgoPorActivo[]>('/reportes/riesgos-por-activo'),
      apiFetch<RiesgoPorMacroProceso[]>('/reportes/riesgos-por-macroproceso'),
      apiFetch<ReporteTratamiento>('/reportes/tratamiento'),
      apiFetch<ReporteCIA>('/reportes/cia'),
    ])
    resumen.value = r
    riesgosPorActivo.value = ra
    riesgosPorMacroproceso.value = rmp
    tratamiento.value = t
    cia.value = c
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al cargar reportes'
  } finally {
    loading.value = false
  }
}

// ── Resumen tab: donut chart ────────────────────────────────────────────────────
const riesgoSegments = computed(() => {
  if (!resumen.value) return []
  const { Alto = 0, Medio = 0, Bajo = 0 } = resumen.value.distribucionRiesgos
  const total = Alto + Medio + Bajo || 1
  return [
    { label: 'Alto', count: Alto, pct: Math.round((Alto / total) * 1000) / 10, color: '#ef4444' },
    { label: 'Medio', count: Medio, pct: Math.round((Medio / total) * 1000) / 10, color: '#eab308' },
    { label: 'Bajo', count: Bajo, pct: Math.round((Bajo / total) * 1000) / 10, color: '#22c55e' },
  ]
})

const donutGradient = computed(() => {
  const segs = riesgoSegments.value
  if (segs.every(s => s.count === 0)) return 'conic-gradient(#334155 0% 100%)'
  let acc = 0
  const parts = segs
    .filter(s => s.pct > 0)
    .map(s => {
      const start = acc
      acc += s.pct
      return `${s.color} ${start}% ${acc}%`
    })
  return `conic-gradient(${parts.join(', ')})`
})

// ── Tratamiento tab: bar chart ──────────────────────────────────────────────────
const metodoEntries = computed(() => {
  if (!tratamiento.value) return []
  const entries = Object.entries(tratamiento.value.distribucionMetodos)
  const max = Math.max(1, ...entries.map(([, v]) => v))
  return entries.map(([k, v]) => ({
    metodo: k,
    cantidad: v,
    pct: Math.round((v / max) * 100),
  }))
})

// ── CIA tab: bar chart ──────────────────────────────────────────────────────────
interface CiaDimBar {
  dimension: string
  nivel: string
  cantidad: number
}

const ciaBars = computed(() => {
  if (!cia.value) return []
  const result: (CiaDimBar & { pct: number })[] = []
  const max = Math.max(
    1,
    ...Object.values(cia.value.confidencialidad),
    ...Object.values(cia.value.integridad),
    ...Object.values(cia.value.disponibilidad),
  )
  for (const dim of ['confidencialidad', 'integridad', 'disponibilidad'] as const) {
    const dimLabel = dim === 'confidencialidad' ? 'Confidencialidad' : dim === 'integridad' ? 'Integridad' : 'Disponibilidad'
    const data = cia.value[dim]
    for (const nivel of ['Alto', 'Medio', 'Bajo'] as const) {
      result.push({
        dimension: dimLabel,
        nivel,
        cantidad: data[nivel] || 0,
        pct: Math.round(((data[nivel] || 0) / max) * 100),
      })
    }
  }
  return result
})

// ── Helpers ─────────────────────────────────────────────────────────────────────
function nivelClass(nivel: string | null) {
  if (!nivel) return ''
  const n = nivel.toLowerCase()
  if (n.includes('alto') || n.includes('critico')) return 'nivel-alto'
  if (n.includes('medio')) return 'nivel-medio'
  return 'nivel-bajo'
}

function formatNum(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toFixed(2)
}

onMounted(() => {
  fetchReportes()
})
</script>

<template>
  <div class="reportes-section">
    <div class="welcome-banner">
      <h2>Reportes</h2>
      <p>Visualice datos agregados de valoraciones de activos, riesgos y controles.</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="reportes-loading">
      <div class="spinner"></div>
      <p>Cargando reportes...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="reportes-error">
      <div class="error-icon">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p>Error al cargar reportes</p>
      <p class="error-detail">{{ error }}</p>
      <button class="btn-retry" @click="fetchReportes()">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Reintentar
      </button>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Tab Navigation -->
      <div class="reportes-tabs">
        <button
          v-for="(tab, i) in tabs"
          :key="i"
          :class="{ active: activeTab === i }"
          class="tab-btn"
          @click="activeTab = i"
        >
          <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path :d="tab.icon" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- ===== TAB 0: RESUMEN ===== -->
      <div v-if="activeTab === 0" class="tab-content">
        <div class="summary-cards">
          <div class="summary-card">
            <span class="summary-value">{{ resumen?.totalActivos ?? 0 }}</span>
            <span class="summary-label">Total Activos</span>
          </div>
          <div class="summary-card">
            <span class="summary-value">{{ resumen?.conRiesgo ?? 0 }}</span>
            <span class="summary-label">Con Riesgo</span>
          </div>
          <div class="summary-card">
            <span class="summary-value">{{ resumen?.sinRiesgo ?? 0 }}</span>
            <span class="summary-label">Sin Riesgo</span>
          </div>
        </div>

        <div class="charts-row">
          <!-- Donut Chart: Riesgo distribution -->
          <div class="chart-card">
            <h3 class="chart-title">Distribución de Nivel de Riesgo</h3>
            <div class="donut-wrapper">
              <div class="donut" :style="{ background: donutGradient }">
                <div class="donut-hole">
                  <span class="donut-total">{{ (resumen?.conRiesgo ?? 0) }}</span>
                  <span class="donut-sub">riesgos</span>
                </div>
              </div>
              <div class="donut-legend">
                <div v-for="seg in riesgoSegments" :key="seg.label" class="legend-item">
                  <span class="legend-dot" :style="{ background: seg.color }"></span>
                  <span class="legend-label">{{ seg.label }}</span>
                  <span class="legend-count">{{ seg.count }} ({{ seg.pct }}%)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Control distribution bar -->
          <div class="chart-card">
            <h3 class="chart-title">Distribución de Controles</h3>
            <div v-if="resumen" class="bar-chart">
              <div class="bar-row" v-for="nivel in ['Alto', 'Medio', 'Bajo']" :key="nivel">
                <span class="bar-label">{{ nivel }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :class="nivelClass(nivel)"
                    :style="{ width: Math.max(
                      Math.round((resumen.distribucionControles[nivel as keyof typeof resumen.distribucionControles] /
                        Math.max(1,
                          resumen.distribucionControles.Alto +
                          resumen.distribucionControles.Medio +
                          resumen.distribucionControles.Bajo)) * 100),
                      2
                    ) + '%' }"
                  ></div>
                </div>
                <span class="bar-value">{{ resumen.distribucionControles[nivel as keyof typeof resumen.distribucionControles] }}</span>
              </div>
            </div>
            <div v-else class="reportes-empty">No hay datos disponibles</div>
          </div>
        </div>
      </div>

      <!-- ===== TAB 1: RIESGOS POR ACTIVO ===== -->
      <div v-if="activeTab === 1" class="tab-content">
        <div v-if="riesgosPorActivo.length === 0" class="reportes-empty">
          No hay riesgos registrados por activo.
        </div>
        <div v-else class="table-wrapper">
          <table class="reportes-table">
            <thead>
              <tr>
                <th>Activo</th>
                <th>Tipo</th>
                <th>Macroproceso</th>
                <th>Evaluación</th>
                <th>Nivel Riesgo</th>
                <th>Tratamiento</th>
                <th>Riesgo Residual</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in riesgosPorActivo" :key="r.activoId">
                <td class="cell-name">{{ r.nombre || `Activo #${r.activoId}` }}</td>
                <td>{{ r.tipoActivo || '—' }}</td>
                <td>{{ r.macroproceso || '—' }}</td>
                <td>{{ formatNum(r.evaluacionRiesgo) }}</td>
                <td>
                  <span v-if="r.nivelRiesgo" class="nivel-badge" :class="nivelClass(r.nivelRiesgo)">
                    {{ r.nivelRiesgo }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td>{{ r.metodoTratamiento || '—' }}</td>
                <td>
                  <span v-if="r.riesgoResidual" :class="r.riesgoResidual === 'ACEPTABLE' ? 'residual-ok' : 'residual-warn'">
                    {{ r.riesgoResidual }}
                  </span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===== TAB 2: RIESGOS POR MACROPROCESO ===== -->
      <div v-if="activeTab === 2" class="tab-content">
        <div v-if="riesgosPorMacroproceso.length === 0" class="reportes-empty">
          No hay datos de riesgos por macroproceso.
        </div>
        <div v-else class="table-wrapper">
          <table class="reportes-table">
            <thead>
              <tr>
                <th>Macroproceso</th>
                <th>Total Activos</th>
                <th>Riesgos Bajo</th>
                <th>Riesgos Medio</th>
                <th>Riesgos Alto</th>
                <th>Promedio Evaluación</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mp in riesgosPorMacroproceso" :key="mp.macroprocesoId">
                <td class="cell-name">{{ mp.macroproceso || `MP #${mp.macroprocesoId}` }}</td>
                <td>{{ mp.totalActivos }}</td>
                <td>
                  <span class="nivel-badge nivel-bajo">{{ mp.riesgosBajo }}</span>
                </td>
                <td>
                  <span class="nivel-badge nivel-medio">{{ mp.riesgosMedio }}</span>
                </td>
                <td>
                  <span class="nivel-badge nivel-alto">{{ mp.riesgosAlto }}</span>
                </td>
                <td>{{ formatNum(mp.promedioEvaluacion) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===== TAB 3: TRATAMIENTO ===== -->
      <div v-if="activeTab === 3" class="tab-content">
        <div v-if="!tratamiento" class="reportes-empty">No hay datos de tratamiento disponibles.</div>
        <template v-else>
          <!-- Residual stats -->
          <div class="summary-cards">
            <div class="summary-card">
              <span class="summary-value">{{ tratamiento.distribucionResidual.ACEPTABLE }}</span>
              <span class="summary-label">Riesgo Aceptable</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">{{ tratamiento.distribucionResidual.INACEPTABLE }}</span>
              <span class="summary-label">Riesgo Inaceptable</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">{{ Object.values(tratamiento.distribucionMetodos).reduce((a, b) => a + b, 0) }}</span>
              <span class="summary-label">Total Métodos</span>
            </div>
          </div>

          <!-- Bar chart: métodos -->
          <div class="chart-card" style="margin-top: 1.5rem;">
            <h3 class="chart-title">Distribución por Método de Tratamiento</h3>
            <div v-if="metodoEntries.length > 0" class="bar-chart">
              <div v-for="m in metodoEntries" :key="m.metodo" class="bar-row">
                <span class="bar-label metodo-label">{{ m.metodo }}</span>
                <div class="bar-track">
                  <div class="bar-fill bar-primary" :style="{ width: m.pct + '%' }"></div>
                </div>
                <span class="bar-value">{{ m.cantidad }}</span>
              </div>
            </div>
            <div v-else class="reportes-empty">No hay métodos de tratamiento registrados.</div>
          </div>
        </template>
      </div>

      <!-- ===== TAB 4: CIA ===== -->
      <div v-if="activeTab === 4" class="tab-content">
        <div v-if="!cia" class="reportes-empty">No hay datos de evaluación CIA disponibles.</div>
        <template v-else>
          <!-- CIA summary averages -->
          <div class="summary-cards">
            <div class="summary-card">
              <span class="summary-value">
                {{ Object.values(cia.confidencialidad).reduce((a, b) => a + b, 0) }}
              </span>
              <span class="summary-label">Confidencialidad</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">
                {{ Object.values(cia.integridad).reduce((a, b) => a + b, 0) }}
              </span>
              <span class="summary-label">Integridad</span>
            </div>
            <div class="summary-card">
              <span class="summary-value">
                {{ Object.values(cia.disponibilidad).reduce((a, b) => a + b, 0) }}
              </span>
              <span class="summary-label">Disponibilidad</span>
            </div>
          </div>

          <!-- CIA bar chart -->
          <div class="chart-card" style="margin-top: 1.5rem;">
            <h3 class="chart-title">Distribución de Niveles CIA</h3>
            <div v-if="ciaBars.length > 0" class="bar-chart">
              <div v-for="bar in ciaBars" :key="bar.dimension + bar.nivel" class="bar-row">
                <span class="bar-label cia-label">{{ bar.dimension }} — {{ bar.nivel }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :class="nivelClass(bar.nivel)" :style="{ width: Math.max(bar.pct, 2) + '%' }"></div>
                </div>
                <span class="bar-value">{{ bar.cantidad }}</span>
              </div>
            </div>
            <div v-else class="reportes-empty">No hay datos de distribución CIA.</div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.reportes-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.welcome-banner {
  margin-bottom: 2rem;
}

.welcome-banner h2 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.welcome-banner p {
  color: var(--text-muted);
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

/* ── Tabs ──────────────────────────────────────────────────────────────────── */
.reportes-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: -1px;
}

.tab-btn svg {
  width: 18px;
  height: 18px;
}

.tab-btn:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.03);
}

.tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* ── Tab content ───────────────────────────────────────────────────────────── */
.tab-content {
  flex: 1;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Summary cards ─────────────────────────────────────────────────────────── */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
}

.summary-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* ── Charts ────────────────────────────────────────────────────────────────── */
.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.chart-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
}

.chart-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
  color: var(--primary);
}

/* ── Donut ─────────────────────────────────────────────────────────────────── */
.donut-wrapper {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.donut {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
}

.donut-hole {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.donut-total {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.donut-sub {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  color: var(--text);
  min-width: 50px;
}

.legend-count {
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* ── Bar chart ─────────────────────────────────────────────────────────────── */
.bar-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bar-label {
  min-width: 90px;
  font-size: 0.85rem;
  color: var(--text);
  text-align: right;
}

.metodo-label {
  min-width: 100px;
  font-weight: 600;
}

.cia-label {
  min-width: 160px;
}

.bar-track {
  flex: 1;
  height: 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.6s ease;
  min-width: 2px;
}

.bar-primary {
  background: var(--primary);
}

.bar-fill.nivel-alto {
  background: #ef4444;
}

.bar-fill.nivel-medio {
  background: #eab308;
}

.bar-fill.nivel-bajo {
  background: #22c55e;
}

.bar-value {
  min-width: 40px;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

/* ── Tables ────────────────────────────────────────────────────────────────── */
.table-wrapper {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
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

.cell-name {
  font-weight: 600;
}

/* ── Badges ────────────────────────────────────────────────────────────────── */
.nivel-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.nivel-alto {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.nivel-medio {
  background: rgba(234, 179, 8, 0.15);
  color: #fde047;
}

.nivel-bajo {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
}

.residual-ok {
  color: #22c55e;
  font-weight: 600;
  font-size: 0.8rem;
}

.residual-warn {
  color: #ef4444;
  font-weight: 600;
  font-size: 0.8rem;
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
</style>
