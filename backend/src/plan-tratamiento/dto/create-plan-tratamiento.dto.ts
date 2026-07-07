import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePlanTratamientoDto {
  @IsString()
  @IsNotEmpty()
  idRiesgo: string;

  @IsInt()
  tipoActivoId: number;

  @IsInt()
  nivelRiesgoId: number;

  @IsInt()
  opcionTratamientoId: number;

  @IsOptional()
  @IsInt()
  controlesImplementarId?: number;

  @IsString()
  @IsNotEmpty()
  descripcionActividades: string;

  @IsOptional()
  @IsInt()
  responsableImplementacionId?: number;

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
  @IsString()
  recursos?: string;

  @IsInt()
  estadoId: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
