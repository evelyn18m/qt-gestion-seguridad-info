import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly prisma: PrismaService) {
    super({ usernameField: 'username', passwordField: 'password' });
  }

  async validate(username: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { username },
    });

    if (!usuario) {
      throw new UnauthorizedException();
    }

    if (!usuario.habilitado) {
      throw new UnauthorizedException();
    }

    if (!usuario.passwordHash) {
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
      source: 'local' as const,
      primerInicio: usuario.primerInicio,
    };
  }
}
