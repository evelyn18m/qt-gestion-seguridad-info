import { Test, TestingModule } from '@nestjs/testing';
import { ValoracionesService } from './valoraciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { ParametrosService } from '../parametros/parametros.service';
import { AuditService } from '../audit/audit.service';
import {
  AtLeastOneConstraint,
  CreateValoracionDto,
  DetalleRiesgoDto,
} from './dto/create-valoracion.dto';
import { UpdateValoracionDto } from './dto/update-valoracion.dto';
import type { ValidationArguments } from 'class-validator';
import { validateSync } from 'class-validator';

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
  activo: { findUnique: jest.fn(), create: jest.fn() },
  formato: { findUnique: jest.fn() },
  macroProceso: { findUnique: jest.fn() },
  subproceso: { findUnique: jest.fn() },
  area: { findUnique: jest.fn() },
  funcionario: { findUnique: jest.fn(), findMany: jest.fn() },
  tipoDatosPersonales: { findMany: jest.fn() },
  impacto: { findUnique: jest.fn() },
  tipoControl: { findUnique: jest.fn() },
  riesgo: {
    findUnique: jest.fn(),
  },
  controlesImplementar: { findMany: jest.fn() },
  detalleRiesgo: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn() as AnyMock,
};

const mockDefaultConfig = {
  id: 1,
  riesgoBajoMax: 3,
  riesgoMedioMax: 9,
  riesgoAltoMax: 27,
  controlBajoMax: 3,
  controlMedioMax: 9,
  controlAltoMax: 27,
  residualAceptableMax: 3,
};

const mockParametrosService = {
  getConfiguracion: jest.fn().mockResolvedValue(mockDefaultConfig),
  updateConfiguracion: jest.fn(),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
  findAll: jest.fn(),
  findById: jest.fn(),
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
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
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

// ──────────────────────────────────────────────────────────────────────────────
// DetalleRiesgoDto — vulnerabilidadRiesgoId validation (Phase 1: TDD)
// ──────────────────────────────────────────────────────────────────────────────
describe('DetalleRiesgoDto — vulnerabilidadRiesgoId validation', () => {
  it('RED: should accept vulnerabilidadRiesgoId as known (decorated) property', () => {
    const dto = Object.assign(new DetalleRiesgoDto(), {
      riesgoId: 2,
      vulnerabilidadRiesgoId: 3,
      tipoControlId: 1,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('should tolerate missing vulnerabilidadRiesgoId (optional field)', () => {
    const dto = Object.assign(new DetalleRiesgoDto(), {
      riesgoId: 1,
      tipoControlId: 1,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// mapDetalleRiesgo — separate threat/vulnerability levels (Phase 2: TDD)
// ──────────────────────────────────────────────────────────────────────────────
describe('mapDetalleRiesgo with separate threat/vulnerability levels', () => {
  let service: ValoracionesService;

  const baseDto: CreateValoracionDto = {
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
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('RED: should compute evaluacionRiesgo from independent amenaza and vulnerabilidad valors', async () => {
    // Catalog: riesgoId=2 → valor=2, vulnerabilidadRiesgoId=3 → valor=3
    mockPrisma.riesgo.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 2)
          return Promise.resolve({ id: 2, valor: 2, nivel: 'Medio' });
        if (args.where.id === 3)
          return Promise.resolve({ id: 3, valor: 3, nivel: 'Alto' });
        return Promise.resolve(null);
      },
    );

    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 20 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 20 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          riesgoId: 2,
          vulnerabilidadRiesgoId: 3,
          amenazaIds: '[1]',
        },
      ],
    };

    await service.create(dto);

    // With the bug: evaluacionRiesgo = 3 × 2 × 2 = 12 (both use riesgoId's valor).
    // After fix:   evaluacionRiesgo = 3 × 2 × 3 = 18 (independent valors).
    const createCall = mockPrisma.detalleRiesgo.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data.evaluacionRiesgo).toBe(18);
    expect(createCall.data.vulnerabilidadRiesgoId).toBe(3);
  });

  it('TRIANGULATE: should default vulnerabilidad to 1 when vulnerabilidadRiesgoId is missing', async () => {
    // riesgoId=2 → valor=2, no vulnerabilidadRiesgoId → default 1
    mockPrisma.riesgo.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 2)
          return Promise.resolve({ id: 2, valor: 2, nivel: 'Medio' });
        return Promise.resolve(null);
      },
    );

    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 21 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 21 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          riesgoId: 2,
          // vulnerabilidadRiesgoId not set → defaults to nivel 1
          amenazaIds: '[1]',
        },
      ],
    };

    await service.create(dto);

    // evaluacionRiesgo = 3 × 2 × 1 = 6
    const createCall = mockPrisma.detalleRiesgo.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data.evaluacionRiesgo).toBe(6);
    expect(createCall.data.vulnerabilidadRiesgoId).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// mapDetalleRiesgo() — controlesImplementarId passthrough (Task 6.2)
// ──────────────────────────────────────────────────────────────────────────────
describe('mapDetalleRiesgo() with controlesImplementarId', () => {
  let service: ValoracionesService;

  const baseDto: CreateValoracionDto = {
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
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('RED→GREEN: should pass controlesImplementarId to detalleRiesgo.create when set', async () => {
    // mapDetalleRiesgo() doesn't map controlesImplementarId yet → RED
    // After Task 3.2 implementation → GREEN
    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 10 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 10 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          amenazaIds: '[3]',
          controlesImplementarId: 42,
        },
      ],
    };

    await service.create(dto);

    expect(mockPrisma.detalleRiesgo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          controlesImplementarId: 42,
        }),
      }),
    );
  });

  it('TRIANGULATE: should NOT include controlesImplementarId when undefined', async () => {
    // Triangulation: different input (no controlesImplementarId) → different output (field absent)
    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 11 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 11 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          amenazaIds: '[3]',
          // no controlesImplementarId
        },
      ],
    };

    await service.create(dto);

    const callData = mockPrisma.detalleRiesgo.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(callData.data.controlesImplementarId).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// mapDetalleRiesgo — vulnerabilidadControlId spread + control valors (Phase 2: TDD)
