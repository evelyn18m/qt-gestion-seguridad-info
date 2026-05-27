import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateValoracionDto } from './dto/create-valoracion.dto';
import { UpdateValoracionDto } from './dto/update-valoracion.dto';

@Injectable()
export class ValoracionesService {
  constructor(private readonly prisma: PrismaService) {}

  private async enrich(item: any) {
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
      this.prisma.tipoControl.findUnique({ where: { id: item.tipoControl } }),
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
    const { detallesRiesgo, ...data } = dto as any;
    const item = await this.prisma.valoracionActivo.create({ data });
    if (detallesRiesgo && Array.isArray(detallesRiesgo)) {
      await this.prisma.detalleRiesgo.createMany({
        data: detallesRiesgo.map((d: any) => ({
          ...d,
          valoracionActivoId: item.id,
        })),
      });
    }
    return this.enrich(item);
  }

  async update(id: number, dto: UpdateValoracionDto) {
    await this.findOne(id);
    const { detallesRiesgo, ...data } = dto as any;
    const item = await this.prisma.valoracionActivo.update({
      where: { id },
      data,
    });
    if (detallesRiesgo && Array.isArray(detallesRiesgo)) {
      await this.prisma.detalleRiesgo.deleteMany({
        where: { valoracionActivoId: id },
      });
      await this.prisma.detalleRiesgo.createMany({
        data: detallesRiesgo.map((d: any) => ({
          ...d,
          valoracionActivoId: id,
        })),
      });
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
