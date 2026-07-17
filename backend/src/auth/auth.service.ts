import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
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
    primerInicio: boolean;
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
        primerInicio: user.primerInicio ?? false,
      },
    };
  }

  async validateLocalUser(
    username: string,
    password: string,
  ): Promise<LocalUser> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { username },
    });

    if (!usuario || !usuario.habilitado || !usuario.passwordHash) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(password, usuario.passwordHash);
    if (!valid) {
      throw new UnauthorizedException();
    }

    const roles: string[] = JSON.parse(usuario.roles) as string[];

    return {
      userId: usuario.id,
      username: usuario.username,
      email: usuario.email,
      roles,
      source: 'local',
      primerInicio: usuario.primerInicio,
    };
  }

  async bootstrapFirstUser(body: {
    username: string;
    password: string;
    email: string;
  }): Promise<LocalUser> {
    const count = await this.prisma.usuario.count();
    if (count > 0) {
      throw new BadRequestException(
        'Bootstrap is only allowed on empty user table',
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const roles = JSON.stringify(['administrador']);

    const usuario = await this.prisma.usuario.create({
      data: {
        username: body.username,
        email: body.email,
        passwordHash,
        roles,
        primerInicio: false,
        habilitado: true,
      },
    });

    return {
      userId: usuario.id,
      username: usuario.username,
      email: usuario.email,
      roles: ['administrador'],
      source: 'local',
      primerInicio: false,
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
