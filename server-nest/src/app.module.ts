import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LegalModule } from './legal/legal.module';
import { FilesModule } from './files/files.module';
import { ChatModule } from './chat/chat.module';
import { OfficeModule } from './office/office.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    LegalModule,
    FilesModule,
    ChatModule,
    OfficeModule,
  ],
})
export class AppModule {}