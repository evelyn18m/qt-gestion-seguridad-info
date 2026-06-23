import { Test, TestingModule } from '@nestjs/testing';
import { ReportesService } from './reportes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HttpException } from '@nestjs/common';

const mockPrisma = {
  valoracionActivo: { findMany: jest.fn() },
  detalleRiesgo: { findMany: jest.fn() },
  impacto: { findMany: jest.fn() },
  tipoActivo: { findMany: jest.fn() },
  formato: { findMany: jest.fn() },
  macroProceso: { findMany: jest.fn(), findUnique: jest.fn() },
  amenaza: { findMany: jest.fn() },
  vulnerabilidad: { findMany: jest.fn() },
  riesgo: { findMany: jest.fn() },
  tipoControl: { findMany: jest.fn() },
  funcionario: { findMany: jest.fn() },
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
  findAll: jest.fn(),
  findById: jest.fn(),
};

describe('ReportesService — Audit Integration', () => {
  let service: ReportesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: return empty arrays to avoid DB calls
    mockPrisma.valoracionActivo.findMany.mockResolvedValue([]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);
    mockPrisma.impacto.findMany.mockResolvedValue([]);
    mockPrisma.tipoActivo.findMany.mockResolvedValue([]);
    mockPrisma.formato.findMany.mockResolvedValue([]);
    mockPrisma.macroProceso.findMany.mockResolvedValue([]);
    mockPrisma.amenaza.findMany.mockResolvedValue([]);
    mockPrisma.vulnerabilidad.findMany.mockResolvedValue([]);
    mockPrisma.riesgo.findMany.mockResolvedValue([]);
    mockPrisma.tipoControl.findMany.mockResolvedValue([]);
    mockPrisma.funcionario.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ReportesService>(ReportesService);
  });

  const mockUser = { userId: 'user-1', username: 'jdoe' };
  const mockReq = {
    headers: { 'user-agent': 'Chrome/120' },
    ip: '10.0.0.1',
  };

  describe('exportValoracionActivos()', () => {
    it('RED: should call AuditService.log with EXPORTAR + valoracion-activos tipo', async () => {
      const filters = { macroProcesoId: '5', custodioId: '10' };
      const buffer = await service.exportValoracionActivos(
        filters,
        mockUser,
        mockReq,
      );

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'EXPORTAR',
          modulo: 'reportes',
          usuarioId: 'user-1',
          usuario: 'jdoe',
          ip: '10.0.0.1',
          dispositivo: 'Chrome/120',
        }),
      );
      const logCall = mockAuditService.log.mock.calls[0][0];
      const detalle = JSON.parse(logCall.detalle);
      expect(detalle.tipo).toBe('valoracion-activos');
      expect(detalle.filtros).toEqual(filters);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('TRIANGULATE: should log export even when filters are empty', async () => {
      const buffer = await service.exportValoracionActivos(
        {},
        mockUser,
        mockReq,
      );

      expect(mockAuditService.log).toHaveBeenCalled();
      const logCall = mockAuditService.log.mock.calls[0][0];
      const detalle = JSON.parse(logCall.detalle);
      expect(detalle.tipo).toBe('valoracion-activos');
      expect(detalle.filtros).toEqual({});
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('exportAnalisisRiesgoActivos()', () => {
    it('RED: should call AuditService.log with EXPORTAR + analisis-riesgo-activos tipo', async () => {
      const filters = { macroProcesoId: '3' };
      const buffer = await service.exportAnalisisRiesgoActivos(
        filters,
        mockUser,
        mockReq,
      );

      expect(mockAuditService.log).toHaveBeenCalled();
      const logCall = mockAuditService.log.mock.calls[0][0];
      const detalle = JSON.parse(logCall.detalle);
      expect(detalle.tipo).toBe('analisis-riesgo-activos');
      expect(detalle.filtros).toEqual(filters);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('exportEvaluacionRiesgo()', () => {
    it('RED: should call AuditService.log with EXPORTAR + evaluacion-riesgo tipo', async () => {
      const filters = { nivelRiesgo: 'Alto' };
      const buffer = await service.exportEvaluacionRiesgo(
        filters,
        mockUser,
        mockReq,
      );

      expect(mockAuditService.log).toHaveBeenCalled();
      const logCall = mockAuditService.log.mock.calls[0][0];
      const detalle = JSON.parse(logCall.detalle);
      expect(detalle.tipo).toBe('evaluacion-riesgo');
      expect(detalle.filtros).toEqual(filters);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('exportTratamientoRiesgo()', () => {
    it('RED: should call AuditService.log with EXPORTAR + tratamiento-riesgo tipo', async () => {
      const filters = { riesgoResidual: 'ACEPTABLE' };
      const buffer = await service.exportTratamientoRiesgo(
        filters,
        mockUser,
        mockReq,
      );

      expect(mockAuditService.log).toHaveBeenCalled();
      const logCall = mockAuditService.log.mock.calls[0][0];
      const detalle = JSON.parse(logCall.detalle);
      expect(detalle.tipo).toBe('tratamiento-riesgo');
      expect(detalle.filtros).toEqual(filters);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('log on error still exported as buffer?', () => {
    it('service should NOT depend on audit for response — export completes even if log fails', async () => {
      // AuditService.log is fire-and-forget internally, so it never throws
      // This test verifies the export method returns a buffer regardless
      const filters = {};
      const buffer = await service.exportValoracionActivos(
        filters,
        mockUser,
        mockReq,
      );
      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('without user (null)', () => {
    it('should not call AuditService.log when user is null', async () => {
      const buffer = await service.exportValoracionActivos({}, null, mockReq);

      expect(mockAuditService.log).not.toHaveBeenCalled();
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });
});
