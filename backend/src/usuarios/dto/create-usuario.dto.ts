import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const ALLOWED_ROLES = ['administradoregsi', 'usuarioegsi'];

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString({ each: true })
  @IsIn(ALLOWED_ROLES, {
    each: true,
    message: 'roles must be one of: administradoregsi, usuarioegsi',
  })
  roles?: string[];
}
