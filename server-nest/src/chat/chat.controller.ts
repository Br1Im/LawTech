import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('office/:officeId')
  async getOfficeMessages(@Param('officeId') officeId: number, @Request() req) {
    return this.chatService.getOfficeMessages(officeId, req.user.id);
  }

  @Post('office/:officeId')
  async createMessage(
    @Param('officeId') officeId: number,
    @Body() createMessageDto: CreateMessageDto,
    @Request() req,
  ) {
    return this.chatService.createMessage(officeId, createMessageDto, req.user);
  }

  @Post('read/:messageId')
  async markAsRead(@Param('messageId') messageId: number, @Request() req) {
    return this.chatService.markAsRead(messageId, req.user.id);
  }
}