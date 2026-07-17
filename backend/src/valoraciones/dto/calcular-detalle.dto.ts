import { IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ConfiguracionRiesgoDto {
  @IsNumber()
  riesgoBajoMax: number;

  @IsNumber()
  riesgoMedioMax: number;

  @IsNumber()
  riesgoAltoMax: number;

  @IsNumber()
  controlBajoMax: number;

  @IsNumber()
  controlMedioMax: number;

  @IsNumber()
  controlAltoMax: number;

  @IsNumber()
  residualAceptableMax: number;
}

/**
 * DTO for the PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular preview endpoint.
 * Allows callers to override VA, control levels, and optionally submit custom thresholds.
 */
export class CalcularDetalleDto {
  @IsNumber()
  nivelAmenaza: number; // 1–3

  @IsNumber()
  nivelVulnerabilidad: number; // 1–3

  @IsOptional()
  @IsNumber()
  VA?: number; // defaults to 3 (CIA promedio fallback)

  @IsOptional()
  @IsNumber()
  nivelAmenazaControl?: number;

  @IsOptional()
  @IsNumber()
  nivelVulnerabilidadControl?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfiguracionRiesgoDto)
  config?: ConfiguracionRiesgoDto;
}
