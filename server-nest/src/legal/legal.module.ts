import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';
import { LegalDocument } from './entities/legal-document.entity';
import { UsersModule } from '../users/users.module';
import { OfficeModule } from '../office/office.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LegalDocument]),
    UsersModule,
    OfficeModule,
  ],
  controllers: [LegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}