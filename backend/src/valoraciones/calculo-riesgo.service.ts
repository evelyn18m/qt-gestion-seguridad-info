export interface RiesgoCalculado {
  evaluacionRiesgo: number; // 1–27
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO';
  metodoTratamiento: 'RETENER / ACEPTAR' | 'MODIFICAR / PREVENIR / COMPARTIR';
  tipoControl: 'Monitoreo' | 'Preventivo' | 'Correctivo';
  evaluacionRiesgoControl?: number;
  nivelRiesgoControl?: 'BAJO' | 'MEDIO' | 'ALTO';
  riesgoResidual?: 'ACEPTABLE' | 'INACEPTABLE';
}

export interface Thresholds {
  riesgoBajoMax: number;
  riesgoMedioMax: number;
  riesgoAltoMax: number;
  controlBajoMax: number;
  controlMedioMax: number;
  controlAltoMax: number;
  residualAceptableMax: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  riesgoBajoMax: 3,
  riesgoMedioMax: 9,
  riesgoAltoMax: 27,
  controlBajoMax: 3,
  controlMedioMax: 9,
  controlAltoMax: 27,
  residualAceptableMax: 3,
};

/**
 * Derives nivelRiesgo string from evaluacionRiesgo numeric value.
 */
function deriveNivelRiesgo(
  evaluacion: number,
  cfg: Thresholds,
): RiesgoCalculado['nivelRiesgo'] {
  if (evaluacion <= cfg.riesgoBajoMax) return 'BAJO';
  if (evaluacion <= cfg.riesgoMedioMax) return 'MEDIO';
  return 'ALTO';
}

/**
 * Derives metodoTratamiento string from evaluacionRiesgo.
 */
function deriveMetodoTratamiento(
  evaluacion: number,
  cfg: Thresholds,
): RiesgoCalculado['metodoTratamiento'] {
  return evaluacion <= cfg.riesgoBajoMax
    ? 'RETENER / ACEPTAR'
    : 'MODIFICAR / PREVENIR / COMPARTIR';
}

/**
 * Derives tipoControl string from evaluacionRiesgo.
 */
function deriveTipoControl(
  evaluacion: number,
  cfg: Thresholds,
): RiesgoCalculado['tipoControl'] {
  if (evaluacion <= cfg.controlBajoMax) return 'Monitoreo';
  if (evaluacion <= cfg.controlMedioMax) return 'Preventivo';
  return 'Correctivo';
}

/**
 * Pure function: calculates risk assessment and all derived fields.
 *
 * @param va                      — Valorización Activo (1–3)
 * @param nivelAmenaza            — Threat level (1–3)
 * @param nivelVulnerabilidad     — Vulnerability level (1–3)
 * @param nivelAmenazaControl     — Optional: threat level with control (1–3)
 * @param nivelVulnerabilidadControl — Optional: vulnerability level with control (1–3)
 * @param config                  — Optional: custom thresholds (defaults to 3/9/27)
 */
export function calculateRiesgo(
  va: number,
  nivelAmenaza: number,
  nivelVulnerabilidad: number,
  nivelAmenazaControl?: number,
  nivelVulnerabilidadControl?: number,
  config: Thresholds = DEFAULT_THRESHOLDS,
): RiesgoCalculado {
  const evaluacionRiesgo = va * nivelAmenaza * nivelVulnerabilidad;
  const nivelRiesgo = deriveNivelRiesgo(evaluacionRiesgo, config);
  const metodoTratamiento = deriveMetodoTratamiento(evaluacionRiesgo, config);
  const tipoControl = deriveTipoControl(evaluacionRiesgo, config);

  const result: RiesgoCalculado = {
    evaluacionRiesgo,
    nivelRiesgo,
    metodoTratamiento,
    tipoControl,
    // Control fields always present (undefined when params not provided)
    evaluacionRiesgoControl: undefined,
    nivelRiesgoControl: undefined,
    riesgoResidual: undefined,
  };

  if (
    nivelAmenazaControl !== undefined &&
    nivelVulnerabilidadControl !== undefined
  ) {
    const evaluacionRiesgoControl =
      va * nivelAmenazaControl * nivelVulnerabilidadControl;
    const nivelRiesgoControl = deriveNivelRiesgo(
      evaluacionRiesgoControl,
      config,
    );
    const riesgoResidual =
      evaluacionRiesgoControl <= config.residualAceptableMax
        ? 'ACEPTABLE'
        : 'INACEPTABLE';

    result.evaluacionRiesgoControl = evaluacionRiesgoControl;
    result.nivelRiesgoControl = nivelRiesgoControl;
    result.riesgoResidual = riesgoResidual;
  }

  return result;
}
