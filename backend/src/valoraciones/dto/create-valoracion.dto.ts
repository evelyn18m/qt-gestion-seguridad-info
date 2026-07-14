import {
  IsNumber,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';

// Tab 2: at least one of amenazaIds / vulnerabilidadIds must be non-empty
@ValidatorConstraint()
export class AtLeastOneConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const amenazaIds = obj['amenazaIds'] as string | undefined;
    const vulnerabilidadIds = obj['vulnerabilidadIds'] as string | undefined;

    let amenazaEmpty = true;
    let vulnerabilidadEmpty = true;

    if (amenazaIds) {
      try {
        const parsed = JSON.parse(amenazaIds) as unknown[];
        amenazaEmpty = !Array.isArray(parsed) || parsed.length === 0;
      } catch {
        amenazaEmpty = true;
      }
    }

    if (vulnerabilidadIds) {
      try {
        const parsed = JSON.parse(vulnerabilidadIds) as unknown[];
        vulnerabilidadEmpty = !Array.isArray(parsed) || parsed.length === 0;
      } catch {
        vulnerabilidadEmpty = true;
      }
    }

    return !amenazaEmpty || !vulnerabilidadEmpty;
  }
  defaultMessage(): string {
    return 'Debe proporcionar al menos una amenaza o una vulnerabilidad';
  }
}

export class DetalleRiesgoDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @Validate(AtLeastOneConstraint)
  // Tab 3/4 legacy fields (deprecated for Tab 2)
  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsNumber()
  catalogoId?: number;

  @IsOptional()
  @IsNumber()
  riesgoId?: number;

  @IsOptional()
  @IsNumber()
  vulnerabilidadRiesgoId?: number;

  @IsOptional()
  @IsNumber()
  evaluacionRiesgo?: number;

  @IsOptional()
  @IsString()
  nivelRiesgo?: string;

  @IsOptional()
  @IsString()
  metodoTratamiento?: string;

  @IsNumber()
  tipoControlId: number;

  @IsOptional()
  @IsNumber()
  riesgoControlId?: number;

  @IsOptional()
  @IsNumber()
  vulnerabilidadControlId?: number;

  @IsOptional()
  @IsNumber()
  evaluacionRiesgoControl?: number;

  @IsOptional()
  @IsString()
  nivelRiesgoControl?: string;

  @IsOptional()
  @IsString()
  riesgoResidual?: string;

  // Tab 2 new fields (JSON array as string, e.g. "[3,7]")
  @IsOptional()
  @IsString()
  amenazaIds?: string;

  @IsOptional()
  @IsString()
  vulnerabilidadIds?: string;

  @IsOptional()
  @IsString()
  controlesImplementados?: string;

  @IsOptional()
  @IsString()
  controlesArea?: string;

  @IsOptional()
  @IsString()
  controlesImplementarId?: string;
}

export class CreateValoracionDto {
  // Tab 1: Valoración de Activo
  @IsString()
  nombreActivo: string;

  @IsNumber()
  tipoActivoId: number;

  @IsNumber()
  formatoId: number;

  @IsNumber()
  macroProcesoId: number;

  @IsNumber()
  subProcesoId: number;

  @IsNumber()
  propietarioId: number;

  @IsString()
  custodioId: string;

  @IsString()
  descripcion: string;

  @IsString()
  controlSeguridad: string;

  @IsString()
  ubicacion: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsNumber()
  confidencialidadId: number;

  @IsNumber()
  integridadId: number;

  @IsNumber()
  disponibilidadId: number;

  @IsOptional()
  tieneDatosPersonales?: boolean;

  @IsOptional()
  @IsString()
  tiposDatosPersonales?: string;

  // Tab 2: Análisis de Riesgos
  @IsOptional()
  @IsString()
  amenazas?: string;

  @IsOptional()
  @IsString()
  vulnerabilidades?: string;

  @IsOptional()
  @IsString()
  controlesImplementacion?: string;

  // Tab 3: Evaluación de Riesgo
  @IsOptional()
  @IsNumber()
  impacto?: number;

  @IsOptional()
  @IsNumber()
  probabilidadId?: number;

  @IsOptional()
  @IsNumber()
  amenazaRiesgoId?: number;

  @IsOptional()
  @IsNumber()
  vulnerabilidadRiesgoId?: number;

  @IsOptional()
  @IsString()
  controlesArea?: string;

  @IsOptional()
  @IsNumber()
  evaluacionRiesgo?: number;

  @IsOptional()
  @IsString()
  nivelRiesgo?: string;

  // Tab 4: Tratamiento de Riesgo
  @IsOptional()
  @IsString()
  metodoTratamiento?: string;

  @IsOptional()
  @IsNumber()
  tipoControl?: number;

  @IsOptional()
  @IsString()
  controlesImplementar?: string;

  @IsOptional()
  @IsNumber()
  nivelAmenazaControl?: number;

  @IsOptional()
  @IsNumber()
  nivelVulnerabilidadControl?: number;

  @IsOptional()
  @IsNumber()
  evaluacionRiesgoControl?: number;

  @IsOptional()
  @IsString()
  nivelRiesgoControl?: string;

  // Detalles individuales de riesgo
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DetalleRiesgoDto)
  detallesRiesgo?: DetalleRiesgoDto[];
}
