import { Module } from '@nestjs/common';
import { PlanTratamientoService } from './plan-tratamiento.service';
import { PlanTratamientoController } from './plan-tratamiento.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PlanTratamientoController],
  providers: [PlanTratamientoService, PrismaService],
})
export class PlanTratamientoModule {}
