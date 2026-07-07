import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanTratamientoDto } from './dto/create-plan-tratamiento.dto';
import { UpdatePlanTratamientoDto } from './dto/update-plan-tratamiento.dto';

const planInclude = {
  tipoActivo: true,
  nivelRiesgo: true,
  opcionTratamiento: true,
  controlesImplementar: true,
  responsable: true,
  area: true,
  estado: true,
} as const;

@Injectable()
export class PlanTratamientoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.planTratamiento.findMany({
      include: planInclude,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const plan = await this.prisma.planTratamiento.findUnique({
      where: { id },
      include: planInclude,
    });
    if (!plan) throw new NotFoundException('Plan de tratamiento no encontrado');
    return plan;
  }

  create(dto: CreatePlanTratamientoDto) {
    const data = this.toPrismaData(dto);
    return this.prisma.planTratamiento.create({
      data,
      include: planInclude,
    });
  }

  async update(id: number, dto: UpdatePlanTratamientoDto) {
    await this.findOne(id);
    const data = this.toPrismaData(dto);
    return this.prisma.planTratamiento.update({
      where: { id },
      data,
      include: planInclude,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.planTratamiento.delete({ where: { id } });
  }

  private toPrismaData(dto: Partial<CreatePlanTratamientoDto>) {
    const data: Record<string, unknown> = {};
    if (dto.idRiesgo !== undefined) data['idRiesgo'] = dto.idRiesgo;
    if (dto.tipoActivoId !== undefined) data['tipoActivoId'] = dto.tipoActivoId;
    if (dto.nivelRiesgoId !== undefined)
      data['nivelRiesgoId'] = dto.nivelRiesgoId;
    if (dto.opcionTratamientoId !== undefined)
      data['opcionTratamientoId'] = dto.opcionTratamientoId;
    if (dto.controlesImplementarId !== undefined)
      data['controlesImplementarId'] = dto.controlesImplementarId;
    if (dto.descripcionActividades !== undefined)
      data['descripcionActividades'] = dto.descripcionActividades;
    if (dto.responsableImplementacionId !== undefined)
      data['responsableImplementacionId'] = dto.responsableImplementacionId;
    if (dto.areaFuncionalId !== undefined)
      data['areaFuncionalId'] = dto.areaFuncionalId;
    if (dto.plazoImplementacion !== undefined)
      data['plazoImplementacion'] = new Date(dto.plazoImplementacion);
    if (dto.recursos !== undefined) data['recursos'] = dto.recursos;
    if (dto.estadoId !== undefined) data['estadoId'] = dto.estadoId;
    if (dto.observaciones !== undefined)
      data['observaciones'] = dto.observaciones;
    return data as never;
  }
}
