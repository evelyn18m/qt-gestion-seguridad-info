import { parseRiesgoRows } from './riesgo-parser';

describe('parseRiesgoRows — section-aware Riesgo seed parser', () => {
  describe('basic parsing', () => {
    it('RED: parses Amenaza rows with correct tipo, nivel, valor', () => {
      const input = [
        { 'Tabla de evaluacion del Riesgo': 'Evaluacion de Amenaza' },
        { 'Tabla de evaluacion del Riesgo': 'Alto (3)' },
        { 'Tabla de evaluacion del Riesgo': 'Medio (2)' },
        { 'Tabla de evaluacion del Riesgo': 'Bajo (1)' },
      ];

      const result = parseRiesgoRows(input);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ tipo: 'Amenaza', nivel: 'Alto', valor: 3 });
      expect(result[1]).toEqual({ tipo: 'Amenaza', nivel: 'Medio', valor: 2 });
      expect(result[2]).toEqual({ tipo: 'Amenaza', nivel: 'Bajo', valor: 1 });
    });

    it('RED: parses Vulnerabilidad rows with correct tipo, nivel, valor', () => {
      const input = [
        { 'Tabla de evaluacion del Riesgo': 'Evaluacion de Vulnerabilidad' },
        { 'Tabla de evaluacion del Riesgo': 'Alto (3)' },
        { 'Tabla de evaluacion del Riesgo': 'Medio (2)' },
        { 'Tabla de evaluacion del Riesgo': 'Bajo (1)' },
      ];

      const result = parseRiesgoRows(input);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ tipo: 'Vulnerabilidad', nivel: 'Alto', valor: 3 });
      expect(result[1]).toEqual({ tipo: 'Vulnerabilidad', nivel: 'Medio', valor: 2 });
      expect(result[2]).toEqual({ tipo: 'Vulnerabilidad', nivel: 'Bajo', valor: 1 });
    });

    it('RED: returns empty array for empty input', () => {
      const result = parseRiesgoRows([]);
      expect(result).toEqual([]);
    });

    it('RED: skips rows without a header preceding them', () => {
      const input = [
        { 'Tabla de evaluacion del Riesgo': 'Alto (3)' },
        { 'Tabla de evaluacion del Riesgo': 'Medio (2)' },
      ];

      const result = parseRiesgoRows(input);

      expect(result).toHaveLength(0);
    });

    it('RED: handles null/undefined text gracefully', () => {
      const input = [
        { 'Tabla de evaluacion del Riesgo': undefined as unknown as string },
        { 'Tabla de evaluacion del Riesgo': 'Evaluacion de Amenaza' },
        { 'Tabla de evaluacion del Riesgo': 'Alto (3)' },
      ];

      const result = parseRiesgoRows(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ tipo: 'Amenaza', nivel: 'Alto', valor: 3 });
    });

    it('RED: handles rows with extra whitespace in nivel text', () => {
      const input = [
        { 'Tabla de evaluacion del Riesgo': 'Evaluacion de Amenaza' },
        { 'Tabla de evaluacion del Riesgo': '  Alto  (3)  ' },
      ];

      const result = parseRiesgoRows(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ tipo: 'Amenaza', nivel: 'Alto', valor: 3 });
    });
  });

  describe('full catalog', () => {
    it('RED: parses both Amenaza and Vulnerabilidad sections from full catalog', () => {
      const input = [
        { 'Tabla de evaluacion del Riesgo': 'Evaluacion de Amenaza' },
        { 'Tabla de evaluacion del Riesgo': 'Alto (3)' },
        { 'Tabla de evaluacion del Riesgo': 'Medio (2)' },
        { 'Tabla de evaluacion del Riesgo': 'Bajo (1)' },
        { 'Tabla de evaluacion del Riesgo': 'Evaluacion de Vulnerabilidad' },
        { 'Tabla de evaluacion del Riesgo': 'Alto (3)' },
        { 'Tabla de evaluacion del Riesgo': 'Medio (2)' },
        { 'Tabla de evaluacion del Riesgo': 'Bajo (1)' },
      ];

      const result = parseRiesgoRows(input);

      expect(result).toHaveLength(6);

      // First 3 are Amenaza
      expect(result[0]).toEqual({ tipo: 'Amenaza', nivel: 'Alto', valor: 3 });
      expect(result[1]).toEqual({ tipo: 'Amenaza', nivel: 'Medio', valor: 2 });
      expect(result[2]).toEqual({ tipo: 'Amenaza', nivel: 'Bajo', valor: 1 });

      // Next 3 are Vulnerabilidad
      expect(result[3]).toEqual({ tipo: 'Vulnerabilidad', nivel: 'Alto', valor: 3 });
      expect(result[4]).toEqual({ tipo: 'Vulnerabilidad', nivel: 'Medio', valor: 2 });
      expect(result[5]).toEqual({ tipo: 'Vulnerabilidad', nivel: 'Bajo', valor: 1 });
    });
  });
});
