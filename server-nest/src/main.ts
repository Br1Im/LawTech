import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Настройка CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://lawtech-p225.onrender.com',
      '*'
    ],
    credentials: true
  });

  // Глобальная валидация
  app.useGlobalPipes(new ValidationPipe());
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Приложение запущено на порту ${port}`);
}

bootstrap();