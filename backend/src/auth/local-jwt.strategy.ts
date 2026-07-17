import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface LocalJwtPayload {
  sub: string;
  username?: string;
  email?: string;
  roles?: string[];
  source: string;
}

@Injectable()
export class LocalJwtStrategy extends PassportStrategy(Strategy, 'jwt-local') {
  constructor() {
    const secret = process.env['JWT_SECRET'] || 'dev-fallback-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: LocalJwtPayload) {
    return {
      userId: payload.sub,
      username: payload.username ?? '',
      email: payload.email ?? '',
      roles: payload.roles ?? [],
      source: 'local' as const,
    };
  }
}
