import { Module } from '@nestjs/common';
import { ParametrosController } from './parametros.controller';
import { ParametrosService } from './parametros.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ParametrosController],
  providers: [ParametrosService, PrismaService],
  exports: [ParametrosService],
})
export class ParametrosModule {}
