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
    const buffer = await this.reportesService.exportAnalisisRiesgoActivos(query);
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
}
