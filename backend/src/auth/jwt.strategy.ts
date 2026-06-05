import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { extractJwtPayload, JwtPayload } from './jwt.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    const jwksUri = process.env['KEYCLOAK_JWKS_URI'];

    if (!jwksUri) {
      throw new Error('KEYCLOAK_JWKS_URI environment variable is not set');
    }

    // passportJwtSecret is called at construction time — this is unavoidable with passport-jwt
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        jwksUri,
        cache: true,
        cacheMaxAge: 600,
      }),
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: JwtPayload) {
    return extractJwtPayload(payload);
  }
}
