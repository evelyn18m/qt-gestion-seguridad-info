import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateParametroDto } from './dto/update-parametro.dto';

@Injectable()
export class ParametrosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la configuración de umbrales de riesgo.
   * Si no existe, crea una fila con valores por defecto (16 campos).
   */
  async getConfiguracion() {
    try {
      let config = await this.prisma.configuracionRiesgo.findFirst();
      if (!config) {
        config = await this.prisma.configuracionRiesgo.create({
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
      }
      return config;
    } catch (error) {
      throw new HttpException(
        'Error al obtener configuración de riesgos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Actualiza los umbrales de riesgo.
   * Valida:
   *   (a) Max chain: bajoMax < medioMax < altoMax (riesgo y control) — preserved
   *   (b) Per-range: desde < max for each of the 7 ranges
   *   (c) Cross-range: maxN < desdeN+1 (no overlap; gaps allowed)
   */
  async updateConfiguracion(dto: UpdateParametroDto) {
    // (a) Max chain validation — preserved from original
    if (dto.riesgoBajoMax >= dto.riesgoMedioMax) {
      throw new BadRequestException(
        'riesgoBajoMax debe ser menor que riesgoMedioMax',
      );
    }
    if (dto.riesgoMedioMax >= dto.riesgoAltoMax) {
      throw new BadRequestException(
        'riesgoMedioMax debe ser menor que riesgoAltoMax',
      );
    }
    if (dto.controlBajoMax >= dto.controlMedioMax) {
      throw new BadRequestException(
        'controlBajoMax debe ser menor que controlMedioMax',
      );
    }
    if (dto.controlMedioMax >= dto.controlAltoMax) {
      throw new BadRequestException(
        'controlMedioMax debe ser menor que controlAltoMax',
      );
    }

    // (b) Per-range: desde < max for each of 7 ranges
    if (dto.riesgoBajoDesde >= dto.riesgoBajoMax) {
      throw new BadRequestException(
        'riesgoBajoDesde debe ser menor que riesgoBajoMax',
      );
    }
    if (dto.riesgoMedioDesde >= dto.riesgoMedioMax) {
      throw new BadRequestException(
        'riesgoMedioDesde debe ser menor que riesgoMedioMax',
      );
    }
    if (dto.riesgoAltoDesde >= dto.riesgoAltoMax) {
      throw new BadRequestException(
        'riesgoAltoDesde debe ser menor que riesgoAltoMax',
      );
    }
    if (dto.controlBajoDesde >= dto.controlBajoMax) {
      throw new BadRequestException(
        'controlBajoDesde debe ser menor que controlBajoMax',
      );
    }
    if (dto.controlMedioDesde >= dto.controlMedioMax) {
      throw new BadRequestException(
        'controlMedioDesde debe ser menor que controlMedioMax',
      );
    }
    if (dto.controlAltoDesde >= dto.controlAltoMax) {
      throw new BadRequestException(
        'controlAltoDesde debe ser menor que controlAltoMax',
      );
    }
    if (dto.residualAceptableDesde >= dto.residualAceptableMax) {
      throw new BadRequestException(
        'residualAceptableDesde debe ser menor que residualAceptableMax',
      );
    }

    // (c) Cross-range: maxN < desdeN+1 — no overlap between adjacent ranges
    if (dto.riesgoBajoMax >= dto.riesgoMedioDesde) {
      throw new BadRequestException(
        'riesgoBajoMax debe ser menor que riesgoMedioDesde (sin solapamiento)',
      );
    }
    if (dto.riesgoMedioMax >= dto.riesgoAltoDesde) {
      throw new BadRequestException(
        'riesgoMedioMax debe ser menor que riesgoAltoDesde (sin solapamiento)',
      );
    }
    if (dto.controlBajoMax >= dto.controlMedioDesde) {
      throw new BadRequestException(
        'controlBajoMax debe ser menor que controlMedioDesde (sin solapamiento)',
      );
    }
    if (dto.controlMedioMax >= dto.controlAltoDesde) {
      throw new BadRequestException(
        'controlMedioMax debe ser menor que controlAltoDesde (sin solapamiento)',
      );
    }
    if (dto.residualAceptableMax >= dto.residualInaceptableDesde) {
      throw new BadRequestException(
        'residualAceptableMax debe ser menor que residualInaceptableDesde (sin solapamiento)',
      );
    }
    if (dto.residualInaceptableDesde >= dto.residualInaceptableMax) {
      throw new BadRequestException(
        'residualInaceptableDesde debe ser menor que residualInaceptableMax',
      );
    }

    try {
      const config = await this.prisma.configuracionRiesgo.findFirst();
      if (!config) {
        return this.prisma.configuracionRiesgo.create({ data: dto });
      }
      return this.prisma.configuracionRiesgo.update({
        where: { id: config.id },
        data: dto,
      });
    } catch (error) {
      throw new HttpException(
        'Error al actualizar configuración de riesgos',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
