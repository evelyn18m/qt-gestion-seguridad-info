import { RolesGuard, ROLE_MAP, normalizeRoles } from './roles.guard';
import { ROLES_KEY } from './decorators/roles.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  // ── Helpers ──────────────────────────────────────────────────────

  function mockExecutionContext(
    overrides: {
      isPublic?: boolean;
      requiredRoles?: string[];
      userRoles?: string[] | null | undefined;
    } = {},
  ): ExecutionContext {
    const request = {
      user:
        overrides.userRoles !== undefined
          ? { roles: overrides.userRoles }
          : { roles: [] },
    };

    const handler = {};
    const cls = {};

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => handler,
      getClass: () => cls,
    } as ExecutionContext;

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === IS_PUBLIC_KEY) return overrides.isPublic ?? false;
        return undefined;
      });

    jest.spyOn(reflector, 'get').mockImplementation((key: string) => {
      if (key === ROLES_KEY) return overrides.requiredRoles;
      return undefined;
    });

    return ctx;
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    jest.clearAllMocks();
  });

  // ── ROLE_MAP constant tests ──────────────────────────────────────

  describe('ROLE_MAP constant', () => {
    it('should map admin to administrador', () => {
      expect(ROLE_MAP['admin']).toBe('administrador');
    });

    it('should map administradoregsi to administrador', () => {
      expect(ROLE_MAP['administradoregsi']).toBe('administrador');
    });

    it('should map usuarioegsi to usuario', () => {
      expect(ROLE_MAP['usuarioegsi']).toBe('usuario');
    });
  });

  // ── normalizeRoles() pure function tests ─────────────────────────

  describe('normalizeRoles()', () => {
    it('should normalize legacy admin roles', () => {
      expect(normalizeRoles(['admin'])).toEqual(['administrador']);
    });

    it('should normalize administradoregsi to administrador', () => {
      expect(normalizeRoles(['administradoregsi'])).toEqual(['administrador']);
    });

    it('should normalize usuarioegsi to usuario', () => {
      expect(normalizeRoles(['usuarioegsi'])).toEqual(['usuario']);
    });

    it('should pass through already normalized roles', () => {
      expect(normalizeRoles(['administrador'])).toEqual(['administrador']);
      expect(normalizeRoles(['usuario'])).toEqual(['usuario']);
    });

    it('should pass through unknown roles untouched', () => {
      expect(normalizeRoles(['superadmin'])).toEqual(['superadmin']);
    });

    it('should deduplicate roles after normalization', () => {
      // admin → 'administrador', administradoregsi → 'administrador'
      // Both normalize to the same value → dedup
      expect(normalizeRoles(['admin', 'administradoregsi'])).toEqual([
        'administrador',
      ]);
    });

    it('should handle empty array', () => {
      expect(normalizeRoles([])).toEqual([]);
    });

    it('should handle mixed legacy and normal roles', () => {
      expect(normalizeRoles(['admin', 'usuarioegsi', 'administrador'])).toEqual(
        ['administrador', 'usuario'],
      );
    });
  });

  // ── canActivate() tests ──────────────────────────────────────────

  describe('canActivate()', () => {
    // ── @Public() bypass ────────────────────────────────────────

    it('RED: should allow @Public() endpoints without checking roles', () => {
      const ctx = mockExecutionContext({
        isPublic: true,
        requiredRoles: ['administrador'],
        userRoles: ['usuario'],
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    // ── No @Roles() → open endpoint ─────────────────────────────

    it('RED: should allow endpoints without @Roles() decorator', () => {
      const ctx = mockExecutionContext({
        requiredRoles: undefined,
        userRoles: ['usuario'],
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('RED: should allow open endpoint even with no user', () => {
      const ctx = mockExecutionContext({
        requiredRoles: undefined,
        userRoles: undefined,
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    // ── Role match ──────────────────────────────────────────────

    it('RED: should allow when user has the required role (administrador)', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['administrador'],
        userRoles: ['administrador'],
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('TRIANGULATE: should allow when user has one of multiple required roles', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['administrador', 'supervisor'],
        userRoles: ['usuario', 'administrador'],
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    // ── Role mismatch → 403 ─────────────────────────────────────

    it('RED: should deny when user lacks the required role', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['administrador'],
        userRoles: ['usuario'],
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('TRIANGULATE: should deny when user has roles but none match required', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['administrador'],
        userRoles: ['invitado', 'auditor'],
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    // ── Legacy role normalization ───────────────────────────────

    it('RED: should match legacy admin role via normalization', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['administrador'],
        userRoles: ['admin'],
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('TRIANGULATE: should match administradoregsi via normalization', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['administrador'],
        userRoles: ['administradoregsi'],
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('TRIANGULATE: should match usuarioegsi via normalization', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['usuario'],
        userRoles: ['usuarioegsi'],
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    // ── Edge cases ──────────────────────────────────────────────

    it('RED: should deny when user.roles is undefined', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['administrador'],
        // roles explicitly set up but user is defined with no roles property
        userRoles: undefined,
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('RED: should deny when user.roles is null', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['administrador'],
        userRoles: null,
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('TRIANGULATE: should deny when user.roles is an empty array', () => {
      const ctx = mockExecutionContext({
        requiredRoles: ['administrador'],
        userRoles: [],
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('TRIANGULATE: should allow when requiredRoles is an empty array (no roles required)', () => {
      const ctx = mockExecutionContext({
        requiredRoles: [],
        userRoles: ['usuario'],
      });
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });
});
