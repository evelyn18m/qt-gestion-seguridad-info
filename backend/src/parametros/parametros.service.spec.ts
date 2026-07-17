import { Test, TestingModule } from '@nestjs/testing';
import { ParametrosService } from './parametros.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

const mockConfigRow = {
  id: 1,
  riesgoBajoMax: 3,
  riesgoBajoDesde: 1,
  riesgoMedioMax: 9,
  riesgoMedioDesde: 4,
  riesgoAltoMax: 27,
  riesgoAltoDesde: 10,
  controlBajoMax: 3,
  controlBajoDesde: 1,
  controlMedioMax: 9,
  controlMedioDesde: 4,
  controlAltoMax: 27,
  controlAltoDesde: 10,
  residualAceptableMax: 3,
  residualAceptableDesde: 1,
  residualInaceptableDesde: 4,
  residualInaceptableMax: 27,
};

/** DTO with all 16 fields at valid defaults — reusable base */
const validDto = () => ({
  riesgoBajoMax: 3,
  riesgoBajoDesde: 1,
  riesgoMedioMax: 9,
  riesgoMedioDesde: 4,
  riesgoAltoMax: 27,
  riesgoAltoDesde: 10,
  controlBajoMax: 3,
  controlBajoDesde: 1,
  controlMedioMax: 9,
  controlMedioDesde: 4,
  controlAltoMax: 27,
  controlAltoDesde: 10,
  residualAceptableMax: 3,
  residualAceptableDesde: 1,
  residualInaceptableDesde: 4,
  residualInaceptableMax: 27,
});

