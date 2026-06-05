import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateValoracionDto,
  DetalleRiesgoDto,
} from './dto/create-valoracion.dto';
import { UpdateValoracionDto } from './dto/update-valoracion.dto';
import { calculateRiesgo, RiesgoCalculado } from './calculo-riesgo.service';
import { CalcularDetalleDto } from './dto/calcular-detalle.dto';

@Injectable()
export class ValoracionesService {
  constructor(private readonly prisma: PrismaService) {}

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
      // Look up Riesgo catalog entries to get nivel (valor field) for calculateRiesgo
      const riesgoResults = await Promise.all(
        detallesRiesgo.map((d) =>
          d.riesgoId != null
            ? this.prisma.riesgo.findUnique({ where: { id: d.riesgoId } })
            : Promise.resolve(null),
        ),
      );
      const vulnRiesgoResults = await Promise.all(
        detallesRiesgo.map((d) =>
          d.vulnerabilidadRiesgoId != null
            ? this.prisma.riesgo.findUnique({
                where: { id: d.vulnerabilidadRiesgoId },
              })
            : Promise.resolve(null),
        ),
      );
      const nivelValores = riesgoResults.map((r) => r?.valor ?? 1);
      const vulnNivelValores = vulnRiesgoResults.map((r) => r?.valor ?? 1);

      // Look up Riesgo catalog for control-level IDs (independent Tab 4)
      const riesgoControlResults = await Promise.all(
        detallesRiesgo.map((d) =>
          d.riesgoControlId != null
            ? this.prisma.riesgo.findUnique({
                where: { id: d.riesgoControlId },
              })
            : Promise.resolve(null),
        ),
      );
      const vulnControlResults = await Promise.all(
        detallesRiesgo.map((d) =>
          d.vulnerabilidadControlId != null
            ? this.prisma.riesgo.findUnique({
                where: { id: d.vulnerabilidadControlId },
              })
            : Promise.resolve(null),
        ),
      );
      const nivelControlAmenaza = riesgoControlResults.map((r) => r?.valor ?? undefined);
      const nivelControlVuln = vulnControlResults.map((r) => r?.valor ?? undefined);

