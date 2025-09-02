import { Controller, Post, Body, UseGuards, Request, Get, Param, Patch, Delete } from '@nestjs/common';
import { LegalService } from './legal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatRequestDto } from './dto/chat-request.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';

@Controller('legal')
@UseGuards(JwtAuthGuard)
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Post('chat')
  async handleChatRequest(@Body() chatRequestDto: ChatRequestDto, @Request() req) {
    return this.legalService.handleChatRequest(chatRequestDto.message, req.user);
  }

  @Post('documents')
  createDocument(@Body() createLegalDocumentDto: CreateLegalDocumentDto, @Request() req) {
    return this.legalService.createDocument(createLegalDocumentDto, req.user);
  }

  @Get('documents')
  findAllDocuments(@Request() req) {
    return this.legalService.findAllDocuments(req.user);
  }

  @Get('documents/:id')
  findOneDocument(@Param('id') id: string, @Request() req) {
    return this.legalService.findOneDocument(+id, req.user);
  }

  @Patch('documents/:id')
  updateDocument(
    @Param('id') id: string,
    @Body() updateLegalDocumentDto: UpdateLegalDocumentDto,
    @Request() req,
  ) {
    return this.legalService.updateDocument(+id, updateLegalDocumentDto, req.user);
  }

  @Delete('documents/:id')
  removeDocument(@Param('id') id: string, @Request() req) {
    return this.legalService.removeDocument(+id, req.user);
  }
}