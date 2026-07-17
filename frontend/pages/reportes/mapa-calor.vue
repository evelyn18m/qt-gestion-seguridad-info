<script lang="ts" setup>
import type { HeatmapSerieDto, HeatmapCellDetail } from '~/types/api'
import type { ValoracionActivo } from '~/types/api'

definePageMeta({ layout: 'default' })

const loading = ref(false)
const errorMsg = ref('')
const series = ref<HeatmapSerieDto[]>([])

// Cell detail state
const showCellPanel = ref(false)
const cellAssets = ref<HeatmapCellDetail[]>([])
const cellLoading = ref(false)
const cellError = ref('')
const showModal = ref(false)
const selectedAsset = ref<ValoracionActivo | null>(null)
const lastCellImpacto = ref(0)
const lastCellProbabilidad = ref(0)

const chartOptions = {
    chart: {
        type: 'heatmap' as const,
        toolbar: { show: false },
        background: 'transparent',
        events: {
            dataPointSelection(_event: unknown, _chartContext: unknown, config: { seriesIndex: number; dataPointIndex: number; w: { config: { series: { data: { y: number }[] }[] } } }) {
                const seriesIndex = config.seriesIndex
                const dataPointIndex = config.dataPointIndex
                const y = config.w.config.series[seriesIndex]?.data[dataPointIndex]?.y ?? 0

                if (y === 0) return

                const impacto = 3 - seriesIndex
                const probabilidad = dataPointIndex + 1

                fetchCellData(impacto, probabilidad)
            },
        },
    },
    dataLabels: { enabled: true, style: { colors: ['#fff'] } },
    colors: ['#2ECC71', '#F1C40F', '#E74C3C'],
    plotOptions: {
        heatmap: {
            enableShades: false,
            colorScale: {
                ranges: [
                    { from: 1, to: 2, color: '#2ECC71', name: 'Bajo' },
                    { from: 3, to: 4, color: '#F1C40F', name: 'Medio' },
                    { from: 6, to: 9, color: '#E74C3C', name: 'Alto' },
                ],
            },
        },
    },
    xaxis: { categories: ['1. Bajo', '2. Medio', '3. Alto'], title: { text: 'Probabilidad' } },
    yaxis: { reversed: true, title: { text: 'Impacto' } },
    theme: { mode: 'dark' as const, palette: 'palette1', monochrome: { enabled: false } },
    grid: { borderColor: '#334155' },
    tooltip: { y: { title: { formatter: () => 'Activos' } } },
}

function getBadgeStyle(nivel: string | null) {
    const n = (nivel || '').toLowerCase()
    if (n === 'bajo') return { bg: 'rgba(46,204,113,0.15)', color: '#2ECC71', label: 'Bajo' }
    if (n === 'medio') return { bg: 'rgba(241,196,15,0.15)', color: '#F1C40F', label: 'Medio' }
    return { bg: 'rgba(231,76,60,0.15)', color: '#E74C3C', label: 'Alto' }
}

async function fetchData() {
    const { apiFetch } = useApi()
    try {
        loading.value = true
        errorMsg.value = ''
        series.value = await apiFetch<HeatmapSerieDto[]>('/reportes/heatmap')
    } catch (e: unknown) {
        errorMsg.value = e instanceof Error ? e.message : 'Error al cargar mapa de calor'
    } finally {
        loading.value = false
    }
}

async function fetchCellData(impacto: number, probabilidad: number) {
    const { apiFetch } = useApi()
    lastCellImpacto.value = impacto
    lastCellProbabilidad.value = probabilidad
    try {
        cellLoading.value = true
        cellError.value = ''
        cellAssets.value = await apiFetch<HeatmapCellDetail[]>(
            `/reportes/heatmap/cell?impacto=${impacto}&probabilidad=${probabilidad}`,
        )
        showCellPanel.value = true
    } catch (e: unknown) {
        cellError.value = e instanceof Error ? e.message : 'Error al cargar detalle de celda'
        showCellPanel.value = true
    } finally {
        cellLoading.value = false
    }
}

async function openAssetDetail(asset: HeatmapCellDetail) {
    const { apiFetch } = useApi()
    try {
        selectedAsset.value = await apiFetch<ValoracionActivo>(`/valoraciones/${asset.id}`)
        showModal.value = true
    } catch (e: unknown) {
        cellError.value = e instanceof Error ? e.message : 'Error al cargar detalle del activo'
    }
}

function closePanel() {
    showCellPanel.value = false
    cellAssets.value = []
    cellError.value = ''
}

