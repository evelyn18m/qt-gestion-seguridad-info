import { Test, TestingModule } from '@nestjs/testing';
import { ValoracionesService } from './valoraciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { ParametrosService } from '../parametros/parametros.service';
import { AuditService } from '../audit/audit.service';
import { CreateValoracionDto } from './dto/create-valoracion.dto';
import { UpdateValoracionDto } from './dto/update-valoracion.dto';

type AnyMock = jest.Mock<any, any[]>;

const mockPrisma = {
  valoracionActivo: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tipoActivo: { findUnique: jest.fn() },
  activo: { findUnique: jest.fn(), create: jest.fn() },
  formato: { findUnique: jest.fn() },
  macroProceso: { findUnique: jest.fn() },
  subproceso: { findUnique: jest.fn() },
  area: { findUnique: jest.fn() },
  funcionario: { findUnique: jest.fn() },
  impacto: { findUnique: jest.fn() },
  tipoControl: { findUnique: jest.fn() },
  riesgo: { findUnique: jest.fn() },
  detalleRiesgo: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn() as AnyMock,
};

const mockParametrosService = {
  getConfiguracion: jest.fn().mockResolvedValue({
    id: 1,
    riesgoBajoMax: 3,
    riesgoMedioMax: 9,
    riesgoAltoMax: 27,
    controlBajoMax: 3,
    controlMedioMax: 9,
    controlAltoMax: 27,
    residualAceptableMax: 3,
  }),
  updateConfiguracion: jest.fn(),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
  findAll: jest.fn(),
  findById: jest.fn(),
};

const mockUser = {
  userId: 'user-abc',
  username: 'jdoe',
  email: 'jdoe@test.com',
  roles: [],
};
const mockReq = {
  headers: { 'user-agent': 'Mozilla/5.0' },
  ip: '192.168.1.100',
};

describe('ValoracionesService — Audit Integration', () => {
  let service: ValoracionesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  describe('create() with user context', () => {
    const baseDto: CreateValoracionDto = {
      nombreActivo: 'Test Activo',
      tipoActivoId: 1,
      formatoId: 1,
      macroProcesoId: 1,
      subProcesoId: 1,
      propietarioId: 1,
      custodioId: 1,
      descripcion: 'Test desc',
      controlSeguridad: 'Test ctrl',
      ubicacion: 'Test loc',
      confidencialidadId: 1,
      integridadId: 1,
      disponibilidadId: 1,
    };

    const mockItem = {
      id: 1,
      ...baseDto,
      observaciones: null,
      tieneDatosPersonales: false,
      amenazas: null,
      vulnerabilidades: null,
      controlesImplementacion: null,
      impacto: null,
      probabilidadId: null,
      amenazaRiesgoId: null,
      vulnerabilidadRiesgoId: null,
      controlesArea: null,
      evaluacionRiesgo: null,
      nivelRiesgo: null,
      metodoTratamiento: null,
      tipoControl: null,
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('RED: should call AuditService.log with CREAR event after create', async () => {
      mockPrisma.valoracionActivo.create.mockResolvedValue(mockItem);
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      await service.create(baseDto, mockUser, mockReq);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'CREAR',
          modulo: 'valoraciones',
          entidad: 'activo',
          usuarioId: 'user-abc',
          usuario: 'jdoe',
          ip: '192.168.1.100',
          dispositivo: 'Mozilla/5.0',
          metodo: 'POST',
          path: '/valoraciones',
        }),
      );
    });

    it('TRIANGULATE: createdBy should be set on ValoracionActivo', async () => {
      mockPrisma.valoracionActivo.create.mockImplementation((args: any) => {
        expect(args.data.createdBy).toBe('jdoe');
        return Promise.resolve(mockItem);
      });
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      await service.create(baseDto, mockUser, mockReq);

      expect(mockPrisma.valoracionActivo.create).toHaveBeenCalled();
    });

    it('TRIANGULATE: log should not be called when user is null', async () => {
      mockPrisma.valoracionActivo.create.mockResolvedValue(mockItem);
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      await service.create(baseDto, null, mockReq);

      // Still sets createdBy as undefined
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });

  describe('update() with user context', () => {
    const mockCurrent = {
      id: 1,
      nombreActivo: 'Old Name',
      tipoActivoId: 1,
      formatoId: 1,
      macroProcesoId: 1,
      subProcesoId: 1,
      propietarioId: 1,
      custodioId: 1,
      descripcion: 'Old desc',
      controlSeguridad: 'Old ctrl',
      ubicacion: 'Old loc',
      observaciones: null,
      confidencialidadId: 1,
      integridadId: 1,
      disponibilidadId: 1,
      tieneDatosPersonales: false,
      amenazas: null,
      vulnerabilidades: null,
      controlesImplementacion: null,
      impacto: null,
      probabilidadId: null,
      amenazaRiesgoId: null,
      vulnerabilidadRiesgoId: null,
      controlesArea: null,
      evaluacionRiesgo: null,
      nivelRiesgo: null,
      metodoTratamiento: null,
      tipoControl: null,
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('RED: should call AuditService.log with ACTUALIZAR + diff', async () => {
      mockPrisma.valoracionActivo.findFirst.mockResolvedValue(mockCurrent);
      mockPrisma.valoracionActivo.update.mockResolvedValue(mockCurrent);
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto: UpdateValoracionDto = {
        nombreActivo: 'New Name',
        descripcion: 'New desc',
      };

      await service.update(1, dto, mockUser, mockReq);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'ACTUALIZAR',
          modulo: 'valoraciones',
          entidad: 'activo',
          usuarioId: 'user-abc',
          usuario: 'jdoe',
        }),
      );

      // Verify diff was computed (only changed fields)
      const logCall = mockAuditService.log.mock.calls[0][0];
      const detalle = JSON.parse(logCall.detalle);
      expect(detalle.nombreActivo).toEqual({
        old: 'Old Name',
        new: 'New Name',
      });
      expect(detalle.descripcion).toEqual({
        old: 'Old desc',
        new: 'New desc',
      });
      // Unchanged fields should NOT be in diff
      expect(detalle.ubicacion).toBeUndefined();
    });

    it('TRIANGULATE: empty diff when no fields changed', async () => {
      mockPrisma.valoracionActivo.findFirst.mockResolvedValue(mockCurrent);
      mockPrisma.valoracionActivo.update.mockResolvedValue(mockCurrent);
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto: UpdateValoracionDto = {};

      await service.update(1, dto, mockUser, mockReq);

      const logCall = mockAuditService.log.mock.calls[0][0];
      expect(logCall.detalle).toBe('{}');
    });

    it('TRIANGULATE: updatedBy should be set on ValoracionActivo', async () => {
      mockPrisma.valoracionActivo.findFirst.mockResolvedValue(mockCurrent);
      mockPrisma.valoracionActivo.update.mockImplementation((args: any) => {
        expect(args.data.updatedBy).toBe('jdoe');
        return Promise.resolve(mockCurrent);
      });
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      await service.update(1, { nombreActivo: 'X' }, mockUser, mockReq);
      expect(mockPrisma.valoracionActivo.update).toHaveBeenCalled();
    });

    it('TRIANGULATE: should handle null user gracefully', async () => {
      mockPrisma.valoracionActivo.findFirst.mockResolvedValue(mockCurrent);
      mockPrisma.valoracionActivo.update.mockResolvedValue(mockCurrent);
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      await service.update(1, { nombreActivo: 'X' }, null, mockReq);

      // Should not throw, and updatedBy should not be set
      expect(mockPrisma.valoracionActivo.update).toHaveBeenCalled();
    });
  });
});
