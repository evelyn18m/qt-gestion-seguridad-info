import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      const error = Object.assign(new Error('Unauthorized'), {
        statusCode: 401,
      });
      throw error;
    }
    return user;
  }
}
