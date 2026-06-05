import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';

const TIPO_MAP: Record<string, string> = {
  amenazas: 'amenaza',
  vulnerabilidades: 'vulnerabilidad',
  impactos: 'impacto',
  formatos: 'formato',
  subprocesos: 'subproceso',
  macroprocesos: 'macroProceso',
  'tipos-activo': 'tipoActivo',
  valoraciones: 'valoracion',
  funcionarios: 'funcionario',
  areas: 'area',
  'tipos-control': 'tipoControl',
  riesgos: 'riesgo',
  probabilidades: 'probabilidad',
  'categorias-controles-implementar': 'categoriaControlesImplementar',
  'controles-implementar': 'controlesImplementar',
};

const FIELD_MAP: Record<string, readonly string[]> = {
  amenaza: ['categoria', 'nombre', 'tipoFuente'],
  vulnerabilidad: ['categoria', 'descripcion'],
  impacto: ['tipo', 'nivel', 'valor', 'criterio'],
  formato: ['nombre'],
  subproceso: ['nombre', 'macroProcesoId'],
  macroProceso: ['nombre', 'codigo'],
  tipoActivo: ['nombre', 'detalle'],
  valoracion: ['nombre'],
  funcionario: ['nombre'],
  area: ['nombre'],
  tipoControl: ['nombre'],
  riesgo: ['tipo', 'nivel', 'valor'],
  probabilidad: ['nombre'],
  categoriaControlesImplementar: ['nombre'],
  controlesImplementar: ['seccion', 'descripcion', 'categoriaId'],
};

@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tipo: string) {
    const model = TIPO_MAP[tipo];
    if (!model) throw new BadRequestException(`Tipo inválido: ${tipo}`);
    return (
      this.delegate(model) as {
        findMany: (args: {
          orderBy: Record<string, string>;
        }) => Promise<unknown[]>;
      }
    ).findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(tipo: string, id: number) {
    const model = TIPO_MAP[tipo];
    if (!model) throw new BadRequestException(`Tipo inválido: ${tipo}`);
    const delegate = this.delegate(model) as {
      findUnique: (args: { where: { id: number } }) => Promise<unknown>;
    };
    const item = await delegate.findUnique({ where: { id } });
    if (!item)
      throw new NotFoundException(`${model} con id ${id} no encontrado`);
    return item;
  }

  create(tipo: string, dto: CreateCatalogoDto) {
    const model = TIPO_MAP[tipo];
    if (!model) throw new BadRequestException(`Tipo inválido: ${tipo}`);
    const fields = FIELD_MAP[model];
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const val = (dto as Record<string, unknown>)[field];
      if (val !== undefined) data[field] = val;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        `No se proporcionaron campos válidos para ${model}. Campos: ${fields.join(', ')}`,
      );
    }
    return (
      this.delegate(model) as {
        create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      }
    ).create({ data });
  }

  async update(tipo: string, id: number, dto: UpdateCatalogoDto) {
    const model = TIPO_MAP[tipo];
    if (!model) throw new BadRequestException(`Tipo inválido: ${tipo}`);
    await this.findOne(tipo, id);
    const fields = FIELD_MAP[model];
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const val = (dto as Record<string, unknown>)[field];
      if (val !== undefined) data[field] = val;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        `No se proporcionaron campos válidos para actualizar ${model}`,
      );
    }
    return (
      this.delegate(model) as {
        update: (args: {
          where: { id: number };
          data: Record<string, unknown>;
        }) => Promise<unknown>;
      }
    ).update({ where: { id }, data });
  }

  async remove(tipo: string, id: number) {
    const model = TIPO_MAP[tipo];
    if (!model) throw new BadRequestException(`Tipo inválido: ${tipo}`);
    await this.findOne(tipo, id);
    try {
      return await (
        this.delegate(model) as {
          delete: (args: { where: { id: number } }) => Promise<unknown>;
        }
      ).delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2003') throw new ConflictException('Cannot delete: item has linked records');
      if (e?.code === 'P2002') throw new ConflictException('Cannot create: duplicate record');
      throw e;
    }
  }

  getTipos() {
    return Object.keys(TIPO_MAP).map((key) => ({
      tipo: key,
      modelo: TIPO_MAP[key],
    }));
  }

  findAllControlesImplementar() {
    return this.prisma.controlesImplementar.findMany({
      include: { categoria: true },
      orderBy: { categoriaId: 'asc' },
    });
  }

  async createControlesImplementar(dto: CreateCatalogoDto) {
    try {
      return await this.prisma.controlesImplementar.create({
        data: {
          seccion: dto.seccion as string,
          descripcion: dto.descripcion as string,
          categoriaId: dto.categoriaId as number,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('La sección ya existe');
      if (e?.code === 'P2003') throw new ConflictException('Cannot delete: item has linked records');
      throw e;
    }
  }

  async updateControlesImplementar(id: number, dto: UpdateCatalogoDto) {
    try {
      const data: { seccion?: string; descripcion?: string; categoriaId?: number } = {};
      if (dto.seccion !== undefined) data.seccion = dto.seccion;
      if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
      if (dto.categoriaId !== undefined) data.categoriaId = dto.categoriaId;
      return await this.prisma.controlesImplementar.update({
        where: { id },
        data,
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('La sección ya existe');
      if (e?.code === 'P2003') throw new ConflictException('Cannot delete: item has linked records');
      throw e;
    }
  }

  async removeControlesImplementar(id: number) {
    try {
      return await this.prisma.controlesImplementar.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('La sección ya existe');
      if (e?.code === 'P2003') throw new ConflictException('Cannot delete: item has linked records');
      throw e;
    }
  }

  private delegate(model: string) {
    const key = (model.charAt(0).toLowerCase() +
      model.slice(1)) as keyof typeof this.prisma;
    return this.prisma[key] as never;
  }
}
