import { Test, TestingModule } from '@nestjs/testing';
import { ValoracionesService } from './valoraciones.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AtLeastOneConstraint,
  CreateValoracionDto,
} from './dto/create-valoracion.dto';
import { UpdateValoracionDto } from './dto/update-valoracion.dto';
import type { ValidationArguments } from 'class-validator';

type AnyMock = jest.Mock<any, any[]>;

const mockPrisma = {
  valoracionActivo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  tipoActivo: { findUnique: jest.fn() },
  formato: { findUnique: jest.fn() },
  macroProceso: { findUnique: jest.fn() },
  subproceso: { findUnique: jest.fn() },
  area: { findUnique: jest.fn() },
  funcionario: { findUnique: jest.fn() },
  impacto: { findUnique: jest.fn() },
  tipoControl: { findUnique: jest.fn() },
  detalleRiesgo: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn() as AnyMock,
};

const mockItem = {
  id: 1,
  nombreActivo: 'Test Activo',
  tipoActivoId: 1,
  formatoId: 1,
  macroProcesoId: 1,
  subProcesoId: 1,
  propietarioId: 1,
  custodioId: 1,
  descripcion: 'Test desc',
  controlSeguridad: 'Test ctrl',
  ubicacion: 'Test loc',
  observaciones: null,
  confidencialidadId: 1,
  integridadId: 1,
  disponibilidadId: 1,
  tieneDatosPersonales: false,
  amenazas: null,
  vulnerabilidades: null,
  controlesImplementacion: null,
  impacto: null,
  probabilidadId: null,
  amenazaRiesgoId: null,
  vulnerabilidadRiesgoId: null,
  controlesArea: null,
  evaluacionRiesgo: null,
  nivelRiesgo: null,
  metodoTratamiento: null,
  tipoControl: null,
  controlesImplementar: null,
  nivelAmenazaControl: null,
  nivelVulnerabilidadControl: null,
  evaluacionRiesgoControl: null,
  nivelRiesgoControl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEnriched = {
  ...mockItem,
  tipoActivo: { id: 1, nombre: 'SW', detalle: 'Software' },
  formato: { id: 1, nombre: 'Documento' },
  macroProceso: { id: 1, nombre: 'MP-Test', codigo: 'MP1' },
  subProceso: { id: 1, nombre: 'SP-Test', macroProcesoId: 1 },
  propietario: { id: 1, nombre: 'Area Test' },
  custodio: { id: 1, nombre: 'Funcionario Test' },
  confidencialidad: {
    id: 1,
    tipo: 'confidencialidad',
    nivel: 'Alto',
    valor: 3,
    criterio: 'Crit',
  },
  integridad: {
    id: 1,
    tipo: 'integridad',
    nivel: 'Medio',
    valor: 2,
    criterio: 'Med',
  },
  disponibilidad: {
    id: 1,
    tipo: 'disponibilidad',
    nivel: 'Alto',
    valor: 3,
    criterio: 'Crit',
  },
  tipoControl: null,
  detallesRiesgo: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ValoracionesService — Tab 2 new fields', () => {
  let service: ValoracionesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  describe('create() with amenaza-only row', () => {
    it('GREEN: should call $transaction with create for row that has amenazaIds', async () => {
      mockPrisma.valoracionActivo.create.mockResolvedValue(mockItem);
      mockPrisma.$transaction.mockResolvedValue([{ id: 10 }]);
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto: CreateValoracionDto = {
        nombreActivo: 'Test Activo',
        tipoActivoId: 1,
        formatoId: 1,
        macroProcesoId: 1,
        subProcesoId: 1,
        propietarioId: 1,
        custodioId: 1,
        descripcion: 'Test desc',
        controlSeguridad: 'Test ctrl',
        ubicacion: 'Test loc',
        confidencialidadId: 1,
        integridadId: 1,
        disponibilidadId: 1,
        detallesRiesgo: [
          {
            tipo: 'amenaza',
            catalogoId: 1,
            amenazaIds: '[3,7]',
            vulnerabilidadIds: undefined,
            controlesImplementados: undefined,
          },
        ],
      };

      await service.create(dto);

      expect(mockPrisma.$transaction.mock.calls.length).toBe(1);
      const txCalls = mockPrisma.$transaction.mock.calls[0] as unknown[];
      const txOps = txCalls[0] as unknown[];
      expect(txOps.length).toBe(1);
    });
  });

  describe('create() with vulnerabilidad-only row', () => {
    it('GREEN: should call $transaction with create for row with vulnerabilidadIds', async () => {
      mockPrisma.valoracionActivo.create.mockResolvedValue(mockItem);
      mockPrisma.$transaction.mockResolvedValue([{ id: 11 }]);
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto: CreateValoracionDto = {
        nombreActivo: 'Test Activo',
        tipoActivoId: 1,
        formatoId: 1,
        macroProcesoId: 1,
        subProcesoId: 1,
        propietarioId: 1,
        custodioId: 1,
        descripcion: 'Test desc',
        controlSeguridad: 'Test ctrl',
        ubicacion: 'Test loc',
        confidencialidadId: 1,
        integridadId: 1,
        disponibilidadId: 1,
        detallesRiesgo: [
          {
            tipo: 'vulnerabilidad',
            catalogoId: 1,
            amenazaIds: undefined,
            vulnerabilidadIds: '[5]',
            controlesImplementados: 'Control A, Control B',
          },
        ],
      };

      await service.create(dto);

      expect(mockPrisma.$transaction.mock.calls.length).toBe(1);
      const txCalls = mockPrisma.$transaction.mock.calls[0] as unknown[];
      const txOps = txCalls[0] as unknown[];
      expect(txOps.length).toBe(1);
    });
  });

  describe('create() with both amenaza and vulnerabilidad', () => {
    it('GREEN: should store both JSON arrays in same row', async () => {
      mockPrisma.valoracionActivo.create.mockResolvedValue(mockItem);
      mockPrisma.$transaction.mockResolvedValue([{ id: 12 }]);
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto: CreateValoracionDto = {
        nombreActivo: 'Test Activo',
        tipoActivoId: 1,
        formatoId: 1,
        macroProcesoId: 1,
        subProcesoId: 1,
        propietarioId: 1,
        custodioId: 1,
        descripcion: 'Test desc',
        controlSeguridad: 'Test ctrl',
        ubicacion: 'Test loc',
        confidencialidadId: 1,
        integridadId: 1,
        disponibilidadId: 1,
        detallesRiesgo: [
          {
            tipo: 'amenaza',
            catalogoId: 1,
            amenazaIds: '[3]',
            vulnerabilidadIds: '[5,9]',
            controlesImplementados: 'Combined controls',
          },
        ],
      };

      await service.create(dto);

      expect(mockPrisma.$transaction.mock.calls.length).toBe(1);
      const txCalls = mockPrisma.$transaction.mock.calls[0] as unknown[];
      const txOps = txCalls[0] as unknown[];
      expect(txOps.length).toBe(1);
    });
  });

  describe('update() with deleteMany + creates', () => {
    it('GREEN: should $transaction with deleteMany followed by create calls', async () => {
      mockPrisma.valoracionActivo.findUnique
        .mockResolvedValueOnce(mockItem)
        .mockResolvedValueOnce(mockEnriched);
      mockPrisma.valoracionActivo.update.mockResolvedValue(mockItem);
      mockPrisma.$transaction.mockResolvedValue([{ count: 1 }]);
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto: UpdateValoracionDto = {
        nombreActivo: 'Updated Activo',
        tipoActivoId: 1,
        formatoId: 1,
        macroProcesoId: 1,
        subProcesoId: 1,
        propietarioId: 1,
        custodioId: 1,
        descripcion: 'Test desc',
        controlSeguridad: 'Test ctrl',
        ubicacion: 'Test loc',
        confidencialidadId: 1,
        integridadId: 1,
        disponibilidadId: 1,
        detallesRiesgo: [
          {
            tipo: 'amenaza',
            catalogoId: 1,
            amenazaIds: '[1,2]',
            vulnerabilidadIds: undefined,
            controlesImplementados: 'Update controls',
          },
        ],
      };

      await service.update(1, dto);

      expect(mockPrisma.$transaction.mock.calls.length).toBe(1);
      const txOps = mockPrisma.$transaction.mock.calls[0][0] as unknown[];
      // deleteMany + 1 create
      expect(txOps.length).toBe(2);
    });
  });
});

