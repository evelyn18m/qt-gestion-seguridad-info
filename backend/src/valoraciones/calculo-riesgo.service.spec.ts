import { calculateRiesgo } from './calculo-riesgo.service';

describe('calculateRiesgo — boundary value tests', () => {
  describe('evaluacionRiesgo = VA × nivelAmenaza × nivelVulnerabilidad', () => {
    it('(1,1,1) → evaluacionRiesgo=1, nivelRiesgo=BAJO', () => {
      const result = calculateRiesgo(1, 1, 1);
      expect(result.evaluacionRiesgo).toBe(1);
      expect(result.nivelRiesgo).toBe('BAJO');
    });

    it('(3,1,1) → evaluacionRiesgo=3, nivelRiesgo=BAJO', () => {
      const result = calculateRiesgo(3, 1, 1);
      expect(result.evaluacionRiesgo).toBe(3);
      expect(result.nivelRiesgo).toBe('BAJO');
    });

    it('(1,2,2) → evaluacionRiesgo=4, nivelRiesgo=MEDIO', () => {
      const result = calculateRiesgo(1, 2, 2);
      expect(result.evaluacionRiesgo).toBe(4);
      expect(result.nivelRiesgo).toBe('MEDIO');
    });

    it('(2,2,2) → evaluacionRiesgo=8, nivelRiesgo=MEDIO', () => {
      const result = calculateRiesgo(2, 2, 2);
      expect(result.evaluacionRiesgo).toBe(8);
      expect(result.nivelRiesgo).toBe('MEDIO');
    });

    it('(1,3,3) → evaluacionRiesgo=9, nivelRiesgo=ALTO', () => {
      const result = calculateRiesgo(1, 3, 3);
      expect(result.evaluacionRiesgo).toBe(9);
      expect(result.nivelRiesgo).toBe('ALTO');
    });

    it('(3,3,3) → evaluacionRiesgo=27, nivelRiesgo=ALTO', () => {
      const result = calculateRiesgo(3, 3, 3);
      expect(result.evaluacionRiesgo).toBe(27);
      expect(result.nivelRiesgo).toBe('ALTO');
    });
  });

  describe('nivelRiesgo derivation: 1-3=BAJO, 4-8=MEDIO, 9-27=ALTO', () => {
    it('evaluacionRiesgo=2 → nivelRiesgo=BAJO', () => {
      // VA=2, amenaza=1, vuln=2 → 2×1×2=4 → MEDIO by formula
      // To get evaluacionRiesgo=2 directly we need evaluate with the formula:
      // The function computes evaluacionRiesgo from inputs, so test via boundary:
      // Input (2,1,1) gives evaluacionRiesgo=2 → BAJO
      const result = calculateRiesgo(2, 1, 1);
      expect(result.evaluacionRiesgo).toBe(2);
      expect(result.nivelRiesgo).toBe('BAJO');
    });

    it('evaluacionRiesgo=4 → nivelRiesgo=MEDIO', () => {
      const result = calculateRiesgo(1, 2, 2);
      expect(result.evaluacionRiesgo).toBe(4);
      expect(result.nivelRiesgo).toBe('MEDIO');
    });

    it('evaluacionRiesgo=9 → nivelRiesgo=ALTO', () => {
      const result = calculateRiesgo(1, 3, 3);
      expect(result.evaluacionRiesgo).toBe(9);
      expect(result.nivelRiesgo).toBe('ALTO');
    });
  });

  describe('metodoTratamiento derivation: 1-3=RETENER/ACEPTAR, 4-27=MODIFICAR/PREVENIR/COMPARTIR', () => {
    it('evaluacionRiesgo=2 → metodoTratamiento=RETENER / ACEPTAR', () => {
      const result = calculateRiesgo(2, 1, 1);
      expect(result.evaluacionRiesgo).toBe(2);
      expect(result.metodoTratamiento).toBe('RETENER / ACEPTAR');
    });

    it('evaluacionRiesgo=3 → metodoTratamiento=RETENER / ACEPTAR', () => {
      const result = calculateRiesgo(3, 1, 1);
      expect(result.evaluacionRiesgo).toBe(3);
      expect(result.metodoTratamiento).toBe('RETENER / ACEPTAR');
    });

    it('evaluacionRiesgo=4 → metodoTratamiento=MODIFICAR / PREVENIR / COMPARTIR', () => {
      const result = calculateRiesgo(1, 2, 2);
      expect(result.evaluacionRiesgo).toBe(4);
      expect(result.metodoTratamiento).toBe('MODIFICAR / PREVENIR / COMPARTIR');
    });

    it('evaluacionRiesgo=6 → metodoTratamiento=MODIFICAR / PREVENIR / COMPARTIR', () => {
      const result = calculateRiesgo(2, 1, 3);
      expect(result.evaluacionRiesgo).toBe(6);
      expect(result.metodoTratamiento).toBe('MODIFICAR / PREVENIR / COMPARTIR');
    });

    it('evaluacionRiesgo=18 → metodoTratamiento=MODIFICAR / PREVENIR / COMPARTIR', () => {
      const result = calculateRiesgo(2, 3, 3);
      expect(result.evaluacionRiesgo).toBe(18);
      expect(result.metodoTratamiento).toBe('MODIFICAR / PREVENIR / COMPARTIR');
    });
  });

  describe('tipoControl derivation: 1-3=Monitoreo, 4-8=Preventivo, 9-27=Correctivo', () => {
    it('evaluacionRiesgo=2 → tipoControl=Monitoreo', () => {
      const result = calculateRiesgo(2, 1, 1);
      expect(result.evaluacionRiesgo).toBe(2);
      expect(result.tipoControl).toBe('Monitoreo');
    });

    it('evaluacionRiesgo=3 → tipoControl=Monitoreo', () => {
      const result = calculateRiesgo(3, 1, 1);
      expect(result.evaluacionRiesgo).toBe(3);
      expect(result.tipoControl).toBe('Monitoreo');
    });

    it('evaluacionRiesgo=5 → tipoControl=Preventivo', () => {
      const result = calculateRiesgo(1, 1, 5);
      expect(result.evaluacionRiesgo).toBe(5);
      expect(result.tipoControl).toBe('Preventivo');
    });

    it('evaluacionRiesgo=8 → tipoControl=Preventivo', () => {
      const result = calculateRiesgo(2, 2, 2);
      expect(result.evaluacionRiesgo).toBe(8);
      expect(result.tipoControl).toBe('Preventivo');
    });

    it('evaluacionRiesgo=12 → tipoControl=Correctivo', () => {
      const result = calculateRiesgo(1, 3, 4);
      expect(result.evaluacionRiesgo).toBe(12);
      expect(result.tipoControl).toBe('Correctivo');
    });
  });

  describe('riesgoResidual derivation', () => {
    it('evaluacionRiesgoControl=2 (≤3) → riesgoResidual=ACEPTABLE', () => {
      const result = calculateRiesgo(1, 1, 1, 2, 1);
      expect(result.evaluacionRiesgoControl).toBe(2);
      expect(result.riesgoResidual).toBe('ACEPTABLE');
    });

    it('evaluacionRiesgoControl=5 (>3) → riesgoResidual=INACEPTABLE', () => {
      const result = calculateRiesgo(1, 1, 1, 1, 5);
      expect(result.evaluacionRiesgoControl).toBe(5);
      expect(result.riesgoResidual).toBe('INACEPTABLE');
    });
  });

  describe('complete boundary case (1,1,1)', () => {
    it('returns all fields correctly for minimum risk', () => {
      const result = calculateRiesgo(1, 1, 1);
      expect(result.evaluacionRiesgo).toBe(1);
      expect(result.nivelRiesgo).toBe('BAJO');
      expect(result.metodoTratamiento).toBe('RETENER / ACEPTAR');
      expect(result.tipoControl).toBe('Monitoreo');
    });
  });

  describe('complete boundary case (3,3,3)', () => {
    it('returns all fields correctly for maximum risk', () => {
      const result = calculateRiesgo(3, 3, 3);
      expect(result.evaluacionRiesgo).toBe(27);
      expect(result.nivelRiesgo).toBe('ALTO');
      expect(result.metodoTratamiento).toBe('MODIFICAR / PREVENIR / COMPARTIR');
      expect(result.tipoControl).toBe('Correctivo');
    });
  });

  describe('returned object shape', () => {
    it('returns RiesgoCalculado with all required fields', () => {
      const result = calculateRiesgo(2, 2, 2);
      expect(result).toHaveProperty('evaluacionRiesgo');
      expect(result).toHaveProperty('nivelRiesgo');
      expect(result).toHaveProperty('metodoTratamiento');
      expect(result).toHaveProperty('tipoControl');
      // Control fields are present only when control params are provided
      expect(result).toHaveProperty('evaluacionRiesgoControl');
      expect(result).toHaveProperty('nivelRiesgoControl');
      expect(result).toHaveProperty('riesgoResidual');
    });

    it('evaluacionRiesgoControl is undefined when control params not provided', () => {
      const result = calculateRiesgo(2, 2, 2);
      expect(result.evaluacionRiesgoControl).toBeUndefined();
      expect(result.nivelRiesgoControl).toBeUndefined();
      expect(result.riesgoResidual).toBeUndefined();
    });

    it('evaluacionRiesgoControl is present and derived when control params provided', () => {
      const result = calculateRiesgo(2, 2, 2, 1, 1);
      expect(result.evaluacionRiesgoControl).toBe(2);
      expect(result.nivelRiesgoControl).toBe('BAJO');
      expect(result.riesgoResidual).toBe('ACEPTABLE');
    });
  });
});
