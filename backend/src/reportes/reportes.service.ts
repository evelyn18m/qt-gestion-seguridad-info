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
  AnalisisRiesgoActivoDto,
  EvaluacionRiesgoReporteDto,
  TratamientoRiesgoReporteDto,
  HeatmapSerieDto,
  HeatmapCellDto,
} from './dto/reporte-response.dto';
import * as XLSX_STYLE from 'xlsx-js-style';

const PROBABILIDAD_LABELS: Record<number, string> = {
  1: '1. Bajo',
  2: '2. Medio',
  3: '3. Alto',
};

const IMPACTO_LABELS: Record<number, string> = {
  1: '1. Bajo',
  2: '2. Medio',
  3: '3. Alto',
};

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  private async fetchImpactoMap(): Promise<
    Map<number, { nivel: string; valor: number }>
  > {
    const impactos = await this.prisma.impacto.findMany();
    return new Map(
      impactos.map((i) => [i.id, { nivel: i.nivel, valor: i.valor }]),
    );
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
          };
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
        {
          totalActivos: number;
          riesgosBajo: number;
          riesgosMedio: number;
          riesgosAlto: number;
          sumaEvaluacion: number;
          countEvaluacion: number;
        }
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
        distribucionResidual: {
          ACEPTABLE: aceptable,
          INACEPTABLE: inaceptable,
        },
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

  async getHeatmap(): Promise<HeatmapSerieDto[]> {
    try {
      const [vas, impactos, probabilidades] = await Promise.all([
        this.prisma.valoracionActivo.findMany(),
        this.prisma.impacto.findMany(),
        this.prisma.probabilidad.findMany(),
      ]);

      const impactoMap = new Map(impactos.map((i) => [i.id, i.valor]));
      const probMap = new Map(probabilidades.map((p) => [p.id, p.valor]));

      const filtered = vas.filter((va) => va.probabilidadId != null);

      const cellMap: Record<string, number> = {};
      for (let i = 1; i <= 3; i++) {
        for (let p = 1; p <= 3; p++) {
          cellMap[`${i}_${p}`] = 0;
        }
      }

      for (const va of filtered) {
        const impacto = Math.max(
          impactoMap.get(va.confidencialidadId) ?? 0,
          impactoMap.get(va.integridadId) ?? 0,
          impactoMap.get(va.disponibilidadId) ?? 0,
        );
        const prob = probMap.get(va.probabilidadId!) ?? 1;
        cellMap[`${impacto}_${prob}`]++;
      }

      const series: HeatmapSerieDto[] = [];
      for (let i = 3; i >= 1; i--) {
        const data: HeatmapCellDto[] = [];
        for (let p = 1; p <= 3; p++) {
          data.push({
            x: PROBABILIDAD_LABELS[p],
            y: cellMap[`${i}_${p}`],
          });
        }
        series.push({
          name: IMPACTO_LABELS[i],
          data,
        });
      }

      return series;
    } catch (error) {
      throw new HttpException(
        `Error al obtener mapa de calor: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getValoracionActivos(
    filters: Record<string, string | undefined>,
  ): Promise<ValoracionActivoReporteDto[]> {
    try {
      const { q, macroProcesoId, formatoId, custodioId } = filters;

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
      const funcionarioMap = new Map(funcionarios.map((f) => [f.id, f.nombre]));
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
        impacto: va.impacto ?? null,
      }));
    } catch (error) {
      throw new HttpException(
        `Error al obtener valoracion de activos: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAnalisisRiesgoActivos(
    filters: Record<string, string | undefined>,
  ): Promise<AnalisisRiesgoActivoDto[]> {
    try {
      const {
        q,
        macroProcesoId,
        categoriaAmenazaId,
        amenazaId,
        categoriaVulnerabilidadId,
        vulnerabilidadId,
      } = filters;

      // Stage 1: resolve macroproceso filter into valoracionActivo IDs
      let vaIds: number[] | undefined;
      if (macroProcesoId) {
        const matchingVas = await this.prisma.valoracionActivo.findMany({
          where: { macroProcesoId: Number(macroProcesoId) },
          select: { id: true },
        });
        vaIds = matchingVas.map((va) => va.id);
        if (vaIds.length === 0) {
          return [];
        }
      }

      // Stage 2: fetch DetalleRiesgo records (with or without VA filter)
      const detalleWhere = vaIds ? { valoracionActivoId: { in: vaIds } } : {};
      const detalles = await this.prisma.detalleRiesgo.findMany({
        where: detalleWhere,
      });

      if (detalles.length === 0) {
        return [];
      }

      // Stage 3: fetch all enrichment catalogs in parallel
      const [valoracionActivos, amenazas, vulnerabilidades, macroProcesos] =
        await Promise.all([
          this.prisma.valoracionActivo.findMany({
            where: vaIds ? { id: { in: vaIds } } : {},
          }),
          this.prisma.amenaza.findMany(),
          this.prisma.vulnerabilidad.findMany(),
          this.prisma.macroProceso.findMany(),
        ]);

      // Build lookup maps
      const vaMap = new Map(valoracionActivos.map((va) => [va.id, va]));
      const amenazaMap = new Map(amenazas.map((a) => [a.id, a]));
      const vulnerabilidadMap = new Map(vulnerabilidades.map((v) => [v.id, v]));
      const macroProcesoMap = new Map(macroProcesos.map((m) => [m.id, m]));

      // Stage 4: enrich and filter in-memory
      const enriched = detalles
        .map((dr): AnalisisRiesgoActivoDto | null => {
          const va = vaMap.get(dr.valoracionActivoId);
          if (!va) return null;

          const mp = macroProcesoMap.get(va.macroProcesoId);

          let parsedAmenazaIds: number[] = [];
          let parsedVulnerabilidadIds: number[] = [];
          try {
            if (dr.amenazaIds) {
              parsedAmenazaIds = JSON.parse(dr.amenazaIds) as number[];
            }
            if (dr.vulnerabilidadIds) {
              parsedVulnerabilidadIds = JSON.parse(
                dr.vulnerabilidadIds,
              ) as number[];
            }
          } catch (error) {
            // Malformed JSON: log and treat as empty arrays
            console.error(`Malformed JSON in DetalleRiesgo ${dr.id}:`, error);
          }

          const amenazaNombres = parsedAmenazaIds
            .map((id) => amenazaMap.get(Number(id))?.nombre)
            .filter((n): n is string => !!n);
          const vulnerabilidadNombres = parsedVulnerabilidadIds
            .map((id) => vulnerabilidadMap.get(Number(id))?.descripcion)
            .filter((n): n is string => !!n);

          const amenaza = amenazaNombres.join(', ') || '';
          const vulnerabilidad = vulnerabilidadNombres.join(', ') || '';

          return {
            id: dr.id,
            nombreActivo: va.nombreActivo,
            macroProceso: mp?.nombre ?? 'Desconocido',
            amenaza,
            vulnerabilidad,
            controlesImplementados: dr.controlesImplementados ?? null,
          };
        })
        .filter((item): item is AnalisisRiesgoActivoDto => item !== null)
        .filter((item) => {
          // In-memory filters
          if (amenazaId) {
            const ids = this.safeParseJsonArray(
              detalles.find((d) => d.id === item.id)?.amenazaIds,
            );
            if (!ids.includes(Number(amenazaId))) return false;
          }
          if (vulnerabilidadId) {
            const ids = this.safeParseJsonArray(
              detalles.find((d) => d.id === item.id)?.vulnerabilidadIds,
            );
            if (!ids.includes(Number(vulnerabilidadId))) return false;
          }
          if (categoriaAmenazaId) {
            const ids = this.safeParseJsonArray(
              detalles.find((d) => d.id === item.id)?.amenazaIds,
            );
            const cats = ids
              .map((id) => amenazaMap.get(id)?.categoria)
              .filter((c): c is string => !!c);
            if (!cats.includes(String(categoriaAmenazaId))) return false;
          }
          if (categoriaVulnerabilidadId) {
            const ids = this.safeParseJsonArray(
              detalles.find((d) => d.id === item.id)?.vulnerabilidadIds,
            );
            const cats = ids
              .map((id) => vulnerabilidadMap.get(id)?.categoria)
              .filter((c): c is string => !!c);
            if (!cats.includes(String(categoriaVulnerabilidadId))) return false;
          }
          if (q) {
            const qLower = q.toLowerCase();
            const matchesActivo = item.nombreActivo
              .toLowerCase()
              .includes(qLower);
            const matchesAmenaza = item.amenaza.toLowerCase().includes(qLower);
            const matchesVulnerabilidad = item.vulnerabilidad
              .toLowerCase()
              .includes(qLower);
            if (!matchesActivo && !matchesAmenaza && !matchesVulnerabilidad) {
              return false;
            }
          }
          return true;
        });

      // Deduplicate by nombreActivo + amenazaIds/vulnerabilidadIds JSON arrays
      const seenAnalisis = new Set<string>();
      const dedupedAnalisis = enriched.filter((item) => {
        const dr = detalles.find((d) => d.id === item.id);
        const key = `${item.nombreActivo}|${dr?.amenazaIds ?? ''}|${dr?.vulnerabilidadIds ?? ''}`;
        if (seenAnalisis.has(key)) return false;
        seenAnalisis.add(key);
        return true;
      });

      // Sort by nombreActivo ascending
      dedupedAnalisis.sort((a, b) =>
        a.nombreActivo.localeCompare(b.nombreActivo),
      );

      return dedupedAnalisis;
    } catch (error) {
      throw new HttpException(
        `Error al obtener análisis de riesgo de activos: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getEvaluacionRiesgo(
    filters: Record<string, string | undefined>,
  ): Promise<EvaluacionRiesgoReporteDto[]> {
    try {
      const {
        q,
        macroProcesoId,
        categoriaAmenazaId,
        amenazaId,
        categoriaVulnerabilidadId,
        vulnerabilidadId,
        nivelRiesgo,
      } = filters;

      // Stage 1: resolve macroproceso filter into valoracionActivo IDs
      let vaIds: number[] | undefined;
      if (macroProcesoId) {
        const matchingVas = await this.prisma.valoracionActivo.findMany({
          where: { macroProcesoId: Number(macroProcesoId) },
          select: { id: true },
        });
        vaIds = matchingVas.map((va) => va.id);
        if (vaIds.length === 0) {
          return [];
        }
      }

      // Stage 2: fetch DetalleRiesgo records
      const detalleWhere = vaIds ? { valoracionActivoId: { in: vaIds } } : {};
      const detalles = await this.prisma.detalleRiesgo.findMany({
        where: detalleWhere,
      });

      if (detalles.length === 0) {
        return [];
      }

      // Stage 3: batch fetch all enrichment catalogs
      const [
        valoracionActivos,
        riesgos,
        amenazas,
        vulnerabilidades,
        macroProcesos,
      ] = await Promise.all([
        this.prisma.valoracionActivo.findMany({
          where: vaIds ? { id: { in: vaIds } } : {},
        }),
        this.prisma.riesgo.findMany(),
        this.prisma.amenaza.findMany(),
        this.prisma.vulnerabilidad.findMany(),
        this.prisma.macroProceso.findMany(),
      ]);

      const vaMap = new Map(valoracionActivos.map((va) => [va.id, va]));
      const riesgoMap = new Map(riesgos.map((r) => [r.id, r.nivel]));
      const amenazaMap = new Map(amenazas.map((a) => [a.id, a]));
      const vulnerabilidadMap = new Map(vulnerabilidades.map((v) => [v.id, v]));
      const macroProcesoMap = new Map(
        macroProcesos.map((m) => [m.id, m.nombre]),
      );

      // Stage 4: enrich + filter in-memory
      const enriched = detalles
        .map((dr) => {
          const va = vaMap.get(dr.valoracionActivoId);
          if (!va) return null;

          const amenazaIds = this.safeParseJsonArray(dr.amenazaIds);
          const vulnIds = this.safeParseJsonArray(dr.vulnerabilidadIds);

          return {
            id: dr.id,
            nombreActivo: va.nombreActivo,
            macroProceso:
              macroProcesoMap.get(va.macroProcesoId) ?? 'Desconocido',
            amenaza: amenazaIds
              .map((id) => amenazaMap.get(Number(id))?.nombre)
              .filter(Boolean)
              .join(', '),
            vulnerabilidad: vulnIds
              .map((id) => vulnerabilidadMap.get(Number(id))?.descripcion)
              .filter(Boolean)
              .join(', '),
            impacto: va.impacto ?? null,
            nivelAmenaza: riesgoMap.get(dr.riesgoId ?? -1) ?? null,
            nivelVulnerabilidad:
              riesgoMap.get(dr.vulnerabilidadRiesgoId ?? -1) ?? null,
            evaluacionRiesgo: dr.evaluacionRiesgo,
            nivelRiesgo: dr.nivelRiesgo,
            controlesArea: dr.controlesArea ?? null,
            // Internal fields for filtering
            _amenazaIds: amenazaIds,
            _vulnIds: vulnIds,
          };
        })
        .filter(Boolean)
        .filter((item) => {
          // In-memory filters (case-insensitive where applicable)
          if (amenazaId && !item!._amenazaIds.includes(Number(amenazaId)))
            return false;
          if (
            vulnerabilidadId &&
            !item!._vulnIds.includes(Number(vulnerabilidadId))
          )
            return false;
          if (categoriaAmenazaId) {
            const cats = item!._amenazaIds
              .map((id) => amenazaMap.get(id)?.categoria)
              .filter((c): c is string => !!c);
            if (!cats.includes(String(categoriaAmenazaId))) return false;
          }
          if (categoriaVulnerabilidadId) {
            const cats = item!._vulnIds
              .map((id) => vulnerabilidadMap.get(id)?.categoria)
              .filter((c): c is string => !!c);
            if (!cats.includes(String(categoriaVulnerabilidadId))) return false;
          }
          if (nivelRiesgo) {
            if (
              !item!.nivelRiesgo ||
              item!.nivelRiesgo.toLowerCase() !== nivelRiesgo.toLowerCase()
            )
              return false;
          }
          if (q) {
            const qLower = q.toLowerCase();
            if (!item!.nombreActivo.toLowerCase().includes(qLower))
              return false;
          }
          return true;
        });

      // Deduplicate by nombreActivo + amenazaIds/vulnerabilidadIds JSON arrays
      const seenEval = new Set<string>();
      const dedupedEval = (
        enriched as Array<{
          _amenazaIds: number[];
          _vulnIds: number[];
          [key: string]: unknown;
        }>
      ).filter((item) => {
        const key = `${item.nombreActivo}|${JSON.stringify(item._amenazaIds)}|${JSON.stringify(item._vulnIds)}`;
        if (seenEval.has(key)) return false;
        seenEval.add(key);
        return true;
      });

      // Sort by nombreActivo ASC
      dedupedEval.sort((a, b) =>
        String(a.nombreActivo).localeCompare(String(b.nombreActivo)),
      );

      // Strip internal fields before return
      return dedupedEval.map(
        ({ _amenazaIds, _vulnIds, ...rest }) =>
          rest as unknown as EvaluacionRiesgoReporteDto,
      );
    } catch (error) {
      throw new HttpException(
        `Error al obtener evaluación de riesgo: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTratamientoRiesgo(
    filters: Record<string, string | undefined>,
  ): Promise<TratamientoRiesgoReporteDto[]> {
    try {
      const {
        q,
        macroProcesoId,
        tipoControlId,
        nivelRiesgoControl,
        riesgoResidual,
      } = filters;

      // Stage 1: resolve macroproceso filter into valoracionActivo IDs
      let vaIds: number[] | undefined;
      if (macroProcesoId) {
        const matchingVas = await this.prisma.valoracionActivo.findMany({
          where: { macroProcesoId: Number(macroProcesoId) },
          select: { id: true },
        });
        vaIds = matchingVas.map((va) => va.id);
        if (vaIds.length === 0) {
          return [];
        }
      }

      // Stage 2: fetch DetalleRiesgo records with include for controlesImplementar
      const detalleWhere = vaIds ? { valoracionActivoId: { in: vaIds } } : {};
      const detalles = await this.prisma.detalleRiesgo.findMany({
        where: detalleWhere,
        include: {
          controlesImplementar: {
            include: { categoria: true },
          },
        },
      });

      if (detalles.length === 0) {
        return [];
      }

      // Stage 3: batch fetch all enrichment catalogs
      const [
        valoracionActivos,
        riesgos,
        amenazas,
        vulnerabilidades,
        macroProcesos,
        tipoControles,
      ] = await Promise.all([
        this.prisma.valoracionActivo.findMany({
          where: vaIds ? { id: { in: vaIds } } : {},
        }),
        this.prisma.riesgo.findMany(),
        this.prisma.amenaza.findMany(),
        this.prisma.vulnerabilidad.findMany(),
        this.prisma.macroProceso.findMany(),
        this.prisma.tipoControl.findMany(),
      ]);

      const vaMap = new Map(valoracionActivos.map((va) => [va.id, va]));
      const riesgoMap = new Map(riesgos.map((r) => [r.id, r.nivel]));
      const amenazaMap = new Map(amenazas.map((a) => [a.id, a]));
      const vulnerabilidadMap = new Map(vulnerabilidades.map((v) => [v.id, v]));
      const macroProcesoMap = new Map(
        macroProcesos.map((m) => [m.id, m.nombre]),
      );
      const tipoControlMap = new Map(
        tipoControles.map((t) => [t.id, t.nombre]),
      );

      // Stage 4: enrich + filter in-memory
      const enriched = detalles
        .map((dr) => {
          const va = vaMap.get(dr.valoracionActivoId);
          if (!va) return null;

          const amenazaIds = this.safeParseJsonArray(dr.amenazaIds);
          const vulnIds = this.safeParseJsonArray(dr.vulnerabilidadIds);

          return {
            id: dr.id,
            nombreActivo: va.nombreActivo,
            macroProceso:
              macroProcesoMap.get(va.macroProcesoId) ?? 'Desconocido',
            amenaza: amenazaIds
              .map((id) => amenazaMap.get(Number(id))?.nombre)
              .filter(Boolean)
              .join(', '),
            vulnerabilidad: vulnIds
              .map((id) => vulnerabilidadMap.get(Number(id))?.descripcion)
              .filter(Boolean)
              .join(', '),
            nivelAmenaza: riesgoMap.get(dr.riesgoId ?? -1) ?? null,
            nivelVulnerabilidad:
              riesgoMap.get(dr.vulnerabilidadRiesgoId ?? -1) ?? null,
            impacto: va.impacto ?? null,
            metodoTratamiento: dr.metodoTratamiento ?? null,
            evaluacionRiesgoControl: dr.evaluacionRiesgoControl ?? null,
            nivelRiesgoControl: dr.nivelRiesgoControl ?? null,
            tipoControl:
              dr.tipoControlId != null
                ? (tipoControlMap.get(dr.tipoControlId) ?? null)
                : null,
            riesgoResidual: dr.riesgoResidual ?? null,
            controlesImplementar: dr.controlesImplementar?.descripcion ?? null,
            // Internal fields for filtering
            _amenazaIds: amenazaIds,
            _vulnIds: vulnIds,
            _tipoControlId: dr.tipoControlId,
          };
        })
        .filter(Boolean)
        .filter((item) => {
          // In-memory filters (case-insensitive where applicable)
          if (tipoControlId && item!._tipoControlId !== Number(tipoControlId))
            return false;
          if (nivelRiesgoControl) {
            if (
              !item!.nivelRiesgoControl ||
              item!.nivelRiesgoControl.toLowerCase() !==
                nivelRiesgoControl.toLowerCase()
            )
              return false;
          }
          if (riesgoResidual) {
            if (
              !item!.riesgoResidual ||
              item!.riesgoResidual.toLowerCase() !==
                riesgoResidual.toLowerCase()
            )
              return false;
          }
          if (q) {
            const qLower = q.toLowerCase();
            const matchesActivo = item!.nombreActivo
              .toLowerCase()
              .includes(qLower);
            const matchesResidual = (item!.riesgoResidual ?? '')
              .toLowerCase()
              .includes(qLower);
            if (!matchesActivo && !matchesResidual) return false;
          }
          return true;
        });

      // Deduplicate by nombreActivo + amenazaIds/vulnerabilidadIds JSON arrays
      const seenTrat = new Set<string>();
      const dedupedTrat = (
        enriched as Array<{
          _amenazaIds: number[];
          _vulnIds: number[];
          _tipoControlId: number;
          [key: string]: unknown;
        }>
      ).filter((item) => {
        const key = `${item.nombreActivo}|${JSON.stringify(item._amenazaIds)}|${JSON.stringify(item._vulnIds)}`;
        if (seenTrat.has(key)) return false;
        seenTrat.add(key);
        return true;
      });

      // Sort by nombreActivo ASC
      dedupedTrat.sort((a, b) =>
        String(a.nombreActivo).localeCompare(String(b.nombreActivo)),
      );

      // Strip internal fields before return
      return dedupedTrat.map(
        ({ _amenazaIds, _vulnIds, _tipoControlId, ...rest }) =>
          rest as unknown as TratamientoRiesgoReporteDto,
      );
    } catch (error) {
      throw new HttpException(
        `Error al obtener tratamiento de riesgo: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exportTratamientoRiesgo(
    filters: Record<string, string | undefined>,
  ): Promise<Buffer> {
    try {
      const data = await this.getTratamientoRiesgo(filters);

      const headers = [
        'Impacto',
        'Macroproceso',
        'Nombre del Activo',
        'Amenaza',
        'Vulnerabilidad',
        'Nivel Amenaza',
        'Nivel Vulnerabilidad',
        'Método Tratamiento',
        'Evaluación Riesgo Control',
        'Nivel Riesgo Control',
        'Tipo Control',
        'Riesgo Residual',
        'Controles a Implementar',
      ];

      const rows = data.map((tr) => [
        tr.impacto ?? '',
        tr.macroProceso,
        tr.nombreActivo,
        tr.amenaza,
        tr.vulnerabilidad,
        tr.nivelAmenaza ?? '',
        tr.nivelVulnerabilidad ?? '',
        tr.metodoTratamiento ?? '',
        tr.evaluacionRiesgoControl ?? '',
        tr.nivelRiesgoControl ?? '',
        tr.tipoControl ?? '',
        tr.riesgoResidual ?? '',
        tr.controlesImplementar ?? '',
      ]);

      const ws = XLSX_STYLE.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX_STYLE.utils.book_new();
      XLSX_STYLE.utils.book_append_sheet(wb, ws, 'Tratamiento de Riesgo');

      // Header styles
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' }, patternType: 'solid' },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      const range = XLSX_STYLE.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX_STYLE.utils.encode_cell({ r: 0, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = headerStyle;
        }
      }

      // Auto-filter
      const lastRow = data.length;
      const lastCol = headers.length - 1;
      const startRef = XLSX_STYLE.utils.encode_cell({ r: 0, c: 0 });
      const endRef = XLSX_STYLE.utils.encode_cell({ r: lastRow, c: lastCol });
      ws['!autofilter'] = { ref: `${startRef}:${endRef}` };

      // Auto-width columns
      const colWidths = headers.map((h, idx) => {
        const maxDataLen = Math.max(
          h.length,
          ...rows.map((r) => String(r[idx] ?? '').length),
        );
        return { wch: Math.min(Math.max(maxDataLen + 2, 10), 40) };
      });
      ws['!cols'] = colWidths;

      const array = XLSX_STYLE.write(wb, { type: 'array', bookType: 'xlsx' });
      return Buffer.from(array);
    } catch (error) {
      throw new HttpException(
        `Error al exportar tratamiento de riesgo: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exportEvaluacionRiesgo(
    filters: Record<string, string | undefined>,
  ): Promise<Buffer> {
    try {
      const data = await this.getEvaluacionRiesgo(filters);

      const headers = [
        'Activo',
        'Macroproceso',
        'Amenaza',
        'Vulnerabilidad',
        'Nivel Amenaza',
        'Nivel Vulnerabilidad',
        'Impacto',
        'Evaluación de Riesgo',
        'Nivel de Riesgo',
        'Controles de Área',
      ];

      const rows = data.map((er) => [
        er.nombreActivo,
        er.macroProceso,
        er.amenaza,
        er.vulnerabilidad,
        er.nivelAmenaza ?? '',
        er.nivelVulnerabilidad ?? '',
        er.impacto ?? '',
        er.evaluacionRiesgo ?? '',
        er.nivelRiesgo ?? '',
        er.controlesArea ?? '',
      ]);

      const ws = XLSX_STYLE.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX_STYLE.utils.book_new();
      XLSX_STYLE.utils.book_append_sheet(wb, ws, 'Evaluación de Riesgo');

      // Header styles
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' }, patternType: 'solid' },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      const range = XLSX_STYLE.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX_STYLE.utils.encode_cell({ r: 0, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = headerStyle;
        }
      }

      // Auto-filter
      const lastRow = data.length;
      const lastCol = headers.length - 1;
      const startRef = XLSX_STYLE.utils.encode_cell({ r: 0, c: 0 });
      const endRef = XLSX_STYLE.utils.encode_cell({ r: lastRow, c: lastCol });
      ws['!autofilter'] = { ref: `${startRef}:${endRef}` };

      // Auto-width columns
      const colWidths = headers.map((h, idx) => {
        const maxDataLen = Math.max(
          h.length,
          ...rows.map((r) => String(r[idx] ?? '').length),
        );
        return { wch: Math.min(Math.max(maxDataLen + 2, 10), 40) };
      });
      ws['!cols'] = colWidths;

      const array = XLSX_STYLE.write(wb, { type: 'array', bookType: 'xlsx' });
      return Buffer.from(array);
    } catch (error) {
      throw new HttpException(
        `Error al exportar evaluación de riesgo: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private safeParseJsonArray(value: string | null | undefined): number[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((v) => Number(v)).filter((n) => !isNaN(n));
    } catch {
      return [];
    }
  }

  async exportValoracionActivos(
    filters: Record<string, string | undefined>,
  ): Promise<Buffer> {
    try {
      const data = await this.getValoracionActivos(filters);

      const headers = [
        'Nombre del Activo',
        'Ubicación',
        'Tipo',
        'Formato',
        'Macroproceso',
        'Custodio',
        'Confidencialidad',
        'Integridad',
        'Disponibilidad',
        'Impacto',
      ];

      const rows = data.map((va) => [
        va.nombreActivo,
        va.ubicacion,
        va.tipoActivo,
        va.formato,
        va.macroProceso,
        va.custodio,
        va.confidencialidad,
        va.integridad,
        va.disponibilidad,
        va.impacto ?? '',
      ]);

      const ws = XLSX_STYLE.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX_STYLE.utils.book_new();
      XLSX_STYLE.utils.book_append_sheet(wb, ws, 'Valoración de Activos');

      // Header styles
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' }, patternType: 'solid' },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      const range = XLSX_STYLE.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX_STYLE.utils.encode_cell({ r: 0, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = headerStyle;
        }
      }

      // Auto-filter
      const lastRow = data.length + 1;
      const lastCol = headers.length - 1;
      const startRef = XLSX_STYLE.utils.encode_cell({ r: 0, c: 0 });
      const endRef = XLSX_STYLE.utils.encode_cell({ r: lastRow, c: lastCol });
      ws['!autofilter'] = { ref: `${startRef}:${endRef}` };

      // Auto-width columns
      const colWidths = headers.map((h, idx) => {
        const maxDataLen = Math.max(
          h.length,
          ...rows.map((r) => String(r[idx] ?? '').length),
        );
        return { wch: Math.min(Math.max(maxDataLen + 2, 10), 40) };
      });
      ws['!cols'] = colWidths;

      const array = XLSX_STYLE.write(wb, { type: 'array', bookType: 'xlsx' });
      return Buffer.from(array);
    } catch (error) {
      throw new HttpException(
        `Error al exportar valoracion de activos: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exportAnalisisRiesgoActivos(
    filters: Record<string, string | undefined>,
  ): Promise<Buffer> {
    try {
      const data = await this.getAnalisisRiesgoActivos(filters);

      const headers = [
        'Nombre del Activo',
        'Macroproceso',
        'Amenaza',
        'Vulnerabilidad',
        'Controles Implementados',
      ];

      const rows = data.map((ar) => [
        ar.nombreActivo,
        ar.macroProceso,
        ar.amenaza,
        ar.vulnerabilidad,
        ar.controlesImplementados ?? '',
      ]);

      const ws = XLSX_STYLE.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX_STYLE.utils.book_new();
      XLSX_STYLE.utils.book_append_sheet(
        wb,
        ws,
        'Análisis de Riesgo de Activos',
      );

      // Header styles
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' }, patternType: 'solid' },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      const range = XLSX_STYLE.utils.decode_range(ws['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX_STYLE.utils.encode_cell({ r: 0, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = headerStyle;
        }
      }

      // Auto-filter
      const lastRow = data.length + 1;
      const lastCol = headers.length - 1;
      const startRef = XLSX_STYLE.utils.encode_cell({ r: 0, c: 0 });
      const endRef = XLSX_STYLE.utils.encode_cell({ r: lastRow, c: lastCol });
      ws['!autofilter'] = { ref: `${startRef}:${endRef}` };

      // Auto-width columns
      const colWidths = headers.map((h, idx) => {
        const maxDataLen = Math.max(
          h.length,
          ...rows.map((r) => String(r[idx] ?? '').length),
        );
        return { wch: Math.min(Math.max(maxDataLen + 2, 10), 40) };
      });
      ws['!cols'] = colWidths;

      const array = XLSX_STYLE.write(wb, { type: 'array', bookType: 'xlsx' });
      return Buffer.from(array);
    } catch (error) {
      throw new HttpException(
        `Error al exportar análisis de riesgo de activos: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
