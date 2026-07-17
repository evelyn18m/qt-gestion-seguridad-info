import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanTratamientoService } from './plan-tratamiento.service';
import { CreatePlanTratamientoDto } from './dto/create-plan-tratamiento.dto';
import { UpdatePlanTratamientoDto } from './dto/update-plan-tratamiento.dto';

@Controller('plan-tratamiento')
export class PlanTratamientoController {
  constructor(
    private readonly planTratamientoService: PlanTratamientoService,
  ) {}

  @Get()
  findAll() {
    return this.planTratamientoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.planTratamientoService.findOne(id);
  }

  @Post()
  @Roles('administrador')
  create(@Body() dto: CreatePlanTratamientoDto) {
    return this.planTratamientoService.create(dto);
  }

  @Patch(':id')
  @Roles('administrador')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanTratamientoDto,
  ) {
    return this.planTratamientoService.update(id, dto);
  }

  @Delete(':id')
  @Roles('administrador')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.planTratamientoService.remove(id);
  }
}
