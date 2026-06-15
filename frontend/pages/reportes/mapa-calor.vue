<script lang="ts" setup>
import type { HeatmapSerieDto } from '~/types/api'

definePageMeta({ layout: 'default' })

const loading = ref(false)
const errorMsg = ref('')
const series = ref<HeatmapSerieDto[]>([])

const chartOptions = {
    chart: { type: 'heatmap' as const, toolbar: { show: false }, background: 'transparent' },
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
