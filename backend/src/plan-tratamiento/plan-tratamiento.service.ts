import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanTratamientoDto } from './dto/create-plan-tratamiento.dto';
import { UpdatePlanTratamientoDto } from './dto/update-plan-tratamiento.dto';

const planInclude = {
  tipoActivo: true,
  nivelRiesgo: true,
  opcionTratamiento: true,
  area: true,
  plazoImplementacion: true,
  estado: true,
} as const;

@Injectable()
export class PlanTratamientoService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.planTratamiento.findMany({
      where: { eliminado: false },
      include: planInclude,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const plan = await this.prisma.planTratamiento.findFirst({
      where: { id, eliminado: false },
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
    return this.prisma.planTratamiento.update({
      where: { id },
      data: { eliminado: true },
      include: planInclude,
    });
  }

  private toPrismaData(dto: Partial<CreatePlanTratamientoDto>) {
    const data: Record<string, unknown> = {};
    if (dto.tipoActivoId !== undefined) data['tipoActivoId'] = dto.tipoActivoId;
    data['activoId'] =
      dto.activoId !== undefined ? JSON.stringify(dto.activoId) : '[]';
    if (dto.nivelRiesgoId !== undefined)
      data['nivelRiesgoId'] = dto.nivelRiesgoId;
    if (dto.opcionTratamientoId !== undefined)
      data['opcionTratamientoId'] = dto.opcionTratamientoId;
    data['controlesImplementarId'] = dto.controlesImplementarId ?? '[]';
    if (dto.descripcionActividades !== undefined)
      data['descripcionActividades'] = dto.descripcionActividades;
    data['responsableImplementacionId'] =
      dto.responsableImplementacionId ?? '[]';
    if (dto.areaFuncionalId !== undefined)
      data['areaFuncionalId'] = dto.areaFuncionalId;
    if (dto.horaDia !== undefined) data['horaDia'] = dto.horaDia;
    if (dto.montoUSD !== undefined) data['montoUSD'] = dto.montoUSD;

    this.applyTimeframe(
      data,
      dto.plazoImplementacionId,
      dto.fechaInicioImplementacion,
      dto.fechaFinImplementacion,
    );

    if (dto.estadoId !== undefined) data['estadoId'] = dto.estadoId;
    if (dto.observaciones !== undefined)
      data['observaciones'] = dto.observaciones;
    return data as never;
  }

  private applyTimeframe(
    data: Record<string, unknown>,
    plazoId?: number,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    const hasPlazo = plazoId !== undefined && plazoId !== null;
    const inicio = this.parseDate(fechaInicio);
    const fin = this.parseDate(fechaFin);

    if (hasPlazo) {
      if (inicio === undefined || fin === undefined) {
        throw new BadRequestException(
          'Cuando se selecciona un plazo de implementación deben indicarse la fecha de inicio y la fecha de fin.',
        );
      }
      if (fin.getTime() <= inicio.getTime()) {
        throw new BadRequestException(
          'La fecha de fin de implementación debe ser posterior a la fecha de inicio.',
        );
      }
    }

    if (hasPlazo) data['plazoImplementacionId'] = plazoId;
    if (inicio !== undefined) data['fechaInicioImplementacion'] = inicio;
    if (fin !== undefined) data['fechaFinImplementacion'] = fin;
  }

  private parseDate(value?: string): Date | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return new Date(value);
  }
}
