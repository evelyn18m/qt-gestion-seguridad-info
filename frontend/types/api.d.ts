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
    custodioId: string
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
    custodio?: { id: number; nombre: string }[]
    tiposDatosPersonales?: { id: number; nombre: string }[]

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
    // Tab 4 FK: selected catalog control to implement (JSON string of IDs or array)
    controlesImplementarId?: string[] | string
    // Enriched relations from backend
    riesgo?: { id: number; nivel: string; valor: number; tipo: string }
    vulnerabilidadRiesgo?: { id: number; nivel: string; valor: number; tipo: string }
    riesgoControl?: { id: number; nivel: string; valor: number; tipo: string }
    vulnerabilidadControl?: { id: number; nivel: string; valor: number; tipo: string }
    tipoControl?: { id: number; nombre: string }
    controlesImplementar?: ControlesImplementarItem[]
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
    impacto: NivelCount
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

export interface ActivosCriticosPorArea {
    area: string
    cantidad: number
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

export interface PlanTratamientoReporte {
    id: number
    tipoActivo: string
    opcionTratamiento: string
    controlesImplementar: string
    descripcionActividades: string
    responsablesImplementacion: string
    areaFuncional: string
    plazoImplementacion: string
    fechaInicioImplementacion: string | null
    fechaFinImplementacion: string | null
    horaDia: number
    montoUSD: string
    estado: string
    observaciones: string | null
}

// ── Usuarios module ───────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  keycloakSub: string | null;
  username: string;
  email: string;
  primerInicio: boolean;
  habilitado: boolean;
  roles: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUsuarioResponse {
  usuario: Usuario;
  contraseñaGenerada: string;
}

export interface LoginResponse {
  access_token: string;
  usuario: {
    id: string;
    username: string;
    email: string;
    primerInicio?: boolean;
    roles: string[];
  };
}

// ── Audit module ──────────────────────────────────────────────────────────────

export interface AuditLogItem {
    id: number
    accion: string
    modulo: string
    entidad: string | null
    usuarioId: string | null
    usuario: string | null
    detalle: string | null
    ip: string | null
    dispositivo: string | null
    path: string | null
    metodo: string | null
    status: number | null
    duracionMs: number | null
    createdAt: string
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

export interface HeatmapCellDetail {
    id: number
    nombreActivo: string
    macroProceso: string
    nivelRiesgo: string | null
    evaluacionRiesgo: number | null
}

// ── Parametros module ───────────────────────────────────────────────────────────

export interface ConfiguracionRiesgo {
    id: number
    createdAt?: string
    updatedAt?: string
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

// ── Plan de Tratamiento module ────────────────────────────────────────────────

export interface PlazoImplementacion {
    id: number
    codigo: string
    nombre: string
}

export interface PlanTratamiento {
    id: number
    tipoActivoId: number
    activoId?: string | null
    nivelRiesgoId: number
    opcionTratamientoId: number
    controlesImplementarId: string
    descripcionActividades: string
    responsableImplementacionId: string
    areaFuncionalId?: number | null
    plazoImplementacionId?: number | null
    fechaInicioImplementacion?: string | null
    fechaFinImplementacion?: string | null
    recursos?: string | null
    horaDia: string
    montoUSD: string
    estadoId: number
    observaciones?: string | null
    createdAt?: string
    updatedAt?: string
    // Joined relations
    tipoActivo?: { id: number; nombre: string }
    nivelRiesgo?: { id: number; nivel: string }
    opcionTratamiento?: { id: number; nombre: string }
    controlesImplementar?: { id: number; seccion: string; descripcion: string }
    responsable?: { id: number; nombre: string }
    area?: { id: number; nombre: string }
    plazoImplementacion?: PlazoImplementacion | null
    estado?: { id: number; nombre: string }
}