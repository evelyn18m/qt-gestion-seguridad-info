import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateCatalogoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  detalle?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  nivel?: string;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsString()
  criterio?: string;

  @IsOptional()
  @IsString()
  tipoFuente?: string;

  @IsOptional()
  @IsNumber()
  macroProcesoId?: number;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  seccion?: string;

  @IsOptional()
  @IsNumber()
  categoriaId?: number;
}
