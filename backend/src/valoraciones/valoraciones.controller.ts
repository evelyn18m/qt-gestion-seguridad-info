import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ValoracionesService } from './valoraciones.service';
import { CreateValoracionDto } from './dto/create-valoracion.dto';
import { UpdateValoracionDto } from './dto/update-valoracion.dto';
import { CalcularDetalleDto } from './dto/calcular-detalle.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('valoraciones')
export class ValoracionesController {
  constructor(private readonly valoracionesService: ValoracionesService) {}

  @Get()
  findAll() {
    return this.valoracionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.valoracionesService.findOne(id);
  }

  @Post()
  @Roles('administrador')
  create(
    @Body() dto: CreateValoracionDto,
    @CurrentUser() user: { userId: string; username: string } | null,
    @Req() req: Request,
  ) {
    return this.valoracionesService.create(dto, user, req as any);
  }

  @Patch(':id')
  @Roles('administrador')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateValoracionDto,
    @CurrentUser() user: { userId: string; username: string } | null,
    @Req() req: Request,
  ) {
    return this.valoracionesService.update(id, dto, user, req as any);
  }

  @Patch(':id/detalles-riesgo/:detalleId/calcular')
  @Roles('administrador')
  calcularDetalleRiesgo(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: CalcularDetalleDto,
  ) {
    return this.valoracionesService.calcularDetalleRiesgo(id, detalleId, dto);
  }

  @Delete(':id')
  @Roles('administrador')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.valoracionesService.remove(id);
  }

  @Post(':id/recalcular')
  @Roles('administrador')
  recalcular(@Param('id', ParseIntPipe) id: number) {
    return this.valoracionesService.recalcular(id);
  }
}
