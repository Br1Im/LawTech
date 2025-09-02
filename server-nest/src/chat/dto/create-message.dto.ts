import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty({ message: 'Текст сообщения не может быть пустым' })
  @IsString({ message: 'Текст сообщения должен быть строкой' })
  text: string;
}