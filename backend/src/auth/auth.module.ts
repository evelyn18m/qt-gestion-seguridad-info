import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { LocalJwtStrategy } from './local-jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { AuthGuard } from './auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SyncInterceptor } from './sync.interceptor';
import { PrismaService } from '../prisma/prisma.service';

export const AUTH_GUARD = 'auth-guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'] || 'dev-fallback-secret',
      signOptions: { algorithm: 'HS256' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    LocalJwtStrategy,
    LocalStrategy,
    SyncInterceptor,
    AuthService,
    PrismaService,
    { provide: AUTH_GUARD, useClass: AuthGuard },
  ],
  exports: [PassportModule, AUTH_GUARD, AuthService],
})
export class AuthModule {}
