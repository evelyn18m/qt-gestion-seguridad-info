import { IsString, IsNotEmpty } from 'class-validator';

export class PageVisitDto {
  @IsString()
  @IsNotEmpty()
  path!: string;
}
