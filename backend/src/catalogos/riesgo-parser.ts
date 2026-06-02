/**
 * Pure function: parses Riesgo catalog rows from the raw JSON data.
 *
 * Section-aware parser: tracks `currentTipo` from header rows
 * ("Evaluacion de Amenaza", "Evaluacion de Vulnerabilidad") and
 * extracts `nivel`/`valor` from data rows ("Alto (3)", "Medio (2)", "Bajo (1)").
 *
 * Returns an array of { tipo, nivel, valor } objects — 6 rows total
 * (Alto/Medio/Bajo × Amenaza/Vulnerabilidad).
 */
export interface RiesgoRowInput {
  'Tabla de evaluacion del Riesgo': string;
}

export interface RiesgoParsedRow {
  tipo: string;
  nivel: string;
  valor: number;
}

export function parseRiesgoRows(data: RiesgoRowInput[]): RiesgoParsedRow[] {
  let currentTipo = '';
  const result: RiesgoParsedRow[] = [];

  for (const row of data) {
    const text = row['Tabla de evaluacion del Riesgo'];
    if (!text) continue;

    // Header row: "Evaluacion de Amenaza" or "Evaluacion de Vulnerabilidad"
    if (text.includes('Evaluacion de')) {
      currentTipo = text.replace('Evaluacion de ', '').trim();
      continue;
    }

    // Data row: "Alto (3)", "Medio (2)", "Bajo (1)"
    const match = text.match(/^(.+?)\((\d)\)\s*$/);
    if (match && currentTipo) {
      result.push({
        tipo: currentTipo,
        nivel: match[1].trim(),
        valor: parseInt(match[2], 10),
      });
    }
  }

  return result;
}