// ──────────────────────────────────────────────────
// AtLeastOneConstraint — pure unit tests
// ──────────────────────────────────────────────────
describe('AtLeastOneConstraint', () => {
  const constraint = new AtLeastOneConstraint();

  function mockArgs(
    amenazaIds: unknown,
    vulnerabilidadIds: unknown,
  ): ValidationArguments {
    return {
      object: { amenazaIds, vulnerabilidadIds },
    } as ValidationArguments;
  }

  it('passes when amenazaIds has items', () => {
    expect(constraint.validate(true, mockArgs('[3,7]', null))).toBe(true);
  });

  it('passes when vulnerabilidadIds has items', () => {
    expect(constraint.validate(true, mockArgs(null, '[5]'))).toBe(true);
  });

  it('passes when both have items', () => {
    expect(constraint.validate(true, mockArgs('[3]', '[5]'))).toBe(true);
  });

  it('fails when both are null', () => {
    expect(constraint.validate(true, mockArgs(null, null))).toBe(false);
  });

  it('fails when both are empty arrays', () => {
    expect(constraint.validate(true, mockArgs('[]', '[]'))).toBe(false);
  });

  it('passes with amenazaIds empty string + valid vulnerabilidadIds', () => {
    // Empty string is falsy → ancaman empty, but vuln has [5] → passes
    expect(constraint.validate(true, mockArgs('', '[5]'))).toBe(true);
  });

  it('passes when amenazaIds contains single id', () => {
    expect(constraint.validate(true, mockArgs('[3]', null))).toBe(true);
  });
});
