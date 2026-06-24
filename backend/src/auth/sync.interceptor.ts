import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.source === 'keycloak' && user.userId) {
      const keycloakSub = user.keycloakSub ?? user.userId;
      const roles =
        user.roles && Array.isArray(user.roles)
          ? JSON.stringify(user.roles)
          : '[]';

      // Fire-and-forget: don't block the request on sync
      void this.prisma.usuario
        .upsert({
          where: { keycloakSub },
          create: {
            keycloakSub,
            username: user.username || user.userId,
            email: user.email || '',
            roles,
            primerInicio: true,
          },
          update: {
            username: user.username || user.userId,
            email: user.email || '',
            roles,
          },
        })
        .catch(() => {
          // Silently ignore sync errors — don't block the request
        });
    }

    return next.handle();
  }
}
