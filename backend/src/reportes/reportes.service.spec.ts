import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { PrismaService } from '../prisma/prisma.service';

const makeVa = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  nombreActivo: 'Servidor A',
  tipoActivoId: 1,
  formatoId: 1,
  macroProcesoId: 1,
  subProcesoId: 1,
  propietarioId: 1,
  custodioId: 1,
  descripcion: '',
  controlSeguridad: '',
  ubicacion: '',
  observaciones: null,
  confidencialidadId: 1,
  integridadId: 2,
  disponibilidadId: 3,
  tieneDatosPersonales: false,
  amenazas: null,
  vulnerabilidades: null,
  controlesImplementacion: null,
  impacto: null,
  probabilidadId: null,
  amenazaRiesgoId: null,
  vulnerabilidadRiesgoId: null,
  controlesArea: null,
  evaluacionRiesgo: 4.5,
  nivelRiesgo: 'Medio',
  metodoTratamiento: 'MITIGAR',
  tipoControl: null,
  controlesImplementar: null,
  nivelAmenazaControl: null,
  nivelVulnerabilidadControl: null,
  evaluacionRiesgoControl: 3.0,
  nivelRiesgoControl: 'Bajo',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeDr = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  valoracionActivoId: 1,
  tipo: 'amenaza',
  catalogoId: 1,
  riesgoId: null,
  vulnerabilidadRiesgoId: null,
  evaluacionRiesgo: 4.5,
  nivelRiesgo: 'Medio',
  metodoTratamiento: 'MITIGAR',
  tipoControlId: 1,
  riesgoControlId: null,
  vulnerabilidadControlId: null,
  evaluacionRiesgoControl: 3.0,
  nivelRiesgoControl: 'Bajo',
  riesgoResidual: 'ACEPTABLE',
  amenazaIds: null,
  vulnerabilidadIds: null,
  controlesImplementados: null,
  controlesArea: null,
  controlesImplementarId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeImpacto = (
  id: number,
  tipo: string,
  nivel: string,
  valor: number,
) => ({
  id,
  tipo,
  nivel,
  valor,
  criterio: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('ReportesService', () => {
  let service: ReportesService;
  let prisma: {
    valoracionActivo: { findMany: jest.Mock };
    detalleRiesgo: { findMany: jest.Mock };
    impacto: { findMany: jest.Mock };
    tipoActivo: { findMany: jest.Mock; findUnique: jest.Mock };
    formato: { findMany: jest.Mock };
    macroProceso: { findMany: jest.Mock; findUnique: jest.Mock };
    funcionario: { findMany: jest.Mock };
    amenaza: { findMany: jest.Mock };
    vulnerabilidad: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      valoracionActivo: { findMany: jest.fn().mockResolvedValue([]) },
      detalleRiesgo: { findMany: jest.fn().mockResolvedValue([]) },
      impacto: { findMany: jest.fn().mockResolvedValue([]) },
      tipoActivo: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      formato: { findMany: jest.fn().mockResolvedValue([]) },
      macroProceso: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      funcionario: { findMany: jest.fn().mockResolvedValue([]) },
      amenaza: { findMany: jest.fn().mockResolvedValue([]) },
      vulnerabilidad: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
  });

  describe('getResumen', () => {
    it('debe retornar conteos correctos con datos', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        makeVa({ id: 1, evaluacionRiesgo: 4.5 }),
        makeVa({ id: 2, evaluacionRiesgo: null }),
        makeVa({ id: 3, evaluacionRiesgo: 2.0 }),
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({ id: 1, nivelRiesgo: 'Medio', nivelRiesgoControl: 'Bajo' }),
        makeDr({ id: 2, nivelRiesgo: 'Alto', nivelRiesgoControl: 'Medio' }),
        makeDr({ id: 3, nivelRiesgo: 'Medio', nivelRiesgoControl: 'Bajo' }),
      ]);

      const result = await service.getResumen();

      expect(result.totalActivos).toBe(3);
      expect(result.conRiesgo).toBe(2);
      expect(result.sinRiesgo).toBe(1);
      expect(result.distribucionRiesgos).toEqual({
        Alto: 1,
        Medio: 2,
        Bajo: 0,
      });
      expect(result.distribucionControles).toEqual({
        Alto: 0,
        Medio: 1,
        Bajo: 2,
      });
    });

    it('debe retornar ceros cuando no hay datos', async () => {
      const result = await service.getResumen();

      expect(result.totalActivos).toBe(0);
      expect(result.conRiesgo).toBe(0);
      expect(result.sinRiesgo).toBe(0);
      expect(result.distribucionRiesgos).toEqual({
        Alto: 0,
        Medio: 0,
        Bajo: 0,
      });
      expect(result.distribucionControles).toEqual({
        Alto: 0,
        Medio: 0,
        Bajo: 0,
      });
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.valoracionActivo.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );

      await expect(service.getResumen()).rejects.toThrow(HttpException);
      await expect(service.getResumen()).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe('getRiesgosPorActivo', () => {
    it('debe retornar activos con riesgo enriquecidos', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        makeVa({
          id: 1,
          nombreActivo: 'Servidor A',
          tipoActivoId: 1,
          macroProcesoId: 1,
          evaluacionRiesgo: 4.5,
          nivelRiesgo: 'Medio',
          metodoTratamiento: 'MITIGAR',
        }),
        makeVa({
          id: 2,
          nombreActivo: 'Servidor B',
          tipoActivoId: 2,
          macroProcesoId: 1,
          evaluacionRiesgo: 9.0,
          nivelRiesgo: 'Alto',
          metodoTratamiento: 'EVITAR',
        }),
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({ id: 1, valoracionActivoId: 1, riesgoResidual: 'ACEPTABLE' }),
        makeDr({ id: 2, valoracionActivoId: 2, riesgoResidual: 'INACEPTABLE' }),
      ]);
      prisma.tipoActivo.findUnique.mockImplementation(({ where }) => {
        if (where.id === 1) return Promise.resolve({ nombre: 'Hardware' });
        if (where.id === 2) return Promise.resolve({ nombre: 'Software' });
        return Promise.resolve(null);
      });
      prisma.macroProceso.findUnique.mockResolvedValue({
        nombre: 'Gestión TI',
      });

      const result = await service.getRiesgosPorActivo();

      // Should be sorted by evaluacionRiesgo DESC
      expect(result).toHaveLength(2);
      expect(result[0].activoId).toBe(2); // Highest riesgo first
      expect(result[0].nombre).toBe('Servidor B');
      expect(result[0].tipoActivo).toBe('Software');
      expect(result[0].macroproceso).toBe('Gestión TI');
      expect(result[0].evaluacionRiesgo).toBe(9.0);
      expect(result[0].nivelRiesgo).toBe('Alto');
      expect(result[0].metodoTratamiento).toBe('EVITAR');
      expect(result[0].riesgoResidual).toBe('INACEPTABLE');
      expect(result[1].activoId).toBe(1);
    });

    it('debe retornar array vacío sin datos', async () => {
      const result = await service.getRiesgosPorActivo();
      expect(result).toEqual([]);
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.valoracionActivo.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );
      await expect(service.getRiesgosPorActivo()).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getRiesgosPorMacroproceso', () => {
    it('debe agrupar por macroproceso correctamente', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        makeVa({
          id: 1,
          macroProcesoId: 1,
          evaluacionRiesgo: 4.0,
          nivelRiesgo: 'Medio',
        }),
        makeVa({
          id: 2,
          macroProcesoId: 1,
          evaluacionRiesgo: 8.0,
          nivelRiesgo: 'Alto',
        }),
        makeVa({
          id: 3,
          macroProcesoId: 2,
          evaluacionRiesgo: 2.0,
          nivelRiesgo: 'Bajo',
        }),
      ]);
      prisma.macroProceso.findUnique.mockImplementation(({ where }) => {
        if (where.id === 1)
          return Promise.resolve({ id: 1, nombre: 'Gestión TI' });
        if (where.id === 2)
          return Promise.resolve({ id: 2, nombre: 'Recursos Humanos' });
        return Promise.resolve(null);
      });

      const result = await service.getRiesgosPorMacroproceso();

      expect(result).toHaveLength(2);
      const mp1 = result.find((r) => r.macroprocesoId === 1);
      expect(mp1).toBeDefined();
      expect(mp1!.totalActivos).toBe(2);
      expect(mp1!.riesgosBajo).toBe(0);
      expect(mp1!.riesgosMedio).toBe(1);
      expect(mp1!.riesgosAlto).toBe(1);
      expect(mp1!.promedioEvaluacion).toBe(6.0);

      const mp2 = result.find((r) => r.macroprocesoId === 2);
      expect(mp2).toBeDefined();
      expect(mp2!.totalActivos).toBe(1);
      expect(mp2!.riesgosBajo).toBe(1);
      expect(mp2!.promedioEvaluacion).toBe(2.0);
    });

    it('debe retornar array vacío sin datos', async () => {
      const result = await service.getRiesgosPorMacroproceso();
      expect(result).toEqual([]);
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.valoracionActivo.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );
      await expect(service.getRiesgosPorMacroproceso()).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getTratamiento', () => {
    it('debe contar metodos y residual correctamente', async () => {
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          metodoTratamiento: 'MITIGAR',
          riesgoResidual: 'ACEPTABLE',
        }),
        makeDr({
          id: 2,
          metodoTratamiento: 'MITIGAR',
          riesgoResidual: 'ACEPTABLE',
        }),
        makeDr({
          id: 3,
          metodoTratamiento: 'TRANSFERIR',
          riesgoResidual: 'INACEPTABLE',
        }),
        makeDr({
          id: 4,
          metodoTratamiento: 'EVITAR',
          riesgoResidual: 'ACEPTABLE',
        }),
        makeDr({
          id: 5,
          metodoTratamiento: 'ASUMIR',
          riesgoResidual: 'INACEPTABLE',
        }),
      ]);

      const result = await service.getTratamiento();

      expect(result.distribucionMetodos).toEqual({
        MITIGAR: 2,
        TRANSFERIR: 1,
        EVITAR: 1,
        ASUMIR: 1,
      });
      expect(result.distribucionResidual).toEqual({
        ACEPTABLE: 3,
        INACEPTABLE: 2,
      });
    });

    it('debe retornar ceros sin datos', async () => {
      const result = await service.getTratamiento();

      expect(result.distribucionMetodos).toEqual({
        MITIGAR: 0,
        TRANSFERIR: 0,
        EVITAR: 0,
        ASUMIR: 0,
      });
      expect(result.distribucionResidual).toEqual({
        ACEPTABLE: 0,
        INACEPTABLE: 0,
      });
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.detalleRiesgo.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );
      await expect(service.getTratamiento()).rejects.toThrow(HttpException);
    });
  });

  describe('getCia', () => {
    it('debe calcular distribucion CIA correctamente', async () => {
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Confidencialidad', 'Alto', 3),
        makeImpacto(2, 'Confidencialidad', 'Medio', 2),
        makeImpacto(3, 'Confidencialidad', 'Bajo', 1),
        makeImpacto(4, 'Integridad', 'Alto', 3),
        makeImpacto(5, 'Integridad', 'Medio', 2),
        makeImpacto(6, 'Integridad', 'Bajo', 1),
        makeImpacto(7, 'Disponibilidad', 'Alto', 3),
        makeImpacto(8, 'Disponibilidad', 'Medio', 2),
        makeImpacto(9, 'Disponibilidad', 'Bajo', 1),
      ]);
      prisma.valoracionActivo.findMany.mockResolvedValue([
        makeVa({
          id: 1,
          confidencialidadId: 1,
          integridadId: 2,
          disponibilidadId: 3,
        }),
        makeVa({
          id: 2,
          confidencialidadId: 1,
          integridadId: 4,
          disponibilidadId: 7,
        }),
        makeVa({
          id: 3,
          confidencialidadId: 2,
          integridadId: 5,
          disponibilidadId: 8,
        }),
      ]);

      const result = await service.getCia();

      expect(result.confidencialidad).toEqual({
        Alto: 2,
        Medio: 1,
        Bajo: 0,
      });
      // integridadId: 2→Medio, 4→Alto, 5→Medio
      expect(result.integridad).toEqual({
        Alto: 1,
        Medio: 2,
        Bajo: 0,
      });
      // disponibilidadId: 3→Bajo, 7→Alto, 8→Medio
      expect(result.disponibilidad).toEqual({
        Alto: 1,
        Medio: 1,
        Bajo: 1,
      });
    });

    it('debe retornar ceros sin datos', async () => {
      prisma.impacto.findMany.mockResolvedValue([]);
      const result = await service.getCia();

      expect(result.confidencialidad).toEqual({
        Alto: 0,
        Medio: 0,
        Bajo: 0,
      });
      expect(result.integridad).toEqual({
        Alto: 0,
        Medio: 0,
        Bajo: 0,
      });
      expect(result.disponibilidad).toEqual({
        Alto: 0,
        Medio: 0,
        Bajo: 0,
      });
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.valoracionActivo.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );
      await expect(service.getCia()).rejects.toThrow(HttpException);
    });
  });

  describe('getValoracionActivos', () => {
    it('debe llamar findMany con where correcto para filtros exactos', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);

      await service.getValoracionActivos({
        macroProcesoId: '1',
        formatoId: '2',
        custodioId: '3',
        confidencialidadId: '4',
        integridadId: '5',
        disponibilidadId: '6',
      });

      expect(prisma.valoracionActivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ macroProcesoId: 1 }),
              expect.objectContaining({ formatoId: 2 }),
              expect.objectContaining({ custodioId: 3 }),
              expect.objectContaining({ confidencialidadId: 4 }),
              expect.objectContaining({ integridadId: 5 }),
              expect.objectContaining({ disponibilidadId: 6 }),
            ]),
          }),
        }),
      );
    });

    it('debe llamar findMany con where correcto para búsqueda de texto', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);

      await service.getValoracionActivos({ q: 'oficina' });

      expect(prisma.valoracionActivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  expect.objectContaining({
                    nombreActivo: { contains: 'oficina' },
                  }),
                  expect.objectContaining({
                    ubicacion: { contains: 'oficina' },
                  }),
                ],
              }),
            ]),
          }),
        }),
      );
    });

    it('debe escapar % y _ en búsqueda de texto', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);

      await service.getValoracionActivos({ q: '50%_off' });

      expect(prisma.valoracionActivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  expect.objectContaining({
                    nombreActivo: { contains: '50\\%\\_off' },
                  }),
                  expect.objectContaining({
                    ubicacion: { contains: '50\\%\\_off' },
                  }),
                ],
              }),
            ]),
          }),
        }),
      );
    });

    it('debe enriquecer nombres de relaciones correctamente', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        makeVa({
          id: 1,
          nombreActivo: 'Servidor A',
          ubicacion: 'Oficina Principal',
          tipoActivoId: 1,
          formatoId: 2,
          macroProcesoId: 3,
          custodioId: 4,
          confidencialidadId: 5,
          integridadId: 6,
          disponibilidadId: 7,
        }),
      ]);
      prisma.tipoActivo.findMany.mockResolvedValue([
        { id: 1, nombre: 'Hardware' },
      ]);
      prisma.formato.findMany.mockResolvedValue([{ id: 2, nombre: 'Físico' }]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 3, nombre: 'Gestión TI' },
      ]);
      prisma.funcionario.findMany.mockResolvedValue([
        { id: 4, nombre: 'Juan Pérez' },
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        {
          id: 5,
          nombre: 'Alto',
          tipo: 'Confidencialidad',
          nivel: 'Alto',
          valor: 3,
          criterio: '',
        },
        {
          id: 6,
          nombre: 'Medio',
          tipo: 'Integridad',
          nivel: 'Medio',
          valor: 2,
          criterio: '',
        },
        {
          id: 7,
          nombre: 'Bajo',
          tipo: 'Disponibilidad',
          nivel: 'Bajo',
          valor: 1,
          criterio: '',
        },
      ]);

      const result = await service.getValoracionActivos({});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
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
        impacto: null,
      });
    });

    it('debe retornar array vacío cuando no hay datos', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);

      const result = await service.getValoracionActivos({});

      expect(result).toEqual([]);
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.valoracionActivo.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );
      await expect(service.getValoracionActivos({})).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getAnalisisRiesgoActivos', () => {
    it('debe llamar findMany con valoracionActivoId in array cuando macroProcesoId se filtra', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([]);

      await service.getAnalisisRiesgoActivos({ macroProcesoId: '1' });

      expect(prisma.valoracionActivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ macroProcesoId: 1 }),
          select: expect.objectContaining({ id: true }),
        }),
      );
    });

    it('debe enriquecer nombres de amenazas y vulnerabilidades concatenando múltiples', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'Servidor A', macroProcesoId: 1 },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1,2]',
          vulnerabilidadIds: '[3,4]',
          controlesImplementados: 'Firewall',
          controlesArea: 'Seguridad',
        }),
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 1, nombre: 'Gestión TI' },
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        { id: 1, nombre: 'Robo', categoria: 'Física' },
        { id: 2, nombre: 'Incendio', categoria: 'Física' },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        { id: 3, descripcion: 'Falta de backups', categoria: 'Operativa' },
        { id: 4, descripcion: 'Personal sin capacitar', categoria: 'Humana' },
      ]);

      const result = await service.getAnalisisRiesgoActivos({});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        nombreActivo: 'Servidor A',
        macroProceso: 'Gestión TI',
        amenaza: 'Robo, Incendio',
        vulnerabilidad: 'Falta de backups, Personal sin capacitar',
        controlesImplementados: 'Firewall',
        controlesArea: 'Seguridad',
      });
    });

    it('debe filtrar en memoria por amenazaId y vulnerabilidadId', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'A', macroProcesoId: 1 },
        { id: 2, nombreActivo: 'B', macroProcesoId: 1 },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
          controlesImplementados: null,
          controlesArea: null,
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          amenazaIds: '[2]',
          vulnerabilidadIds: '[4]',
          controlesImplementados: null,
          controlesArea: null,
        }),
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);
      prisma.amenaza.findMany.mockResolvedValue([
        { id: 1, nombre: 'Phishing', categoria: 'Técnica' },
        { id: 2, nombre: 'Robo', categoria: 'Física' },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        { id: 3, descripcion: 'Sin backup', categoria: 'Operativa' },
        { id: 4, descripcion: 'Sin policy', categoria: 'Humana' },
      ]);

      const result = await service.getAnalisisRiesgoActivos({
        amenazaId: '1',
        vulnerabilidadId: '3',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('debe manejar JSON malformado sin lanzar error y excluir del filtro', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'Servidor A', macroProcesoId: 1 },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: 'invalid',
          vulnerabilidadIds: '[1]',
          controlesImplementados: null,
          controlesArea: null,
        }),
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 1, nombre: 'Gestión TI' },
      ]);
      prisma.amenaza.findMany.mockResolvedValue([]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        { id: 1, descripcion: 'Sin backup', categoria: 'Operativa' },
      ]);

      const result = await service.getAnalisisRiesgoActivos({ amenazaId: '1' });

      expect(result).toHaveLength(0);
    });

    it('debe filtrar por búsqueda de texto en nombreActivo, amenaza y vulnerabilidad', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'Servidor A', macroProcesoId: 1 },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[1]',
          controlesImplementados: null,
          controlesArea: null,
        }),
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 1, nombre: 'Gestión TI' },
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        { id: 1, nombre: 'Phishing', categoria: 'Técnica' },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        { id: 1, descripcion: 'Falta de backups', categoria: 'Operativa' },
      ]);

      const resultByActivo = await service.getAnalisisRiesgoActivos({
        q: 'servidor',
      });
      expect(resultByActivo).toHaveLength(1);

      const resultByAmenaza = await service.getAnalisisRiesgoActivos({
        q: 'phishing',
      });
      expect(resultByAmenaza).toHaveLength(1);

      const resultByVul = await service.getAnalisisRiesgoActivos({
        q: 'backup',
      });
      expect(resultByVul).toHaveLength(1);

      const resultNoMatch = await service.getAnalisisRiesgoActivos({
        q: 'xyz',
      });
      expect(resultNoMatch).toHaveLength(0);
    });

    it('debe retornar array vacío cuando no hay datos', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const result = await service.getAnalisisRiesgoActivos({});

      expect(result).toEqual([]);
    });

    it('debe retornar todos los registros ordenados por nombreActivo ASC sin query params', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 2, nombreActivo: 'Servidor B', macroProcesoId: 1 },
        { id: 1, nombreActivo: 'Servidor A', macroProcesoId: 1 },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[1]',
          controlesImplementados: null,
          controlesArea: null,
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[1]',
          controlesImplementados: null,
          controlesArea: null,
        }),
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 1, nombre: 'Gestión TI' },
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        { id: 1, nombre: 'Phishing', categoria: 'Técnica' },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        { id: 1, descripcion: 'Falta de backups', categoria: 'Operativa' },
      ]);

      const result = await service.getAnalisisRiesgoActivos({});

      expect(result).toHaveLength(2);
      expect(result[0].nombreActivo).toBe('Servidor A');
      expect(result[1].nombreActivo).toBe('Servidor B');
    });
  });
});
