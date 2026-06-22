import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateValoracionDto,
  DetalleRiesgoDto,
} from './dto/create-valoracion.dto';
import { UpdateValoracionDto } from './dto/update-valoracion.dto';
import {
  calculateRiesgo,
  RiesgoCalculado,
  Thresholds,
  DEFAULT_THRESHOLDS,
} from './calculo-riesgo.service';
import { CalcularDetalleDto } from './dto/calcular-detalle.dto';
import { ParametrosService } from '../parametros/parametros.service';

@Injectable()
export class ValoracionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametrosService: ParametrosService,
  ) {}

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

    // Read config once per request
    let config: Thresholds = DEFAULT_THRESHOLDS;
    try {
      config = await this.parametrosService.getConfiguracion();
    } catch {
      // Fall back to defaults if config read fails
    }

    if (
      detallesRiesgo &&
      Array.isArray(detallesRiesgo) &&
      detallesRiesgo.length > 0
    ) {
      // Compute VA from CIA impacto catalog (confidencialidad + integridad + disponibilidad)
      const [impConf, impInt, impDisp] = await Promise.all([
        this.prisma.impacto.findUnique({
          where: { id: dto.confidencialidadId },
        }),
        this.prisma.impacto.findUnique({
          where: { id: dto.integridadId },
        }),
        this.prisma.impacto.findUnique({
          where: { id: dto.disponibilidadId },
        }),
      ]);
      const ciaAvg =
        impConf && impInt && impDisp
          ? Math.round(
              ((impConf.valor + impInt.valor + impDisp.valor) / 3) * 100,
            ) / 100
          : 3;

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
      const nivelControlAmenaza = riesgoControlResults.map(
        (r) => r?.valor ?? undefined,
      );
      const nivelControlVuln = vulnControlResults.map(
        (r) => r?.valor ?? undefined,
      );

      const createInputs = detallesRiesgo.map((d, i) =>
        this.mapDetalleRiesgo(
          d,
          item.id,
          nivelValores[i],
          vulnNivelValores[i],
          nivelControlAmenaza[i],
          nivelControlVuln[i],
          config,
          ciaAvg,
        ),
      );

      await this.prisma.$transaction(
        createInputs.map((data) => this.prisma.detalleRiesgo.create({ data })),
      );

      // Persist ValoracionActivo.evaluacionRiesgo = MAX of hijos
      const evals = createInputs
        .map((input) => input.evaluacionRiesgo ?? 0)
        .filter((e) => e > 0);
      if (evals.length > 0) {
        const maxEval = Math.max(...evals);
        const nivelMaxEval = createInputs.find(
          (input) => input.evaluacionRiesgo === maxEval,
        )?.nivelRiesgo;
        if (maxEval > 0 && nivelMaxEval) {
          await this.prisma.valoracionActivo.update({
            where: { id: item.id },
            data: {
              evaluacionRiesgo: maxEval,
              nivelRiesgo: nivelMaxEval,
            },
          });
        }
      }
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

    // Read config once per request
    let config: Thresholds = DEFAULT_THRESHOLDS;
    try {
      config = await this.parametrosService.getConfiguracion();
    } catch {
      // Fall back to defaults
    }

    if (
      detallesRiesgo &&
      Array.isArray(detallesRiesgo) &&
      detallesRiesgo.length > 0
    ) {
      // Compute VA from CIA impacto catalog
      const [impConf, impInt, impDisp] = await Promise.all([
        this.prisma.impacto.findUnique({
          where: { id: data.confidencialidadId },
        }),
        this.prisma.impacto.findUnique({
          where: { id: data.integridadId },
        }),
        this.prisma.impacto.findUnique({
          where: { id: data.disponibilidadId },
        }),
      ]);
      const ciaAvg =
        impConf && impInt && impDisp
          ? Math.round(
              ((impConf.valor + impInt.valor + impDisp.valor) / 3) * 100,
            ) / 100
          : 3;

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
      const nivelControlAmenaza = riesgoControlResults.map(
        (r) => r?.valor ?? undefined,
      );
      const nivelControlVuln = vulnControlResults.map(
        (r) => r?.valor ?? undefined,
      );

      const createInputs = detallesRiesgo.map((d, i) =>
        this.mapDetalleRiesgo(
          d,
          id,
          nivelValores[i],
          vulnNivelValores[i],
          nivelControlAmenaza[i],
          nivelControlVuln[i],
          config,
          ciaAvg,
        ),
      );

      await this.prisma.$transaction([
        this.prisma.detalleRiesgo.deleteMany({
          where: { valoracionActivoId: id },
        }),
        ...createInputs.map((data) =>
          this.prisma.detalleRiesgo.create({ data }),
        ),
      ]);

      // Persist ValoracionActivo.evaluacionRiesgo = MAX of hijos
      const evals = createInputs
        .map((input) => input.evaluacionRiesgo ?? 0)
        .filter((e) => e > 0);
      if (evals.length > 0) {
        const maxEval = Math.max(...evals);
        const nivelMaxEval = createInputs.find(
          (input) => input.evaluacionRiesgo === maxEval,
        )?.nivelRiesgo;
        if (maxEval > 0 && nivelMaxEval) {
          await this.prisma.valoracionActivo.update({
            where: { id },
            data: {
              evaluacionRiesgo: maxEval,
              nivelRiesgo: nivelMaxEval,
            },
          });
        }
      }
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
    const va = dto.VA ?? (await this.computeParentCiaAvg(id)) ?? 3;

    // Use dto.config if provided, otherwise read from DB
    let config: Thresholds = DEFAULT_THRESHOLDS;
    if (dto.config) {
      config = dto.config;
    } else {
      try {
        config = await this.parametrosService.getConfiguracion();
      } catch {
        // Fall back to defaults
      }
    }

    return calculateRiesgo(
      va,
      dto.nivelAmenaza,
      dto.nivelVulnerabilidad,
      dto.nivelAmenazaControl,
      dto.nivelVulnerabilidadControl,
      config,
    );
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.detalleRiesgo.deleteMany({
      where: { valoracionActivoId: id },
    });
    return this.prisma.valoracionActivo.delete({ where: { id } });
  }

  /**
   * Recalcula todos los DetalleRiesgo de un ValoracionActivo con el VA real
   * del padre. Corrige filas existentes persistidas con VA=3 hardcodeado.
   * No modifica inputs (riesgoId, amenazaIds, etc.), solo recalcula campos derivados.
   */
  async recalcular(id: number) {
    const va = await this.prisma.valoracionActivo.findUnique({
      where: { id },
    });
    if (!va) throw new NotFoundException(`Valoración ${id} no encontrada`);

    const hijos = await this.prisma.detalleRiesgo.findMany({
      where: { valoracionActivoId: id },
    });

    if (hijos.length === 0) {
      return this.enrich(va);
    }

    // Compute real VA from CIA impacto catalog
    const [impConf, impInt, impDisp] = await Promise.all([
      this.prisma.impacto.findUnique({
        where: { id: va.confidencialidadId },
      }),
      this.prisma.impacto.findUnique({
        where: { id: va.integridadId },
      }),
      this.prisma.impacto.findUnique({
        where: { id: va.disponibilidadId },
      }),
    ]);
    const ciaAvg =
      impConf && impInt && impDisp
        ? Math.round(
            ((impConf.valor + impInt.valor + impDisp.valor) / 3) * 100,
          ) / 100
        : 3;

    // Read config
    let config: Thresholds = DEFAULT_THRESHOLDS;
    try {
      config = await this.parametrosService.getConfiguracion();
    } catch {
      // Fallback
    }

    // Look up Riesgo catalog for each hijo
    const riesgoResults = await Promise.all(
      hijos.map((h) =>
        h.riesgoId != null
          ? this.prisma.riesgo.findUnique({ where: { id: h.riesgoId } })
          : Promise.resolve(null),
      ),
    );
    const vulnRiesgoResults = await Promise.all(
      hijos.map((h) =>
        h.vulnerabilidadRiesgoId != null
          ? this.prisma.riesgo.findUnique({
              where: { id: h.vulnerabilidadRiesgoId },
            })
          : Promise.resolve(null),
      ),
    );
    const riesgoControlResults = await Promise.all(
      hijos.map((h) =>
        h.riesgoControlId != null
          ? this.prisma.riesgo.findUnique({
              where: { id: h.riesgoControlId },
            })
          : Promise.resolve(null),
      ),
    );
    const vulnControlResults = await Promise.all(
      hijos.map((h) =>
        h.vulnerabilidadControlId != null
          ? this.prisma.riesgo.findUnique({
              where: { id: h.vulnerabilidadControlId },
            })
          : Promise.resolve(null),
      ),
    );

    // Build create inputs preserving original input fields
    const createInputs = hijos.map((h, i) => {
      const d: DetalleRiesgoDto = {
        tipo: h.tipo,
        catalogoId: h.catalogoId,
        riesgoId: h.riesgoId ?? undefined,
        vulnerabilidadRiesgoId: h.vulnerabilidadRiesgoId ?? undefined,
        tipoControlId: h.tipoControlId,
        riesgoControlId: h.riesgoControlId ?? undefined,
        vulnerabilidadControlId: h.vulnerabilidadControlId ?? undefined,
        amenazaIds: h.amenazaIds ?? undefined,
        vulnerabilidadIds: h.vulnerabilidadIds ?? undefined,
        controlesImplementados: h.controlesImplementados ?? undefined,
        controlesArea: h.controlesArea ?? undefined,
        controlesImplementarId: h.controlesImplementarId ?? undefined,
      };
      return this.mapDetalleRiesgo(
        d,
        id,
        riesgoResults[i]?.valor ?? 1,
        vulnRiesgoResults[i]?.valor ?? 1,
        riesgoControlResults[i]?.valor ?? undefined,
        vulnControlResults[i]?.valor ?? undefined,
        config,
        ciaAvg,
      );
    });

    await this.prisma.$transaction([
      this.prisma.detalleRiesgo.deleteMany({
        where: { valoracionActivoId: id },
      }),
      ...createInputs.map((data) => this.prisma.detalleRiesgo.create({ data })),
    ]);

    // Persist MAX
    const evals = createInputs
      .map((input) => input.evaluacionRiesgo ?? 0)
      .filter((e) => e > 0);
    if (evals.length > 0) {
      const maxEval = Math.max(...evals);
      const nivelMaxEval = createInputs.find(
        (input) => input.evaluacionRiesgo === maxEval,
      )?.nivelRiesgo;
      if (maxEval > 0 && nivelMaxEval) {
        await this.prisma.valoracionActivo.update({
          where: { id },
          data: {
            evaluacionRiesgo: maxEval,
            nivelRiesgo: nivelMaxEval,
          },
        });
      }
    }

    return this.enrich(va);
  }

  private mapDetalleRiesgo(
    d: DetalleRiesgoDto,
    valoracionActivoId: number,
    nivelAmenazaValor?: number,
    nivelVulnerabilidadValor?: number,
    nivelAmenazaControlValor?: number,
    nivelVulnerabilidadControlValor?: number,
    config: Thresholds = DEFAULT_THRESHOLDS,
    va: number = 3,
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
      tipoControlId: d.tipoControlId,
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

    // Compute risk fields using calculateRiesgo with VA from parent CIA average
    // nivelAmenazaValor comes from the Riesgo catalog's valor field via riesgoId lookup
    // nivelVulnerabilidadValor comes independently from vulnerabilidadRiesgoId lookup
    const nivelAmenaza = nivelAmenazaValor ?? 1;
    const nivelVulnerabilidad = nivelVulnerabilidadValor ?? 1;
    const riesgo = calculateRiesgo(
      va,
      nivelAmenaza,
      nivelVulnerabilidad,
      nivelAmenazaControlValor,
      nivelVulnerabilidadControlValor,
      config,
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

  /**
   * Computes CIA average for a ValoracionActivo from its impacto catalog entries.
   * Returns null if the parent or any impacto record is missing.
   */
  private async computeParentCiaAvg(
    valoracionActivoId: number,
  ): Promise<number | null> {
    const parent = await this.prisma.valoracionActivo.findUnique({
      where: { id: valoracionActivoId },
      select: {
        confidencialidadId: true,
        integridadId: true,
        disponibilidadId: true,
      },
    });
    if (!parent) return null;

    const [impConf, impInt, impDisp] = await Promise.all([
      this.prisma.impacto.findUnique({
        where: { id: parent.confidencialidadId },
      }),
      this.prisma.impacto.findUnique({
        where: { id: parent.integridadId },
      }),
      this.prisma.impacto.findUnique({
        where: { id: parent.disponibilidadId },
      }),
    ]);

    if (!impConf || !impInt || !impDisp) return null;

    return (
      Math.round(((impConf.valor + impInt.valor + impDisp.valor) / 3) * 100) /
      100
    );
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
