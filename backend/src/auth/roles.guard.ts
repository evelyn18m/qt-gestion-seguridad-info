import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

export const ROLE_MAP: Record<string, string> = {
  admin: 'administrador',
  administradoregsi: 'administrador',
  usuarioegsi: 'usuario',
};

export function normalizeRoles(roles: string[]): string[] {
  return [...new Set(roles.map((r) => ROLE_MAP[r] || r))];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] | undefined = request.user?.roles;

    if (!userRoles || !Array.isArray(userRoles)) {
      throw new ForbiddenException('No tenés permisos para realizar esta acción');
    }

    const normalized = normalizeRoles(userRoles);
    const hasRole = requiredRoles.some((role) => normalized.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('No tenés permisos para realizar esta acción');
    }

    return true;
  }
}
