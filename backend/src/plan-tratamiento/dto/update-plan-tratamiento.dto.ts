import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanTratamientoDto } from './create-plan-tratamiento.dto';
import { IsInt } from 'class-validator';

export class UpdatePlanTratamientoDto extends PartialType(
  CreatePlanTratamientoDto,
) {
  @IsInt()
  id: number;
}
