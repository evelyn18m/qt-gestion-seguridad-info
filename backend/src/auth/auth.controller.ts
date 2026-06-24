import {
  Controller,
  Post,
  UseGuards,
  Req,
  Body,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, LocalUser } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

class LoginDto {
  username: string;
  password: string;
}

class SetPasswordDto {
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @HttpCode(200)
  @Post('login')
  login(@Req() req: { user: LocalUser }) {
    return this.authService.generateToken(req.user);
  }

  @UseGuards(AuthGuard('jwt-local'))
  @Post('set-password')
  setPassword(
    @CurrentUser() user: { userId: string },
    @Body() body: SetPasswordDto,
  ) {
    return this.authService.setPassword(user.userId, body.password);
  }
}
