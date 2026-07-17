import { PrismaClient } from '@prisma/client';

export async function seedOpcionesTratamiento(
  prisma: PrismaClient,
): Promise<void> {
  const opciones = [
    { id: 1, nombre: 'Modificar/Reducir' },
    { id: 2, nombre: 'Compartir' },
    { id: 3, nombre: 'Evitar' },
    { id: 4, nombre: 'Aceptar' },
  ];

  for (const opcion of opciones) {
    await prisma.opcionTratamiento.upsert({
      where: { id: opcion.id },
      update: { nombre: opcion.nombre },
      create: opcion,
    });
  }
}

export async function seedEstadosPlanTratamiento(
  prisma: PrismaClient,
): Promise<void> {
  const estados = [
    { id: 1, nombre: 'Pendiente' },
    { id: 2, nombre: 'En progreso' },
    { id: 3, nombre: 'Completado' },
    { id: 4, nombre: 'Cancelado' },
  ];

  for (const estado of estados) {
    await prisma.estadoPlanTratamiento.upsert({
      where: { id: estado.id },
      update: { nombre: estado.nombre },
      create: estado,
    });
  }
}

export async function seedPlazosImplementacion(
  prisma: PrismaClient,
): Promise<void> {
  const plazos = [
    { id: 1, codigo: 'C', nombre: 'Corto' },
    { id: 2, codigo: 'M', nombre: 'Medio' },
    { id: 3, codigo: 'L', nombre: 'Largo' },
  ];

  for (const plazo of plazos) {
    await prisma.plazoImplementacion.upsert({
      where: { id: plazo.id },
      update: { codigo: plazo.codigo, nombre: plazo.nombre },
      create: plazo,
    });
  }
}
