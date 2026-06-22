import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportesService } from './reportes.service';
import {
  ResumenReporteDto,
  RiesgoPorActivoDto,
  RiesgoPorMacroProcesoDto,
  TratamientoReporteDto,
  CiaReporteDto,
  IndiceReporteDto,
  ValoracionActivoReporteDto,
  AnalisisRiesgoActivoDto,
  EvaluacionRiesgoReporteDto,
  TratamientoRiesgoReporteDto,
  HeatmapReporteDto,
} from './dto/reporte-response.dto';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get()
  getIndice(): IndiceReporteDto {
    return {
      endpoints: [
        {
          ruta: 'GET /reportes/resumen',
          descripcion: 'Resumen del dashboard con totales y distribuciones',
        },
        {
          ruta: 'GET /reportes/riesgos-por-activo',
          descripcion: 'Riesgos por activo con datos enriquecidos',
        },
        {
          ruta: 'GET /reportes/riesgos-por-macroproceso',
          descripcion: 'Riesgos agrupados por macroproceso',
        },
        {
          ruta: 'GET /reportes/tratamiento',
          descripcion: 'Resumen de métodos de tratamiento y riesgo residual',
        },
        {
          ruta: 'GET /reportes/cia',
          descripcion:
            'Distribución de niveles CIA (Confidencialidad, Integridad, Disponibilidad)',
        },
        {
          ruta: 'GET /reportes/valoracion-activos',
          descripcion:
            'Reporte de valoración de activos con filtros y búsqueda',
        },
        {
          ruta: 'GET /reportes/analisis-riesgo-activos',
          descripcion:
            'Análisis de riesgo de activos con amenazas y vulnerabilidades',
        },
        {
          ruta: 'GET /reportes/evaluacion-riesgo',
          descripcion:
            'Evaluación de riesgo con CIA, niveles y controles de área',
        },
        {
          ruta: 'GET /reportes/tratamiento-riesgo',
          descripcion:
            'Reporte de tratamiento de riesgo con 13 columnas y filtros',
        },
        {
          ruta: 'GET /reportes/tratamiento-riesgo/export',
          descripcion: 'Exportación Excel del reporte de tratamiento de riesgo',
        },
        {
          ruta: 'GET /reportes/heatmap',
          descripcion: 'Mapa de calor 3x3 de riesgos (Evaluación de Riesgo × Impacto)',
        },
      ],
    };
  }

  @Get('resumen')
  getResumen(): Promise<ResumenReporteDto> {
    return this.reportesService.getResumen();
  }

  @Get('riesgos-por-activo')
  getRiesgosPorActivo(): Promise<RiesgoPorActivoDto[]> {
    return this.reportesService.getRiesgosPorActivo();
  }

  @Get('riesgos-por-macroproceso')
  getRiesgosPorMacroproceso(): Promise<RiesgoPorMacroProcesoDto[]> {
    return this.reportesService.getRiesgosPorMacroproceso();
  }

  @Get('tratamiento')
  getTratamiento(): Promise<TratamientoReporteDto> {
    return this.reportesService.getTratamiento();
  }

  @Get('cia')
  getCia(): Promise<CiaReporteDto> {
    return this.reportesService.getCia();
  }

  @Get('valoracion-activos')
  getValoracionActivos(
    @Query() query: Record<string, string | undefined>,
  ): Promise<ValoracionActivoReporteDto[]> {
    return this.reportesService.getValoracionActivos(query);
  }

  @Get('analisis-riesgo-activos')
  getAnalisisRiesgoActivos(
    @Query() query: Record<string, string | undefined>,
  ): Promise<AnalisisRiesgoActivoDto[]> {
    return this.reportesService.getAnalisisRiesgoActivos(query);
  }

  @Get('valoracion-activos/export')
  async exportValoracionActivos(
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.reportesService.exportValoracionActivos(query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="valoracion-activos.xlsx"',
    );
    res.setHeader('Content-Length', buffer.length);
    res.write(buffer);
    res.end();
  }

  @Get('analisis-riesgo-activos/export')
  async exportAnalisisRiesgoActivos(
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ): Promise<void> {
    const buffer =
      await this.reportesService.exportAnalisisRiesgoActivos(query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="analisis-riesgo-activos.xlsx"',
    );
    res.setHeader('Content-Length', buffer.length);
    res.write(buffer);
    res.end();
  }

  @Get('evaluacion-riesgo')
  getEvaluacionRiesgo(
    @Query() query: Record<string, string | undefined>,
  ): Promise<EvaluacionRiesgoReporteDto[]> {
    return this.reportesService.getEvaluacionRiesgo(query);
  }

  @Get('evaluacion-riesgo/export')
  async exportEvaluacionRiesgo(
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.reportesService.exportEvaluacionRiesgo(query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="evaluacion-riesgo-${new Date().toISOString().split('T')[0]}.xlsx"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.write(buffer);
    res.end();
  }

  @Get('tratamiento-riesgo')
  getTratamientoRiesgo(
    @Query() query: Record<string, string | undefined>,
  ): Promise<TratamientoRiesgoReporteDto[]> {
    return this.reportesService.getTratamientoRiesgo(query);
  }

  @Get('heatmap')
  getHeatmap(): Promise<HeatmapReporteDto> {
    return this.reportesService.getHeatmap();
  }

  @Get('tratamiento-riesgo/export')
  async exportTratamientoRiesgo(
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.reportesService.exportTratamientoRiesgo(query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tratamiento-riesgo-${new Date().toISOString().split('T')[0]}.xlsx"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.write(buffer);
    res.end();
  }
}
