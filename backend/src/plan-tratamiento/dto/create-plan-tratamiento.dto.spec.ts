import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePlanTratamientoDto } from './create-plan-tratamiento.dto';

function transformAndValidate(dto: Record<string, unknown>) {
  const instance = plainToInstance(CreatePlanTratamientoDto, dto);
  return validate(instance);
}

describe('CreatePlanTratamientoDto', () => {
  const validBase = {
    idRiesgo: 'R-001',
    tipoActivoId: 1,
    nivelRiesgoId: 2,
    opcionTratamientoId: 3,
    descripcionActividades: 'Actividades',
    estadoId: 1,
  };

  it('accepts valid ISO dates and plazoImplementacionId', async () => {
    const dto = {
      ...validBase,
      plazoImplementacionId: 2,
      fechaInicioImplementacion: '2026-01-01',
      fechaFinImplementacion: '2026-01-31',
    };

    const errors = await transformAndValidate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid fechaFinImplementacion string with 400-style validation error', async () => {
    const dto = {
      ...validBase,
      plazoImplementacionId: 2,
      fechaInicioImplementacion: '2026-01-01',
      fechaFinImplementacion: 'not-a-date',
    };

    const errors = await transformAndValidate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const propertyNames = errors.map((e) => e.property);
    expect(propertyNames).toContain('fechaFinImplementacion');
  });

  it('accepts DTO without any timeframe fields', async () => {
    const errors = await transformAndValidate(validBase);

    expect(errors).toHaveLength(0);
  });

  it('rejects non-integer plazoImplementacionId', async () => {
    const dto = {
      ...validBase,
      plazoImplementacionId: 'C',
    };

    const errors = await transformAndValidate(dto);

    const propertyNames = errors.map((e) => e.property);
    expect(propertyNames).toContain('plazoImplementacionId');
  });
});
