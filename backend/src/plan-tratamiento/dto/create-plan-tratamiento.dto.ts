import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePlanTratamientoDto {
  @IsInt()
  tipoActivoId: number;

  @IsInt()
  nivelRiesgoId: number;

  @IsInt()
  opcionTratamientoId: number;

  @IsOptional()
  @IsString()
  controlesImplementarId?: string;

  @IsString()
  @IsNotEmpty()
  descripcionActividades: string;

  @IsOptional()
  @IsString()
  responsableImplementacionId?: string;

  @IsOptional()
  @IsInt()
  areaFuncionalId?: number;

  @IsOptional()
  @IsInt()
  plazoImplementacionId?: number;

  @IsOptional()
  @IsDateString()
  fechaInicioImplementacion?: string;

  @IsOptional()
  @IsDateString()
  fechaFinImplementacion?: string;

  @IsOptional()
  @IsInt()
  horaDia?: number;

  @IsOptional()
  @IsString()
  montoUSD?: string;

  @IsInt()
  estadoId: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
