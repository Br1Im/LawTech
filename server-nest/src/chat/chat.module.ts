import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { UsersModule } from '../users/users.module';
import { OfficeModule } from '../office/office.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    UsersModule,
    OfficeModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}