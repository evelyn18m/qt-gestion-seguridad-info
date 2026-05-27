export class DetalleRiesgoDto {
  id?: number;
  tipo: string; // "amenaza" | "vulnerabilidad"
  catalogoId: number;
  riesgoId?: number;
  evaluacionRiesgo?: number;
  nivelRiesgo?: string;
  metodoTratamiento?: string;
  tipoControlId?: number;
  riesgoControlId?: number;
  evaluacionRiesgoControl?: number;
  nivelRiesgoControl?: string;
}

export class CreateValoracionDto {
  // Tab 1: Valoración de Activo
  nombreActivo: string;
  tipoActivoId: number;
  formatoId: number;
  macroProcesoId: number;
  subProcesoId: number;
  propietarioId: number;
  custodioId: number;
  descripcion: string;
  controlSeguridad: string;
  ubicacion: string;
  observaciones?: string;
  confidencialidadId: number;
  integridadId: number;
  disponibilidadId: number;
  tieneDatosPersonales?: boolean;

  // Tab 2: Análisis de Riesgos
  amenazas?: string;
  vulnerabilidades?: string;
  controlesImplementacion?: string;

  // Tab 3: Evaluación de Riesgo
  impacto?: number;
  probabilidadId?: number;
  amenazaRiesgoId?: number;
  vulnerabilidadRiesgoId?: number;
  controlesArea?: string;
  evaluacionRiesgo?: number;
  nivelRiesgo?: string;

  // Tab 4: Tratamiento de Riesgo
  metodoTratamiento?: string;
  tipoControl?: number;
  controlesImplementar?: string;
  nivelAmenazaControl?: number;
  nivelVulnerabilidadControl?: number;
  evaluacionRiesgoControl?: number;
  nivelRiesgoControl?: string;

  // Detalles individuales de riesgo
  detallesRiesgo?: DetalleRiesgoDto[];
}
