import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import { KeycloakAdminService } from '../keycloak/keycloak-admin.service';
import * as bcrypt from 'bcrypt';

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
  let mockKeycloak: {
    getAdminToken: jest.Mock;
    createUser: jest.Mock;
    findUserByUsername: jest.Mock;
    assignClientRoles: jest.Mock;
    deleteUser: jest.Mock;
    updateUser: jest.Mock;
    getClientUuid: jest.Mock;
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

  // User WITHOUT keycloakSub (legacy / KC sync never happened)
  const mockUsuarioNoKc = {
    ...mockUsuarioFull,
    keycloakSub: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      usuario: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(mockUsuarioNoHash),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    mockKeycloak = {
      getAdminToken: jest.fn().mockResolvedValue('mock-token'),
      createUser: jest.fn().mockResolvedValue('kc-new-uuid'),
      findUserByUsername: jest.fn().mockResolvedValue(null),
      assignClientRoles: jest.fn().mockResolvedValue(undefined),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      updateUser: jest.fn().mockResolvedValue(undefined),
      getClientUuid: jest.fn().mockResolvedValue('client-uuid-sgsi'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: KeycloakAdminService, useValue: mockKeycloak },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EXISTING TESTS (safety net — must still pass after KC integration)
  // ═══════════════════════════════════════════════════════════════════════

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

  it('TRIANGULATE: should return empty array when no usuarios exist', async () => {
    mockPrisma.usuario.findMany.mockResolvedValue([]);

    const result = await service.findAll();

    expect(result).toEqual([]);
  });

  it('RED: should create usuario with auto-generated password and return compound response', async () => {
    mockPrisma.usuario.create.mockResolvedValue(mockUsuarioNoHash);

    const result = await service.create({
      username: 'newuser',
      email: 'new@test.com',
    });

    expect(mockPrisma.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'newuser',
          email: 'new@test.com',
          roles: '[]',
          passwordHash: expect.any(String),
          primerInicio: true,
        }),
        select: expect.objectContaining({
          passwordHash: false,
        }),
      }),
    );
    expect(result).toHaveProperty('usuario');
    expect(result).toHaveProperty('contraseñaGenerada');
    expect(result.usuario).not.toHaveProperty('passwordHash');
    expect(result.usuario.username).toBe('jdoe');
    expect(result.contraseñaGenerada).toEqual(expect.any(String));
    expect(result.contraseñaGenerada.length).toBe(32);
  });

  it('RED: contraseñaGenerada should be bcrypt-verifiable against stored passwordHash', async () => {
    let capturedCreateArgs: { data: { passwordHash: string } } | null = null;
    mockPrisma.usuario.create.mockImplementation(
      (args: { data: { passwordHash: string } }) => {
        capturedCreateArgs = args;
        return Promise.resolve(mockUsuarioNoHash);
      },
    );

    const result = await service.create({
      username: 'bcryptuser',
      email: 'bcrypt@test.com',
    });

    const storedPasswordHash = capturedCreateArgs!.data.passwordHash;
    const plainPassword = result.contraseñaGenerada;

    const isValid = await bcrypt.compare(plainPassword, storedPasswordHash);
    expect(isValid).toBe(true);
  });

  it('TRIANGULATE: two create() calls should produce different contraseñaGenerada', async () => {
    const user1 = { ...mockUsuarioNoHash, username: 'user1' };
    const user2 = { ...mockUsuarioNoHash, username: 'user2' };
    mockPrisma.usuario.create
      .mockResolvedValueOnce(user1)
      .mockResolvedValueOnce(user2);

    const result1 = await service.create({
      username: 'user1',
      email: 'u1@test.com',
    });
    const result2 = await service.create({
      username: 'user2',
      email: 'u2@test.com',
    });

    expect(result1.contraseñaGenerada).not.toBe(result2.contraseñaGenerada);
  });

  it('TRIANGULATE: should propagate Prisma unique constraint error', async () => {
    const prismaError = { code: 'P2002', meta: { target: ['username'] } };
    mockPrisma.usuario.create.mockRejectedValue(prismaError);

    await expect(
      service.create({ username: 'jdoe', email: 'dup@test.com' }),
    ).rejects.toEqual(prismaError);
  });

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

  it('TRIANGULATE: should return null when usuario not found', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    const result = await service.findOne('nonexistent');

    expect(result).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // NEW: Keycloak Sync Tests (Phase 3 RED)
  // ═══════════════════════════════════════════════════════════════════════

  describe('Keycloak Sync', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // ── RED: create() syncs to Keycloak and saves keycloakSub ──────────

    it('RED: create() should sync user to Keycloak and save keycloakSub', async () => {
      mockPrisma.usuario.create.mockResolvedValue(mockUsuarioNoHash);
      mockKeycloak.createUser.mockResolvedValue('kc-new-uuid-123');

      const result = await service.create({
        username: 'syncuser',
        email: 'sync@test.com',
      });

      // Keycloak user created
      expect(mockKeycloak.createUser).toHaveBeenCalledWith({
        username: 'syncuser',
        email: 'sync@test.com',
        enabled: true,
        credentials: [
          {
            type: 'password',
            value: result.contraseñaGenerada,
            temporary: false,
          },
        ],
      });

      // keycloakSub saved locally
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
        where: { id: mockUsuarioNoHash.id },
        data: { keycloakSub: 'kc-new-uuid-123' },
      });

      // Response still includes compound result
      expect(result).toHaveProperty('usuario');
      expect(result).toHaveProperty('contraseñaGenerada');
    });

    // ── RED: create() with roles assigns client roles to KC ─────────────

    it('RED: create() with roles should assign client roles in Keycloak', async () => {
      mockPrisma.usuario.create.mockResolvedValue(mockUsuarioNoHash);
      mockKeycloak.createUser.mockResolvedValue('kc-new-uuid-456');

      await service.create({
        username: 'roleuser',
        email: 'role@test.com',
        roles: ['administrador'],
      });

      expect(mockKeycloak.assignClientRoles).toHaveBeenCalledWith(
        'kc-new-uuid-456',
        ['administrador'],
      );
    });

    // ── TRIANGULATE: create() survives Keycloak failure ─────────────────

    it('TRIANGULATE: create() should succeed locally even when Keycloak fails (best-effort)', async () => {
      mockPrisma.usuario.create.mockResolvedValue(mockUsuarioNoHash);
      mockKeycloak.createUser.mockRejectedValue(new Error('KC down'));

      const result = await service.create({
        username: 'resilient',
        email: 'resilient@test.com',
      });

      // Local user created
      expect(mockPrisma.usuario.create).toHaveBeenCalled();
      // keycloakSub NOT updated (KC failed)
      expect(mockPrisma.usuario.update).not.toHaveBeenCalled();
      // Still returns 201-style response
      expect(result).toHaveProperty('usuario');
      expect(result.contraseñaGenerada).toEqual(expect.any(String));
    });

    // ── RED: update() syncs to Keycloak when keycloakSub exists ─────────

    it('RED: update() should sync email and enabled to Keycloak', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuarioFull);
      mockPrisma.usuario.update.mockResolvedValue(mockUsuarioNoHash);

      await service.update('uuid-1', {
        email: 'synced@test.com',
        habilitado: false,
      });

      expect(mockKeycloak.updateUser).toHaveBeenCalledWith('kc-1', {
        email: 'synced@test.com',
        enabled: false,
      });
    });

    // ── RED: update() syncs roles to Keycloak ───────────────────────────

    it('RED: update() should sync roles to Keycloak when roles provided', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuarioFull);
      mockPrisma.usuario.update.mockResolvedValue(mockUsuarioNoHash);

      await service.update('uuid-1', {
        roles: ['usuario'],
      });

      expect(mockKeycloak.assignClientRoles).toHaveBeenCalledWith('kc-1', [
        'usuario',
      ]);
    });

    // ── TRIANGULATE: update() skips Keycloak when no keycloakSub ────────

    it('TRIANGULATE: update() should skip KC sync when keycloakSub is null', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuarioNoKc);
      mockPrisma.usuario.update.mockResolvedValue(mockUsuarioNoKc);

      await service.update('uuid-no-kc', {
        email: 'new@test.com',
      });

      // No KC calls at all
      expect(mockKeycloak.updateUser).not.toHaveBeenCalled();
      expect(mockKeycloak.assignClientRoles).not.toHaveBeenCalled();
      expect(mockKeycloak.deleteUser).not.toHaveBeenCalled();
    });

    // ── RED: delete() deletes from Keycloak ─────────────────────────────

    it('RED: delete() should delete from Keycloak when keycloakSub exists', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuarioFull);
      mockPrisma.usuario.delete.mockResolvedValue({ id: 'uuid-1' });

      await service.delete('uuid-1');

      expect(mockKeycloak.deleteUser).toHaveBeenCalledWith('kc-1');
    });

    // ── TRIANGULATE: delete() skips KC when no keycloakSub ──────────────

    it('TRIANGULATE: delete() should skip KC delete when keycloakSub is null', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuarioNoKc);
      mockPrisma.usuario.delete.mockResolvedValue({ id: 'uuid-no-kc' });

      await service.delete('uuid-no-kc');

      // Local delete still happens
      expect(mockPrisma.usuario.delete).toHaveBeenCalled();
      // KC delete NOT called
      expect(mockKeycloak.deleteUser).not.toHaveBeenCalled();
    });
  });
});