// ──────────────────────────────────────────────────────────────────────────────
describe('mapDetalleRiesgo with vulnerabilidadControlId', () => {
  let service: ValoracionesService;

  const baseDto: CreateValoracionDto = {
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
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('RED: should spread vulnerabilidadControlId into create data when defined', async () => {
    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 30 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 30 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          vulnerabilidadControlId: 4,
          amenazaIds: '[1]',
        },
      ],
    };

    await service.create(dto);

    const createCall = mockPrisma.detalleRiesgo.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data.vulnerabilidadControlId).toBe(4);
  });

  it('TRIANGULATE: should NOT include vulnerabilidadControlId when undefined', async () => {
    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 31 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 31 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          // vulnerabilidadControlId not set
          amenazaIds: '[1]',
        },
      ],
    };

    await service.create(dto);

    const createCall = mockPrisma.detalleRiesgo.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data.vulnerabilidadControlId).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DetalleRiesgoDto — vulnerabilidadControlId validation (Phase 2: TDD)
// ──────────────────────────────────────────────────────────────────────────────
describe('DetalleRiesgoDto — vulnerabilidadControlId validation', () => {
  it('RED: should accept vulnerabilidadControlId as known (decorated) property', () => {
    const dto = Object.assign(new DetalleRiesgoDto(), {
      riesgoControlId: 2,
      vulnerabilidadControlId: 5,
      tipoControlId: 1,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('should tolerate missing vulnerabilidadControlId (optional field)', () => {
    const dto = Object.assign(new DetalleRiesgoDto(), {
      riesgoControlId: 1,
      tipoControlId: 1,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('TRIANGULATE: should pass with valid integer value', () => {
    const dto = Object.assign(new DetalleRiesgoDto(), {
      riesgoControlId: 3,
      vulnerabilidadControlId: 7,
      tipoControlId: 1,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DetalleRiesgoDto — tipoControlId validation (required field)
// ──────────────────────────────────────────────────────────────────────────────
describe('DetalleRiesgoDto — tipoControlId validation (required)', () => {
  it('RED: should reject missing tipoControlId (required field)', () => {
    const dto = Object.assign(new DetalleRiesgoDto(), {
      riesgoId: 1,
      vulnerabilidadRiesgoId: 2,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('TRIANGULATE: should accept when tipoControlId is provided', () => {
    const dto = Object.assign(new DetalleRiesgoDto(), {
      riesgoId: 1,
      vulnerabilidadRiesgoId: 2,
      tipoControlId: 5,
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('TRIANGULATE: should reject non-number tipoControlId', () => {
    const dto = Object.assign(new DetalleRiesgoDto(), {
      riesgoId: 1,
      vulnerabilidadRiesgoId: 2,
      tipoControlId: 'not-a-number',
    });
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// create() / update() — independent Riesgo lookups for control IDs (Phase 2: TDD)
// ──────────────────────────────────────────────────────────────────────────────
describe('create() with control-level Riesgo lookups', () => {
  let service: ValoracionesService;

  const baseDto: CreateValoracionDto = {
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
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('RED: should call prisma.riesgo.findUnique() for riesgoControlId and vulnerabilidadControlId', async () => {
    // Mock Riesgo catalog: riesgoId=2→valor=2, riesgoControlId=1→valor=1, vulnerabilidadControlId=3→valor=3
    mockPrisma.riesgo.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 2)
          return Promise.resolve({ id: 2, valor: 2, nivel: 'Medio' });
        if (args.where.id === 1)
          return Promise.resolve({ id: 1, valor: 1, nivel: 'Bajo' });
        if (args.where.id === 3)
          return Promise.resolve({ id: 3, valor: 3, nivel: 'Alto' });
        return Promise.resolve(null);
      },
    );

    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 40 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 40 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          riesgoId: 2,
          riesgoControlId: 1,
          vulnerabilidadControlId: 3,
          amenazaIds: '[1]',
        },
      ],
    };

    await service.create(dto);

    // Verify riesgo.findUnique was called for all 3 IDs
    const findUniqueCalls = mockPrisma.riesgo.findUnique.mock.calls.map(
      (c: any[]) => (c[0] as { where: { id: number } }).where.id,
    );
    expect(findUniqueCalls).toContain(2); // riesgoId
    expect(findUniqueCalls).toContain(1); // riesgoControlId
    expect(findUniqueCalls).toContain(3); // vulnerabilidadControlId
  });

  it('TRIANGULATE: should compute evaluacionRiesgoControl using control valors', async () => {
    // riesgoId=3→valor=3, riesgoControlId=1→valor=1, vulnerabilidadControlId=1→valor=1
    // inherent: VA=3 × 3 × 1 = 9 (no vulnRiesgoId set)
    // control: VA=3 × 1 × 1 = 3 → evaluacionRiesgoControl=3
    mockPrisma.riesgo.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 3)
          return Promise.resolve({ id: 3, valor: 3, nivel: 'Alto' });
        if (args.where.id === 1)
          return Promise.resolve({ id: 1, valor: 1, nivel: 'Bajo' });
        return Promise.resolve(null);
      },
    );

    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 41 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 41 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          riesgoId: 3,
          riesgoControlId: 1,
          vulnerabilidadControlId: 1,
          amenazaIds: '[1]',
        },
      ],
    };

    await service.create(dto);

    const createCall = mockPrisma.detalleRiesgo.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    // evaluacionRiesgoControl = 3 × 1 × 1 = 3 (independent from inherent)
    expect(createCall.data.evaluacionRiesgoControl).toBe(3);
    expect(createCall.data.nivelRiesgoControl).toBe('BAJO');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// enrich() — includes controlesImplementar relation (Task 6.3)
// ──────────────────────────────────────────────────────────────────────────────
describe('enrich() includes controlesImplementar in detalleRiesgo.findMany', () => {
  let service: ValoracionesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Setup all findUnique mocks to return null (enrich() tolerates null relations)
    mockPrisma.tipoActivo.findUnique.mockResolvedValue(null);
    mockPrisma.formato.findUnique.mockResolvedValue(null);
    mockPrisma.macroProceso.findUnique.mockResolvedValue(null);
    mockPrisma.subproceso.findUnique.mockResolvedValue(null);
    mockPrisma.area.findUnique.mockResolvedValue(null);
    mockPrisma.funcionario.findUnique.mockResolvedValue(null);
    mockPrisma.impacto.findUnique.mockResolvedValue(null);
    mockPrisma.tipoControl.findUnique.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('should fetch detalleRiesgo without non-existent controlesImplementar relation', async () => {
    // Schema stores controlesImplementarId as a JSON string; there is no
    // Prisma relation to include on DetalleRiesgo.
    const item = {
      id: 1,
      nombreActivo: 'Test',
      tipoActivoId: 1,
      formatoId: 1,
      macroProcesoId: 1,
      subProcesoId: 1,
      propietarioId: 1,
      custodioId: 1,
      descripcion: 'Test',
      controlSeguridad: 'Test',
      ubicacion: 'Test',
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

    mockPrisma.valoracionActivo.findUnique.mockResolvedValue(item);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    await service.findOne(1);

    expect(mockPrisma.detalleRiesgo.findMany).toHaveBeenCalledWith({
      where: { valoracionActivoId: 1 },
      orderBy: { id: 'asc' },
      select: expect.any(Object),
    });
  });

  it('TRIANGULATE: response should include controlesImplementar field when set', async () => {
    // Triangulation: when detalleRiesgo has controlesImplementar data, it appears in response
    const item = {
      id: 2,
      nombreActivo: 'Test2',
      tipoActivoId: 1,
      formatoId: 1,
      macroProcesoId: 1,
      subProcesoId: 1,
      propietarioId: 1,
      custodioId: 1,
      descripcion: 'Test',
      controlSeguridad: 'Test',
      ubicacion: 'Test',
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

    const controlImplementar = {
      id: 5,
      seccion: 'A.1',
      descripcion: 'Politica de acceso',
      categoriaId: 1,
      categoria: { id: 1, nombre: 'Control de Acceso' },
    };

    const enrichedDetalle = {
      id: 10,
      valoracionActivoId: 2,
      tipo: 'amenaza',
      catalogoId: 1,
      controlesImplementarId: 5,
    };

    mockPrisma.valoracionActivo.findUnique.mockResolvedValue(item);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([enrichedDetalle]);
    mockPrisma.controlesImplementar.findMany.mockResolvedValue([
      controlImplementar,
    ]);

    const result = await service.findOne(2);

    expect(result.detallesRiesgo).toHaveLength(1);
    const detalle = result.detallesRiesgo[0];
    expect(detalle.controlesImplementar).toEqual([controlImplementar]);
    expect(detalle.controlesImplementar[0].descripcion).toBe(
      'Politica de acceso',
    );
    expect(detalle.controlesImplementar[0].categoria.nombre).toBe(
      'Control de Acceso',
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// mapDetalleRiesgo — VA from CIA average (Phase 1: Fix hardcoded VA=3)
// ──────────────────────────────────────────────────────────────────────────────
describe('mapDetalleRiesgo with VA from CIA impacto', () => {
  let service: ValoracionesService;

  const baseDto: CreateValoracionDto = {
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
    confidencialidadId: 10,
    integridadId: 11,
    disponibilidadId: 12,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('RED: should compute evaluacionRiesgo = ciaAverage × A × V (not 3 × A × V)', async () => {
    // CIA impacto values: 1 + 2 + 2 → avg = 1.67
    mockPrisma.impacto.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 10)
          return Promise.resolve({
            id: 10,
            tipo: 'confidencialidad',
            nivel: 'Bajo',
            valor: 1,
            criterio: 'test',
          });
        if (args.where.id === 11)
          return Promise.resolve({
            id: 11,
            tipo: 'integridad',
            nivel: 'Medio',
            valor: 2,
            criterio: 'test',
          });
        if (args.where.id === 12)
          return Promise.resolve({
            id: 12,
            tipo: 'disponibilidad',
            nivel: 'Medio',
            valor: 2,
            criterio: 'test',
          });
        return Promise.resolve(null);
      },
    );

    // riesgoId=2 → valor=2, vulnerabilidadRiesgoId=3 → valor=3
    mockPrisma.riesgo.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 2)
          return Promise.resolve({ id: 2, valor: 2, nivel: 'Medio' });
        if (args.where.id === 3)
          return Promise.resolve({ id: 3, valor: 3, nivel: 'Alto' });
        return Promise.resolve(null);
      },
    );

    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 200 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 200 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          riesgoId: 2,
          vulnerabilidadRiesgoId: 3,
          tipoControlId: 1,
          amenazaIds: '[1]',
        },
      ],
    };

    await service.create(dto);

    const createCall = mockPrisma.detalleRiesgo.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    // va = (1+2+2)/3 ≈ 1.67 → evaluacionRiesgo = 1.67 × 2 × 3 = 10.02
    // Currently (bug): va=3 → evaluacionRiesgo = 3 × 2 × 3 = 18
    expect(createCall.data.evaluacionRiesgo).toBeCloseTo(10.02, 2);
  });

  it('TRIANGULATE: CIA=1,1,1 → va=1 → evaluacionRiesgo = 1×A×V', async () => {
    // All CIA IDs = 1 (valor=1 each) → avg = 1
    mockPrisma.impacto.findUnique.mockResolvedValue({
      id: 1,
      tipo: 'confidencialidad',
      nivel: 'Bajo',
      valor: 1,
      criterio: 'test',
    });

    // riesgoId=2 → valor=2, vulnerabilidadRiesgoId=3 → valor=3
    mockPrisma.riesgo.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 2)
          return Promise.resolve({ id: 2, valor: 2, nivel: 'Medio' });
        if (args.where.id === 3)
          return Promise.resolve({ id: 3, valor: 3, nivel: 'Alto' });
        return Promise.resolve(null);
      },
    );

    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.create.mockResolvedValue({ id: 201 });
    mockPrisma.$transaction.mockResolvedValue([{ id: 201 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      confidencialidadId: 1,
      integridadId: 1,
      disponibilidadId: 1,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          riesgoId: 2,
          vulnerabilidadRiesgoId: 3,
          tipoControlId: 1,
          amenazaIds: '[1]',
        },
      ],
    };

    await service.create(dto);

    const createCall = mockPrisma.detalleRiesgo.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    // va = (1+1+1)/3 = 1 → evaluacionRiesgo = 1 × 2 × 3 = 6
    // Old bug: va=3 → evaluacionRiesgo = 3 × 2 × 3 = 18
    expect(createCall.data.evaluacionRiesgo).toBe(6);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// calcularDetalleRiesgo — fallback to parent CIA when VA not in DTO
// ──────────────────────────────────────────────────────────────────────────────
describe('calcularDetalleRiesgo with parent CIA fallback', () => {
  let service: ValoracionesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('RED: should use parent CIA average when DTO has no VA', async () => {
    // Mock detalle exists
    mockPrisma.detalleRiesgo.findFirst.mockResolvedValue({
      id: 50,
      valoracionActivoId: 1,
      riesgoId: 2,
      vulnerabilidadRiesgoId: 3,
    });

    // Parent VA has CIA IDs that map to impacto values: 1,2,2 → avg=1.67
    mockPrisma.valoracionActivo.findUnique.mockResolvedValue({
      id: 1,
      confidencialidadId: 10,
      integridadId: 11,
      disponibilidadId: 12,
    });

    mockPrisma.impacto.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 10)
          return Promise.resolve({
            id: 10,
            tipo: 'c',
            nivel: 'Bajo',
            valor: 1,
            criterio: 't',
          });
        if (args.where.id === 11)
          return Promise.resolve({
            id: 11,
            tipo: 'i',
            nivel: 'Medio',
            valor: 2,
            criterio: 't',
          });
        if (args.where.id === 12)
          return Promise.resolve({
            id: 12,
            tipo: 'd',
            nivel: 'Medio',
            valor: 2,
            criterio: 't',
          });
        return Promise.resolve(null);
      },
    );

    const result = await service.calcularDetalleRiesgo(1, 50, {
      nivelAmenaza: 2,
      nivelVulnerabilidad: 2,
      // NO VA in DTO → should fall back to parent CIA avg = 1.67
    });

    // va=1.67 → evaluacionRiesgo = 1.67 × 2 × 2 = 6.68
    // Old bug (without fix): va=3 → evaluacionRiesgo = 3 × 2 × 2 = 12
    expect(result.evaluacionRiesgo).toBeCloseTo(6.68, 2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// create() / update() — persist ValoracionActivo.evaluacionRiesgo as MAX
// ──────────────────────────────────────────────────────────────────────────────
describe('create() persists ValoracionActivo.evaluacionRiesgo as MAX of hijos', () => {
  let service: ValoracionesService;

  const baseDto: CreateValoracionDto = {
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
    confidencialidadId: 10,
    integridadId: 11,
    disponibilidadId: 12,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('RED: should persist VA.evaluacionRiesgo = MAX(hijos.evaluacionRiesgo) after create', async () => {
    // CIA impacto: valores 1,2,2 → avg = 1.67
    mockPrisma.impacto.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 10)
          return Promise.resolve({
            id: 10,
            tipo: 'c',
            nivel: 'Bajo',
            valor: 1,
            criterio: 't',
          });
        if (args.where.id === 11)
          return Promise.resolve({
            id: 11,
            tipo: 'i',
            nivel: 'Medio',
            valor: 2,
            criterio: 't',
          });
        if (args.where.id === 12)
          return Promise.resolve({
            id: 12,
            tipo: 'd',
            nivel: 'Medio',
            valor: 2,
            criterio: 't',
          });
        return Promise.resolve(null);
      },
    );

    // riesgoId=2 → valor=2, riesgoId=3 → valor=3
    mockPrisma.riesgo.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 2)
          return Promise.resolve({ id: 2, valor: 2, nivel: 'Medio' });
        if (args.where.id === 3)
          return Promise.resolve({ id: 3, valor: 3, nivel: 'Alto' });
        return Promise.resolve(null);
      },
    );

    const createdItem = {
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.valoracionActivo.create.mockResolvedValue(createdItem);
    mockPrisma.$transaction.mockResolvedValue([{ id: 300 }, { id: 301 }]);
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

    const dto: CreateValoracionDto = {
      ...baseDto,
      detallesRiesgo: [
        {
          tipo: 'amenaza',
          catalogoId: 1,
          riesgoId: 2, // valor=2 → eval = 1.67×2×1 = 3.34  (vuln defaults to 1)
          tipoControlId: 1,
          amenazaIds: '[1]',
        },
        {
          tipo: 'vulnerabilidad',
          catalogoId: 2,
          riesgoId: 3, // valor=3 → eval = 1.67×3×1 = 5.01
          tipoControlId: 1,
          vulnerabilidadIds: '[2]',
        },
      ],
    };

    await service.create(dto);

    // Assert VA.update was called with evaluacionRiesgo = MAX(3.34, 5.01) = 5.01
    // and nivelRiesgo derived from 5.01 (default riesgoBajoMax=3, riesgoMedioMax=9 → MEDIO)
    expect(mockPrisma.valoracionActivo.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        evaluacionRiesgo: 5.01,
        nivelRiesgo: 'MEDIO',
      }),
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// recalcular() — fix existing rows with inflated VA=3
// ──────────────────────────────────────────────────────────────────────────────
describe('recalcular() recalculates with real VA', () => {
  let service: ValoracionesService;

  const parentVA = {
    id: 1,
    nombreActivo: 'Test',
    confidencialidadId: 10,
    integridadId: 11,
    disponibilidadId: 12,
    tipoControl: null,
    amenazas: null,
    vulnerabilidades: null,
    controlesImplementacion: null,
    impacto: null,
    probabilidadId: null,
    amenazaRiesgoId: null,
    vulnerabilidadRiesgoId: null,
    controlesArea: null,
    evaluacionRiesgo: 18,
    nivelRiesgo: 'ALTO',
    metodoTratamiento: null,
    tipoControlId: 1,
    controlesImplementar: null,
    nivelAmenazaControl: null,
    nivelVulnerabilidadControl: null,
    evaluacionRiesgoControl: null,
    nivelRiesgoControl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('RED: should delete old hijos and recreate with real VA from parent CIA', async () => {
    // CIA impacto: 1,2,2 → avg = 1.67
    mockPrisma.impacto.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 10)
          return Promise.resolve({
            id: 10,
            tipo: 'c',
            nivel: 'Bajo',
            valor: 1,
            criterio: 't',
          });
        if (args.where.id === 11)
          return Promise.resolve({
            id: 11,
            tipo: 'i',
            nivel: 'Medio',
            valor: 2,
            criterio: 't',
          });
        if (args.where.id === 12)
          return Promise.resolve({
            id: 12,
            tipo: 'd',
            nivel: 'Medio',
            valor: 2,
            criterio: 't',
          });
        return Promise.resolve(null);
      },
    );

    // Existing hijos with inflated evaluacionRiesgo (was VA=3)
    const oldHijo1 = {
      id: 10,
      valoracionActivoId: 1,
      tipo: 'amenaza',
      catalogoId: 1,
      riesgoId: 2,
      vulnerabilidadRiesgoId: 3,
      evaluacionRiesgo: 18, // 3×2×3 = old bug
      nivelRiesgo: 'ALTO',
      metodoTratamiento: 'MODIFICAR / PREVENIR / COMPARTIR',
      tipoControlId: 1,
      riesgoControlId: null,
      vulnerabilidadControlId: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      riesgoResidual: null,
      amenazaIds: '[1]',
      vulnerabilidadIds: null,
      controlesImplementados: null,
      controlesArea: null,
      controlesImplementarId: null,
    };

    // Mock parent VA exists
    mockPrisma.valoracionActivo.findUnique.mockResolvedValue(parentVA);

    // Mock existing hijos
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([oldHijo1]);

    // Mock deleteMany
    mockPrisma.detalleRiesgo.deleteMany.mockResolvedValue({ count: 1 });

    // Mock transaction
    mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { id: 100 }]);

    // Mock enrich catalog lookups (return null for simplicity)
    mockPrisma.tipoActivo.findUnique.mockResolvedValue(null);
    mockPrisma.formato.findUnique.mockResolvedValue(null);
    mockPrisma.macroProceso.findUnique.mockResolvedValue(null);
    mockPrisma.subproceso.findUnique.mockResolvedValue(null);
    mockPrisma.area.findUnique.mockResolvedValue(null);
    mockPrisma.funcionario.findUnique.mockResolvedValue(null);
    mockPrisma.tipoControl.findUnique.mockResolvedValue(null);
    mockPrisma.detalleRiesgo.findMany
      .mockResolvedValueOnce([oldHijo1])
      .mockResolvedValueOnce([]); // after recalcular, findMany inside enrich

    // Mock Riesgo catalog for recalculating
    mockPrisma.riesgo.findUnique.mockImplementation(
      (args: { where: { id: number } }) => {
        if (args.where.id === 2)
          return Promise.resolve({ id: 2, valor: 2, nivel: 'Medio' });
        if (args.where.id === 3)
          return Promise.resolve({ id: 3, valor: 3, nivel: 'Alto' });
        return Promise.resolve(null);
      },
    );

    // Mock valoracionActivo.update for post-recalculo MAX persistence
    mockPrisma.valoracionActivo.update.mockResolvedValue(parentVA);

    const result = await service.recalcular(1);

    // Should call deleteMany for old hijos
    expect(mockPrisma.detalleRiesgo.deleteMany).toHaveBeenCalledWith({
      where: { valoracionActivoId: 1 },
    });

    // Should recreate hijo using real VA (1.67 not 3)
    // With VA=1.67, riesgoId=2 (valor=2), vulnRiesgoId=3 (valor=3): eval = 1.67×2×3 = 10.02
    const createCall = mockPrisma.detalleRiesgo.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data.evaluacionRiesgo).toBeCloseTo(10.02, 2);
    // Inputs preserved
    expect(createCall.data.riesgoId).toBe(2);
    expect(createCall.data.vulnerabilidadRiesgoId).toBe(3);
    expect(createCall.data.amenazaIds).toBe('[1]');

    // Should persist VA.evaluacionRiesgo as MAX
    expect(mockPrisma.valoracionActivo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evaluacionRiesgo: expect.any(Number),
          nivelRiesgo: expect.any(String),
        }),
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Activo catalog sync — populated from valuation asset names
// ──────────────────────────────────────────────────────────────────────────────
describe('create() / update() sync Activo catalog from nombreActivo', () => {
  let service: ValoracionesService;

  const baseDto: CreateValoracionDto = {
    nombreActivo: 'Nuevo Activo',
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
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ParametrosService, useValue: mockParametrosService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
  });

  it('should create Activo when nombreActivo is new', async () => {
    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);
    mockPrisma.activo.findUnique.mockResolvedValue(null);
    mockPrisma.activo.create.mockResolvedValue({
      id: 1,
      nombre: 'Nuevo Activo',
    });

    await service.create(baseDto);

    expect(mockPrisma.activo.findUnique).toHaveBeenCalledWith({
      where: { nombre: 'Nuevo Activo' },
    });
    expect(mockPrisma.activo.create).toHaveBeenCalledWith({
      data: { nombre: 'Nuevo Activo' },
    });
  });

  it('should not create Activo when nombreActivo already exists', async () => {
    mockPrisma.valoracionActivo.create.mockResolvedValue({
      id: 1,
      ...baseDto,
      tipoControl: null,
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
      controlesImplementar: null,
      nivelAmenazaControl: null,
      nivelVulnerabilidadControl: null,
      evaluacionRiesgoControl: null,
      nivelRiesgoControl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);
    mockPrisma.activo.findUnique.mockResolvedValue({
      id: 1,
      nombre: 'Nuevo Activo',
    });

    await service.create(baseDto);

    expect(mockPrisma.activo.create).not.toHaveBeenCalled();
  });

  it('should sync Activo when update changes nombreActivo', async () => {
    mockPrisma.valoracionActivo.findUnique.mockResolvedValue({
      id: 1,
      nombreActivo: 'Old Name',
      tipoActivoId: 1,
      formatoId: 1,
      macroProcesoId: 1,
      subProcesoId: 1,
      propietarioId: 1,
      custodioId: 1,
      descripcion: 'Test',
      controlSeguridad: 'Test',
      ubicacion: 'Test',
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
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.valoracionActivo.update.mockResolvedValue({
      id: 1,
      nombreActivo: 'Renamed Activo',
    });
    mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);
    mockPrisma.activo.findUnique.mockResolvedValue(null);
    mockPrisma.activo.create.mockResolvedValue({
      id: 2,
      nombre: 'Renamed Activo',
    });

    await service.update(1, { nombreActivo: 'Renamed Activo' });

    expect(mockPrisma.activo.create).toHaveBeenCalledWith({
      data: { nombre: 'Renamed Activo' },
    });
  });
});
