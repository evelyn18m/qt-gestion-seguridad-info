import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ResumenReporteDto,
  NivelCount,
  RiesgoPorActivoDto,
  RiesgoPorMacroProcesoDto,
  TratamientoReporteDto,
  CiaReporteDto,
  ValoracionActivoReporteDto,
} from './dto/reporte-response.dto';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  private async fetchImpactoMap(): Promise<Map<number, { nivel: string; valor: number }>> {
    const impactos = await this.prisma.impacto.findMany();
    return new Map(impactos.map((i) => [i.id, { nivel: i.nivel, valor: i.valor }]));
  }

  private nvlCero(): NivelCount {
    return { Alto: 0, Medio: 0, Bajo: 0 };
  }

  async getResumen(): Promise<ResumenReporteDto> {
    try {
      const vas = await this.prisma.valoracionActivo.findMany();
      const detalles = await this.prisma.detalleRiesgo.findMany();

      const totalActivos = vas.length;
      const conRiesgo = vas.filter((v) => v.evaluacionRiesgo != null).length;
      const sinRiesgo = totalActivos - conRiesgo;

      const distribucionRiesgos = this.nvlCero();
      for (const d of detalles) {
        const nivel = d.nivelRiesgo;
        if (nivel === 'Alto') distribucionRiesgos.Alto++;
        else if (nivel === 'Medio') distribucionRiesgos.Medio++;
        else if (nivel === 'Bajo') distribucionRiesgos.Bajo++;
      }

      const distribucionControles = this.nvlCero();
      for (const d of detalles) {
        const nivel = d.nivelRiesgoControl;
        if (nivel === 'Alto') distribucionControles.Alto++;
        else if (nivel === 'Medio') distribucionControles.Medio++;
        else if (nivel === 'Bajo') distribucionControles.Bajo++;
      }

      return {
        totalActivos,
        conRiesgo,
        sinRiesgo,
        distribucionRiesgos,
        distribucionControles,
      };
    } catch (error) {
      throw new HttpException(
        `Error al obtener resumen de reportes: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getRiesgosPorActivo(): Promise<RiesgoPorActivoDto[]> {
    try {
      const vas = await this.prisma.valoracionActivo.findMany();
      const detalles = await this.prisma.detalleRiesgo.findMany();

      // Build a map of VA id -> first detalle's riesgoResidual
      const residualMap = new Map<number, string | null>();
      for (const d of detalles) {
        if (!residualMap.has(d.valoracionActivoId)) {
          residualMap.set(d.valoracionActivoId, d.riesgoResidual);
        }
      }

      // Enrich each VA with catalog names
      const results = await Promise.all(
        vas.map(async (va) => {
          const [tipoActivo, macroProceso] = await Promise.all([
            this.prisma.tipoActivo.findUnique({
              where: { id: va.tipoActivoId },
            }),
            this.prisma.macroProceso.findUnique({
              where: { id: va.macroProcesoId },
            }),
          ]);

          return {
            activoId: va.id,
            nombre: va.nombreActivo,
            tipoActivo: tipoActivo?.nombre ?? 'Desconocido',
            macroproceso: macroProceso?.nombre ?? 'Desconocido',
            evaluacionRiesgo: va.evaluacionRiesgo,
            nivelRiesgo: va.nivelRiesgo,
            metodoTratamiento: va.metodoTratamiento,
            riesgoResidual: residualMap.get(va.id) ?? null,
          } as RiesgoPorActivoDto;
        }),
      );

      // Sort by evaluacionRiesgo DESC (nulls last)
      results.sort((a, b) => {
        if (a.evaluacionRiesgo == null && b.evaluacionRiesgo == null) return 0;
        if (a.evaluacionRiesgo == null) return 1;
        if (b.evaluacionRiesgo == null) return -1;
        return b.evaluacionRiesgo - a.evaluacionRiesgo;
      });

      return results;
    } catch (error) {
      throw new HttpException(
        `Error al obtener riesgos por activo: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getRiesgosPorMacroproceso(): Promise<RiesgoPorMacroProcesoDto[]> {
    try {
      const vas = await this.prisma.valoracionActivo.findMany();

      // Group by macroProcesoId
      const groups = new Map<
        number,
        { totalActivos: number; riesgosBajo: number; riesgosMedio: number; riesgosAlto: number; sumaEvaluacion: number; countEvaluacion: number }
      >();

      for (const va of vas) {
        const g = groups.get(va.macroProcesoId) ?? {
          totalActivos: 0,
          riesgosBajo: 0,
          riesgosMedio: 0,
          riesgosAlto: 0,
          sumaEvaluacion: 0,
          countEvaluacion: 0,
        };
        g.totalActivos++;

        if (va.nivelRiesgo === 'Bajo') g.riesgosBajo++;
        else if (va.nivelRiesgo === 'Medio') g.riesgosMedio++;
        else if (va.nivelRiesgo === 'Alto') g.riesgosAlto++;

        if (va.evaluacionRiesgo != null) {
          g.sumaEvaluacion += va.evaluacionRiesgo;
          g.countEvaluacion++;
        }

        groups.set(va.macroProcesoId, g);
      }

      // Enrich with macroProceso names
      const results: RiesgoPorMacroProcesoDto[] = [];
      for (const [macroProcesoId, g] of groups) {
        const mp = await this.prisma.macroProceso.findUnique({
          where: { id: macroProcesoId },
        });
        results.push({
          macroprocesoId: macroProcesoId,
          macroproceso: mp?.nombre ?? 'Desconocido',
          totalActivos: g.totalActivos,
          riesgosBajo: g.riesgosBajo,
          riesgosMedio: g.riesgosMedio,
          riesgosAlto: g.riesgosAlto,
          promedioEvaluacion:
            g.countEvaluacion > 0
              ? Math.round((g.sumaEvaluacion / g.countEvaluacion) * 100) / 100
              : 0,
        });
      }

      return results;
    } catch (error) {
      throw new HttpException(
        `Error al obtener riesgos por macroproceso: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTratamiento(): Promise<TratamientoReporteDto> {
    try {
      const detalles = await this.prisma.detalleRiesgo.findMany();

      const distribucionMetodos: Record<string, number> = {
        MITIGAR: 0,
        TRANSFERIR: 0,
        EVITAR: 0,
        ASUMIR: 0,
      };

      let aceptable = 0;
      let inaceptable = 0;

      for (const d of detalles) {
        const metodo = d.metodoTratamiento;
        if (metodo && metodo in distribucionMetodos) {
          distribucionMetodos[metodo]++;
        }

        if (d.riesgoResidual === 'ACEPTABLE') aceptable++;
        else if (d.riesgoResidual === 'INACEPTABLE') inaceptable++;
      }

      return {
        distribucionMetodos,
        distribucionResidual: { ACEPTABLE: aceptable, INACEPTABLE: inaceptable },
      };
    } catch (error) {
      throw new HttpException(
        `Error al obtener reporte de tratamiento: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCia(): Promise<CiaReporteDto> {
    try {
      const impactoMap = await this.fetchImpactoMap();
      const vas = await this.prisma.valoracionActivo.findMany();

      const confidencialidad = this.nvlCero();
      const integridad = this.nvlCero();
      const disponibilidad = this.nvlCero();

      for (const va of vas) {
        const c = impactoMap.get(va.confidencialidadId);
        const i = impactoMap.get(va.integridadId);
        const d = impactoMap.get(va.disponibilidadId);

        if (c) {
          if (c.nivel === 'Alto') confidencialidad.Alto++;
          else if (c.nivel === 'Medio') confidencialidad.Medio++;
          else if (c.nivel === 'Bajo') confidencialidad.Bajo++;
        }
        if (i) {
          if (i.nivel === 'Alto') integridad.Alto++;
          else if (i.nivel === 'Medio') integridad.Medio++;
          else if (i.nivel === 'Bajo') integridad.Bajo++;
        }
        if (d) {
          if (d.nivel === 'Alto') disponibilidad.Alto++;
          else if (d.nivel === 'Medio') disponibilidad.Medio++;
          else if (d.nivel === 'Bajo') disponibilidad.Bajo++;
        }
      }

      return { confidencialidad, integridad, disponibilidad };
    } catch (error) {
      throw new HttpException(
        `Error al obtener reporte CIA: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getValoracionActivos(
    filters: Record<string, string | undefined>,
  ): Promise<ValoracionActivoReporteDto[]> {
    try {
      const {
        q,
        macroProcesoId,
        formatoId,
        custodioId,
        confidencialidadId,
        integridadId,
        disponibilidadId,
      } = filters;

      const andConditions: Prisma.ValoracionActivoWhereInput[] = [];

      if (macroProcesoId) {
        andConditions.push({ macroProcesoId: Number(macroProcesoId) });
      }
      if (formatoId) {
        andConditions.push({ formatoId: Number(formatoId) });
      }
      if (custodioId) {
        andConditions.push({ custodioId: Number(custodioId) });
      }
      if (confidencialidadId) {
        andConditions.push({ confidencialidadId: Number(confidencialidadId) });
      }
      if (integridadId) {
        andConditions.push({ integridadId: Number(integridadId) });
      }
      if (disponibilidadId) {
        andConditions.push({ disponibilidadId: Number(disponibilidadId) });
      }

      if (q) {
        const escapedQ = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
        andConditions.push({
          OR: [
            { nombreActivo: { contains: escapedQ } },
            { ubicacion: { contains: escapedQ } },
          ],
        });
      }

      const where: Prisma.ValoracionActivoWhereInput =
        andConditions.length > 0 ? { AND: andConditions } : {};

      const valuations = await this.prisma.valoracionActivo.findMany({
        where,
        orderBy: { nombreActivo: 'asc' },
      });

      if (valuations.length === 0) {
        return [];
      }

      const [tipoActivos, formatos, macroProcesos, funcionarios, impactos] =
        await Promise.all([
          this.prisma.tipoActivo.findMany(),
          this.prisma.formato.findMany(),
          this.prisma.macroProceso.findMany(),
          this.prisma.funcionario.findMany(),
          this.prisma.impacto.findMany(),
        ]);

      const tipoActivoMap = new Map(tipoActivos.map((t) => [t.id, t.nombre]));
      const formatoMap = new Map(formatos.map((f) => [f.id, f.nombre]));
      const macroProcesoMap = new Map(
        macroProcesos.map((m) => [m.id, m.nombre]),
      );
      const funcionarioMap = new Map(
        funcionarios.map((f) => [f.id, f.nombre]),
      );
      const impactoMap = new Map(impactos.map((i) => [i.id, i.nivel]));

      return valuations.map((va) => ({
        id: va.id,
        nombreActivo: va.nombreActivo,
        ubicacion: va.ubicacion,
        tipoActivo: tipoActivoMap.get(va.tipoActivoId) ?? 'Desconocido',
        formato: formatoMap.get(va.formatoId) ?? 'Desconocido',
        macroProceso: macroProcesoMap.get(va.macroProcesoId) ?? 'Desconocido',
        custodio: funcionarioMap.get(va.custodioId) ?? 'Desconocido',
        confidencialidad:
          impactoMap.get(va.confidencialidadId) ?? 'Desconocido',
        integridad: impactoMap.get(va.integridadId) ?? 'Desconocido',
        disponibilidad: impactoMap.get(va.disponibilidadId) ?? 'Desconocido',
      }));
    } catch (error) {
      throw new HttpException(
        `Error al obtener valoracion de activos: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