onMounted(() => {
    fetchData()
})
</script>

<template>
    <div>
        <ReportesTabs />
        <div class="reportes-page">
            <main class="reportes-main">
                <div class="main-header">
                    <div>
                        <h2>Mapa de Calor</h2>
                        <p class="subtitle">Matriz de riesgo 3×3: Impacto × Probabilidad. Colores según nivel de riesgo (Bajo, Medio, Alto).</p>
                    </div>
                </div>

                <div v-if="loading" class="reportes-loading">
                    <div class="spinner"></div>
                    <p>Cargando mapa de calor...</p>
                </div>

                <div v-else-if="errorMsg" class="reportes-error">
                    <div class="error-icon">
                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <p>Error al cargar</p>
                    <p class="error-detail">{{ errorMsg }}</p>
                    <button class="btn-retry" @click="fetchData()">
                        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Reintentar
                    </button>
                </div>

                <div v-else-if="series.length === 0" class="reportes-empty">
                    No hay datos disponibles para el mapa de calor.
                </div>

                <div v-else class="chart-wrapper">
                    <apexchart
                        type="heatmap"
                        :options="chartOptions"
                        :series="series"
                        height="450"
                    />
                </div>

                <!-- Cell Detail Panel -->
                <div v-if="showCellPanel" class="cell-panel">
                    <div class="cell-panel-header">
                        <h3>Activos en la celda</h3>
                        <button class="cell-panel-close" @click="closePanel" title="Cerrar">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>

                    <div v-if="cellLoading" class="cell-panel-loading">
                        <div class="spinner"></div>
                        <p>Cargando activos...</p>
                    </div>

                    <div v-else-if="cellError" class="cell-panel-error">
                        <p>{{ cellError }}</p>
                        <button class="btn-retry" @click="fetchCellData(lastCellImpacto, lastCellProbabilidad)">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Reintentar
                        </button>
                    </div>

                    <div v-else-if="cellAssets.length === 0" class="cell-panel-empty">
                        No hay activos en esta celda.
                    </div>

                    <div v-else class="cell-asset-list">
                        <div
                            v-for="asset in cellAssets"
                            :key="asset.id"
                            class="cell-asset-row"
                            @click="openAssetDetail(asset)"
                        >
                            <div class="cell-asset-info">
                                <span class="cell-asset-name">{{ asset.nombreActivo }}</span>
                                <span class="cell-asset-macro">{{ asset.macroProceso }}</span>
                            </div>
                            <span
                                class="cell-asset-badge"
                                :style="{
                                    background: getBadgeStyle(asset.nivelRiesgo).bg,
                                    color: getBadgeStyle(asset.nivelRiesgo).color,
                                }"
                            >
                                {{ getBadgeStyle(asset.nivelRiesgo).label }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Valoracion Detail Modal -->
                <ValoracionViewModal v-model="showModal" :view-item="selectedAsset" />
            </main>
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

.reportes-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    padding: 0 1rem;
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

/* ── Chart wrapper ─────────────────────────────────────────────────────────── */
.chart-wrapper {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem;
    overflow: hidden;
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

/* ── Cell Detail Panel ─────────────────────────────────────────────────────── */
.cell-panel {
    margin-top: 1.5rem;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
}

.cell-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
}

.cell-panel-header h3 {
    margin: 0;
    font-size: 1.05rem;
    color: var(--text);
}

.cell-panel-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
}

.cell-panel-close svg {
    width: 16px;
    height: 16px;
}

.cell-panel-close:hover {
    background: var(--border);
    color: var(--text);
}

.cell-panel-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 0.75rem;
    color: var(--text-muted);
}

.cell-panel-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 0.75rem;
    color: #fca5a5;
    text-align: center;
}

.cell-panel-empty {
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
}

.cell-asset-list {
    padding: 0.5rem 0;
}

.cell-asset-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    transition: background 0.15s ease;
}

.cell-asset-row:hover {
    background: rgba(255, 255, 255, 0.04);
}

.cell-asset-row + .cell-asset-row {
    border-top: 1px solid var(--border);
}

.cell-asset-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.cell-asset-name {
    color: var(--text);
    font-weight: 500;
    font-size: 0.95rem;
}

.cell-asset-macro {
    color: var(--text-muted);
    font-size: 0.8rem;
}

.cell-asset-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
}

/* ── Responsive ────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
    .reportes-main {
        padding: 0 0.5rem;
    }

    .chart-wrapper {
        padding: 0.75rem;
    }

    .main-header h2 {
        font-size: 1.35rem;
    }
}
</style>
