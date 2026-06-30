import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

const ALLOWED_ROLES = ['administrador', 'usuario'];

export class UpdateUsuarioDto {
  @IsOptional()
  @ValidateIf((o) => o.email !== '' && o.email !== undefined)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  habilitado?: boolean;

  @IsOptional()
  @IsString({ each: true })
  @IsIn(ALLOWED_ROLES, {
    each: true,
    message: 'roles must be one of: administrador, usuario',
  })
  roles?: string[];
}
