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
