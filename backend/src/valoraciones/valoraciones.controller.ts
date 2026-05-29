import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ValoracionesService } from './valoraciones.service';
import { CreateValoracionDto } from './dto/create-valoracion.dto';
import { UpdateValoracionDto } from './dto/update-valoracion.dto';
import { CalcularDetalleDto } from './dto/calcular-detalle.dto';

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
  create(@Body() dto: CreateValoracionDto) {
    return this.valoracionesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateValoracionDto,
  ) {
    return this.valoracionesService.update(id, dto);
  }

  @Patch(':id/detalles-riesgo/:detalleId/calcular')
  calcularDetalleRiesgo(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detalleId: number,
    @Body() dto: CalcularDetalleDto,
  ) {
    return this.valoracionesService.calcularDetalleRiesgo(id, detalleId, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.valoracionesService.remove(id);
  }
}
