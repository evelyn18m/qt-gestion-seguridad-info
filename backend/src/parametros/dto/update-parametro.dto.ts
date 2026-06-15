import { IsInt, Min, Max } from 'class-validator';

export class UpdateParametroDto {
  @IsInt()
  @Min(1)
  @Max(27)
  riesgoBajoMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  riesgoMedioMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  riesgoAltoMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  controlBajoMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  controlMedioMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  controlAltoMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  residualAceptableMax: number;
}
