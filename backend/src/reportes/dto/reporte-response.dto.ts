export class NivelCount {
  Alto: number;
  Medio: number;
  Bajo: number;
}

export class ResumenReporteDto {
  totalActivos: number;
  conRiesgo: number;
  sinRiesgo: number;
  distribucionRiesgos: NivelCount;
  distribucionControles: NivelCount;
}

export class RiesgoPorActivoDto {
  activoId: number;
  nombre: string;
  tipoActivo: string;
  macroproceso: string;
  evaluacionRiesgo: number | null;
  nivelRiesgo: string | null;
  metodoTratamiento: string | null;
  riesgoResidual: string | null;
}

export class RiesgoPorMacroProcesoDto {
  macroprocesoId: number;
  macroproceso: string;
  totalActivos: number;
  riesgosBajo: number;
  riesgosMedio: number;
  riesgosAlto: number;
  promedioEvaluacion: number;
}

export class TratamientoReporteDto {
  distribucionMetodos: Record<string, number>;
  distribucionResidual: { ACEPTABLE: number; INACEPTABLE: number };
}

export class CiaReporteDto {
  confidencialidad: NivelCount;
  integridad: NivelCount;
  disponibilidad: NivelCount;
  impacto: NivelCount;
}

export class ValoracionActivoReporteDto {
  id: number;
  nombreActivo: string;
  ubicacion: string;
  tipoActivo: string;
  formato: string;
  macroProceso: string;
  custodio: string;
  confidencialidad: string;
  integridad: string;
  disponibilidad: string;
  impacto: number | null;
}

export class IndiceReporteDto {
  endpoints: { ruta: string; descripcion: string }[];
}

export class AnalisisRiesgoActivoDto {
  id: number;
  nombreActivo: string;
  macroProceso: string;
  amenaza: string;
  vulnerabilidad: string;
  controlesImplementados: string | null;
}

export class EvaluacionRiesgoReporteDto {
  id: number;
  nombreActivo: string;
  macroProceso: string;
  amenaza: string;
  vulnerabilidad: string;
  impacto: number | null;
  nivelAmenaza: string | null;
  nivelVulnerabilidad: string | null;
  evaluacionRiesgo: number | null;
  nivelRiesgo: string | null;
  controlesArea: string | null;
}

export class HeatmapCellDto {
  x: string;
  y: number;
}

export class HeatmapSerieDto {
  name: string;
  data: HeatmapCellDto[];
}

export type HeatmapReporteDto = HeatmapSerieDto[];

export class HeatmapCellDetailDto {
  id: number;
  nombreActivo: string;
  macroProceso: string;
  nivelRiesgo: string | null;
  evaluacionRiesgo: number | null;
}

export class TratamientoRiesgoReporteDto {
  id: number;
  nombreActivo: string;
  macroProceso: string;
  amenaza: string;
  vulnerabilidad: string;
  nivelAmenaza: string | null;
  nivelVulnerabilidad: string | null;
  impacto: number | null;
  metodoTratamiento: string | null;
  evaluacionRiesgoControl: number | null;
  nivelRiesgoControl: string | null;
  tipoControl: string | null;
  riesgoResidual: string | null;
  controlesImplementar: string | null;
}

export class PlanTratamientoReporteDto {
  id: number;
  tipoActivo: string;
  opcionTratamiento: string;
  controlesImplementar: string;
  descripcionActividades: string;
  responsablesImplementacion: string;
  areaFuncional: string;
  plazoImplementacion: string;
  fechaInicioImplementacion: Date | null;
  fechaFinImplementacion: Date | null;
  horaDia: number;
  montoUSD: string;
  estado: string;
  observaciones: string | null;
}

export class ActivosCriticosPorAreaDto {
  area: string;
  cantidad: number;
}
