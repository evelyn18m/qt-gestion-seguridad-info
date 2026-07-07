import {
  seedOpcionesTratamiento,
  seedEstadosPlanTratamiento,
} from './seed-plan-tratamiento';

describe('seedOpcionesTratamiento', () => {
  it('upserts the four expected treatment options with stable ids', async () => {
    const upsert = jest.fn();
    const prisma = { opcionTratamiento: { upsert } } as any;

    await seedOpcionesTratamiento(prisma);

    expect(upsert).toHaveBeenCalledTimes(4);
    expect(upsert).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      update: { nombre: 'Modificar/Reducir' },
      create: { id: 1, nombre: 'Modificar/Reducir' },
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      update: { nombre: 'Compartir' },
      create: { id: 2, nombre: 'Compartir' },
    });
    expect(upsert).toHaveBeenNthCalledWith(3, {
      where: { id: 3 },
      update: { nombre: 'Evitar' },
      create: { id: 3, nombre: 'Evitar' },
    });
    expect(upsert).toHaveBeenNthCalledWith(4, {
      where: { id: 4 },
      update: { nombre: 'Aceptar' },
      create: { id: 4, nombre: 'Aceptar' },
    });
  });

  it('does not touch unrelated models', async () => {
    const upsert = jest.fn();
    const estadoUpsert = jest.fn();
    const prisma = {
      opcionTratamiento: { upsert },
      estadoPlanTratamiento: { upsert: estadoUpsert },
    } as any;

    await seedOpcionesTratamiento(prisma);

    expect(estadoUpsert).not.toHaveBeenCalled();
  });
});

describe('seedEstadosPlanTratamiento', () => {
  it('upserts the four expected plan statuses with stable ids', async () => {
    const upsert = jest.fn();
    const prisma = { estadoPlanTratamiento: { upsert } } as any;

    await seedEstadosPlanTratamiento(prisma);

    expect(upsert).toHaveBeenCalledTimes(4);
    expect(upsert).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      update: { nombre: 'Pendiente' },
      create: { id: 1, nombre: 'Pendiente' },
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      update: { nombre: 'En progreso' },
      create: { id: 2, nombre: 'En progreso' },
    });
    expect(upsert).toHaveBeenNthCalledWith(3, {
      where: { id: 3 },
      update: { nombre: 'Completado' },
      create: { id: 3, nombre: 'Completado' },
    });
    expect(upsert).toHaveBeenNthCalledWith(4, {
      where: { id: 4 },
      update: { nombre: 'Cancelado' },
      create: { id: 4, nombre: 'Cancelado' },
    });
  });

  it('does not touch unrelated models', async () => {
    const upsert = jest.fn();
    const opcionUpsert = jest.fn();
    const prisma = {
      estadoPlanTratamiento: { upsert },
      opcionTratamiento: { upsert: opcionUpsert },
    } as any;

    await seedEstadosPlanTratamiento(prisma);

    expect(opcionUpsert).not.toHaveBeenCalled();
  });
});
