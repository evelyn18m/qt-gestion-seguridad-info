<script lang="ts" setup>
import type { ReporteResumen, RiesgoPorMacroProceso, ReporteCIA, NivelCount } from '~/types/api'

definePageMeta({ layout: 'default' })

const loading = ref(false)
const errorMsg = ref('')

const resumen = ref<ReporteResumen | null>(null)
const macroprocesos = ref<RiesgoPorMacroProceso[]>([])
const cia = ref<ReporteCIA | null>(null)

const totalActivos = computed(() => resumen.value?.totalActivos ?? 0)
const conRiesgo = computed(() => resumen.value?.conRiesgo ?? 0)
const sinRiesgo = computed(() => resumen.value?.sinRiesgo ?? 0)


const ciaLabels = ['Alto', 'Medio', 'Bajo']
const ciaColors = ['#E74C3C', '#F1C40F', '#2ECC71']

function buildCiaSeries(counts: NivelCount | undefined): number[] {
  if (!counts) return []
  return [counts.Alto ?? 0, counts.Medio ?? 0, counts.Bajo ?? 0]
}

function isCiaEmpty(counts: NivelCount | undefined): boolean {
  const series = buildCiaSeries(counts)
  return series.length === 0 || series.every((v) => v === 0)
}

function buildCiaDonutOptions(title: string) {
  return {
    chart: {
      type: 'donut' as const,
      toolbar: { show: false },
      background: 'transparent',
    },
    labels: ciaLabels,
    colors: ciaColors,
    title: {
      text: title,
      align: 'center' as const,
      style: { color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '55%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Activos',
              color: '#94a3b8',
              fontSize: '0.75rem',
            },
          },
        },
      },
    },
    theme: { mode: 'dark' as const },
    legend: { position: 'bottom' as const, fontSize: '0.75rem' },
    dataLabels: { enabled: false },
  }
}

const confidencialidadSeries = computed(() => buildCiaSeries(cia.value?.confidencialidad))
const integridadSeries = computed(() => buildCiaSeries(cia.value?.integridad))
const disponibilidadSeries = computed(() => buildCiaSeries(cia.value?.disponibilidad))
const ciaEmpty = computed(() =>
  isCiaEmpty(cia.value?.confidencialidad) &&
  isCiaEmpty(cia.value?.integridad) &&
  isCiaEmpty(cia.value?.disponibilidad),
)

const macroprocesoCategories = computed(() => macroprocesos.value.map((m) => m.macroproceso))
const macroprocesoSeries = computed(() => [
  {
    name: 'Riesgos',
    data: macroprocesos.value.map((m) =>
      (m.riesgosAlto ?? 0) + (m.riesgosMedio ?? 0) + (m.riesgosBajo ?? 0),
    ),
  },
])
const macroprocesoEmpty = computed(() => macroprocesos.value.length === 0)

const barOptions = computed(() => ({
  chart: {
    type: 'bar' as const,
    toolbar: { show: false },
    background: 'transparent',
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 6,
    },
  },
  xaxis: {
    categories: macroprocesoCategories.value,
    title: { text: 'Cantidad de riesgos' },
  },
  yaxis: {
    title: { text: 'Macroproceso' },
  },
  colors: ['#6366f1'],
  theme: { mode: 'dark' as const },
  dataLabels: { enabled: true },
  grid: { borderColor: '#334155' },
}))

async function fetchDashboard() {
  const { apiFetch } = useApi()
  loading.value = true
  errorMsg.value = ''

  try {
    const [resumenData, macroprocesoData, ciaData] = await Promise.all([
      apiFetch<ReporteResumen>('/reportes/resumen').catch(() => null),
      apiFetch<RiesgoPorMacroProceso[]>('/reportes/riesgos-por-macroproceso').catch(() => []),
      apiFetch<ReporteCIA>('/reportes/cia').catch(() => null),
    ])

    // Surface an error if any critical request failed. Macroprocess and CIA data are allowed to be empty.
    if (!resumenData) {
      throw new Error('No se pudo cargar el resumen de activos.')
    }

    resumen.value = resumenData
    macroprocesos.value = macroprocesoData ?? []
    cia.value = ciaData
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Error al cargar el dashboard'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
})
</script>

