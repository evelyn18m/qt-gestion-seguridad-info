import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
  });

  function mockContext(
    method: string,
    path: string,
    userId?: string,
    username?: string,
    ip?: string,
    userAgent?: string,
  ): ExecutionContext {
    const req = {
      method,
      url: path,
      user: userId ? { userId, username: username ?? '' } : undefined,
      ip: ip ?? '127.0.0.1',
      headers: {
        'user-agent': userAgent ?? 'test-agent',
      },
    };
    return {
      switchToHttp: () => ({
        getRequest: <T>() => req as T,
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;
  }

  function mockHandler(): CallHandler {
    return { handle: () => of({}) };
  }

  describe('whitelist filtering', () => {
    it('RED: should skip /health endpoint', (done) => {
      const ctx = mockContext('GET', '/health');
      const handler = mockHandler();

      interceptor.intercept(ctx, handler).subscribe({
        next: () => {
          expect(mockAuditService.log).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('TRIANGULATE: should skip /api/docs endpoint', (done) => {
      const ctx = mockContext('GET', '/api/docs');
      const handler = mockHandler();

      interceptor.intercept(ctx, handler).subscribe({
        next: () => {
          expect(mockAuditService.log).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });

    it('TRIANGULATE: should skip /favicon.ico', (done) => {
      const ctx = mockContext('GET', '/favicon.ico');
      const handler = mockHandler();

      interceptor.intercept(ctx, handler).subscribe({
        next: () => {
          expect(mockAuditService.log).not.toHaveBeenCalled();
          done();
        },
        error: done,
      });
    });
  });

  describe('audit capture', () => {
    it('should log non-whitelisted GET request with user + IP', (done) => {
      const ctx = mockContext(
        'GET',
        '/valoraciones',
        'user-1',
        'jdoe',
        '10.0.0.1',
        'Chrome',
      );
      const handler = mockHandler();

      interceptor.intercept(ctx, handler).subscribe({
        next: () => {
          expect(mockAuditService.log).toHaveBeenCalledTimes(1);
          expect(mockAuditService.log).toHaveBeenCalledWith(
            expect.objectContaining({
              accion: 'REQUEST',
              modulo: 'api',
              metodo: 'GET',
              path: '/valoraciones',
              usuarioId: 'user-1',
              usuario: 'jdoe',
              ip: '10.0.0.1',
              dispositivo: 'Chrome',
              status: 200,
              duracionMs: expect.any(Number),
            }),
          );
          done();
        },
        error: done,
      });
    });

    it('TRIANGULATE: should handle POST request with status 201', (done) => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: <T>() =>
            ({
              method: 'POST',
              url: '/valoraciones',
              user: { userId: 'user-2', username: 'asmith' },
              ip: '::1',
              headers: { 'user-agent': 'Firefox' },
            }) as T,
          getResponse: () => ({ statusCode: 201 }),
        }),
      } as ExecutionContext;
      const handler = mockHandler();

      interceptor.intercept(ctx, handler).subscribe({
        next: () => {
          expect(mockAuditService.log).toHaveBeenCalledWith(
            expect.objectContaining({
              metodo: 'POST',
              path: '/valoraciones',
              status: 201,
              ip: '::1',
            }),
          );
          done();
        },
        error: done,
      });
    });

    it('TRIANGULATE: should handle request without authenticated user (userId=null)', (done) => {
      const ctx = mockContext(
        'GET',
        '/api/catalogos/amenazas',
        undefined,
        undefined,
        '172.16.0.1',
      );
      const handler = mockHandler();

      interceptor.intercept(ctx, handler).subscribe({
        next: () => {
          expect(mockAuditService.log).toHaveBeenCalledWith(
            expect.objectContaining({
              usuarioId: undefined,
              usuario: undefined,
              path: '/api/catalogos/amenazas',
            }),
          );
          done();
        },
        error: done,
      });
    });
  });

  describe('fire-and-forget pattern', () => {
    it('should call AuditService.log with void (no await) — service handles errors internally', (done) => {
      const ctx = mockContext(
        'GET',
        '/valoraciones',
        'user-1',
        'jdoe',
        '1.2.3.4',
      );
      const handler = mockHandler();

      interceptor.intercept(ctx, handler).subscribe({
        next: () => {
          // Called exactly once with correct event
          expect(mockAuditService.log).toHaveBeenCalledTimes(1);
          expect(mockAuditService.log).toHaveBeenCalledWith(
            expect.objectContaining({
              accion: 'REQUEST',
              modulo: 'api',
            }),
          );
          done();
        },
        error: done,
      });
    });
  });
});
