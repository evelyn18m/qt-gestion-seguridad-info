import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { PageVisitDto } from './dto/page-visit.dto';
import { extractIp } from './ip.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('login')
  logLogin(
    @Req() req: Request,
    @CurrentUser() user: { userId: string; username: string } | null,
  ) {
    void this.auditService.log({
      accion: 'login',
      modulo: 'auth',
      usuarioId: user?.userId,
      usuario: user?.username,
      dispositivo: req.headers?.['user-agent'],
      ip: extractIp(req),
      metodo: 'POST',
      path: '/audit/login',
    });
  }

  @Post('page-visit')
  logPageVisit(
    @Req() req: Request,
    @CurrentUser() user: { userId: string; username: string } | null,
    @Body() dto: PageVisitDto,
  ) {
    void this.auditService.log({
      accion: 'page-visit',
      modulo: 'frontend',
      entidad: 'pagina',
      usuarioId: user?.userId,
      usuario: user?.username,
      path: dto.path,
      dispositivo: req.headers?.['user-agent'],
      ip: extractIp(req),
      metodo: 'POST',
    });
  }

  @Get()
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }
}
