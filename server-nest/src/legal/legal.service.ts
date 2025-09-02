import { Injectable, HttpException, HttpStatus, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegalDocument } from './entities/legal-document.entity';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';
import { UsersService } from '../users/users.service';
import { OfficeService } from '../office/office.service';
import axios from 'axios';

@Injectable()
export class LegalService {
  constructor(
    private configService: ConfigService,
    @InjectRepository(LegalDocument)
    private legalDocumentRepository: Repository<LegalDocument>,
    private usersService: UsersService,
    private officeService: OfficeService,
  ) {}

  async handleChatRequest(message: string) {
    try {
      // Здесь можно добавить интеграцию с GigaChat или другим API
      // Для примера используем локальную обработку
      const response = this.getLocalLegalResponse(message);
      
      return {
        text: response,
        source: 'local',
      };
    } catch (error) {
      throw new HttpException(
        'Ошибка при обработке запроса',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getLocalLegalResponse(message: string): string {
    // Простая локальная обработка запросов
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('договор') || lowerMessage.includes('контракт')) {
      return 'Договор - это соглашение двух или более лиц об установлении, изменении или прекращении гражданских прав и обязанностей. Основные требования к договорам установлены в Гражданском кодексе РФ.';
    }
    
    if (lowerMessage.includes('иск') || lowerMessage.includes('суд')) {
      return 'Исковое заявление подается в суд в письменной форме. В нем должны быть указаны наименование суда, данные истца и ответчика, суть нарушения прав, обстоятельства и доказательства, требования истца.';
    }
    
    if (lowerMessage.includes('налог')) {
      return 'Налоговая система РФ включает федеральные, региональные и местные налоги. Основные положения регулируются Налоговым кодексом РФ.';
    }
    
    return 'Для получения юридической консультации по вашему вопросу, пожалуйста, уточните детали или обратитесь к специалисту.';
  }

  async createDocument(createLegalDocumentDto: CreateLegalDocumentDto, user: any) {
    const document = this.legalDocumentRepository.create({
      ...createLegalDocumentDto,
      author_id: user.id,
    });

    // Если указан office_id, проверяем существование офиса
    if (createLegalDocumentDto.office_id) {
      const office = await this.officeService.findOne(createLegalDocumentDto.office_id);
      document.office_id = office.id;
    }

    return this.legalDocumentRepository.save(document);
  }

  async findAllDocuments(user: any) {
    // Если пользователь админ или владелец, показываем все документы
    if (user.role === 'admin' || user.role === 'owner') {
      return this.legalDocumentRepository.find({
        relations: ['author', 'office'],
      });
    }

    // Иначе показываем только документы пользователя или его офиса
    return this.legalDocumentRepository.find({
      where: [
        { author_id: user.id },
        { office_id: user.office_id },
      ],
      relations: ['author', 'office'],
    });
  }

  async findOneDocument(id: number, user: any) {
    const document = await this.legalDocumentRepository.findOne({
      where: { id },
      relations: ['author', 'office'],
    });

    if (!document) {
      throw new NotFoundException(`Документ с ID ${id} не найден`);
    }

    // Проверка прав доступа
    if (user.role !== 'admin' && user.role !== 'owner' && 
        document.author_id !== user.id && document.office_id !== user.office_id) {
      throw new ForbiddenException('У вас нет доступа к этому документу');
    }

    return document;
  }

  async updateDocument(id: number, updateLegalDocumentDto: UpdateLegalDocumentDto, user: any) {
    const document = await this.findOneDocument(id, user);

    // Проверка прав на редактирование
    if (user.role !== 'admin' && user.role !== 'owner' && document.author_id !== user.id) {
      throw new ForbiddenException('У вас нет прав на редактирование этого документа');
    }

    // Обновляем поле updated_at
    updateLegalDocumentDto['updated_at'] = new Date();

    await this.legalDocumentRepository.update(id, updateLegalDocumentDto);
    return this.findOneDocument(id, user);
  }

  async removeDocument(id: number, user: any) {
    const document = await this.findOneDocument(id, user);

    // Проверка прав на удаление
    if (user.role !== 'admin' && user.role !== 'owner' && document.author_id !== user.id) {
      throw new ForbiddenException('У вас нет прав на удаление этого документа');
    }

    await this.legalDocumentRepository.remove(document);
    return { success: true };
  }
}