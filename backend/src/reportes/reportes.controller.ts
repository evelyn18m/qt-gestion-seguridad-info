import { Controller, Get, Query } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import {
  ResumenReporteDto,
  RiesgoPorActivoDto,
  RiesgoPorMacroProcesoDto,
  TratamientoReporteDto,
  CiaReporteDto,
  IndiceReporteDto,
  ValoracionActivoReporteDto,
} from './dto/reporte-response.dto';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get()
  getIndice(): IndiceReporteDto {
    return {
      endpoints: [
        { ruta: 'GET /reportes/resumen', descripcion: 'Resumen del dashboard con totales y distribuciones' },
        { ruta: 'GET /reportes/riesgos-por-activo', descripcion: 'Riesgos por activo con datos enriquecidos' },
        { ruta: 'GET /reportes/riesgos-por-macroproceso', descripcion: 'Riesgos agrupados por macroproceso' },
        { ruta: 'GET /reportes/tratamiento', descripcion: 'Resumen de métodos de tratamiento y riesgo residual' },
        { ruta: 'GET /reportes/cia', descripcion: 'Distribución de niveles CIA (Confidencialidad, Integridad, Disponibilidad)' },
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
}
