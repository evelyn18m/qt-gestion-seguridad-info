import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

class SetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

class BootstrapDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsEmail()
  email: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateLocalUser(
      body.username,
      body.password,
    );
    return this.authService.generateToken(user);
  }

  @Public()
  @HttpCode(201)
  @Post('bootstrap')
  async bootstrap(@Body() body: BootstrapDto) {
    const user = await this.authService.bootstrapFirstUser(body);
    return this.authService.generateToken(user);
  }

  @Post('set-password')
  @Roles('administrador')
  setPassword(
    @CurrentUser() user: { userId: string },
    @Body() body: SetPasswordDto,
  ) {
    return this.authService.setPassword(user.userId, body.password);
  }
}