const mockPrisma = {
  configuracionRiesgo: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('ParametrosService', () => {
  let service: ParametrosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParametrosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ParametrosService>(ParametrosService);
  });

  describe('getConfiguracion', () => {
    it('should return existing config when found', async () => {
      mockPrisma.configuracionRiesgo.findFirst.mockResolvedValue(mockConfigRow);

      const result = await service.getConfiguracion();

      expect(result).toEqual(mockConfigRow);
      expect(mockPrisma.configuracionRiesgo.create).not.toHaveBeenCalled();
    });

    it('should create defaults with all 16 fields when no config exists', async () => {
      mockPrisma.configuracionRiesgo.findFirst.mockResolvedValue(null);
      mockPrisma.configuracionRiesgo.create.mockResolvedValue(mockConfigRow);

      const result = await service.getConfiguracion();

      expect(result).toEqual(mockConfigRow);
      expect(mockPrisma.configuracionRiesgo.create).toHaveBeenCalledWith({
        data: {
          riesgoBajoMax: 3,
          riesgoBajoDesde: 1,
          riesgoMedioMax: 9,
          riesgoMedioDesde: 4,
          riesgoAltoMax: 27,
          riesgoAltoDesde: 10,
          controlBajoMax: 3,
          controlBajoDesde: 1,
          controlMedioMax: 9,
          controlMedioDesde: 4,
          controlAltoMax: 27,
          controlAltoDesde: 10,
          residualAceptableMax: 3,
          residualAceptableDesde: 1,
          residualInaceptableDesde: 4,
          residualInaceptableMax: 27,
        },
      });
    });
  });

  describe('updateConfiguracion — existing ascending Max chain validation (preserved)', () => {
    it('should reject riesgoBajoMax=10 ≥ riesgoMedioMax=8 with BadRequestException', async () => {
      const dto = { ...validDto(), riesgoBajoMax: 10, riesgoMedioMax: 8 };

      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject riesgoMedioMax=5 ≥ riesgoAltoMax=5 (equal) with BadRequestException', async () => {
      const dto = { ...validDto(), riesgoMedioMax: 5, riesgoAltoMax: 5 };

      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject controlBajoMax=10 ≥ controlMedioMax=5 with BadRequestException', async () => {
      const dto = { ...validDto(), controlBajoMax: 10, controlMedioMax: 5 };

      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Per-range validation: desde < max for each of 7 ranges ───

  describe('updateConfiguracion — per-range desde ≥ max (RED)', () => {
    it('RED: should reject riesgoBajoDesde=5 ≥ riesgoBajoMax=3', async () => {
      const dto = { ...validDto(), riesgoBajoDesde: 5, riesgoBajoMax: 3 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject riesgoMedioDesde=10 ≥ riesgoMedioMax=9', async () => {
      const dto = { ...validDto(), riesgoMedioDesde: 10, riesgoMedioMax: 9 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject riesgoAltoDesde=30 ≥ riesgoAltoMax=27', async () => {
      const dto = { ...validDto(), riesgoAltoDesde: 30, riesgoAltoMax: 27 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject controlBajoDesde=5 ≥ controlBajoMax=3', async () => {
      const dto = { ...validDto(), controlBajoDesde: 5, controlBajoMax: 3 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject controlMedioDesde=10 ≥ controlMedioMax=9', async () => {
      const dto = { ...validDto(), controlMedioDesde: 10, controlMedioMax: 9 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject controlAltoDesde=30 ≥ controlAltoMax=27', async () => {
      const dto = { ...validDto(), controlAltoDesde: 30, controlAltoMax: 27 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject residualAceptableDesde=5 ≥ residualAceptableMax=3', async () => {
      const dto = {
        ...validDto(),
        residualAceptableDesde: 5,
        residualAceptableMax: 3,
      };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Cross-range validation: maxN ≥ desdeN+1 for each gap ───

  describe('updateConfiguracion — cross-range overlap (RED)', () => {
    it('RED: should reject riesgoBajoMax=8 ≥ riesgoMedioDesde=5 (overlap)', async () => {
      const dto = { ...validDto(), riesgoBajoMax: 8, riesgoMedioDesde: 5 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject riesgoMedioMax=15 ≥ riesgoAltoDesde=10 (overlap)', async () => {
      const dto = { ...validDto(), riesgoMedioMax: 15, riesgoAltoDesde: 10 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject controlBajoMax=8 ≥ controlMedioDesde=5 (overlap)', async () => {
      const dto = { ...validDto(), controlBajoMax: 8, controlMedioDesde: 5 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject controlMedioMax=15 ≥ controlAltoDesde=10 (overlap)', async () => {
      const dto = { ...validDto(), controlMedioMax: 15, controlAltoDesde: 10 };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject residualAceptableMax=8 ≥ residualInaceptableDesde=5 (overlap)', async () => {
      const dto = {
        ...validDto(),
        residualAceptableMax: 8,
        residualInaceptableDesde: 5,
      };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('RED: should reject residualInaceptableDesde=30 ≥ residualInaceptableMax=27 (Inaceptable overlap)', async () => {
      const dto = {
        ...validDto(),
        residualInaceptableDesde: 30,
        residualInaceptableMax: 27,
      };
      await expect(service.updateConfiguracion(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Valid full-config acceptance ───

  describe('updateConfiguracion — valid 16-field config', () => {
    it('RED: should accept valid 16-field config and persist all values', async () => {
      mockPrisma.configuracionRiesgo.findFirst.mockResolvedValue(mockConfigRow);
      const updated = {
        ...mockConfigRow,
        riesgoBajoMax: 3,
        riesgoBajoDesde: 1,
        riesgoMedioMax: 9,
        riesgoMedioDesde: 4,
        riesgoAltoMax: 27,
        riesgoAltoDesde: 10,
        controlBajoMax: 3,
        controlBajoDesde: 1,
        controlMedioMax: 9,
        controlMedioDesde: 4,
        controlAltoMax: 27,
        controlAltoDesde: 10,
        residualAceptableMax: 3,
        residualAceptableDesde: 1,
        residualInaceptableDesde: 4,
        residualInaceptableMax: 27,
      };
      mockPrisma.configuracionRiesgo.update.mockResolvedValue(updated);

      const dto = validDto();
      const result = await service.updateConfiguracion(dto);

      expect(result.riesgoBajoMax).toBe(3);
      expect(result.riesgoBajoDesde).toBe(1);
      expect(result.riesgoMedioMax).toBe(9);
      expect(result.riesgoMedioDesde).toBe(4);
      expect(result.riesgoAltoMax).toBe(27);
      expect(result.riesgoAltoDesde).toBe(10);
      expect(result.controlBajoMax).toBe(3);
      expect(result.controlBajoDesde).toBe(1);
      expect(result.controlMedioMax).toBe(9);
      expect(result.controlMedioDesde).toBe(4);
      expect(result.controlAltoMax).toBe(27);
      expect(result.controlAltoDesde).toBe(10);
      expect(result.residualAceptableMax).toBe(3);
      expect(result.residualAceptableDesde).toBe(1);
      expect(result.residualInaceptableDesde).toBe(4);
      expect(result.residualInaceptableMax).toBe(27);
    });
  });
});
