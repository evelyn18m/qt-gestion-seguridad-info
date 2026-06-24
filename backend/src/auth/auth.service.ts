import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface LoginResult {
  access_token: string;
  usuario: {
    id: string;
    username: string;
    email: string;
    roles: string[];
  };
}

export interface LocalUser {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  source: 'local';
  primerInicio?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  generateToken(user: LocalUser): LoginResult {
    const payload = {
      sub: user.userId,
      username: user.username,
      email: user.email,
      roles: user.roles,
      source: 'local',
    };

    const access_token = this.jwtService.sign(payload, {
      algorithm: 'HS256',
    });

    return {
      access_token,
      usuario: {
        id: user.userId,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  async setPassword(userId: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (!usuario.primerInicio) {
      throw new BadRequestException('La contraseña ya fue configurada');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        passwordHash,
        primerInicio: false,
      },
    });

    return { message: 'Contraseña configurada' };
  }
}
