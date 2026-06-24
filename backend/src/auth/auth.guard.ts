import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as passport from 'passport';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip auth for @Public() routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Try local HMAC first (no network required, fast)
    try {
      const user = await this.tryLocal(request);
      if (user) {
        request.user = user;
        return true;
      }
    } catch {
      // Local validation failed
    }

    // Fall back to Keycloak JWKS
    try {
      const user = await this.tryKeycloak(request, response);
      if (user) {
        request.user = user;
        return true;
      }
    } catch {
      // Both failed
    }

    throw new UnauthorizedException();
  }

  private tryLocal(request: unknown): unknown | null {
    const authHeader = (request as { headers?: Record<string, string> })
      .headers?.['authorization'];
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);
    const secret = process.env['JWT_SECRET'] || 'dev-fallback-secret';

    try {
      const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as Record<string, unknown>;

      // Only accept tokens with source: 'local'
      if (payload.source !== 'local') return null;

      return {
        userId: payload.sub,
        username: payload.username ?? '',
        email: payload.email ?? '',
        roles: payload.roles ?? [],
        source: 'local' as const,
      };
    } catch {
      return null;
    }
  }

  private tryKeycloak(request: unknown, response: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      passport.authenticate(
        'jwt-keycloak',
        { session: false },
        (err: Error | null, user: unknown) => {
          if (err || !user) {
            reject(err ?? new UnauthorizedException());
          } else {
            resolve(user);
          }
        },
      )(request, response);
    });
  }
}
