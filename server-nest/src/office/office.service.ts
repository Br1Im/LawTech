import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Office } from './entities/office.entity';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

@Injectable()
export class OfficeService {
  constructor(
    @InjectRepository(Office)
    private officeRepository: Repository<Office>,
  ) {}

  async create(createOfficeDto: CreateOfficeDto, user: any) {
    // Проверка прав пользователя (например, только админ может создавать офисы)
    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new ForbiddenException('У вас нет прав для создания офисов');
    }

    const office = this.officeRepository.create(createOfficeDto);
    return this.officeRepository.save(office);
  }

  async findAll() {
    const offices = await this.officeRepository.find();
    
    // Добавляем количество сотрудников для каждого офиса
    const officesWithEmployeeCount = await Promise.all(
      offices.map(async (office) => {
        const employeeCount = await this.getEmployeeCount(office.id);
        return {
          ...office,
          employee_count: employeeCount,
          online: false, // Заглушка для онлайн-статуса
          last_activity: null, // Заглушка для последней активности
        };
      }),
    );

    return officesWithEmployeeCount;
  }

  async findOne(id: number) {
    const office = await this.officeRepository.findOne({ where: { id } });
    
    if (!office) {
      throw new NotFoundException(`Офис с ID ${id} не найден`);
    }

    const employeeCount = await this.getEmployeeCount(id);
    
    return {
      ...office,
      employee_count: employeeCount,
      online: false, // Заглушка для онлайн-статуса
      last_activity: null, // Заглушка для последней активности
    };
  }

  async update(id: number, updateOfficeDto: UpdateOfficeDto, user: any) {
    // Проверка прав пользователя
    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new ForbiddenException('У вас нет прав для обновления офисов');
    }

    const office = await this.officeRepository.findOne({ where: { id } });
    
    if (!office) {
      throw new NotFoundException(`Офис с ID ${id} не найден`);
    }

    await this.officeRepository.update(id, updateOfficeDto);
    return this.findOne(id);
  }

  async remove(id: number, user: any) {
    // Проверка прав пользователя
    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new ForbiddenException('У вас нет прав для удаления офисов');
    }

    const office = await this.officeRepository.findOne({ where: { id } });
    
    if (!office) {
      throw new NotFoundException(`Офис с ID ${id} не найден`);
    }

    await this.officeRepository.remove(office);
    return { success: true };
  }

  async getOfficeEmployees(id: number) {
    const office = await this.officeRepository.findOne({
      where: { id },
      relations: ['employees'],
    });
    
    if (!office) {
      throw new NotFoundException(`Офис с ID ${id} не найден`);
    }

    return office.employees.map(employee => {
      const { password, ...result } = employee;
      return result;
    });
  }

  private async getEmployeeCount(officeId: number): Promise<number> {
    const office = await this.officeRepository.findOne({
      where: { id: officeId },
      relations: ['employees'],
    });
    
    return office ? office.employees.length : 0;
  }
}