import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { HttpException } from '@nestjs/common';

const mockUsuariosService = {
  getUsers: jest.fn(),
};

describe('UsuariosController', () => {
  let controller: UsuariosController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockUsuariosService }],
    }).compile();
    controller = module.get<UsuariosController>(UsuariosController);
  });

  describe('GET /usuarios', () => {
    // ── RED: Delegates to service and returns DTO array ─────────────────

    it('RED: should delegate to UsuariosService.getUsers and return UsuarioDto[]', async () => {
      const mockUsers = [
        {
          id: 'a1',
          username: 'jdoe',
          email: 'jdoe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          enabled: true,
          roles: ['admin'],
        },
      ];
      mockUsuariosService.getUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUsers();

      expect(mockUsuariosService.getUsers).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(1);
    });

    // ── TRIANGULATE: Returns empty array from service ───────────────────

    it('TRIANGULATE: should propagate empty array when service returns empty', async () => {
      mockUsuariosService.getUsers.mockResolvedValue([]);

      const result = await controller.getUsers();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    // ── TRIANGULATE: Propagates service errors ──────────────────────────

    it('TRIANGULATE: should propagate HttpException when service throws', async () => {
      mockUsuariosService.getUsers.mockRejectedValue(
        new HttpException('Keycloak no disponible', 502),
      );

      await expect(controller.getUsers()).rejects.toThrow(HttpException);
      await expect(controller.getUsers()).rejects.toMatchObject({
        response: 'Keycloak no disponible',
        status: 502,
      });
    });

    // ── TRIANGULATE: Delegates multiple users correctly ─────────────────

    it('TRIANGULATE: should return multiple DTOs from service', async () => {
      const mockUsers = [
        { id: '1', username: 'u1', email: '', firstName: '', lastName: '', enabled: true, roles: [] },
        { id: '2', username: 'u2', email: '', firstName: '', lastName: '', enabled: false, roles: ['viewer'] },
        { id: '3', username: 'u3', email: '', firstName: '', lastName: '', enabled: true, roles: ['admin', 'editor'] },
      ];
      mockUsuariosService.getUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUsers();

      expect(result).toHaveLength(3);
      expect(result[2].roles).toEqual(['admin', 'editor']);
    });
  });
});
