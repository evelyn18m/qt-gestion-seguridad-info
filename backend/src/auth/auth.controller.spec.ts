import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService, LocalUser } from './auth.service';

const mockAuthService = {
  generateToken: jest.fn(),
  setPassword: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ── RED: POST /auth/login successful ──────────────────────────────────

  it('RED: should return access_token and usuario on successful login', () => {
    const localUser: LocalUser = {
      userId: 'user-123',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: ['admin'],
      source: 'local',
    };

    mockAuthService.generateToken.mockReturnValue({
      access_token: 'mock-jwt-token',
      usuario: {
        id: 'user-123',
        username: 'jdoe',
        email: 'jdoe@test.com',
        roles: ['admin'],
      },
    });

    const req = { user: localUser };
    const result = controller.login(req);

    expect(mockAuthService.generateToken).toHaveBeenCalledWith(localUser);
    expect(result).toEqual({
      access_token: 'mock-jwt-token',
      usuario: {
        id: 'user-123',
        username: 'jdoe',
        email: 'jdoe@test.com',
        roles: ['admin'],
      },
    });
  });

  // ── RED: POST /auth/set-password success ──────────────────────────────

  it('RED: should delegate to AuthService.setPassword on success', async () => {
    mockAuthService.setPassword.mockResolvedValue({
      message: 'Contraseña configurada',
    });

    const result = await controller.setPassword(
      { userId: 'user-1' },
      { password: 'newpass123' },
    );

    expect(mockAuthService.setPassword).toHaveBeenCalledWith(
      'user-1',
      'newpass123',
    );
    expect(result).toEqual({ message: 'Contraseña configurada' });
  });

  // ── TRIANGULATE: setPassword already set → propagates error ───────────

  it('TRIANGULATE: should propagate BadRequestException when password already set', async () => {
    mockAuthService.setPassword.mockRejectedValue(
      new BadRequestException('La contraseña ya fue configurada'),
    );

    await expect(
      controller.setPassword({ userId: 'user-1' }, { password: 'newpass123' }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── TRIANGULATE: login passes user to service regardless ─────────────

  it('TRIANGULATE: should pass req.user to authService even if some fields are missing', () => {
    const partialUser = {
      userId: 'user-min',
      username: 'min',
      email: '',
      roles: [],
      source: 'local' as const,
    };

    mockAuthService.generateToken.mockReturnValue({
      access_token: 'token',
      usuario: { id: 'user-min', username: 'min', email: '', roles: [] },
    });

    const req = { user: partialUser };
    const result = controller.login(req);

    expect(result.access_token).toBe('token');
    expect(result.usuario.username).toBe('min');
  });
});
