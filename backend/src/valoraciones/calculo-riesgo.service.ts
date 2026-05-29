export interface RiesgoCalculado {
  evaluacionRiesgo: number; // 1–27
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO';
  metodoTratamiento: 'RETENER / ACEPTAR' | 'MODIFICAR / PREVENIR / COMPARTIR';
  tipoControl: 'Monitoreo' | 'Preventivo' | 'Correctivo';
  evaluacionRiesgoControl?: number;
  nivelRiesgoControl?: 'BAJO' | 'MEDIO' | 'ALTO';
  riesgoResidual?: 'ACEPTABLE' | 'INACEPTABLE';
}

/**
 * Derives nivelRiesgo string from evaluacionRiesgo numeric value.
 */
function deriveNivelRiesgo(evaluacion: number): RiesgoCalculado['nivelRiesgo'] {
  if (evaluacion <= 3) return 'BAJO';
  if (evaluacion <= 8) return 'MEDIO';
  return 'ALTO';
}

/**
 * Derives metodoTratamiento string from evaluacionRiesgo.
 */
function deriveMetodoTratamiento(
  evaluacion: number,
): RiesgoCalculado['metodoTratamiento'] {
  return evaluacion <= 3
    ? 'RETENER / ACEPTAR'
    : 'MODIFICAR / PREVENIR / COMPARTIR';
}

/**
 * Derives tipoControl string from evaluacionRiesgo.
 */
function deriveTipoControl(evaluacion: number): RiesgoCalculado['tipoControl'] {
  if (evaluacion <= 3) return 'Monitoreo';
  if (evaluacion <= 8) return 'Preventivo';
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
 */
export function calculateRiesgo(
  va: number,
  nivelAmenaza: number,
  nivelVulnerabilidad: number,
  nivelAmenazaControl?: number,
  nivelVulnerabilidadControl?: number,
): RiesgoCalculado {
  const evaluacionRiesgo = va * nivelAmenaza * nivelVulnerabilidad;
  const nivelRiesgo = deriveNivelRiesgo(evaluacionRiesgo);
  const metodoTratamiento = deriveMetodoTratamiento(evaluacionRiesgo);
  const tipoControl = deriveTipoControl(evaluacionRiesgo);

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
    const nivelRiesgoControl = deriveNivelRiesgo(evaluacionRiesgoControl);
    const riesgoResidual =
      evaluacionRiesgoControl <= 3 ? 'ACEPTABLE' : 'INACEPTABLE';

    result.evaluacionRiesgoControl = evaluacionRiesgoControl;
    result.nivelRiesgoControl = nivelRiesgoControl;
    result.riesgoResidual = riesgoResidual;
  }

  return result;
}
