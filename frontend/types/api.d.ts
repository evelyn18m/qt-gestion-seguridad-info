// Shared API response types for SGSI frontend

export interface CatalogoItem {
    id: number
    nombre?: string
    categoria?: string
    tipo?: string
    modelo?: string
    detalle?: string
    descripcion?: string
    tipoFuente?: string
    nivel?: string
    valor?: number
    criterio?: string
    evaluacion?: string

    [key: string]: any
}

export interface CategoriaControlesImplementar {
    id: number
    nombre: string
}

export interface ControlesImplementarItem {
    id: number
    seccion: string
    descripcion: string
    categoriaId: number
    categoria: CategoriaControlesImplementar
}

export interface ValoracionActivo {
    id: number
    nombreActivo: string
    tipoActivoId: number
    formatoId: number
    macroProcesoId: number
    subProcesoId: number
    propietarioId: number
    custodioId: number
    descripcion: string
    controlSeguridad: string
    ubicacion: string
    observaciones?: string
    confidencialidadId: number
    integridadId: number
    disponibilidadId: number
    tieneDatosPersonales: boolean
    amenazas?: string | null
    vulnerabilidades?: string | null
    controlesImplementacion?: string | null
    impacto?: number | null
    controlesArea?: string | null
    amenazaRiesgoId?: number | null
    vulnerabilidadRiesgoId?: number | null
    probabilidadId?: number | null
    detallesRiesgo?: DetalleRiesgo[]
    // Joined relations (from API)
    macroProceso?: { id: number; nombre: string }

    [key: string]: any
}

export interface RiesgoCalculado {
    evaluacionRiesgo: number
    nivelRiesgo: string
    metodoTratamiento: string
    tipoControl: string
    evaluacionRiesgoControl: number
    nivelRiesgoControl: string
    riesgoResidual: 'ACEPTABLE' | 'INACEPTABLE'
}

export interface DetalleRiesgo {
    id?: number
    // Legacy fields (Tab 3/4 still use these)
    tipo: 'amenaza' | 'vulnerabilidad'
    catalogoId: number
    riesgoId?: number | string | null
    vulnerabilidadRiesgoId?: number | null
    evaluacionRiesgo?: number
    nivelRiesgo?: string
    metodoTratamiento?: string
    tipoControlId?: number | string | null
    riesgoControlId?: number | string | null
    vulnerabilidadControlId?: number | null
    evaluacionRiesgoControl?: number
    nivelRiesgoControl?: string
    riesgoResidual?: 'ACEPTABLE' | 'INACEPTABLE'
    // New per-row fields (Tab 2 row-based model)
    amenazaIds?: string[]
    vulnerabilidadIds?: string[]
    controlesImplementados?: string
    controlesArea?: string
    // Tab 4 FK: selected catalog control to implement
    controlesImplementarId?: number | null
    controlesImplementar?: ControlesImplementarItem | null
}

export interface ApiError {
    message: string
    statusCode: number
}

// ── Reportes module ───────────────────────────────────────────────────────────

export interface NivelCount {
    Alto: number
    Medio: number
    Bajo: number
}

export interface ReporteResumen {
    totalActivos: number
    conRiesgo: number
    sinRiesgo: number
    distribucionRiesgos: NivelCount
    distribucionControles: NivelCount
}

export interface RiesgoPorActivo {
    activoId: number
    nombre: string
    tipoActivo: string
    macroproceso: string
    evaluacionRiesgo: number | null
    nivelRiesgo: string | null
    metodoTratamiento: string | null
    riesgoResidual: string | null
}

export interface RiesgoPorMacroProceso {
    macroprocesoId: number
    macroproceso: string
    totalActivos: number
    riesgosBajo: number
    riesgosMedio: number
    riesgosAlto: number
    promedioEvaluacion: number
}

export interface ReporteTratamiento {
    distribucionMetodos: Record<string, number>
    distribucionResidual: { ACEPTABLE: number; INACEPTABLE: number }
}

export interface ReporteCIA {
    confidencialidad: NivelCount
    integridad: NivelCount
    disponibilidad: NivelCount
}

export interface ValoracionActivoReporte {
    id: number
    nombreActivo: string
    ubicacion: string
    tipoActivo: string
    formato: string
    macroProceso: string
    custodio: string
    confidencialidad: string
    integridad: string
    disponibilidad: string
    impacto: number | null
}

export interface AnalisisRiesgoActivoReporte {
    id: number
    nombreActivo: string
    macroProceso: string
    amenaza: string
    vulnerabilidad: string
    controlesImplementados: string | null
}

export interface EvaluacionRiesgoReporte {
    id: number
    nombreActivo: string
    macroProceso: string
    amenaza: string
    vulnerabilidad: string
    impacto: number | null
    nivelAmenaza: string | null
    nivelVulnerabilidad: string | null
    evaluacionRiesgo: number | null
    nivelRiesgo: string | null
    controlesArea: string | null
}

export interface TratamientoRiesgoReporte {
    id: number
    nombreActivo: string
    macroProceso: string
    amenaza: string
    vulnerabilidad: string
    nivelAmenaza: string | null
    nivelVulnerabilidad: string | null
    impacto: number | null
    metodoTratamiento: string | null
    evaluacionRiesgoControl: number | null
    nivelRiesgoControl: string | null
    tipoControl: string | null
    riesgoResidual: string | null
    controlesImplementar: string | null
}

// ── Heatmap module ────────────────────────────────────────────────────────────

export interface HeatmapCellDto {
    x: string   // "1. Bajo" | "2. Medio" | "3. Alto"
    y: number   // cell count
}

export interface HeatmapSerieDto {
    name: string            // series label (e.g. "Conteo")
    data: HeatmapCellDto[]  // 9 cells (3×3)
}

// ── Parametros module ───────────────────────────────────────────────────────────

export interface ConfiguracionRiesgo {
    id: number
    riesgoBajoMax: number
    riesgoBajoDesde: number
    riesgoMedioMax: number
    riesgoMedioDesde: number
    riesgoAltoMax: number
    riesgoAltoDesde: number
    controlBajoMax: number
    controlBajoDesde: number
    controlMedioMax: number
    controlMedioDesde: number
    controlAltoMax: number
    controlAltoDesde: number
    residualAceptableMax: number
    residualAceptableDesde: number
    residualInaceptableDesde: number
    residualInaceptableMax: number
}