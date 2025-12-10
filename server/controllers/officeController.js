const Office = require('../models/office');
const { formatOfficeResponse } = require('../utils/formatters');

/**
 * Контроллер для работы с офисами
 */
const officeController = {
  /**
   * Получить данные о выручке офисов за указанный период
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getOfficesRevenue(req, res) {
    try {
      const { period } = req.query;
      
      // Проверяем, что период указан и является допустимым
      if (!period || !['day', '2weeks', 'month'].includes(period)) {
        return res.status(400).json({ error: 'Необходимо указать корректный период (day, 2weeks, month)' });
      }
      
      const revenueData = await Office.getRevenueByPeriod(period);
      
      return res.json(revenueData);
    } catch (error) {
      console.error('Ошибка при получении данных о выручке:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Получить все офисы с полными данными
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getAllOffices(req, res) {
    try {
      const { period = 'day' } = req.query;
      const user = req.user; // Получаем пользователя из middleware
      
      let offices;
      
      // Если пользователь - юрист, администратор, менеджер или ОКК, возвращаем только его офис
      if (user && (user.role === 'lawyer' || user.role === 'admin' || user.role === 'manager' || user.role === 'okk') && user.office_id) {
        const userOffice = await Office.getById(user.office_id);
        offices = userOffice ? [userOffice] : [];
      } else {
        // Для остальных ролей (директор, эксперт) возвращаем все офисы
        offices = await Office.getAll();
      }
      
      // Получаем полные данные для каждого офиса
      const officesWithData = await Promise.all(
        offices.map(async (office) => {
          const [employees, stats, chartData] = await Promise.all([
            Office.getEmployeesByOfficeId(office.id),
            Office.getStatsByOfficeId(office.id, period),
            Office.getChartDataByOfficeId(office.id)
          ]);
          
          return {
            ...office,
            employees,
            stats,
            chartData
          };
        })
      );
      
      res.json({
        success: true,
        data: officesWithData
      });
    } catch (error) {
      console.error('Error getting all offices:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при получении офисов'
      });
    }
  },
  
  /**
   * Получить офис по ID
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getOfficeById(req, res) {
    try {
      const { officeId } = req.params;
      
      const office = await Office.getById(officeId);
      if (!office) {
        return res.status(404).json({ error: 'Офис не найден' });
      }
      
      // Форматируем ответ
      const formattedOffice = formatOfficeResponse(office);
      
      return res.json(formattedOffice);
    } catch (error) {
      console.error('Ошибка при получении офиса:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Создать новый офис
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async createOffice(req, res) {
    try {
      const { name, address, contact_phone, website } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Название офиса обязательно' });
      }
      
      const officeData = {
        name,
        address,
        contact_phone,
        website
      };
      
      const office = await Office.create(officeData);
      
      // Форматируем ответ
      const formattedOffice = formatOfficeResponse(office);
      
      return res.status(201).json(formattedOffice);
    } catch (error) {
      console.error('Ошибка при создании офиса:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Обновить существующий офис
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async updateOffice(req, res) {
    try {
      const { officeId } = req.params;
      const { name, address, contact_phone, website } = req.body;
      
      // Проверяем, существует ли офис
      const existingOffice = await Office.getById(officeId);
      if (!existingOffice) {
        return res.status(404).json({ error: 'Офис не найден' });
      }
      
      if (!name) {
        return res.status(400).json({ error: 'Название офиса обязательно' });
      }
      
      const officeData = {
        name,
        address,
        contact_phone,
        website
      };
      
      await Office.update(officeId, officeData);
      
      // Получаем обновленные данные
      const updatedOffice = await Office.getById(officeId);
      
      // Форматируем ответ
      const formattedOffice = formatOfficeResponse(updatedOffice);
      
      return res.json(formattedOffice);
    } catch (error) {
      console.error('Ошибка при обновлении офиса:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Удалить офис
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async deleteOffice(req, res) {
    try {
      const { officeId } = req.params;
      
      // Проверяем, существует ли офис
      const office = await Office.getById(officeId);
      if (!office) {
        return res.status(404).json({ error: 'Офис не найден' });
      }
      
      await Office.delete(officeId);
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при удалении офиса:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },

  /**
   * Обновить статистику офиса
   */
  async updateOfficeStats(req, res) {
    try {
      const { id } = req.params;
      const { period = 'day', stats } = req.body;
      
      if (!stats || typeof stats !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Данные статистики обязательны'
        });
      }
      
      const result = await Office.updateStats(id, period, stats);
      
      if (result) {
        res.json({
          success: true,
          message: 'Статистика обновлена успешно'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Ошибка при обновлении статистики'
        });
      }
    } catch (error) {
      console.error('Error updating office stats:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при обновлении статистики офиса'
      });
    }
  }
};

module.exports = officeController;