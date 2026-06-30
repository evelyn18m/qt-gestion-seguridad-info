import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const usuarioSelect = {
  id: true,
  keycloakSub: true,
  username: true,
  email: true,
  primerInicio: true,
  habilitado: true,
  roles: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: false,
} as const;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.usuario.findMany({
      select: usuarioSelect,
    });
  }

  async findOne(id: string) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: usuarioSelect,
    });
  }

  async create(dto: CreateUsuarioDto) {
    const password = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        username: dto.username,
        email: dto.email,
        roles: '[]',
        passwordHash,
        primerInicio: true,
      },
      select: usuarioSelect,
    });

    return { usuario, contraseñaGenerada: password };
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    const existing = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const data: Record<string, unknown> = {};
    if (dto.email !== undefined) data['email'] = dto.email;
    if (dto.habilitado !== undefined) data['habilitado'] = dto.habilitado;
    if (dto.roles !== undefined) data['roles'] = JSON.stringify(dto.roles);

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: usuarioSelect,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.usuario.delete({
      where: { id },
    });
  }
}
