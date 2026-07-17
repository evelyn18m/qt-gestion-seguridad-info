import { Controller, Get, Put, Body } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { ParametrosService } from './parametros.service';
import { UpdateParametroDto } from './dto/update-parametro.dto';

@Controller('parametros')
export class ParametrosController {
  constructor(private readonly parametrosService: ParametrosService) {}

  @Get()
  getConfiguracion() {
    return this.parametrosService.getConfiguracion();
  }

  @Put()
  @Roles('administrador')
  updateConfiguracion(@Body() dto: UpdateParametroDto) {
    return this.parametrosService.updateConfiguracion(dto);
  }
}
