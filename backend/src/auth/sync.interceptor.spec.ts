import { Test, TestingModule } from '@nestjs/testing';
import { SyncInterceptor } from './sync.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { of } from 'rxjs';

describe('SyncInterceptor', () => {
  let interceptor: SyncInterceptor;
  let mockPrisma: {
    usuario: {
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      usuario: {
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncInterceptor,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    interceptor = module.get<SyncInterceptor>(SyncInterceptor);
    jest.clearAllMocks();
  });

  // ── RED: Keycloak source creates new Usuario ──────────────────────────

  it('RED: should create Usuario with primerInicio true on first Keycloak login', async () => {
    const mockRequest = {
      user: {
        userId: 'kc-sub-123',
        username: 'jdoe',
        email: 'jdoe@test.com',
        roles: ['admin', 'user'],
        source: 'keycloak',
        keycloakSub: 'kc-sub-123',
      },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    };

    mockPrisma.usuario.upsert.mockResolvedValue({
      id: 'local-uuid',
      keycloakSub: 'kc-sub-123',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: '["admin","user"]',
      primerInicio: true,
    });

    // The interceptor must call the next.handle() pipeline
    const callHandler = { handle: () => of('response') };

    const result = await new Promise((resolve) => {
      const obs = interceptor.intercept(mockContext as any, callHandler);
      obs.subscribe({ next: resolve });
    });

    expect(result).toBe('response');
    expect(mockPrisma.usuario.upsert).toHaveBeenCalledWith({
      where: { keycloakSub: 'kc-sub-123' },
      create: {
        keycloakSub: 'kc-sub-123',
        username: 'jdoe',
        email: 'jdoe@test.com',
        roles: '["admin","user"]',
        primerInicio: true,
      },
      update: {
        username: 'jdoe',
        email: 'jdoe@test.com',
        roles: '["admin","user"]',
      },
    });
  });

  // ── TRIANGULATE: Keycloak source updates existing Usuario ──────────────

  it('TRIANGULATE: should update Usuario without changing primerInicio on subsequent login', async () => {
    const mockRequest = {
      user: {
        userId: 'kc-sub-456',
        username: 'asmith',
        email: 'asmith@test.com',
        roles: ['user'],
        source: 'keycloak',
        keycloakSub: 'kc-sub-456',
      },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    };

    mockPrisma.usuario.upsert.mockResolvedValue({
      id: 'existing-uuid',
      keycloakSub: 'kc-sub-456',
      username: 'asmith',
      email: 'asmith@test.com',
      roles: '["user"]',
      primerInicio: false,
      habilitado: true,
    });

    const callHandler = { handle: () => of('response') };

    await new Promise((resolve) => {
      const obs = interceptor.intercept(mockContext as any, callHandler);
      obs.subscribe({ next: resolve });
    });

    expect(mockPrisma.usuario.upsert).toHaveBeenCalledWith({
      where: { keycloakSub: 'kc-sub-456' },
      create: expect.objectContaining({
        keycloakSub: 'kc-sub-456',
        username: 'asmith',
        primerInicio: true,
      }),
      update: expect.objectContaining({
        username: 'asmith',
        email: 'asmith@test.com',
        roles: '["user"]',
      }),
    });
  });

  // ── TRIANGULATE: Local source should skip sync ────────────────────────

  it('TRIANGULATE: should skip sync when source is local', async () => {
    const mockRequest = {
      user: {
        userId: 'user-1',
        username: 'localuser',
        source: 'local',
      },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    };

    const callHandler = { handle: () => of('response') };

    await new Promise((resolve) => {
      const obs = interceptor.intercept(mockContext as any, callHandler);
      obs.subscribe({ next: resolve });
    });

    expect(mockPrisma.usuario.upsert).not.toHaveBeenCalled();
  });

  // ── TRIANGULATE: Missing roles → empty array ──────────────────────────

  it('TRIANGULATE: should handle Keycloak user without roles gracefully', async () => {
    const mockRequest = {
      user: {
        userId: 'kc-sub-789',
        username: 'noroles',
        email: '',
        roles: [],
        source: 'keycloak',
        keycloakSub: 'kc-sub-789',
      },
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    };

    mockPrisma.usuario.upsert.mockResolvedValue({ id: 'new-uuid' });

    const callHandler = { handle: () => of('response') };

    await new Promise((resolve) => {
      const obs = interceptor.intercept(mockContext as any, callHandler);
      obs.subscribe({ next: resolve });
    });

    expect(mockPrisma.usuario.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          roles: '[]',
        }),
      }),
    );
  });
});
