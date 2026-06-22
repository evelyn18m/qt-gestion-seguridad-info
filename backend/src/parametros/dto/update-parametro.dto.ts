import { IsInt, Min, Max } from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Class-level constraint for range consistency.
 * Used by parametros.service.updateConfiguracion() for manual validation
 * since class-level @Validate decorators are incompatible with NestJS legacy decorators.
 */
@ValidatorConstraint({ name: 'isRangoConsistente', async: false })
export class IsRangoConsistenteConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as UpdateParametroDto;
    if (dto.riesgoBajoMax >= dto.riesgoMedioMax) return false;
    if (dto.riesgoMedioMax >= dto.riesgoAltoMax) return false;
    if (dto.controlBajoMax >= dto.controlMedioMax) return false;
    if (dto.controlMedioMax >= dto.controlAltoMax) return false;
    return true;
  }

  defaultMessage(): string {
    return 'bajoMax debe ser menor que medioMax y medioMax menor que altoMax (riesgo y control)';
  }
}

export class UpdateParametroDto {
  @IsInt()
  @Min(1)
  @Max(27)
  riesgoBajoMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  riesgoBajoDesde: number;

  @IsInt()
  @Min(1)
  @Max(27)
  riesgoMedioMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  riesgoMedioDesde: number;

  @IsInt()
  @Min(1)
  @Max(27)
  riesgoAltoMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  riesgoAltoDesde: number;

  @IsInt()
  @Min(1)
  @Max(27)
  controlBajoMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  controlBajoDesde: number;

  @IsInt()
  @Min(1)
  @Max(27)
  controlMedioMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  controlMedioDesde: number;

  @IsInt()
  @Min(1)
  @Max(27)
  controlAltoMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  controlAltoDesde: number;

  @IsInt()
  @Min(1)
  @Max(27)
  residualAceptableMax: number;

  @IsInt()
  @Min(1)
  @Max(27)
  residualAceptableDesde: number;

  @IsInt()
  @Min(1)
  @Max(27)
  residualInaceptableDesde: number;

  @IsInt()
  @Min(1)
  @Max(27)
  residualInaceptableMax: number;
}
