import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanTratamientoService } from './plan-tratamiento.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  planTratamiento: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('PlanTratamientoService', () => {
  let service: PlanTratamientoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanTratamientoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<PlanTratamientoService>(PlanTratamientoService);
  });

  const validBase = {
    idRiesgo: 'R-001',
    tipoActivoId: 1,
    nivelRiesgoId: 2,
    opcionTratamientoId: 3,
    descripcionActividades: 'Actividades',
    estadoId: 1,
  };

  it('accepts a plan with plazo and both dates when end is after start', async () => {
    const dto = {
      ...validBase,
      plazoImplementacionId: 2,
      fechaInicioImplementacion: '2026-01-01',
      fechaFinImplementacion: '2026-01-31',
    };
    const created: Record<string, unknown> = { id: 1, ...dto };
    mockPrisma.planTratamiento.create.mockResolvedValue(created);

    const result = await service.create(dto);

    expect(result).toEqual(created);
    const calls = mockPrisma.planTratamiento.create.mock.calls as unknown as [
      [{ data: Record<string, unknown> }],
    ];
    expect(calls[0][0].data).toMatchObject({
      plazoImplementacionId: 2,
      fechaInicioImplementacion: new Date('2026-01-01'),
      fechaFinImplementacion: new Date('2026-01-31'),
    });
  });

  it('throws BadRequestException when plazo is set but fechaInicio is missing', () => {
    const dto = {
      ...validBase,
      plazoImplementacionId: 2,
      fechaFinImplementacion: '2026-01-31',
    };

    expect(() => service.create(dto)).toThrow(BadRequestException);
  });

  it('throws BadRequestException when plazo is set but fechaFin is missing', () => {
    const dto = {
      ...validBase,
      plazoImplementacionId: 2,
      fechaInicioImplementacion: '2026-01-01',
    };

    expect(() => service.create(dto)).toThrow(BadRequestException);
  });

  it('throws BadRequestException when start and end are the same day', () => {
    const dto = {
      ...validBase,
      plazoImplementacionId: 2,
      fechaInicioImplementacion: '2026-01-15',
      fechaFinImplementacion: '2026-01-15',
    };

    expect(() => service.create(dto)).toThrow(BadRequestException);
  });

  it('throws BadRequestException when end is before start', () => {
    const dto = {
      ...validBase,
      plazoImplementacionId: 2,
      fechaInicioImplementacion: '2026-01-31',
      fechaFinImplementacion: '2026-01-01',
    };

    expect(() => service.create(dto)).toThrow(BadRequestException);
  });

  it('stores null timeframe fields when none are provided', async () => {
    const dto = { ...validBase };
    const created: Record<string, unknown> = { id: 1, ...dto };
    mockPrisma.planTratamiento.create.mockResolvedValue(created);

    await service.create(dto);

    const calls = mockPrisma.planTratamiento.create.mock.calls as unknown as [
      [{ data: Record<string, unknown> }],
    ];
    expect(calls[0][0].data.plazoImplementacionId).toBeUndefined();
    expect(calls[0][0].data.fechaInicioImplementacion).toBeUndefined();
    expect(calls[0][0].data.fechaFinImplementacion).toBeUndefined();
  });

  it('throws NotFoundException when updating a non-existent plan', async () => {
    mockPrisma.planTratamiento.findFirst.mockResolvedValue(null);

    await expect(service.update(999, { ...validBase })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('soft-deletes a plan by setting eliminado to true', async () => {
    mockPrisma.planTratamiento.findFirst.mockResolvedValue({ id: 1 });
    mockPrisma.planTratamiento.update.mockResolvedValue({ id: 1, eliminado: true });

    await service.remove(1);

    const calls = mockPrisma.planTratamiento.update.mock.calls as unknown as [
      [{ where: { id: number }; data: { eliminado: boolean } }],
    ];
    expect(calls[0][0].where.id).toBe(1);
    expect(calls[0][0].data.eliminado).toBe(true);
  });
});