<template>
  <div class="dashboard-page">
    <div class="dashboard-header">
      <h1>Dashboard de Seguridad de la Información</h1>
      <p class="subtitle">Resumen del estado de riesgos y activos del SGSI</p>
    </div>

    <div v-if="loading" class="dashboard-loading">
      <div class="spinner"></div>
      <p>Cargando dashboard...</p>
    </div>

    <div v-else-if="errorMsg" class="dashboard-error">
      <div class="error-icon">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p>Error al cargar el dashboard</p>
      <p class="error-detail">{{ errorMsg }}</p>
      <button class="btn-retry" @click="fetchDashboard">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Reintentar
      </button>
    </div>

    <template v-else>
      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon total">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.375m-16.5-3.375v3.375m0 11.25c0 2.278 3.694 4.125 8.25 4.125s8.25-1.847 8.25-4.125" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="kpi-content">
            <h3>Total de Activos</h3>
            <p class="kpi-value">{{ totalActivos }}</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon risk">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM12 2.25a9.75 9.75 0 00-9.75 9.75c0 5.384 4.365 9.75 9.75 9.75s9.75-4.366 9.75-9.75A9.75 9.75 0 0012 2.25z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="kpi-content">
            <h3>Activos con Riesgo</h3>
            <p class="kpi-value">{{ conRiesgo }}</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon safe">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="kpi-content">
            <h3>Activos sin Riesgo</h3>
            <p class="kpi-value">{{ sinRiesgo }}</p>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-grid">
        <div class="chart-card cia-card">
          <h3>Valoración CIA</h3>
          <div v-if="ciaEmpty" class="chart-empty">
            No hay datos de valoración CIA.
          </div>
          <div v-else class="cia-charts">
            <apexchart
              type="donut"
              :options="buildCiaDonutOptions('Confidencialidad')"
              :series="confidencialidadSeries"
              height="260"
            />
            <apexchart
              type="donut"
              :options="buildCiaDonutOptions('Integridad')"
              :series="integridadSeries"
              height="260"
            />
            <apexchart
              type="donut"
              :options="buildCiaDonutOptions('Disponibilidad')"
              :series="disponibilidadSeries"
              height="260"
            />
          </div>
        </div>

        <div class="chart-card">
          <h3>Riesgos por Macroproceso</h3>
          <div v-if="macroprocesoEmpty" class="chart-empty">
            No hay riesgos agrupados por macroproceso.
          </div>
          <apexchart
            v-else
            type="bar"
            :options="barOptions"
            :series="macroprocesoSeries"
            height="320"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dashboard-header {
  margin-bottom: 0.5rem;
}

.dashboard-header h1 {
  font-size: 1.75rem;
  margin: 0 0 0.25rem 0;
  color: var(--text);
}

.subtitle {
  color: var(--text-muted);
  margin: 0;
}

/* KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.kpi-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.3s ease;
}

.kpi-card:hover {
  transform: translateY(-3px);
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-icon svg {
  width: 24px;
  height: 24px;
}

.kpi-icon.total {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.kpi-icon.risk {
  background: rgba(231, 76, 60, 0.15);
  color: #E74C3C;
}

.kpi-icon.safe {
  background: rgba(46, 204, 113, 0.15);
  color: #2ECC71;
}

.kpi-content h3 {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1.5rem;
}

.chart-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
}

.chart-card h3 {
  font-size: 1rem;
  color: var(--text);
  margin: 0 0 1rem 0;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.cia-charts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

@media (max-width: 900px) {
  .cia-charts {
    grid-template-columns: 1fr;
  }
}

/* Loading */
.dashboard-loading {
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

/* Error */
.dashboard-error {
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

.dashboard-error > p:first-of-type {
  color: #fca5a5;
  margin: 0;
  font-weight: 600;
}

.error-detail {
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 400px;
  word-break: break-word;
  margin: 0;
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

/* Responsive */
@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-header h1 {
    font-size: 1.35rem;
  }
}
</style>
