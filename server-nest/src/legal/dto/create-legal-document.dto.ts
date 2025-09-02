import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateLegalDocumentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  file_path?: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsString()
  file_type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  office_id?: number;
}