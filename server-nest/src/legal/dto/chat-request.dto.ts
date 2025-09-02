import { IsNotEmpty, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsNotEmpty({ message: 'Сообщение не может быть пустым' })
  @IsString({ message: 'Сообщение должно быть строкой' })
  message: string;
}