import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AuditService>(AuditService);
  });

  describe('log()', () => {
    const eventDto = {
      accion: 'CREAR',
      modulo: 'valoraciones',
      entidad: 'activo',
      usuarioId: 'user-1',
      usuario: 'jdoe',
      detalle: '{}',
      ip: '192.168.1.1',
      dispositivo: 'Mozilla/5.0',
      path: '/valoraciones',
      metodo: 'POST',
      status: 201,
      duracionMs: 45,
    };

    it('RED: should call prisma.auditLog.create with the dto data', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 1, ...eventDto });

      await service.log(eventDto);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'CREAR',
          modulo: 'valoraciones',
          usuarioId: 'user-1',
          usuario: 'jdoe',
        }),
      });
    });

    it('TRIANGULATE: should not throw when prisma create fails (fire-and-forget)', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockPrisma.auditLog.create.mockRejectedValue(
        new Error('DB connection lost'),
      );

      // This MUST NOT throw
      await expect(service.log(eventDto)).resolves.toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AuditService] log failed:',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });

    it('TRIANGULATE: should handle minimal event (only required fields)', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 2 });

      await service.log({ accion: 'login', modulo: 'auth' });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'login',
          modulo: 'auth',
        }),
      });
    });
  });

  describe('findAll()', () => {
    const mockAuditLogs = [
      {
        id: 1,
        accion: 'login',
        modulo: 'auth',
        usuarioId: 'user-1',
        usuario: 'jdoe',
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 2,
        accion: 'CREAR',
        modulo: 'valoraciones',
        usuarioId: 'user-1',
        usuario: 'jdoe',
        detalle: '{}',
        createdAt: new Date('2024-01-02'),
      },
    ];

    it('RED: should call findMany with default pagination and orderBy createdAt desc', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);
      mockPrisma.auditLog.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.data).toEqual(mockAuditLogs);
      expect(result.total).toBe(2);
    });

    it('TRIANGULATE: should apply accion filter when provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLogs[1]]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      await service.findAll({ accion: 'CREAR' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accion: 'CREAR' }),
        }),
      );
    });

    it('TRIANGULATE: should apply modulo filter when provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLogs[0]]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      await service.findAll({ modulo: 'auth' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ modulo: 'auth' }),
        }),
      );
    });

    it('TRIANGULATE: should apply usuarioId filter when provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLogs[0]]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      await service.findAll({ usuarioId: 'user-1' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ usuarioId: 'user-1' }),
        }),
      );
    });

    it('TRIANGULATE: should apply date range filter (fechaDesde + fechaHasta)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);
      mockPrisma.auditLog.count.mockResolvedValue(2);

      await service.findAll({
        fechaDesde: '2024-01-01',
        fechaHasta: '2024-01-31',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('TRIANGULATE: should handle custom pagination (page=2, limit=10)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ page: 2, limit: 10 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('findAllReport()', () => {
    const mockAuditLogs = [
      {
        id: 1,
        accion: 'login',
        modulo: 'auth',
        usuarioId: 'user-1',
        usuario: 'jdoe',
        entidad: null,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 2,
        accion: 'CREAR',
        modulo: 'valoraciones',
        usuarioId: 'user-1',
        usuario: 'jdoe',
        entidad: 'activo',
        detalle: '{}',
        createdAt: new Date('2024-01-02'),
      },
    ];

    it('RED: should return unpaginated array with same filters as findAll()', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await service.findAllReport({
        accion: 'CREAR',
        entidad: 'activo',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accion: 'CREAR',
            entidad: 'activo',
          }),
          orderBy: { createdAt: 'desc' },
        }),
      );
      // Should NOT have skip/take (unpaginated)
      const callArgs = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.skip).toBeUndefined();
      expect(callArgs.take).toBeUndefined();
      expect(result).toEqual(mockAuditLogs);
      expect(Array.isArray(result)).toBe(true);
    });

    it('TRIANGULATE: should return empty array when no records match filters', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.findAllReport({
        modulo: 'nonexistent',
      });

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('TRIANGULATE: should apply date range filter', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLogs[0]]);

      await service.findAllReport({
        fechaDesde: '2024-01-01',
        fechaHasta: '2024-01-31',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });
  });

  describe('exportExcel()', () => {
    const mockAuditLogs = [
      {
        id: 1,
        accion: 'login',
        modulo: 'auth',
        usuarioId: 'user-1',
        usuario: 'jdoe',
        entidad: null,
        detalle: null,
        ip: '192.168.1.1',
        dispositivo: 'Mozilla/5.0',
        path: '/login',
        metodo: 'POST',
        duracionMs: 45,
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
      },
      {
        id: 2,
        accion: 'CREAR',
        modulo: 'valoraciones',
        usuarioId: 'user-1',
        usuario: 'jdoe',
        entidad: 'activo',
        detalle: '{"name":"test"}',
        ip: '192.168.1.2',
        dispositivo: 'Chrome/120',
        path: '/valoraciones',
        metodo: 'POST',
        duracionMs: 120,
        createdAt: new Date('2024-01-02T12:00:00.000Z'),
      },
    ];

    it('RED: should return a Buffer', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await service.exportExcel({});

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('TRIANGULATE: should apply filters passed to findAllReport', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([mockAuditLogs[0]]);

      const result = await service.exportExcel({
        accion: 'login',
        modulo: 'auth',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accion: 'login',
            modulo: 'auth',
          }),
        }),
      );
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('TRIANGULATE: should return valid xlsx even with empty data', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.exportExcel({});

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('entidad filter in findAll()', () => {
    it('TRIANGULATE: should apply entidad filter when provided', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ entidad: 'activo' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entidad: 'activo' }),
        }),
      );
    });
  });

  describe('findById()', () => {
    const mockLog = {
      id: 1,
      accion: 'CREAR',
      modulo: 'valoraciones',
      usuarioId: 'user-1',
      usuario: 'jdoe',
      createdAt: new Date('2024-01-01'),
    };

    it('RED: should return audit log when found', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue(mockLog);

      const result = await service.findById(1);

      expect(mockPrisma.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockLog);
    });

    it('TRIANGULATE: should throw NotFoundException when not found', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });
});
