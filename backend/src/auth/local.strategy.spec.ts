import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let mockPrisma: {
    usuario: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      usuario: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    jest.clearAllMocks();
  });

  // ── RED: Successful login ─────────────────────────────────────────────

  it('RED: should return user when credentials are valid', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: '["admin","user"]',
      passwordHash,
      primerInicio: false,
      habilitado: true,
      keycloakSub: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await strategy.validate('jdoe', 'secret123');

    expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { username: 'jdoe' },
    });
    expect(result).toEqual({
      userId: 'user-1',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: ['admin', 'user'],
      source: 'local',
      primerInicio: false,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  // ── GREEN: Invalid password ───────────────────────────────────────────

  it('RED: should throw 401 when password is invalid', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'jdoe',
      roles: '["admin"]',
      passwordHash,
      primerInicio: false,
      habilitado: true,
    });

    await expect(strategy.validate('jdoe', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // ── TRIANGULATE: User not found ───────────────────────────────────────

  it('TRIANGULATE: should throw 401 when username is not found', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(null);

    await expect(strategy.validate('ghost', 'any')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // ── TRIANGULATE: primerInicio → allow login with flag ─────────────────

  it('TRIANGULATE: should allow login and return primerInicio flag when true', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: '["admin"]',
      passwordHash,
      primerInicio: true,
      habilitado: true,
    });

    const result = await strategy.validate('jdoe', 'secret123');

    expect(result).toEqual({
      userId: 'user-1',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: ['admin'],
      source: 'local',
      primerInicio: true,
    });
  });

  // ── TRIANGULATE: habilitado: false → 401 ──────────────────────────────

  it('TRIANGULATE: should throw 401 when user is disabled', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'jdoe',
      roles: '["admin"]',
      passwordHash,
      primerInicio: false,
      habilitado: false,
    });

    await expect(strategy.validate('jdoe', 'secret123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // ── TRIANGULATE: null passwordHash → 401 ──────────────────────────────

  it('TRIANGULATE: should throw 401 when passwordHash is null', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'jdoe',
      roles: '["admin"]',
      passwordHash: null,
      primerInicio: false,
      habilitado: true,
    });

    await expect(strategy.validate('jdoe', 'any')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
