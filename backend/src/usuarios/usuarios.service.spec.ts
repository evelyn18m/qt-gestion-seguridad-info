import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let mockPrisma: {
    usuario: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  // Mock data WITHOUT passwordHash (as select would filter it out)
  const mockUsuarioNoHash = {
    id: 'uuid-1',
    keycloakSub: 'kc-1',
    username: 'jdoe',
    email: 'jdoe@test.com',
    primerInicio: false,
    habilitado: true,
    roles: '["admin","user"]',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock data WITH passwordHash (for existence checks)
  const mockUsuarioFull = {
    ...mockUsuarioNoHash,
    passwordHash: '$2b$10$hashed',
  };

  beforeEach(async () => {
    mockPrisma = {
      usuario: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    jest.clearAllMocks();
  });

  // ── RED: findAll() ────────────────────────────────────────────────────

  it('RED: should return all usuarios without passwordHash', async () => {
    mockPrisma.usuario.findMany.mockResolvedValue([mockUsuarioNoHash]);

    const result = await service.findAll();

    expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ passwordHash: false }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('passwordHash');
    expect(result[0].id).toBe('uuid-1');
    expect(result[0].username).toBe('jdoe');
    expect(result[0].habilitado).toBe(true);
  });

  // ── TRIANGULATE: findAll() empty ──────────────────────────────────────

  it('TRIANGULATE: should return empty array when no usuarios exist', async () => {
    mockPrisma.usuario.findMany.mockResolvedValue([]);

    const result = await service.findAll();

    expect(result).toEqual([]);
  });

  // ── RED: create() ─────────────────────────────────────────────────────

  it('RED: should create usuario and return without passwordHash', async () => {
    mockPrisma.usuario.create.mockResolvedValue(mockUsuarioNoHash);

    const result = await service.create({
      username: 'newuser',
      email: 'new@test.com',
    });

    expect(mockPrisma.usuario.create).toHaveBeenCalledWith({
      data: {
        username: 'newuser',
        email: 'new@test.com',
        roles: '[]',
      },
      select: expect.objectContaining({
        passwordHash: false,
      }),
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.username).toBe('jdoe');
  });

  // ── TRIANGULATE: create() with duplicate username ─────────────────────

  it('TRIANGULATE: should propagate Prisma unique constraint error', async () => {
    const prismaError = { code: 'P2002', meta: { target: ['username'] } };
    mockPrisma.usuario.create.mockRejectedValue(prismaError);

    await expect(
      service.create({ username: 'jdoe', email: 'dup@test.com' }),
    ).rejects.toEqual(prismaError);
  });

  // ── RED: update() ─────────────────────────────────────────────────────

  it('RED: should update usuario fields after verifying existence', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuarioFull);
    const updated = {
      ...mockUsuarioNoHash,
      email: 'newemail@test.com',
      habilitado: false,
    };
    mockPrisma.usuario.update.mockResolvedValue(updated);

    const result = await service.update('uuid-1', {
      email: 'newemail@test.com',
      habilitado: false,
    });

    expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: 'uuid-1' },
    });
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'uuid-1' },
      data: { email: 'newemail@test.com', habilitado: false },
      select: expect.objectContaining({ passwordHash: false }),
    });
    expect(result.email).toBe('newemail@test.com');
    expect(result.habilitado).toBe(false);
  });

  // ── TRIANGULATE: update() roles ───────────────────────────────────────

  it('TRIANGULATE: should update roles field as JSON string', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuarioFull);
    const withRoles = { ...mockUsuarioNoHash, roles: '["editor"]' };
    mockPrisma.usuario.update.mockResolvedValue(withRoles);

    const result = await service.update('uuid-1', {
      roles: ['editor'],
    });

    expect(result.roles).toBe('["editor"]');
    expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roles: '["editor"]' }),
      }),
    );
  });

  // ── RED: delete() ─────────────────────────────────────────────────────

  it('RED: should delete usuario by id after verifying existence', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuarioFull);
    mockPrisma.usuario.delete.mockResolvedValue({ id: 'uuid-1' });

    await service.delete('uuid-1');

    expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: 'uuid-1' },
    });
    expect(mockPrisma.usuario.delete).toHaveBeenCalledWith({
      where: { id: 'uuid-1' },
    });
  });

  // ── RED: findOne() ────────────────────────────────────────────────────

  it('RED: should find usuario by id without passwordHash', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuarioNoHash);

    const result = await service.findOne('uuid-1');

    expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: 'uuid-1' },
      select: expect.objectContaining({ passwordHash: false }),
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result?.id).toBe('uuid-1');
  });

  // ── TRIANGULATE: findOne() not found ──────────────────────────────────

  it('TRIANGULATE: should return null when usuario not found', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    const result = await service.findOne('nonexistent');

    expect(result).toBeNull();
  });
});
