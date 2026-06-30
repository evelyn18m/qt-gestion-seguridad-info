import { IsBoolean, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

const ALLOWED_ROLES = ['administradoregsi', 'usuarioegsi'];

export class UpdateUsuarioDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  habilitado?: boolean;

  @IsOptional()
  @IsString({ each: true })
  @IsIn(ALLOWED_ROLES, {
    each: true,
    message: 'roles must be one of: administradoregsi, usuarioegsi',
  })
  roles?: string[];
}
