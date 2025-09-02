import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateOfficeDto {
  @IsNotEmpty({ message: 'Название офиса не может быть пустым' })
  @IsString({ message: 'Название офиса должно быть строкой' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Адрес должен быть строкой' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Контактный телефон должен быть строкой' })
  contact_phone?: string;

  @IsOptional()
  @IsString({ message: 'Рабочий телефон должен быть строкой' })
  work_phone2?: string;

  @IsOptional()
  @IsString({ message: 'Веб-сайт должен быть строкой' })
  website?: string;
}