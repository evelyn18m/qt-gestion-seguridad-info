import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditEventDto } from './dto/audit-event.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { Prisma } from '@prisma/client';
import * as XLSX_STYLE from 'xlsx-js-style';

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

  /**
   * Builds the Prisma where clause from AuditQueryDto filters.
   */
  private buildWhere(query: AuditQueryDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.accion) {
      where.accion = query.accion;
    }
    if (query.modulo) {
      where.modulo = query.modulo;
    }
    if (query.entidad) {
      where.entidad = query.entidad;
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

    return where;
  }

  async findAll(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query);

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

  /**
   * Unpaginated version of findAll() — same filters but returns AuditLog[] directly.
   */
  async findAllReport(query: AuditQueryDto) {
    const where = this.buildWhere(query);

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException(`AuditLog ${id} not found`);
    }
    return log;
  }

  /**
   * Exports filtered audit logs to an Excel (.xlsx) Buffer.
   */
  async exportExcel(filters: AuditQueryDto): Promise<Buffer> {
    const data = await this.findAllReport(filters);

    const headers = [
      'Fecha',
      'Acción',
      'Módulo',
      'Usuario',
      'Entidad',
      'Detalle',
      'IP',
      'Dispositivo',
      'Path',
      'Método',
      'Duración (ms)',
    ];

    const rows = data.map((row) => [
      row.createdAt?.toISOString() ?? '',
      row.accion,
      row.modulo,
      row.usuario ?? '',
      row.entidad ?? '',
      row.detalle ?? '',
      row.ip ?? '',
      row.dispositivo ?? '',
      row.path ?? '',
      row.metodo ?? '',
      row.duracionMs ?? '',
    ]);

    const ws = XLSX_STYLE.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX_STYLE.utils.book_new();
    XLSX_STYLE.utils.book_append_sheet(wb, ws, 'Auditoría');

    // Style headers
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4F46E5' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    const range = XLSX_STYLE.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX_STYLE.utils.encode_cell({ r: 0, c: col });
      if (ws[cellRef]) (ws[cellRef] as any).s = headerStyle;
    }

    // Column widths
    ws['!cols'] = headers.map(() => ({ wch: 20 }));

    const array = XLSX_STYLE.write(wb, { type: 'array', bookType: 'xlsx' });
    return Buffer.from(array);
  }
}
