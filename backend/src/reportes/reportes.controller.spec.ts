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
    getValoracionActivos: jest.Mock;
    exportValoracionActivos: jest.Mock;
    getAnalisisRiesgoActivos: jest.Mock;
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

  const mockValoracionActivos = [
    {
      id: 1,
      nombreActivo: 'Servidor A',
      ubicacion: 'Oficina Principal',
      tipoActivo: 'Hardware',
      formato: 'Físico',
      macroProceso: 'Gestión TI',
      custodio: 'Juan Pérez',
      confidencialidad: 'Alto',
      integridad: 'Medio',
      disponibilidad: 'Bajo',
    },
  ];

  const mockAnalisisRiesgoActivos = [
    {
      id: 1,
      nombreActivo: 'Servidor A',
      macroProceso: 'Gestión TI',
      amenaza: 'Phishing, Robo',
      vulnerabilidad: 'Falta de backups',
      controlesImplementados: 'Firewall, Antivirus',
      controlesArea: 'Seguridad física',
    },
  ];

  beforeEach(async () => {
    service = {
      getResumen: jest.fn().mockResolvedValue(mockResumen),
      getRiesgosPorActivo: jest.fn().mockResolvedValue(mockRiesgosPorActivo),
      getRiesgosPorMacroproceso: jest
        .fn()
        .mockResolvedValue(mockRiesgosPorMacroproceso),
      getTratamiento: jest.fn().mockResolvedValue(mockTratamiento),
      getCia: jest.fn().mockResolvedValue(mockCia),
      getValoracionActivos: jest.fn().mockResolvedValue(mockValoracionActivos),
      exportValoracionActivos: jest.fn().mockResolvedValue(Buffer.from('test')),
      getAnalisisRiesgoActivos: jest
        .fn()
        .mockResolvedValue(mockAnalisisRiesgoActivos),
      exportAnalisisRiesgoActivos: jest.fn().mockResolvedValue(Buffer.from('test')),
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

  describe('GET /reportes/valoracion-activos', () => {
    it('debe retornar 200 y lista de valoraciones', async () => {
      const result = await controller.getValoracionActivos({});
      expect(service.getValoracionActivos).toHaveBeenCalled();
      expect(result).toEqual(mockValoracionActivos);
    });

    it('debe reenviar query params al servicio', async () => {
      const query = { q: 'oficina', macroProcesoId: '1', formatoId: '2' };
      await controller.getValoracionActivos(query);
      expect(service.getValoracionActivos).toHaveBeenCalledWith(query);
    });

    it('debe exportar a Excel con filtros aplicados', async () => {
      const query = { q: 'test' };
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;
      await controller.exportValoracionActivos(query, mockRes);
      expect(service.exportValoracionActivos).toHaveBeenCalledWith(query);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.write).toHaveBeenCalled();
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('GET /reportes/analisis-riesgo-activos', () => {
    it('debe retornar 200 y lista de análisis de riesgo de activos', async () => {
      const result = await controller.getAnalisisRiesgoActivos({});
      expect(service.getAnalisisRiesgoActivos).toHaveBeenCalled();
      expect(result).toEqual(mockAnalisisRiesgoActivos);
    });

    it('debe reenviar query params al servicio', async () => {
      const query = {
        q: 'phishing',
        macroProcesoId: '1',
        amenazaId: '2',
        vulnerabilidadId: '3',
      };
      await controller.getAnalisisRiesgoActivos(query);
      expect(service.getAnalisisRiesgoActivos).toHaveBeenCalledWith(query);
    });

    it('debe retornar DTO con shape correcto', async () => {
      const result = await controller.getAnalisisRiesgoActivos({});
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('nombreActivo');
      expect(result[0]).toHaveProperty('macroProceso');
      expect(result[0]).toHaveProperty('amenaza');
      expect(result[0]).toHaveProperty('vulnerabilidad');
      expect(result[0]).toHaveProperty('controlesImplementados');
      expect(result[0]).toHaveProperty('controlesArea');
      expect(result[0]).toEqual(mockAnalisisRiesgoActivos[0]);
    });

    it('debe exportar a Excel con filtros aplicados', async () => {
      const query = { q: 'test' };
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;
      await controller.exportAnalisisRiesgoActivos(query, mockRes);
      expect(service.exportAnalisisRiesgoActivos).toHaveBeenCalledWith(query);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.write).toHaveBeenCalled();
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
