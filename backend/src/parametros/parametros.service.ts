import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateParametroDto } from './dto/update-parametro.dto';

@Injectable()
export class ParametrosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la configuración de umbrales de riesgo.
   * Si no existe, crea una fila con valores por defecto.
   */
  async getConfiguracion() {
    try {
      let config = await this.prisma.configuracionRiesgo.findFirst();
      if (!config) {
        config = await this.prisma.configuracionRiesgo.create({
          data: {
            riesgoBajoMax: 3,
            riesgoMedioMax: 9,
            riesgoAltoMax: 27,
            controlBajoMax: 3,
            controlMedioMax: 9,
            controlAltoMax: 27,
            residualAceptableMax: 3,
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
   */
  async updateConfiguracion(dto: UpdateParametroDto) {
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
