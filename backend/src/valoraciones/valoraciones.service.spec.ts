import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ValoracionesService } from './valoraciones.service';
import { PrismaService } from '../prisma/prisma.service';

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
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ValoracionesService — transaction + Tab 4 Payload', () => {
  let service: ValoracionesService;
  let prisma: typeof mockPrisma;

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
    impacto: 2.5,
    probabilidadId: null,
    amenazaRiesgoId: null,
    vulnerabilidadRiesgoId: null,
    controlesArea: null,
    evaluacionRiesgo: null,
    nivelRiesgo: null,
    metodoTratamiento: 'Test method',
    tipoControl: 1,
    controlesImplementar: 'Test controls',
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
    tipoControl: { id: 1, nombre: 'Preventivo' },
    detallesRiesgo: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoracionesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ValoracionesService>(ValoracionesService);
    prisma = mockPrisma;
  });

  // ──────────────────────────────────────────────────────────────
  // Bug 4 — Transaction wrapper: deleteMany+createMany must be atomic
  // ──────────────────────────────────────────────────────────────

  describe('RED: update() with detallesRiesgo uses $transaction', () => {
    it('GREEN: should call $transaction with deleteMany + createMany when detallesRiesgo provided', async () => {
      // findOne is called first to verify record exists
      mockPrisma.valoracionActivo.findUnique
        .mockResolvedValueOnce(mockItem) // first call in update() → findOne
        .mockResolvedValueOnce(mockEnriched); // second call in enrich()

      mockPrisma.valoracionActivo.update.mockResolvedValue(mockItem);

      // Simulate $transaction returning an array of results (one per operation)
      // Operations run lazily inside $transaction, so results are returned as array
      const txResults = [{ count: 1 }, { count: 1 }];
      mockPrisma.$transaction = jest.fn().mockResolvedValue(txResults);

      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto = {
        nombreActivo: 'Updated Activo',
        detallesRiesgo: [
          {
            tipo: 'amenaza',
            catalogoId: 1,
            riesgoId: 1,
            evaluacionRiesgo: 2.5,
            nivelRiesgo: 'Medio',
          },
        ],
      };

      await service.update(1, dto);

      // Verify $transaction was called (not two separate await calls)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      const txCallArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(txCallArgs)).toBe(true);
      expect(txCallArgs.length).toBe(2); // deleteMany + createMany
    });

    it('REFACTOR: should not call $transaction when detallesRiesgo is empty array', async () => {
      mockPrisma.valoracionActivo.findUnique
        .mockResolvedValueOnce(mockItem)
        .mockResolvedValueOnce(mockEnriched);

      mockPrisma.valoracionActivo.update.mockResolvedValue(mockItem);

      mockPrisma.$transaction = jest.fn().mockResolvedValue([{ count: 0 }]);

      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto = { nombreActivo: 'Updated Activo', detallesRiesgo: [] };

      await service.update(1, dto);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('RED: update() rollback on createMany failure', () => {
    it('GREEN: $transaction should rollback deleteMany if createMany fails', async () => {
      mockPrisma.valoracionActivo.findUnique
        .mockResolvedValueOnce(mockItem)
        .mockResolvedValueOnce(mockEnriched);

      mockPrisma.valoracionActivo.update.mockResolvedValue(mockItem);

      // Simulate $transaction behavior: if any op fails, all are rolled back
      const txMock = jest
        .fn()
        .mockRejectedValue(new Error('createMany failed — DB error'));
      mockPrisma.$transaction = txMock;

      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto = {
        nombreActivo: 'Updated Activo',
        detallesRiesgo: [
          {
            tipo: 'amenaza',
            catalogoId: 1,
            riesgoId: 1,
            evaluacionRiesgo: 2.5,
            nivelRiesgo: 'Medio',
          },
        ],
      };

      await expect(service.update(1, dto)).rejects.toThrow('createMany failed');

      // Transaction was called (rollback behavior is Prisma's responsibility)
      expect(txMock).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Bug 2 — Tab 4 payload: tratamientoForm fields must be accepted
  // ──────────────────────────────────────────────────────────────

  describe('RED: Tab 4 fields accepted in create payload', () => {
    it('GREEN: create() should accept top-level Tab 4 fields from tratamientoForm', async () => {
      mockPrisma.valoracionActivo.create.mockResolvedValue(mockItem);
      mockPrisma.detalleRiesgo.createMany.mockResolvedValue({ count: 0 });
      mockPrisma.tipoActivo.findUnique.mockResolvedValue(
        mockEnriched.tipoActivo,
      );
      mockPrisma.formato.findUnique.mockResolvedValue(mockEnriched.formato);
      mockPrisma.macroProceso.findUnique.mockResolvedValue(
        mockEnriched.macroProceso,
      );
      mockPrisma.subproceso.findUnique.mockResolvedValue(
        mockEnriched.subProceso,
      );
      mockPrisma.area.findUnique.mockResolvedValue(mockEnriched.propietario);
      mockPrisma.funcionario.findUnique.mockResolvedValue(
        mockEnriched.custodio,
      );
      mockPrisma.impacto.findUnique.mockResolvedValue(
        mockEnriched.confidencialidad,
      ); // called 3x for CIA
      mockPrisma.tipoControl.findUnique.mockResolvedValue(
        mockEnriched.tipoControl,
      );
      mockPrisma.detalleRiesgo.findMany.mockResolvedValue([]);

      const dto = {
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
        // Tab 4 top-level fields (from tratamientoForm.value)
        metodoTratamiento: 'Mitigar',
        tipoControl: 1,
        controlesImplementar: 'Nuevos controles',
      };

      const result = await service.create(dto);

      // create() was called with the full dto (including Tab 4 fields passed through as data)
      expect(mockPrisma.valoracionActivo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metodoTratamiento: 'Mitigar',
            tipoControl: 1,
            controlesImplementar: 'Nuevos controles',
          }),
        }),
      );
      expect(result).toBeTruthy();
    });
  });
});
