import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { KeycloakAdminService } from '../keycloak/keycloak-admin.service';
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
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloak: KeycloakAdminService,
  ) {}

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
        roles: dto.roles ? JSON.stringify(dto.roles) : '[]',
        passwordHash,
        primerInicio: true,
      },
      select: usuarioSelect,
    });

    // Best-effort Keycloak sync
    try {
      const kcUserId = await this.keycloak.createUser({
        username: dto.username,
        email: dto.email,
        enabled: true,
        credentials: [
          { type: 'password', value: password, temporary: false },
        ],
      });

      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { keycloakSub: kcUserId },
      });

      if (dto.roles && dto.roles.length > 0) {
        await this.keycloak.assignClientRoles(kcUserId, dto.roles);
      }
    } catch (error) {
      this.logger.warn(
        `Keycloak sync failed on create for user "${dto.username}": ${String(error)}`,
      );
    }

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

    const updated = await this.prisma.usuario.update({
      where: { id },
      data,
      select: usuarioSelect,
    });

    // Best-effort Keycloak sync (only if keycloakSub exists)
    if (existing.keycloakSub) {
      try {
        await this.keycloak.updateUser(existing.keycloakSub, {
          email: dto.email,
          enabled: dto.habilitado,
        });

        if (dto.roles !== undefined) {
          await this.keycloak.assignClientRoles(
            existing.keycloakSub,
            dto.roles,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Keycloak sync failed on update for user "${existing.username}": ${String(error)}`,
        );
      }
    }

    return updated;
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

    // Best-effort Keycloak delete (only if keycloakSub exists)
    if (existing.keycloakSub) {
      try {
        await this.keycloak.deleteUser(existing.keycloakSub);
      } catch (error) {
        this.logger.warn(
          `Keycloak sync failed on delete for user "${existing.username}": ${String(error)}`,
        );
      }
    }
  }
}
