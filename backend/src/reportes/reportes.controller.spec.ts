import { Test, TestingModule } from '@nestjs/testing';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

describe('ReportesController', () => {
  let controller: ReportesController;
  let service: {
    getResumen: jest.Mock;
    getRiesgosPorActivo: jest.Mock;
    getRiesgosPorMacroproceso: jest.Mock;
    getTratamiento: jest.Mock;
    getCia: jest.Mock;
  };

  const mockResumen = {
    totalActivos: 10,
    conRiesgo: 7,
    sinRiesgo: 3,
    distribucionRiesgos: { Alto: 2, Medio: 3, Bajo: 2 },
    distribucionControles: { Alto: 1, Medio: 2, Bajo: 4 },
  };

  const mockRiesgosPorActivo = [
    {
      activoId: 1,
      nombre: 'Servidor A',
      tipoActivo: 'Hardware',
      macroproceso: 'Gestión TI',
      evaluacionRiesgo: 9.0,
      nivelRiesgo: 'Alto',
      metodoTratamiento: 'MITIGAR',
      riesgoResidual: 'ACEPTABLE',
    },
  ];

  const mockRiesgosPorMacroproceso = [
    {
      macroprocesoId: 1,
      macroproceso: 'Gestión TI',
      totalActivos: 5,
      riesgosBajo: 1,
      riesgosMedio: 2,
      riesgosAlto: 2,
      promedioEvaluacion: 5.5,
    },
  ];

  const mockTratamiento = {
    distribucionMetodos: { MITIGAR: 5, TRANSFERIR: 2, EVITAR: 1, ASUMIR: 0 },
    distribucionResidual: { ACEPTABLE: 6, INACEPTABLE: 2 },
  };

  const mockCia = {
    confidencialidad: { Alto: 3, Medio: 4, Bajo: 1 },
    integridad: { Alto: 2, Medio: 5, Bajo: 1 },
    disponibilidad: { Alto: 4, Medio: 3, Bajo: 1 },
  };

  beforeEach(async () => {
    service = {
      getResumen: jest.fn().mockResolvedValue(mockResumen),
      getRiesgosPorActivo: jest.fn().mockResolvedValue(mockRiesgosPorActivo),
      getRiesgosPorMacroproceso: jest
        .fn()
        .mockResolvedValue(mockRiesgosPorMacroproceso),
      getTratamiento: jest.fn().mockResolvedValue(mockTratamiento),
      getCia: jest.fn().mockResolvedValue(mockCia),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [{ provide: ReportesService, useValue: service }],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /reportes (index)', () => {
    it('debe retornar lista de endpoints disponibles', () => {
      const result = controller.getIndice();
      expect(result).toHaveProperty('endpoints');
      expect(result.endpoints).toBeInstanceOf(Array);
      expect(result.endpoints.length).toBeGreaterThan(0);
    });
  });

  describe('GET /reportes/resumen', () => {
    it('debe retornar el resumen de reportes', async () => {
      const result = await controller.getResumen();
      expect(service.getResumen).toHaveBeenCalled();
      expect(result).toEqual(mockResumen);
    });
  });

  describe('GET /reportes/riesgos-por-activo', () => {
    it('debe retornar riesgos por activo', async () => {
      const result = await controller.getRiesgosPorActivo();
      expect(service.getRiesgosPorActivo).toHaveBeenCalled();
      expect(result).toEqual(mockRiesgosPorActivo);
    });
  });

  describe('GET /reportes/riesgos-por-macroproceso', () => {
    it('debe retornar riesgos agrupados por macroproceso', async () => {
      const result = await controller.getRiesgosPorMacroproceso();
      expect(service.getRiesgosPorMacroproceso).toHaveBeenCalled();
      expect(result).toEqual(mockRiesgosPorMacroproceso);
    });
  });

  describe('GET /reportes/tratamiento', () => {
    it('debe retornar resumen de tratamiento', async () => {
      const result = await controller.getTratamiento();
      expect(service.getTratamiento).toHaveBeenCalled();
      expect(result).toEqual(mockTratamiento);
    });
  });

  describe('GET /reportes/cia', () => {
    it('debe retornar distribucion CIA', async () => {
      const result = await controller.getCia();
      expect(service.getCia).toHaveBeenCalled();
      expect(result).toEqual(mockCia);
    });
  });
});
