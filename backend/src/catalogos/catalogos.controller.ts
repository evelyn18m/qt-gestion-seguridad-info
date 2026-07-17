import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
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

  @Get('controles-implementar')
  findAllControlesImplementar() {
    return this.catalogosService.findAllControlesImplementar();
  }

  // ─── Dedicated write routes for controles-implementar ───────────────────────
  // MUST be declared before the @Post(':tipo'), @Patch(':tipo/:id'),
  // and @Delete(':tipo/:id') wildcard routes so they shadow them.

  @Post('controles-implementar')
  @Roles('administrador')
  createControlesImplementar(@Body() dto: CreateCatalogoDto) {
    return this.catalogosService.createControlesImplementar(dto);
  }

  @Patch('controles-implementar/:id')
  @Roles('administrador')
  updateControlesImplementar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogoDto,
  ) {
    return this.catalogosService.updateControlesImplementar(id, dto);
  }

  @Delete('controles-implementar/:id')
  @Roles('administrador')
  removeControlesImplementar(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.removeControlesImplementar(id);
  }

  // ─── Generic wildcard routes ──────────────────────────────────────────────

  @Get(':tipo')
  findAll(@Param('tipo') tipo: string) {
    return this.catalogosService.findAll(tipo);
  }

  @Get(':tipo/:id')
  findOne(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.findOne(tipo, id);
  }

  @Post(':tipo')
  @Roles('administrador')
  create(@Param('tipo') tipo: string, @Body() dto: CreateCatalogoDto) {
    return this.catalogosService.create(tipo, dto);
  }

  @Patch(':tipo/:id')
  @Roles('administrador')
  update(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogoDto,
  ) {
    return this.catalogosService.update(tipo, id, dto);
  }

  @Delete(':tipo/:id')
  @Roles('administrador')
  remove(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.remove(tipo, id);
  }
}
