import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateValoracionDto,
  DetalleRiesgoDto,
} from './dto/create-valoracion.dto';
import { UpdateValoracionDto } from './dto/update-valoracion.dto';

@Injectable()
export class ValoracionesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapDetalleRiesgo(
    d: DetalleRiesgoDto,
    valoracionActivoId: number,
  ): Prisma.DetalleRiesgoCreateInput {
    const data: Prisma.DetalleRiesgoCreateInput = {
      valoracionActivoId,
      tipo: d.tipo ?? 'amenaza',
      catalogoId: d.catalogoId ?? 0,
      // Tab 3/4 optional fields — only include if provided
      ...(d.riesgoId !== undefined && { riesgoId: d.riesgoId }),
      ...(d.evaluacionRiesgo !== undefined && {
        evaluacionRiesgo: d.evaluacionRiesgo,
      }),
      ...(d.nivelRiesgo !== undefined && { nivelRiesgo: d.nivelRiesgo }),
      ...(d.metodoTratamiento !== undefined && {
        metodoTratamiento: d.metodoTratamiento,
      }),
      ...(d.tipoControlId !== undefined && { tipoControlId: d.tipoControlId }),
      ...(d.riesgoControlId !== undefined && {
        riesgoControlId: d.riesgoControlId,
      }),
      ...(d.evaluacionRiesgoControl !== undefined && {
        evaluacionRiesgoControl: d.evaluacionRiesgoControl,
      }),
      ...(d.nivelRiesgoControl !== undefined && {
        nivelRiesgoControl: d.nivelRiesgoControl,
      }),
      // Tab 2 new fields
      ...(d.amenazaIds !== undefined && { amenazaIds: d.amenazaIds }),
      ...(d.vulnerabilidadIds !== undefined && {
        vulnerabilidadIds: d.vulnerabilidadIds,
      }),
      ...(d.controlesImplementados !== undefined && {
        controlesImplementados: d.controlesImplementados,
      }),
    };
    return data;
  }

  private async enrich(
    item: Prisma.ValoracionActivoGetPayload<object> & {
      tipoControl?: number | null;
    },
  ) {
    const [
      tipoActivo,
      formato,
      macroProceso,
      subProceso,
      propietario,
      custodio,
      confidencialidad,
      integridad,
      disponibilidad,
      tipoControl,
    ] = await Promise.all([
      this.prisma.tipoActivo.findUnique({ where: { id: item.tipoActivoId } }),
      this.prisma.formato.findUnique({ where: { id: item.formatoId } }),
      this.prisma.macroProceso.findUnique({
        where: { id: item.macroProcesoId },
      }),
      this.prisma.subproceso.findUnique({ where: { id: item.subProcesoId } }),
      this.prisma.area.findUnique({ where: { id: item.propietarioId } }),
      this.prisma.funcionario.findUnique({ where: { id: item.custodioId } }),
      this.prisma.impacto.findUnique({
        where: { id: item.confidencialidadId },
      }),
      this.prisma.impacto.findUnique({ where: { id: item.integridadId } }),
      this.prisma.impacto.findUnique({ where: { id: item.disponibilidadId } }),
      item.tipoControl != null
        ? this.prisma.tipoControl.findUnique({
            where: { id: item.tipoControl },
          })
        : null,
    ]);
    const detallesRiesgo = await this.prisma.detalleRiesgo.findMany({
      where: { valoracionActivoId: item.id },
      orderBy: { id: 'asc' },
    });
    return {
      ...item,
      tipoActivo,
      formato,
      macroProceso,
      subProceso,
      propietario,
      custodio,
      confidencialidad,
      integridad,
      disponibilidad,
      tipoControl,
      detallesRiesgo,
    };
  }

  async findAll() {
    const items = await this.prisma.valoracionActivo.findMany({
      orderBy: { id: 'desc' },
    });
    return Promise.all(items.map((i) => this.enrich(i)));
  }

  async findOne(id: number) {
    const item = await this.prisma.valoracionActivo.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException(`Valoración ${id} no encontrada`);
    return this.enrich(item);
  }

  async create(dto: CreateValoracionDto) {
    const { detallesRiesgo, ...data } = dto;
    const item = await this.prisma.valoracionActivo.create({ data });
    if (
      detallesRiesgo &&
      Array.isArray(detallesRiesgo) &&
      detallesRiesgo.length > 0
    ) {
      await this.prisma.$transaction(
        detallesRiesgo.map((d) =>
          this.prisma.detalleRiesgo.create({
            data: this.mapDetalleRiesgo(d, item.id),
          }),
        ),
      );
    }
    return this.enrich(item);
  }

  async update(id: number, dto: UpdateValoracionDto) {
    await this.findOne(id);
    const { detallesRiesgo, ...data } = dto;
    const item = await this.prisma.valoracionActivo.update({
      where: { id },
      data,
    });
    if (
      detallesRiesgo &&
      Array.isArray(detallesRiesgo) &&
      detallesRiesgo.length > 0
    ) {
      await this.prisma.$transaction([
        this.prisma.detalleRiesgo.deleteMany({
          where: { valoracionActivoId: id },
        }),
        ...detallesRiesgo.map((d) =>
          this.prisma.detalleRiesgo.create({
            data: this.mapDetalleRiesgo(d, id),
          }),
        ),
      ]);
    }
    return this.enrich(item);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.detalleRiesgo.deleteMany({
      where: { valoracionActivoId: id },
    });
    return this.prisma.valoracionActivo.delete({ where: { id } });
  }
}
