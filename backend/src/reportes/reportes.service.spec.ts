import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HeatmapCellDetailDto } from './dto/reporte-response.dto';

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
    riesgo: { findMany: jest.Mock };
    tipoControl: { findMany: jest.Mock };
    probabilidad: { findMany: jest.Mock };
    planTratamiento: { findMany: jest.Mock };
    opcionTratamiento: { findMany: jest.Mock };
    estadoPlanTratamiento: { findMany: jest.Mock };
    plazoImplementacion: { findMany: jest.Mock };
    area: { findMany: jest.Mock };
    controlesImplementar: { findMany: jest.Mock };
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
      riesgo: { findMany: jest.fn().mockResolvedValue([]) },
      tipoControl: { findMany: jest.fn().mockResolvedValue([]) },
      probabilidad: { findMany: jest.fn().mockResolvedValue([]) },
      planTratamiento: { findMany: jest.fn().mockResolvedValue([]) },
      opcionTratamiento: { findMany: jest.fn().mockResolvedValue([]) },
      estadoPlanTratamiento: { findMany: jest.fn().mockResolvedValue([]) },
      plazoImplementacion: { findMany: jest.fn().mockResolvedValue([]) },
      area: { findMany: jest.fn().mockResolvedValue([]) },
      controlesImplementar: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
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

    it('debe retornar array vacío cuando nivelRiesgo no coincide', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);

      const result = await service.getRiesgosPorActivo({
        nivelRiesgo: 'Medio',
      });

      expect(result).toEqual([]);
      expect(prisma.valoracionActivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            nivelRiesgo: {
              equals: 'Medio',
            },
          }),
        }),
      );
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
      // impacto = max(c, i, d) por activo
      expect(result.impacto).toEqual({
        Alto: 2,
        Medio: 1,
        Bajo: 0,
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
      expect(result.impacto).toEqual({
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
      });

      expect(prisma.valoracionActivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ macroProcesoId: 1 }),
              expect.objectContaining({ formatoId: 2 }),
              expect.objectContaining({ custodioId: '3' }),
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
          custodioId: '[4]',
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

    it('debe filtrar por dimension y nivel CIA', async () => {
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Confidencialidad', 'Alto', 3),
      ]);
      prisma.valoracionActivo.findMany.mockResolvedValue([
        makeVa({
          id: 1,
          nombreActivo: 'Servidor A',
          confidencialidadId: 1,
          integridadId: 2,
          disponibilidadId: 3,
        }),
      ]);

      const result = await service.getValoracionActivos({
        dimension: 'confidencialidad',
        nivel: 'Alto',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].nombreActivo).toBe('Servidor A');
      expect(prisma.valoracionActivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ confidencialidadId: { in: [1] } }),
            ]),
          }),
        }),
      );
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

  const makeRiesgo = (id: number, nivel: string, probabilidad: number) => ({
    id,
    nivel,
    probabilidad,
    valor: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makePlanTratamiento = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    tipoActivoId: 1,
    nivelRiesgoId: 1,
    opcionTratamientoId: 1,
    controlesImplementarId: '[1]',
    descripcionActividades: 'Migrar servidores',
    responsableImplementacionId: '[1]',
    areaFuncionalId: 1,
    plazoImplementacionId: 1,
    fechaInicioImplementacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaFinImplementacion: new Date('2026-06-01T00:00:00.000Z'),
    horaDia: 8,
    montoUSD: '5000.00',
    estadoId: 1,
    observaciones: 'Observación de prueba',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('getEvaluacionRiesgo', () => {
    it('debe resolver macroProcesoId → VA IDs y filtrar DetalleRiesgo (Stage 1+2)', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([]);

      await service.getEvaluacionRiesgo({ macroProcesoId: '1' });

      expect(prisma.valoracionActivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ macroProcesoId: 1 }),
          select: expect.objectContaining({ id: true }),
        }),
      );
    });

    it('debe enriquecer columnas con impacto, nivelAmenaza y nivelVulnerabilidad', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 10,
          nombreActivo: 'Servidor X',
          macroProcesoId: 10,
          confidencialidadId: 1,
          integridadId: 2,
          disponibilidadId: 3,
          impacto: 3.5,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 100,
          valoracionActivoId: 10,
          riesgoId: 1,
          vulnerabilidadRiesgoId: 2,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[2]',
          evaluacionRiesgo: 4.5,
          nivelRiesgo: 'Medio',
          controlesArea: 'Firewall, Antivirus',
        }),
      ]);
      prisma.riesgo.findMany.mockResolvedValue([
        {
          id: 1,
          tipo: 'Amenaza',
          nivel: 'Alto',
          valor: 3,
          probabilidad: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          tipo: 'Vulnerabilidad',
          nivel: 'Bajo',
          valor: 1,
          probabilidad: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'Phishing',
          categoria: 'Técnica',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 2,
          descripcion: 'Sin backups',
          categoria: 'Operativa',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 10, nombre: 'Gestión TI' },
      ]);

      const result = await service.getEvaluacionRiesgo({});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 100,
        nombreActivo: 'Servidor X',
        macroProceso: 'Gestión TI',
        amenaza: 'Phishing',
        vulnerabilidad: 'Sin backups',
        impacto: 3.5,
        nivelAmenaza: 'Alto',
        nivelVulnerabilidad: 'Bajo',
        evaluacionRiesgo: 4.5,
        nivelRiesgo: 'Medio',
        controlesArea: 'Firewall, Antivirus',
      });
    });

    it('debe filtrar en memoria por amenazaId sobre JSON array', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
        {
          id: 2,
          nombreActivo: 'B',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1,2]',
          vulnerabilidadIds: '[3]',
          controlesArea: null,
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          amenazaIds: '[3]',
          vulnerabilidadIds: '[3]',
          controlesArea: null,
        }),
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Conf', 'Medio', 2),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          nombre: 'A2',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          nombre: 'A3',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);

      const result = await service.getEvaluacionRiesgo({ amenazaId: '1' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('debe filtrar en memoria por vulnerabilidadId sobre JSON array', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
        {
          id: 2,
          nombreActivo: 'B',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3,4]',
          controlesArea: null,
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[5]',
          controlesArea: null,
        }),
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Conf', 'Medio', 2),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 4,
          descripcion: 'V4',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 5,
          descripcion: 'V5',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);

      const result = await service.getEvaluacionRiesgo({
        vulnerabilidadId: '4',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('debe filtrar por categoriaAmenazaId usando amenazaMap', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
        {
          id: 2,
          nombreActivo: 'B',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
          controlesArea: null,
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          amenazaIds: '[2]',
          vulnerabilidadIds: '[3]',
          controlesArea: null,
        }),
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Conf', 'Medio', 2),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'Phishing',
          categoria: 'Técnica',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          nombre: 'Robo',
          categoria: 'Física',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);

      const result = await service.getEvaluacionRiesgo({
        categoriaAmenazaId: 'Técnica',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('debe filtrar por categoriaVulnerabilidadId', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
        {
          id: 2,
          nombreActivo: 'B',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
          controlesArea: null,
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[4]',
          controlesArea: null,
        }),
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Conf', 'Medio', 2),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Operativa',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 4,
          descripcion: 'V4',
          categoria: 'Humana',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);

      const result = await service.getEvaluacionRiesgo({
        categoriaVulnerabilidadId: 'Operativa',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('debe filtrar por nivelRiesgo de forma case-insensitive', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
        {
          id: 2,
          nombreActivo: 'B',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
        {
          id: 3,
          nombreActivo: 'C',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
          nivelRiesgo: 'Alto',
          controlesArea: null,
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
          nivelRiesgo: 'ALTO',
          controlesArea: null,
        }),
        makeDr({
          id: 3,
          valoracionActivoId: 3,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
          nivelRiesgo: 'Bajo',
          controlesArea: null,
        }),
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Conf', 'Medio', 2),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);

      const result = await service.getEvaluacionRiesgo({ nivelRiesgo: 'alto' });

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id).sort()).toEqual([1, 2]);
    });

    it('debe filtrar por q en nombreActivo (text search)', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'Servidor Producción',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
        {
          id: 2,
          nombreActivo: 'Estación Trabajo',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
          controlesArea: null,
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
          controlesArea: null,
        }),
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Conf', 'Medio', 2),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);

      const result = await service.getEvaluacionRiesgo({ q: 'servidor' });

      expect(result).toHaveLength(1);
      expect(result[0].nombreActivo).toBe('Servidor Producción');
    });

    it('debe manejar JSON malformado devolviendo string vacío en amenaza/vulnerabilidad', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'Servidor A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: 'invalid-json',
          vulnerabilidadIds: 'also-invalid',
          controlesArea: null,
        }),
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Conf', 'Medio', 2),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 1, nombre: 'Gestión TI' },
      ]);

      const result = await service.getEvaluacionRiesgo({});

      expect(result).toHaveLength(1);
      expect(result[0].amenaza).toBe('');
      expect(result[0].vulnerabilidad).toBe('');
    });

    it('debe deduplicar filas con mismo VA + amenazaIds/vulnerabilidadIds', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'Servidor A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[2]',
          evaluacionRiesgo: 4.5,
          nivelRiesgo: 'Medio',
          controlesArea: 'Firewall',
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[2]',
          evaluacionRiesgo: 4.5,
          nivelRiesgo: 'Medio',
          controlesArea: 'Firewall',
        }),
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Conf', 'Medio', 2),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 2,
          descripcion: 'V2',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);

      const result = await service.getEvaluacionRiesgo({});

      expect(result).toHaveLength(1);
    });

    it('NO debe deduplicar filas con diferente amenazaIds/vulnerabilidadIds', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'Servidor A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[2]',
          evaluacionRiesgo: 4.5,
          nivelRiesgo: 'Medio',
          controlesArea: null,
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 1,
          amenazaIds: '[3]',
          vulnerabilidadIds: '[2]',
          evaluacionRiesgo: 4.5,
          nivelRiesgo: 'Medio',
          controlesArea: null,
        }),
      ]);
      prisma.impacto.findMany.mockResolvedValue([
        makeImpacto(1, 'Conf', 'Medio', 2),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          nombre: 'A3',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 2,
          descripcion: 'V2',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);

      const result = await service.getEvaluacionRiesgo({});

      expect(result).toHaveLength(2);
    });

    it('debe retornar array vacío cuando no hay datos', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const result = await service.getEvaluacionRiesgo({});

      expect(result).toEqual([]);
    });
  });

  describe('getTratamientoRiesgo', () => {
    it('debe resolver macroProcesoId → VA IDs y retornar [] si no hay coincidencias', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);

      const result = await service.getTratamientoRiesgo({
        macroProcesoId: '999',
      });

      expect(result).toEqual([]);
      expect(prisma.valoracionActivo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ macroProcesoId: 999 }),
          select: expect.objectContaining({ id: true }),
        }),
      );
    });

    it('debe filtrar en memoria por tipoControlId', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'Servidor A', macroProcesoId: 1, impacto: null },
        { id: 2, nombreActivo: 'Servidor B', macroProcesoId: 1, impacto: null },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          tipoControlId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          tipoControlId: 2,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'Phishing',
          categoria: 'Técnica',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'Sin backups',
          categoria: 'Operativa',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 1, nombre: 'Gestión TI' },
      ]);
      prisma.tipoControl.findMany.mockResolvedValue([
        { id: 1, nombre: 'Preventivo' },
        { id: 2, nombre: 'Detectivo' },
      ]);

      const result = await service.getTratamientoRiesgo({ tipoControlId: '1' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].tipoControl).toBe('Preventivo');
    });

    it('debe filtrar por nivelRiesgoControl de forma case-insensitive', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'A', macroProcesoId: 1, impacto: null },
        { id: 2, nombreActivo: 'B', macroProcesoId: 1, impacto: null },
        { id: 3, nombreActivo: 'C', macroProcesoId: 1, impacto: null },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          nivelRiesgoControl: 'Alto',
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          nivelRiesgoControl: 'ALTO',
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
        makeDr({
          id: 3,
          valoracionActivoId: 3,
          nivelRiesgoControl: 'Bajo',
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);
      prisma.tipoControl.findMany.mockResolvedValue([]);

      const result = await service.getTratamientoRiesgo({
        nivelRiesgoControl: 'alto',
      });

      expect(result).toHaveLength(2);
      expect(result.map((r: { id: number }) => r.id).sort()).toEqual([1, 2]);
    });

    it('debe filtrar por riesgoResidual de forma case-insensitive', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'A', macroProcesoId: 1, impacto: null },
        { id: 2, nombreActivo: 'B', macroProcesoId: 1, impacto: null },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          riesgoResidual: 'ACEPTABLE',
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          riesgoResidual: 'INACEPTABLE',
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);
      prisma.tipoControl.findMany.mockResolvedValue([]);

      const result = await service.getTratamientoRiesgo({
        riesgoResidual: 'aceptable',
      });

      expect(result).toHaveLength(1);
      expect(result[0].riesgoResidual).toBe('ACEPTABLE');
    });

    it('debe filtrar por q en nombreActivo (OR search)', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'Servidor Producción',
          macroProcesoId: 1,
          impacto: null,
        },
        {
          id: 2,
          nombreActivo: 'Estación Trabajo',
          macroProcesoId: 1,
          impacto: null,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          riesgoResidual: 'INACEPTABLE',
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          riesgoResidual: 'ACEPTABLE',
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);
      prisma.tipoControl.findMany.mockResolvedValue([]);

      const result = await service.getTratamientoRiesgo({ q: 'servidor' });

      expect(result).toHaveLength(1);
      expect(result[0].nombreActivo).toBe('Servidor Producción');
    });

    it('debe filtrar por q en riesgoResidual (OR search)', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'Router', macroProcesoId: 1, impacto: null },
        { id: 2, nombreActivo: 'Switch', macroProcesoId: 1, impacto: null },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          riesgoResidual: 'INACEPTABLE',
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 2,
          riesgoResidual: 'ACEPTABLE',
          amenazaIds: '[1]',
          vulnerabilidadIds: '[3]',
        }),
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);
      prisma.tipoControl.findMany.mockResolvedValue([]);

      const result = await service.getTratamientoRiesgo({ q: 'inacep' });

      expect(result).toHaveLength(1);
      expect(result[0].riesgoResidual).toBe('INACEPTABLE');
    });

    it('debe enriquecer todas las columnas correctamente con nivelAmenaza, nivelVulnerabilidad y controlesImplementar', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 10,
          nombreActivo: 'Servidor X',
          macroProcesoId: 10,
          confidencialidadId: 1,
          integridadId: 2,
          disponibilidadId: 3,
          impacto: 3.5,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        {
          ...makeDr({
            id: 100,
            valoracionActivoId: 10,
            riesgoId: 1,
            vulnerabilidadRiesgoId: 2,
            amenazaIds: '[1]',
            vulnerabilidadIds: '[2]',
            controlesImplementarId: '[5]',
            metodoTratamiento: 'MITIGAR',
            evaluacionRiesgoControl: 3.0,
            nivelRiesgoControl: 'Bajo',
            tipoControlId: 1,
            riesgoResidual: 'ACEPTABLE',
          }),
        },
      ]);
      prisma.controlesImplementar.findMany.mockResolvedValue([
        {
          id: 5,
          seccion: 'A.1',
          descripcion: 'Control de acceso',
          categoriaId: 1,
        },
      ]);
      prisma.riesgo.findMany.mockResolvedValue([
        makeRiesgo(1, 'Alto', 3),
        makeRiesgo(2, 'Bajo', 1),
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'Phishing',
          categoria: 'Técnica',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 2,
          descripcion: 'Sin backups',
          categoria: 'Operativa',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 10, nombre: 'Gestión TI' },
      ]);
      prisma.tipoControl.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'Preventivo',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getTratamientoRiesgo({});

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 100,
        nombreActivo: 'Servidor X',
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
      });
    });

    it('debe retornar array vacío cuando no hay DetalleRiesgo', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const result = await service.getTratamientoRiesgo({});

      expect(result).toEqual([]);
    });

    it('debe manejar JSON malformado en amenazaIds/vulnerabilidadIds devolviendo string vacío', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'Servidor A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
          impacto: null,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        {
          ...makeDr({
            id: 1,
            valoracionActivoId: 1,
            amenazaIds: '{bad',
            vulnerabilidadIds: 'also-invalid',
          }),
          controlesImplementar: null,
        },
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 1, nombre: 'Gestión TI' },
      ]);
      prisma.tipoControl.findMany.mockResolvedValue([]);

      const result = await service.getTratamientoRiesgo({});

      expect(result).toHaveLength(1);
      expect(result[0].amenaza).toBe('');
      expect(result[0].vulnerabilidad).toBe('');
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.valoracionActivo.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );

      await expect(
        service.getTratamientoRiesgo({ macroProcesoId: '1' }),
      ).rejects.toThrow(HttpException);
      await expect(
        service.getTratamientoRiesgo({ macroProcesoId: '1' }),
      ).rejects.toMatchObject({
        status: 500,
      });
    });

    it('debe ordenar resultados por nombreActivo ASC', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 2,
          nombreActivo: 'Servidor B',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
          impacto: null,
        },
        {
          id: 1,
          nombreActivo: 'Servidor A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
          impacto: null,
        },
        {
          id: 3,
          nombreActivo: 'Activo C',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
          impacto: null,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        {
          ...makeDr({
            id: 1,
            valoracionActivoId: 1,
            amenazaIds: '[1]',
            vulnerabilidadIds: '[3]',
          }),
          controlesImplementar: null,
        },
        {
          ...makeDr({
            id: 2,
            valoracionActivoId: 2,
            amenazaIds: '[1]',
            vulnerabilidadIds: '[3]',
          }),
          controlesImplementar: null,
        },
        {
          ...makeDr({
            id: 3,
            valoracionActivoId: 3,
            amenazaIds: '[1]',
            vulnerabilidadIds: '[3]',
          }),
          controlesImplementar: null,
        },
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'V3',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);
      prisma.tipoControl.findMany.mockResolvedValue([]);

      const result = await service.getTratamientoRiesgo({});

      expect(result).toHaveLength(3);
      expect(result[0].nombreActivo).toBe('Activo C');
      expect(result[1].nombreActivo).toBe('Servidor A');
      expect(result[2].nombreActivo).toBe('Servidor B');
    });

    it('debe deduplicar filas con mismo VA + amenazaIds/vulnerabilidadIds', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'Servidor A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
          impacto: 2.5,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        {
          ...makeDr({
            id: 1,
            valoracionActivoId: 1,
            amenazaIds: '[1]',
            vulnerabilidadIds: '[2]',
            metodoTratamiento: 'MITIGAR',
            evaluacionRiesgoControl: 3.0,
            nivelRiesgoControl: 'Bajo',
            tipoControlId: 1,
            riesgoResidual: 'ACEPTABLE',
          }),
          controlesImplementar: null,
        },
        {
          ...makeDr({
            id: 2,
            valoracionActivoId: 1,
            amenazaIds: '[1]',
            vulnerabilidadIds: '[2]',
            metodoTratamiento: 'MITIGAR',
            evaluacionRiesgoControl: 3.0,
            nivelRiesgoControl: 'Bajo',
            tipoControlId: 1,
            riesgoResidual: 'ACEPTABLE',
          }),
          controlesImplementar: null,
        },
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 2,
          descripcion: 'V2',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);
      prisma.tipoControl.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'Preventivo',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getTratamientoRiesgo({});

      expect(result).toHaveLength(1);
    });

    it('NO debe deduplicar filas con diferente amenazaIds/vulnerabilidadIds', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'Servidor A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
          impacto: 2.5,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        {
          ...makeDr({
            id: 1,
            valoracionActivoId: 1,
            amenazaIds: '[1]',
            vulnerabilidadIds: '[2]',
            metodoTratamiento: 'MITIGAR',
          }),
          controlesImplementar: null,
        },
        {
          ...makeDr({
            id: 2,
            valoracionActivoId: 1,
            amenazaIds: '[3]',
            vulnerabilidadIds: '[2]',
            metodoTratamiento: 'MITIGAR',
          }),
          controlesImplementar: null,
        },
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'A1',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          nombre: 'A3',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 2,
          descripcion: 'V2',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);
      prisma.tipoControl.findMany.mockResolvedValue([]);

      const result = await service.getTratamientoRiesgo({});

      expect(result).toHaveLength(2);
    });

    it('debe combinar los 5 filtros simultáneamente', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        {
          id: 1,
          nombreActivo: 'Servidor A',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
          impacto: 2.5,
        },
        {
          id: 2,
          nombreActivo: 'Servidor B',
          macroProcesoId: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
          impacto: 1.0,
        },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        {
          ...makeDr({
            id: 1,
            valoracionActivoId: 1,
            nivelRiesgoControl: 'ALTO',
            tipoControlId: 1,
            riesgoResidual: 'ACEPTABLE',
            metodoTratamiento: 'MITIGAR',
            amenazaIds: '[1]',
            vulnerabilidadIds: '[3]',
          }),
          controlesImplementar: null,
        },
        {
          ...makeDr({
            id: 2,
            valoracionActivoId: 2,
            nivelRiesgoControl: 'BAJO',
            tipoControlId: 2,
            riesgoResidual: 'INACEPTABLE',
            metodoTratamiento: 'EVITAR',
            amenazaIds: '[1]',
            vulnerabilidadIds: '[3]',
          }),
          controlesImplementar: null,
        },
      ]);
      prisma.riesgo.findMany.mockResolvedValue([]);
      prisma.amenaza.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'Phishing',
          categoria: 'X',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        {
          id: 3,
          descripcion: 'Sin parches',
          categoria: 'Y',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([{ id: 1, nombre: 'MP' }]);
      prisma.tipoControl.findMany.mockResolvedValue([
        {
          id: 1,
          nombre: 'Preventivo',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          nombre: 'Detectivo',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getTratamientoRiesgo({
        macroProcesoId: '1',
        tipoControlId: '1',
        nivelRiesgoControl: 'alto',
        riesgoResidual: 'aceptable',
        q: 'Servidor',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].nombreActivo).toBe('Servidor A');
      expect(result[0].nivelRiesgoControl).toBe('ALTO');
      expect(result[0].riesgoResidual).toBe('ACEPTABLE');
      expect(result[0].tipoControl).toBe('Preventivo');
    });
  });

  describe('getPlanTratamiento', () => {
    it('debe retornar todos los planes enriquecidos por defecto', async () => {
      prisma.planTratamiento.findMany.mockResolvedValue([
        makePlanTratamiento({ id: 1, descripcionActividades: 'Actividad A' }),
        makePlanTratamiento({
          id: 2,
          descripcionActividades: 'Actividad B',
          tipoActivoId: 2,
          opcionTratamientoId: 2,
          estadoId: 2,
          areaFuncionalId: null,
          plazoImplementacionId: null,
        }),
      ]);
      prisma.tipoActivo.findMany.mockResolvedValue([
        { id: 1, nombre: 'Hardware' },
        { id: 2, nombre: 'Software' },
      ]);
      prisma.opcionTratamiento.findMany.mockResolvedValue([
        { id: 1, nombre: 'Mitigar' },
        { id: 2, nombre: 'Transferir' },
      ]);
      prisma.controlesImplementar.findMany.mockResolvedValue([
        { id: 1, seccion: 'A.1', descripcion: 'Control acceso' },
      ]);
      prisma.area.findMany.mockResolvedValue([{ id: 1, nombre: 'TI' }]);
      prisma.plazoImplementacion.findMany.mockResolvedValue([
        { id: 1, codigo: 'P1', nombre: 'Corto' },
      ]);
      prisma.estadoPlanTratamiento.findMany.mockResolvedValue([
        { id: 1, nombre: 'Pendiente' },
        { id: 2, nombre: 'Completado' },
      ]);

      const result = await service.getPlanTratamiento({});

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].tipoActivo).toBe('Hardware');
      expect(result[0].opcionTratamiento).toBe('Mitigar');
      expect(result[0].controlesImplementar).toBe('A.1 - Control acceso');
      expect(result[0].responsablesImplementacion).toBe('TI');
      expect(result[0].areaFuncional).toBe('TI');
      expect(result[0].plazoImplementacion).toBe('Corto');
      expect(result[0].estado).toBe('Pendiente');
      expect(result[0].horaDia).toBe(8);
      expect(result[0].montoUSD).toBe('5000.00');
      expect(result[0].observaciones).toBe('Observación de prueba');
    });

    it('debe aplicar filtros combinados en la query de Prisma', async () => {
      prisma.planTratamiento.findMany.mockResolvedValue([
        makePlanTratamiento({
          id: 1,
          tipoActivoId: 1,
          estadoId: 2,
          descripcionActividades: 'migración de servidores',
        }),
      ]);
      prisma.tipoActivo.findMany.mockResolvedValue([
        { id: 1, nombre: 'Hardware' },
      ]);
      prisma.opcionTratamiento.findMany.mockResolvedValue([
        { id: 1, nombre: 'Mitigar' },
      ]);
      prisma.controlesImplementar.findMany.mockResolvedValue([]);
      prisma.area.findMany.mockResolvedValue([]);
      prisma.plazoImplementacion.findMany.mockResolvedValue([]);
      prisma.estadoPlanTratamiento.findMany.mockResolvedValue([
        { id: 2, nombre: 'En progreso' },
      ]);

      const result = await service.getPlanTratamiento({
        tipoActivoId: '1',
        estadoId: '2',
        q: 'migración',
      });

      expect(result).toHaveLength(1);
      expect(result[0].tipoActivo).toBe('Hardware');
      expect(result[0].estado).toBe('En progreso');
      expect(prisma.planTratamiento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ tipoActivoId: 1 }),
              expect.objectContaining({ estadoId: 2 }),
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({
                    descripcionActividades: { contains: 'migración' },
                  }),
                ]),
              }),
            ]),
          }),
        }),
      );
    });

    it('debe manejar JSON malformado devolviendo string vacío para controles y responsables', async () => {
      prisma.planTratamiento.findMany.mockResolvedValue([
        makePlanTratamiento({
          id: 1,
          controlesImplementarId: '{bad',
          responsableImplementacionId: 'invalid',
        }),
      ]);
      prisma.tipoActivo.findMany.mockResolvedValue([
        { id: 1, nombre: 'Hardware' },
      ]);
      prisma.opcionTratamiento.findMany.mockResolvedValue([
        { id: 1, nombre: 'Mitigar' },
      ]);
      prisma.controlesImplementar.findMany.mockResolvedValue([
        { id: 1, seccion: 'A.1', descripcion: 'Ctrl' },
      ]);
      prisma.area.findMany.mockResolvedValue([{ id: 1, nombre: 'TI' }]);
      prisma.plazoImplementacion.findMany.mockResolvedValue([
        { id: 1, codigo: 'P1', nombre: 'Corto' },
      ]);
      prisma.estadoPlanTratamiento.findMany.mockResolvedValue([
        { id: 1, nombre: 'Pendiente' },
      ]);

      const result = await service.getPlanTratamiento({});

      expect(result).toHaveLength(1);
      expect(result[0].controlesImplementar).toBe('');
      expect(result[0].responsablesImplementacion).toBe('');
    });

    it('debe retornar array vacío cuando no hay planes', async () => {
      prisma.planTratamiento.findMany.mockResolvedValue([]);
      const result = await service.getPlanTratamiento({});
      expect(result).toEqual([]);
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.planTratamiento.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );
      await expect(service.getPlanTratamiento({})).rejects.toThrow(
        HttpException,
      );
      await expect(service.getPlanTratamiento({})).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe('exportPlanTratamiento', () => {
    it('debe retornar un buffer y registrar auditoría cuando hay usuario', async () => {
      prisma.planTratamiento.findMany.mockResolvedValue([
        makePlanTratamiento({ id: 1 }),
      ]);
      prisma.tipoActivo.findMany.mockResolvedValue([
        { id: 1, nombre: 'Hardware' },
      ]);
      prisma.opcionTratamiento.findMany.mockResolvedValue([
        { id: 1, nombre: 'Mitigar' },
      ]);
      prisma.controlesImplementar.findMany.mockResolvedValue([
        { id: 1, seccion: 'A.1', descripcion: 'Ctrl' },
      ]);
      prisma.area.findMany.mockResolvedValue([{ id: 1, nombre: 'TI' }]);
      prisma.plazoImplementacion.findMany.mockResolvedValue([
        { id: 1, codigo: 'P1', nombre: 'Corto' },
      ]);
      prisma.estadoPlanTratamiento.findMany.mockResolvedValue([
        { id: 1, nombre: 'Pendiente' },
      ]);

      const auditService = (service as any).auditService;
      const result = await service.exportPlanTratamiento(
        {},
        { userId: 'u1', username: 'admin' },
        { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } },
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(auditService.log).toHaveBeenCalled();
    });

    it('debe pasar los filtros al servicio subyacente', async () => {
      prisma.planTratamiento.findMany.mockResolvedValue([]);
      const filters = { estadoId: '1', q: 'mantenimiento' };
      await service.exportPlanTratamiento(filters);
      expect(prisma.planTratamiento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ estadoId: 1 }),
            ]),
          }),
        }),
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

    it('debe deduplicar filas con mismo VA + amenazaIds/vulnerabilidadIds', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'Servidor A', macroProcesoId: 1 },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[2]',
          controlesImplementados: 'Ctrl A',
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[2]',
          controlesImplementados: 'Ctrl B',
        }),
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 1, nombre: 'Gestión TI' },
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        { id: 1, nombre: 'Phishing', categoria: 'Técnica' },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        { id: 2, descripcion: 'Sin backups', categoria: 'Operativa' },
      ]);

      const result = await service.getAnalisisRiesgoActivos({});

      expect(result).toHaveLength(1);
    });

    it('NO debe deduplicar filas con diferente amenazaIds/vulnerabilidadIds', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        { id: 1, nombreActivo: 'Servidor A', macroProcesoId: 1 },
      ]);
      prisma.detalleRiesgo.findMany.mockResolvedValue([
        makeDr({
          id: 1,
          valoracionActivoId: 1,
          amenazaIds: '[1]',
          vulnerabilidadIds: '[2]',
          controlesImplementados: 'Ctrl A',
        }),
        makeDr({
          id: 2,
          valoracionActivoId: 1,
          amenazaIds: '[3]',
          vulnerabilidadIds: '[2]',
          controlesImplementados: 'Ctrl B',
        }),
      ]);
      prisma.macroProceso.findMany.mockResolvedValue([
        { id: 1, nombre: 'Gestión TI' },
      ]);
      prisma.amenaza.findMany.mockResolvedValue([
        { id: 1, nombre: 'Phishing', categoria: 'Técnica' },
        { id: 3, nombre: 'Robo', categoria: 'Física' },
      ]);
      prisma.vulnerabilidad.findMany.mockResolvedValue([
        { id: 2, descripcion: 'Sin backups', categoria: 'Operativa' },
      ]);

      const result = await service.getAnalisisRiesgoActivos({});

      expect(result).toHaveLength(2);
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

  describe('getHeatmap', () => {
    const mockImpactos = [
      makeImpacto(1, 'Confidencialidad', 'Bajo', 1),
      makeImpacto(2, 'Confidencialidad', 'Medio', 2),
      makeImpacto(3, 'Confidencialidad', 'Alto', 3),
      makeImpacto(4, 'Integridad', 'Bajo', 1),
      makeImpacto(5, 'Integridad', 'Medio', 2),
      makeImpacto(6, 'Integridad', 'Alto', 3),
      makeImpacto(7, 'Disponibilidad', 'Bajo', 1),
      makeImpacto(8, 'Disponibilidad', 'Medio', 2),
      makeImpacto(9, 'Disponibilidad', 'Alto', 3),
    ];

    beforeEach(() => {
      prisma.impacto.findMany.mockResolvedValue(mockImpactos);
    });

    it('debe retornar matriz 3x3 con todos ceros cuando no hay activos', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([]);

      const result = await service.getHeatmap();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('3. Alto');
      expect(result[1].name).toBe('2. Medio');
      expect(result[2].name).toBe('1. Bajo');

      for (const serie of result) {
        expect(serie.data).toHaveLength(3);
        for (const cell of serie.data) {
          expect(cell.y).toBe(0);
        }
      }
    });

    it('debe excluir activos con evaluacionRiesgo null', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        makeVa({
          id: 1,
          evaluacionRiesgo: null,
          probabilidadId: 1,
          confidencialidadId: 3,
          integridadId: 3,
          disponibilidadId: 3,
        }),
      ]);

      const result = await service.getHeatmap();

      expect(result).toHaveLength(3);
      for (const serie of result) {
        for (const cell of serie.data) {
          expect(cell.y).toBe(0);
        }
      }
    });

    it('debe contar correctamente activos con distintos impactos y evaluaciones de riesgo', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        // Activo 1: conf=2, int=1, disp=1 → max=2=Medio, eval=2=Bajo → [2][1]
        makeVa({
          id: 1,
          evaluacionRiesgo: 2,
          confidencialidadId: 2,
          integridadId: 1,
          disponibilidadId: 1,
        }),
        // Activo 2: conf=1, int=3, disp=1 → max=3=Alto, eval=6=Medio → [3][2]
        makeVa({
          id: 2,
          evaluacionRiesgo: 6,
          confidencialidadId: 1,
          integridadId: 6,
          disponibilidadId: 1,
        }),
        // Activo 3: conf=1, int=1, disp=1 → max=1=Bajo, eval=12=Alto → [1][3]
        makeVa({
          id: 3,
          evaluacionRiesgo: 12,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        }),
      ]);

      const result = await service.getHeatmap();

      // Serie 0 = impacto 3 (Alto) → data[1] eval=Medio → cell y=1
      const serieAlto = result.find((s) => s.name === '3. Alto');
      expect(serieAlto).toBeDefined();
      const cell32 = serieAlto!.data.find((c) => c.x === '2. Medio');
      expect(cell32).toBeDefined();
      expect(cell32!.y).toBe(1);

      // Serie 1 = impacto 2 (Medio) → data[0] eval=Bajo → cell y=1
      const serieMedio = result.find((s) => s.name === '2. Medio');
      expect(serieMedio).toBeDefined();
      const cell21 = serieMedio!.data.find((c) => c.x === '1. Bajo');
      expect(cell21).toBeDefined();
      expect(cell21!.y).toBe(1);

      // Serie 2 = impacto 1 (Bajo) → data[2] eval=Alto → cell y=1
      const serieBajo = result.find((s) => s.name === '1. Bajo');
      expect(serieBajo).toBeDefined();
      const cell13 = serieBajo!.data.find((c) => c.x === '3. Alto');
      expect(cell13).toBeDefined();
      expect(cell13!.y).toBe(1);

      // Total count should be 3
      const totalCount = result.reduce(
        (sum, s) => sum + s.data.reduce((s2, c) => s2 + c.y, 0),
        0,
      );
      expect(totalCount).toBe(3);
    });

    it('debe ubicar un activo en la celda correcta (impacto=3, evaluacionRiesgo=Alto)', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        // conf=3, int=1→Bajo, disp=1→Bajo → max=3=Alto, eval=20=Alto → [3][3]
        makeVa({
          id: 1,
          evaluacionRiesgo: 20,
          confidencialidadId: 3,
          integridadId: 4,
          disponibilidadId: 7,
        }),
      ]);

      const result = await service.getHeatmap();

      // impactoFinal = max(3,1,1) = 3 → "3. Alto" series
      // evaluacionRiesgo=20 → >8 → bucket 3 → "3. Alto" column
      const serieAlto = result.find((s) => s.name === '3. Alto');
      expect(serieAlto).toBeDefined();

      const cell33 = serieAlto!.data.find((c) => c.x === '3. Alto');
      expect(cell33).toBeDefined();
      expect(cell33!.y).toBe(1);

      // All other cells should be 0
      const otherCells = result.flatMap((s) =>
        s.data.filter((c) => !(s.name === '3. Alto' && c.x === '3. Alto')),
      );
      for (const c of otherCells) {
        expect(c.y).toBe(0);
      }
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.valoracionActivo.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );

      await expect(service.getHeatmap()).rejects.toThrow(HttpException);
      await expect(service.getHeatmap()).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe('getHeatmapCell', () => {
    const mockImpactos = [
      makeImpacto(1, 'Confidencialidad', 'Bajo', 1),
      makeImpacto(2, 'Confidencialidad', 'Medio', 2),
      makeImpacto(3, 'Confidencialidad', 'Alto', 3),
      makeImpacto(4, 'Integridad', 'Bajo', 1),
      makeImpacto(5, 'Integridad', 'Medio', 2),
      makeImpacto(6, 'Integridad', 'Alto', 3),
      makeImpacto(7, 'Disponibilidad', 'Bajo', 1),
      makeImpacto(8, 'Disponibilidad', 'Medio', 2),
      makeImpacto(9, 'Disponibilidad', 'Alto', 3),
    ];

    const mockMacroProcesos = [
      { id: 1, nombre: 'Gestión TI' },
      { id: 2, nombre: 'Recursos Humanos' },
    ];

    beforeEach(() => {
      prisma.impacto.findMany.mockResolvedValue(mockImpactos);
      prisma.macroProceso.findMany.mockResolvedValue(mockMacroProcesos);
    });

    it('debe retornar activos filtrados por impacto y probabilidad correctos', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        // impacto=3 (conf=3=Alto), evaluacionRiesgo=6 → prob=2 (Medio) → cell [3][2]
        makeVa({
          id: 1,
          nombreActivo: 'Servidor A',
          macroProcesoId: 1,
          evaluacionRiesgo: 6,
          nivelRiesgo: 'Medio',
          confidencialidadId: 3,
          integridadId: 4,
          disponibilidadId: 7,
        }),
        // impacto=2 (conf=2=Medio), evaluacionRiesgo=2 → prob=1 (Bajo) → cell [2][1]
        makeVa({
          id: 2,
          nombreActivo: 'Servidor B',
          macroProcesoId: 2,
          evaluacionRiesgo: 2,
          nivelRiesgo: 'Bajo',
          confidencialidadId: 2,
          integridadId: 1,
          disponibilidadId: 1,
        }),
        // impacto=3 (conf=3=Alto), evaluacionRiesgo=6 → prob=2 (Medio) → cell [3][2]
        makeVa({
          id: 3,
          nombreActivo: 'Servidor C',
          macroProcesoId: 1,
          evaluacionRiesgo: 6,
          nivelRiesgo: 'Medio',
          confidencialidadId: 3,
          integridadId: 1,
          disponibilidadId: 1,
        }),
      ]);

      const result = await service.getHeatmapCell(3, 2);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        nombreActivo: 'Servidor A',
        macroProceso: 'Gestión TI',
        nivelRiesgo: 'Medio',
        evaluacionRiesgo: 6,
      });
      expect(result[1]).toEqual({
        id: 3,
        nombreActivo: 'Servidor C',
        macroProceso: 'Gestión TI',
        nivelRiesgo: 'Medio',
        evaluacionRiesgo: 6,
      });
    });

    it('debe retornar array vacío para celda sin activos', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        // Only assets in cell [1][1]
        makeVa({
          id: 1,
          evaluacionRiesgo: 1,
          confidencialidadId: 1,
          integridadId: 1,
          disponibilidadId: 1,
        }),
      ]);

      const result = await service.getHeatmapCell(3, 3);

      expect(result).toEqual([]);
    });

    it('debe retornar macroProceso "Desconocido" si el ID no tiene match', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        makeVa({
          id: 1,
          nombreActivo: 'Servidor Huerfano',
          macroProcesoId: 999,
          evaluacionRiesgo: 5,
          nivelRiesgo: 'Medio',
          confidencialidadId: 2,
          integridadId: 1,
          disponibilidadId: 1,
        }),
      ]);

      const result = await service.getHeatmapCell(2, 2);

      expect(result).toHaveLength(1);
      expect(result[0].macroProceso).toBe('Desconocido');
    });

    it('debe excluir activos con evaluacionRiesgo null', async () => {
      prisma.valoracionActivo.findMany.mockResolvedValue([
        makeVa({
          id: 1,
          evaluacionRiesgo: null,
          confidencialidadId: 3,
          integridadId: 3,
          disponibilidadId: 3,
        }),
      ]);

      const result = await service.getHeatmapCell(3, 3);

      expect(result).toEqual([]);
    });

    it('debe lanzar HttpException 500 si Prisma falla', async () => {
      prisma.valoracionActivo.findMany.mockRejectedValue(
        new Error('Connection lost'),
      );

      await expect(service.getHeatmapCell(1, 1)).rejects.toThrow(HttpException);
      await expect(service.getHeatmapCell(1, 1)).rejects.toMatchObject({
        status: 500,
      });
    });
  });
});
