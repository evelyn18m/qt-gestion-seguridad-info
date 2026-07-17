import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { extractIp } from './ip.util';

const WHITELIST_PATHS = ['/health', '/api/docs', '/favicon.ico'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const path = req.url as string;

    // Skip whitelisted paths
    if (WHITELIST_PATHS.includes(path)) {
      return next.handle();
    }

    const start = Date.now();
    const user = req.user as { userId: string; username: string } | undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;
          void this.auditService.log({
            accion: 'REQUEST',
            modulo: 'api',
            metodo: req.method as string,
            path,
            usuarioId: user?.userId,
            usuario: user?.username,
            ip: extractIp(req),
            dispositivo: req.headers?.['user-agent'] as string | undefined,
            status: res.statusCode,
            duracionMs: durationMs,
          });
        },
        error: () => {
          const durationMs = Date.now() - start;
          void this.auditService.log({
            accion: 'REQUEST',
            modulo: 'api',
            metodo: req.method as string,
            path,
            usuarioId: user?.userId,
            usuario: user?.username,
            ip: extractIp(req),
            dispositivo: req.headers?.['user-agent'] as string | undefined,
            status: res.statusCode,
            duracionMs: durationMs,
          });
        },
      }),
    );
  }
}
