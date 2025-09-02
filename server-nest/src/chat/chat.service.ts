import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async getOfficeMessages(officeId: number, userId: number) {
    const messages = await this.messagesRepository.find({
      where: { office_id: officeId },
      order: { created_at: 'ASC' },
      relations: ['user'],
    });

    return messages.map(message => ({
      id: message.id,
      text: message.text,
      sender: message.sender,
      is_read: message.is_read,
      created_at: message.created_at,
      user_id: message.user_id,
      is_mine: message.user_id === userId,
    }));
  }

  async createMessage(officeId: number, createMessageDto: CreateMessageDto, user: any) {
    const message = this.messagesRepository.create({
      text: createMessageDto.text,
      sender: user.name,
      office_id: officeId,
      user_id: user.id,
      is_read: false,
    });

    await this.messagesRepository.save(message);

    return {
      id: message.id,
      text: message.text,
      sender: message.sender,
      is_read: message.is_read,
      created_at: message.created_at,
      user_id: message.user_id,
      is_mine: true,
    };
  }

  async markAsRead(messageId: number, userId: number) {
    const message = await this.messagesRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Сообщение не найдено');
    }

    if (message.user_id === userId) {
      throw new ForbiddenException('Нельзя отметить собственное сообщение как прочитанное');
    }

    message.is_read = true;
    await this.messagesRepository.save(message);

    return { success: true };
  }
}