import { Module } from '@nestjs/common';
import { ValoracionesService } from './valoraciones.service';
import { ValoracionesController } from './valoraciones.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ParametrosModule } from '../parametros/parametros.module';

@Module({
  imports: [ParametrosModule],
  controllers: [ValoracionesController],
  providers: [ValoracionesService, PrismaService],
})
export class ValoracionesModule {}
