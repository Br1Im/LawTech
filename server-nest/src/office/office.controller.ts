import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { OfficeService } from './office.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('offices')
@UseGuards(JwtAuthGuard)
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Post()
  create(@Body() createOfficeDto: CreateOfficeDto, @Request() req) {
    return this.officeService.create(createOfficeDto, req.user);
  }

  @Get()
  findAll() {
    return this.officeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.officeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOfficeDto: UpdateOfficeDto, @Request() req) {
    return this.officeService.update(+id, updateOfficeDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.officeService.remove(+id, req.user);
  }

  @Get(':id/employees')
  getOfficeEmployees(@Param('id') id: string) {
    return this.officeService.getOfficeEmployees(+id);
  }
}