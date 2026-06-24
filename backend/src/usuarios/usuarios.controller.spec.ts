import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { NotFoundException } from '@nestjs/common';

const mockUsuariosService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('UsuariosController', () => {
  let controller: UsuariosController;

  const mockUsuarioResponse = {
    id: 'uuid-1',
    keycloakSub: 'kc-1',
    username: 'jdoe',
    email: 'jdoe@test.com',
    primerInicio: false,
    habilitado: true,
    roles: '["admin"]',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockUsuariosService }],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  // ── RED: GET /usuarios ────────────────────────────────────────────────

  it('RED: should delegate to service and return array', async () => {
    mockUsuariosService.findAll.mockResolvedValue([mockUsuarioResponse]);

    const result = await controller.findAll();

    expect(mockUsuariosService.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual([mockUsuarioResponse]);
    expect(result).toHaveLength(1);
  });

  // ── TRIANGULATE: GET /usuarios empty ──────────────────────────────────

  it('TRIANGULATE: should return empty array from service', async () => {
    mockUsuariosService.findAll.mockResolvedValue([]);

    const result = await controller.findAll();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  // ── RED: POST /usuarios ───────────────────────────────────────────────

  it('RED: should create usuario and return result', async () => {
    mockUsuariosService.create.mockResolvedValue(mockUsuarioResponse);

    const dto = { username: 'newuser', email: 'new@test.com' };
    const result = await controller.create(dto);

    expect(mockUsuariosService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockUsuarioResponse);
  });

  // ── RED: PATCH /usuarios/:id ──────────────────────────────────────────

  it('RED: should update usuario and return result', async () => {
    const updated = { ...mockUsuarioResponse, email: 'updated@test.com' };
    mockUsuariosService.update.mockResolvedValue(updated);

    const result = await controller.update('uuid-1', {
      email: 'updated@test.com',
    });

    expect(mockUsuariosService.update).toHaveBeenCalledWith('uuid-1', {
      email: 'updated@test.com',
    });
    expect(result).toEqual(updated);
  });

  // ── TRIANGULATE: PATCH /usuarios/:id not found ────────────────────────

  it('TRIANGULATE: should propagate NotFoundException on update of missing user', async () => {
    mockUsuariosService.update.mockRejectedValue(
      new NotFoundException('Usuario no encontrado'),
    );

    await expect(
      controller.update('nonexistent', { email: 'up@test.com' }),
    ).rejects.toThrow(NotFoundException);
  });

  // ── RED: DELETE /usuarios/:id ─────────────────────────────────────────

  it('RED: should delete usuario and return void', async () => {
    mockUsuariosService.delete.mockResolvedValue(undefined);

    const result = await controller.delete('uuid-1');

    expect(mockUsuariosService.delete).toHaveBeenCalledWith('uuid-1');
    expect(result).toBeUndefined();
  });

  // ── TRIANGULATE: DELETE /usuarios/:id not found ───────────────────────

  it('TRIANGULATE: should propagate NotFoundException on delete of missing user', async () => {
    mockUsuariosService.delete.mockRejectedValue(
      new NotFoundException('Usuario no encontrado'),
    );

    await expect(controller.delete('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
