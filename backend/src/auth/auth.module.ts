import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthGuard } from './auth.guard';

export const AUTH_GUARD = 'auth-guard';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, { provide: AUTH_GUARD, useClass: AuthGuard }],
  exports: [PassportModule, AUTH_GUARD],
})
export class AuthModule {}
