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
    exportAnalisisRiesgoActivos: jest.Mock;
    getEvaluacionRiesgo: jest.Mock;
    exportEvaluacionRiesgo: jest.Mock;
    getTratamientoRiesgo: jest.Mock;
    exportTratamientoRiesgo: jest.Mock;
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
    },
  ];

  const mockEvaluacionRiesgo = [
    {
      id: 1,
      nombreActivo: 'Servidor A',
      macroProceso: 'Gestión TI',
      amenaza: 'Phishing',
      vulnerabilidad: 'Sin backups',
      impacto: 3.5,
      nivelAmenaza: 'Alto',
      nivelVulnerabilidad: 'Bajo',
      evaluacionRiesgo: 4.5,
      nivelRiesgo: 'Medio',
      controlesArea: 'Firewall',
    },
  ];

  const mockTratamientoRiesgo = [
    {
      id: 1,
      nombreActivo: 'Servidor A',
      macroProceso: 'Gestión TI',
      amenaza: 'Phishing',
      vulnerabilidad: 'Sin backups',
      nivelAmenaza: 'Alto',
      nivelVulnerabilidad: 'Bajo',
      impacto: 3.5,
      metodoTratamiento: 'MITIGAR',
      evaluacionRiesgoControl: 3.0,
      nivelRiesgoControl: 'Bajo',
      tipoControl: 'Preventivo',
      riesgoResidual: 'ACEPTABLE',
      controlesImplementar: 'Control de acceso',
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
      getEvaluacionRiesgo: jest.fn().mockResolvedValue(mockEvaluacionRiesgo),
      exportEvaluacionRiesgo: jest.fn().mockResolvedValue(Buffer.from('test')),
      getTratamientoRiesgo: jest.fn().mockResolvedValue(mockTratamientoRiesgo),
      exportTratamientoRiesgo: jest.fn().mockResolvedValue(Buffer.from('test')),
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

  describe('GET /reportes/evaluacion-riesgo', () => {
    it('debe retornar 200 y lista con shape correcto de EvaluacionRiesgoReporteDto', async () => {
      const result = await controller.getEvaluacionRiesgo({});
      expect(service.getEvaluacionRiesgo).toHaveBeenCalled();
      expect(result).toEqual(mockEvaluacionRiesgo);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('nombreActivo');
      expect(result[0]).toHaveProperty('macroProceso');
      expect(result[0]).toHaveProperty('amenaza');
      expect(result[0]).toHaveProperty('vulnerabilidad');
      expect(result[0]).toHaveProperty('impacto');
      expect(result[0]).toHaveProperty('nivelAmenaza');
      expect(result[0]).toHaveProperty('nivelVulnerabilidad');
      expect(result[0]).toHaveProperty('evaluacionRiesgo');
      expect(result[0]).toHaveProperty('nivelRiesgo');
      expect(result[0]).toHaveProperty('controlesArea');
    });

    it('debe reenviar todos los query params al servicio', async () => {
      const query = {
        q: 'servidor',
        macroProcesoId: '1',
        categoriaAmenazaId: 'Técnica',
        amenazaId: '2',
        categoriaVulnerabilidadId: 'Operativa',
        vulnerabilidadId: '3',
        nivelRiesgo: 'Alto',
      };
      await controller.getEvaluacionRiesgo(query);
      expect(service.getEvaluacionRiesgo).toHaveBeenCalledWith(query);
    });

    it('debe exportar Excel con Content-Type y buffer correctos', async () => {
      const query = { macroProcesoId: '1' };
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;
      await controller.exportEvaluacionRiesgo(query, mockRes);
      expect(service.exportEvaluacionRiesgo).toHaveBeenCalledWith(query);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('evaluacion-riesgo'),
      );
      expect(mockRes.write).toHaveBeenCalled();
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('debe pasar los filtros al export', async () => {
      const query = { q: 'test', nivelRiesgo: 'Medio' };
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;
      await controller.exportEvaluacionRiesgo(query, mockRes);
      expect(service.exportEvaluacionRiesgo).toHaveBeenCalledWith(query);
    });
  });

  describe('GET /reportes/tratamiento-riesgo', () => {
    it('debe retornar 200 y lista con shape correcto de TratamientoRiesgoReporteDto', async () => {
      const result = await controller.getTratamientoRiesgo({});
      expect(service.getTratamientoRiesgo).toHaveBeenCalled();
      expect(result).toEqual(mockTratamientoRiesgo);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('nombreActivo');
      expect(result[0]).toHaveProperty('macroProceso');
      expect(result[0]).toHaveProperty('amenaza');
      expect(result[0]).toHaveProperty('vulnerabilidad');
      expect(result[0]).toHaveProperty('nivelAmenaza');
      expect(result[0]).toHaveProperty('nivelVulnerabilidad');
      expect(result[0]).toHaveProperty('impacto');
      expect(result[0]).toHaveProperty('metodoTratamiento');
      expect(result[0]).toHaveProperty('evaluacionRiesgoControl');
      expect(result[0]).toHaveProperty('nivelRiesgoControl');
      expect(result[0]).toHaveProperty('tipoControl');
      expect(result[0]).toHaveProperty('riesgoResidual');
      expect(result[0]).toHaveProperty('controlesImplementar');
    });

    it('debe reenviar todos los query params al servicio', async () => {
      const query = {
        q: 'servidor',
        macroProcesoId: '1',
        tipoControlId: '2',
        nivelRiesgoControl: 'Alto',
        riesgoResidual: 'ACEPTABLE',
      };
      await controller.getTratamientoRiesgo(query);
      expect(service.getTratamientoRiesgo).toHaveBeenCalledWith(query);
    });
  });

  describe('GET /reportes/tratamiento-riesgo/export', () => {
    it('debe exportar Excel con Content-Type y Content-Disposition correctos', async () => {
      const query = { macroProcesoId: '1' };
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;
      await controller.exportTratamientoRiesgo(query, mockRes);
      expect(service.exportTratamientoRiesgo).toHaveBeenCalledWith(query);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('tratamiento-riesgo'),
      );
      expect(mockRes.write).toHaveBeenCalled();
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('debe pasar los filtros al export', async () => {
      const query = { q: 'test', nivelRiesgoControl: 'Medio' };
      const mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;
      await controller.exportTratamientoRiesgo(query, mockRes);
      expect(service.exportTratamientoRiesgo).toHaveBeenCalledWith(query);
    });
  });
});
