import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  habilitado?: boolean;

  @IsOptional()
  @IsString({ each: true })
  roles?: string[];
}
