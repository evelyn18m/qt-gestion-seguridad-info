import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService, LocalUser } from './auth.service';

const mockAuthService = {
  generateToken: jest.fn(),
  setPassword: jest.fn(),
  validateLocalUser: jest.fn(),
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

  it('RED: should return access_token and usuario on successful login', async () => {
    const localUser: LocalUser = {
      userId: 'user-123',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: ['admin'],
      source: 'local',
    };

    mockAuthService.validateLocalUser.mockResolvedValue(localUser);
    mockAuthService.generateToken.mockReturnValue({
      access_token: 'mock-jwt-token',
      usuario: {
        id: 'user-123',
        username: 'jdoe',
        email: 'jdoe@test.com',
        roles: ['admin'],
        primerInicio: false,
      },
    });

    const result = await controller.login({
      username: 'jdoe',
      password: 'secret123',
    });

    expect(mockAuthService.validateLocalUser).toHaveBeenCalledWith(
      'jdoe',
      'secret123',
    );
    expect(mockAuthService.generateToken).toHaveBeenCalledWith(localUser);
    expect(result).toEqual({
      access_token: 'mock-jwt-token',
      usuario: {
        id: 'user-123',
        username: 'jdoe',
        email: 'jdoe@test.com',
        roles: ['admin'],
        primerInicio: false,
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

  it('TRIANGULATE: should pass validated user to authService even if some fields are missing', async () => {
    const partialUser: LocalUser = {
      userId: 'user-min',
      username: 'min',
      email: '',
      roles: [],
      source: 'local',
    };

    mockAuthService.validateLocalUser.mockResolvedValue(partialUser);
    mockAuthService.generateToken.mockReturnValue({
      access_token: 'token',
      usuario: {
        id: 'user-min',
        username: 'min',
        email: '',
        roles: [],
        primerInicio: false,
      },
    });

    const result = await controller.login({
      username: 'min',
      password: 'secret123',
    });

    expect(mockAuthService.validateLocalUser).toHaveBeenCalledWith(
      'min',
      'secret123',
    );
    expect(result.access_token).toBe('token');
    expect(result.usuario.username).toBe('min');
  });
});
