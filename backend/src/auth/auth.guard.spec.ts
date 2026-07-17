import { AuthGuard } from './auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';

jest.mock('passport', () => ({
  authenticate: jest.fn(),
}));

// Mock jsonwebtoken for controlled behavior
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('AuthGuard (composite)', () => {
  let guard: AuthGuard;
  let mockReflector: Reflector;

  const mockContext = (
    headers: Record<string, string> = {},
    isPublic = false,
  ) => {
    const req = { headers };
    const res = {};

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    jest.spyOn(mockReflector, 'getAllAndOverride').mockReturnValue(isPublic);

    return ctx;
  };

  beforeEach(() => {
    mockReflector = new Reflector();
    guard = new AuthGuard(mockReflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // ── RED: @Public() routes bypass auth ────────────────────────────────

  it('RED: should allow @Public() routes without authentication', async () => {
    const result = await guard.canActivate(mockContext({}, true));
    expect(result).toBe(true);
  });

  // ── RED: Local JWT accepted via HMAC ─────────────────────────────────

  it('RED: should accept valid local JWT with correct source', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'user-1',
      username: 'jdoe',
      email: 'jdoe@test.com',
      roles: ['admin'],
      source: 'local',
    });

    const ctx = mockContext({
      authorization: 'Bearer valid-local-token',
    });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  // ── TRIANGULATE: Local JWT rejected (wrong source) → falls to Keycloak

  it('TRIANGULATE: should reject local JWT with wrong source and fall to Keycloak', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'user-1',
      source: 'keycloak',
    });

    (passport.authenticate as jest.Mock).mockImplementation(
      (_str: string, _opts: unknown, cb: Function) => {
        cb(null, { userId: 'kc-1', source: 'keycloak' });
        return jest.fn();
      },
    );

    const ctx = mockContext({
      authorization: 'Bearer some-token',
    });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  // ── TRIANGULATE: Both fail → 401 ──────────────────────────────────────

  it('TRIANGULATE: should throw 401 when both strategies fail', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    (passport.authenticate as jest.Mock).mockImplementation(
      (_str: string, _opts: unknown, cb: Function) => {
        cb(new Error('invalid'), null);
        return jest.fn();
      },
    );

    await expect(guard.canActivate(mockContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // ── TRIANGULATE: No auth header → 401 ────────────────────────────────

  it('TRIANGULATE: should throw 401 when no authorization header', async () => {
    (passport.authenticate as jest.Mock).mockImplementation(
      (_str: string, _opts: unknown, cb: Function) => {
        cb(new Error('no token'), null);
        return jest.fn();
      },
    );

    await expect(guard.canActivate(mockContext({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  // ── TRIANGULATE: Non-Bearer auth header → 401 ────────────────────────

  it('TRIANGULATE: should skip local validation for non-Bearer tokens', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'x', source: 'local' });
    (passport.authenticate as jest.Mock).mockImplementation(
      (_str: string, _opts: unknown, cb: Function) => {
        cb(new Error('invalid'), null);
        return jest.fn();
      },
    );

    await expect(
      guard.canActivate(mockContext({ authorization: 'Basic dXNlcjpwYXNz' })),
    ).rejects.toThrow(UnauthorizedException);

    // jwt.verify should not be called for non-Bearer tokens
    expect(jwt.verify).not.toHaveBeenCalled();
  });
});
