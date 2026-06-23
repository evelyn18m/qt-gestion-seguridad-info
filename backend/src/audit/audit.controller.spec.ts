import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PageVisitDto } from './dto/page-visit.dto';

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
  findAll: jest.fn(),
  findById: jest.fn(),
};

describe('AuditController', () => {
  let controller: AuditController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: mockAuditService }],
    }).compile();
    controller = module.get<AuditController>(AuditController);
  });

  describe('POST /audit/login', () => {
    it('RED: should call AuditService.log with LOGIN event data', async () => {
      const mockReq = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '192.168.1.100',
      } as any;
      const mockUser = { userId: 'abc-123', username: 'jdoe' };

      await controller.logLogin(mockReq, mockUser);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'login',
          modulo: 'auth',
          usuarioId: 'abc-123',
          usuario: 'jdoe',
          dispositivo: 'Mozilla/5.0',
          ip: '192.168.1.100',
          metodo: 'POST',
          path: '/audit/login',
        }),
      );
    });

    it('TRIANGULATE: should handle missing user-agent gracefully', async () => {
      const mockReq = {
        headers: {},
        ip: '10.0.0.1',
      } as any;
      const mockUser = { userId: 'user-2', username: 'asmith' };

      await controller.logLogin(mockReq, mockUser);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          dispositivo: undefined,
          ip: '10.0.0.1',
        }),
      );
    });
  });

  describe('POST /audit/page-visit', () => {
    it('RED: should call AuditService.log with page-visit data', async () => {
      const mockReq = {
        headers: { 'user-agent': 'Chrome/120' },
        ip: '10.0.0.1',
      } as any;
      const mockUser = { userId: 'abc-123', username: 'jdoe' };
      const dto: PageVisitDto = { path: '/reportes' };

      await controller.logPageVisit(mockReq, mockUser, dto);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'page-visit',
          modulo: 'frontend',
          path: '/reportes',
          usuarioId: 'abc-123',
          usuario: 'jdoe',
          dispositivo: 'Chrome/120',
          ip: '10.0.0.1',
          metodo: 'POST',
        }),
      );
    });

    it('TRIANGULATE: should handle missing user (anonymous)', async () => {
      const mockReq = {
        headers: {},
        ip: '10.0.0.1',
      } as any;
      const dto: PageVisitDto = { path: '/public' };

      await controller.logPageVisit(mockReq, null, dto);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'page-visit',
          modulo: 'frontend',
          path: '/public',
          usuarioId: undefined,
          usuario: undefined,
        }),
      );
    });
  });

  describe('GET /audit', () => {
    it('RED: should call AuditService.findAll with query params', async () => {
      const mockData = { data: [{ id: 1 }], total: 1 };
      mockAuditService.findAll.mockResolvedValue(mockData);

      const result = await controller.findAll({
        modulo: 'auth',
        page: 1,
        limit: 10,
      });

      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        modulo: 'auth',
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(mockData);
    });
  });
});
