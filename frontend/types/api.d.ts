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
  evaluacionRiesgoControl?: number
  nivelRiesgoControl?: string
  riesgoResidual?: 'ACEPTABLE' | 'INACEPTABLE'
  // New per-row fields (Tab 2 row-based model)
  amenazaIds?: string[]
  vulnerabilidadIds?: string[]
  controlesImplementados?: string
  controlesArea?: string
}

export interface ApiError {
  message: string
  statusCode: number
}