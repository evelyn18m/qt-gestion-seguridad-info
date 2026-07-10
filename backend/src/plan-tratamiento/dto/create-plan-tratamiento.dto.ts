import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
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

  @IsString()
  controlesImplementarId: string;

  @IsString()
  @IsNotEmpty()
  descripcionActividades: string;

  @IsString()
  responsableImplementacionId: string;

  @IsInt()
  areaFuncionalId: number;

  @IsInt()
  plazoImplementacionId: number;

  @IsDateString()
  fechaInicioImplementacion: string;

  @IsDateString()
  fechaFinImplementacion: string;

  @IsNumber()
  horaDia: number;

  @IsString()
  montoUSD: string;

  @IsInt()
  estadoId: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