      await this.prisma.$transaction(
        detallesRiesgo.map((d, i) =>
          this.prisma.detalleRiesgo.create({
            data: this.mapDetalleRiesgo(
              d,
              item.id,
              nivelValores[i],
              vulnNivelValores[i],
              nivelControlAmenaza[i],
              nivelControlVuln[i],
            ),
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
      // Look up Riesgo catalog entries to get nivel (valor field) for calculateRiesgo
      const riesgoResults = await Promise.all(
        detallesRiesgo.map((d) =>
          d.riesgoId != null
            ? this.prisma.riesgo.findUnique({ where: { id: d.riesgoId } })
            : Promise.resolve(null),
        ),
      );
      const vulnRiesgoResults = await Promise.all(
        detallesRiesgo.map((d) =>
          d.vulnerabilidadRiesgoId != null
            ? this.prisma.riesgo.findUnique({
                where: { id: d.vulnerabilidadRiesgoId },
              })
            : Promise.resolve(null),
        ),
      );
      const nivelValores = riesgoResults.map((r) => r?.valor ?? 1);
      const vulnNivelValores = vulnRiesgoResults.map((r) => r?.valor ?? 1);

      // Look up Riesgo catalog for control-level IDs (independent Tab 4)
      const riesgoControlResults = await Promise.all(
        detallesRiesgo.map((d) =>
          d.riesgoControlId != null
            ? this.prisma.riesgo.findUnique({
                where: { id: d.riesgoControlId },
              })
            : Promise.resolve(null),
        ),
      );
      const vulnControlResults = await Promise.all(
        detallesRiesgo.map((d) =>
          d.vulnerabilidadControlId != null
            ? this.prisma.riesgo.findUnique({
                where: { id: d.vulnerabilidadControlId },
              })
            : Promise.resolve(null),
        ),
      );
      const nivelControlAmenaza = riesgoControlResults.map((r) => r?.valor ?? undefined);
      const nivelControlVuln = vulnControlResults.map((r) => r?.valor ?? undefined);

      await this.prisma.$transaction([
        this.prisma.detalleRiesgo.deleteMany({
          where: { valoracionActivoId: id },
        }),
        ...detallesRiesgo.map((d, i) =>
          this.prisma.detalleRiesgo.create({
            data: this.mapDetalleRiesgo(
              d,
              id,
              nivelValores[i],
              vulnNivelValores[i],
              nivelControlAmenaza[i],
              nivelControlVuln[i],
            ),
          }),
        ),
      ]);
    }
    return this.enrich(item);
  }

  /**
   * Computes risk fields using calculateRiesgo without persisting.
   * Reads the existing DetalleRiesgo row to validate it exists,
   * then calculates using DTO params (overrides VA if provided).
   */
  async calcularDetalleRiesgo(
    id: number,
    detalleId: number,
    dto: CalcularDetalleDto,
  ): Promise<RiesgoCalculado> {
    // Validate the detalle belongs to the valoracion
    const detalle = await this.prisma.detalleRiesgo.findFirst({
      where: { id: detalleId, valoracionActivoId: id },
    });
    if (!detalle) {
      throw new NotFoundException(
        `DetalleRiesgo ${detalleId} no encontrado para Valoración ${id}`,
      );
    }
    const va = dto.VA ?? 3;
    return calculateRiesgo(
      va,
      dto.nivelAmenaza,
      dto.nivelVulnerabilidad,
      dto.nivelAmenazaControl,
      dto.nivelVulnerabilidadControl,
    );
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.detalleRiesgo.deleteMany({
      where: { valoracionActivoId: id },
    });
    return this.prisma.valoracionActivo.delete({ where: { id } });
  }

  private mapDetalleRiesgo(
    d: DetalleRiesgoDto,
    valoracionActivoId: number,
    nivelAmenazaValor?: number,
    nivelVulnerabilidadValor?: number,
    nivelAmenazaControlValor?: number,
    nivelVulnerabilidadControlValor?: number,
  ): Prisma.DetalleRiesgoUncheckedCreateInput {
    const data: Prisma.DetalleRiesgoUncheckedCreateInput = {
      valoracionActivoId,
      tipo: d.tipo ?? 'amenaza',
      catalogoId: d.catalogoId ?? 0,
      // Tab 3/4 optional fields — only include if provided
      ...(d.riesgoId !== undefined && { riesgoId: d.riesgoId }),
      ...(d.vulnerabilidadRiesgoId !== undefined && {
        vulnerabilidadRiesgoId: d.vulnerabilidadRiesgoId,
      }),
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
      ...(d.vulnerabilidadControlId !== undefined && {
        vulnerabilidadControlId: d.vulnerabilidadControlId,
      }),
      ...(d.evaluacionRiesgoControl !== undefined && {
        evaluacionRiesgoControl: d.evaluacionRiesgoControl,
      }),
      ...(d.nivelRiesgoControl !== undefined && {
        nivelRiesgoControl: d.nivelRiesgoControl,
      }),
      ...(d.riesgoResidual !== undefined && {
        riesgoResidual: d.riesgoResidual,
      }),
      // Tab 2 new fields
      ...(d.amenazaIds !== undefined && { amenazaIds: d.amenazaIds }),
      ...(d.vulnerabilidadIds !== undefined && {
        vulnerabilidadIds: d.vulnerabilidadIds,
      }),
      ...(d.controlesImplementados !== undefined && {
        controlesImplementados: d.controlesImplementados,
      }),
      ...(d.controlesArea !== undefined && {
        controlesArea: d.controlesArea,
      }),
      // Tab 4 FK: selected catalog control to implement
      ...(d.controlesImplementarId !== undefined && {
        controlesImplementarId: d.controlesImplementarId,
      }),
    };

    // Compute risk fields using calculateRiesgo with VA=3 (CIA promedio fallback)
    // nivelAmenazaValor comes from the Riesgo catalog's valor field via riesgoId lookup
    // nivelVulnerabilidadValor comes independently from vulnerabilidadRiesgoId lookup
    const nivelAmenaza = nivelAmenazaValor ?? 1;
    const nivelVulnerabilidad = nivelVulnerabilidadValor ?? 1;
    const riesgo = calculateRiesgo(
      3,
      nivelAmenaza,
      nivelVulnerabilidad,
      nivelAmenazaControlValor,
      nivelVulnerabilidadControlValor,
    );
    data.evaluacionRiesgo = riesgo.evaluacionRiesgo;
    data.nivelRiesgo = riesgo.nivelRiesgo;
    data.metodoTratamiento = riesgo.metodoTratamiento;
    data.tipoControlId = d.tipoControlId; // tipoControl FK still set from DTO if present
    data.evaluacionRiesgoControl = riesgo.evaluacionRiesgoControl;
    data.nivelRiesgoControl = riesgo.nivelRiesgoControl;
    data.riesgoResidual = riesgo.riesgoResidual;

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
      include: { controlesImplementar: { include: { categoria: true } } },
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
}
