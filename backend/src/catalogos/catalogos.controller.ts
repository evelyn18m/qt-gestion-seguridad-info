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
import { CatalogosService } from './catalogos.service';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';

@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  getTipos() {
    return this.catalogosService.getTipos();
  }

  @Get(':tipo')
  findAll(@Param('tipo') tipo: string) {
    return this.catalogosService.findAll(tipo);
  }

  @Get(':tipo/:id')
  findOne(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.findOne(tipo, id);
  }

  @Post(':tipo')
  create(@Param('tipo') tipo: string, @Body() dto: CreateCatalogoDto) {
    return this.catalogosService.create(tipo, dto);
  }

  @Patch(':tipo/:id')
  update(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogoDto,
  ) {
    return this.catalogosService.update(tipo, id, dto);
  }

  @Delete(':tipo/:id')
  remove(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.remove(tipo, id);
  }
}
