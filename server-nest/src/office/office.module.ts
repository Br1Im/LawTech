import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfficeController } from './office.controller';
import { OfficeService } from './office.service';
import { Office } from './entities/office.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Office])],
  controllers: [OfficeController],
  providers: [OfficeService],
  exports: [OfficeService],
})
export class OfficeModule {}