import { IsNumber, IsOptional } from 'class-validator';

/**
 * DTO for the PATCH /valoraciones/:id/detalles-riesgo/:detalleId/calcular preview endpoint.
 * Allows callers to override VA and optionally provide control levels.
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
}
