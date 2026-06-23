import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditEventDto } from './dto/audit-event.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget audit logging. NEVER throws — wraps in try/catch.
   */
  async log(dto: CreateAuditEventDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: dto });
    } catch (e) {
      console.error('[AuditService] log failed:', e);
    }
  }

  async findAll(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.accion) {
      where.accion = query.accion;
    }
    if (query.modulo) {
      where.modulo = query.modulo;
    }
    if (query.usuarioId) {
      where.usuarioId = query.usuarioId;
    }
    if (query.fechaDesde || query.fechaHasta) {
      where.createdAt = {};
      if (query.fechaDesde) {
        where.createdAt.gte = new Date(query.fechaDesde);
      }
      if (query.fechaHasta) {
        where.createdAt.lte = new Date(query.fechaHasta);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: number) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException(`AuditLog ${id} not found`);
    }
    return log;
  }
}
