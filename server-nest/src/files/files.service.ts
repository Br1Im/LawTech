import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  async processUploadedFile(file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('Файл не предоставлен', HttpStatus.BAD_REQUEST);
    }

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
    const fileExtension = extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      throw new HttpException(
        'Недопустимый формат файла. Разрешены только PDF, DOC, DOCX, TXT, JPG, JPEG, PNG',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Здесь можно добавить логику для обработки файла
    // Например, извлечение текста из PDF или изображений

    return {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      text: 'Текст извлечен из файла (заглушка)',
    };
  }

  getFilePath(filename: string): string {
    return path.join(process.cwd(), 'uploads', filename);
  }
}