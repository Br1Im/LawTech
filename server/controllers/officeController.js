const Office = require('../models/office');
const { formatOfficeResponse } = require('../utils/formatters');
const db = require('../db');

/**
 * Проверяет, что текущий пользователь — владелец офиса.
 * Возвращает true для системной роли 'owner' или если offices.owner_id === user.id.
 * Используется для гейта операций PUT/DELETE на офисе.
 */
async function isOfficeOwner(user, officeId) {
  if (!user || !user.id || !officeId) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'owner') return true;
  const [rows] = await db.query(
    'SELECT owner_id FROM offices WHERE id = ? LIMIT 1',
    [officeId]
  );
  if (!rows[0]) return false;
  return Number(rows[0].owner_id) === Number(user.id);
}

const officeController = {
  /**
   * Получить данные о выручке офисов за указанный период
   */
  async getOfficesRevenue(req, res) {
    try {
      const { period } = req.query;
      
      if (!period || !['day', '2weeks', 'month'].includes(period)) {
        return res.status(400).json({ success: false, message: 'Необходимо указать корректный период (day, 2weeks, month)' });
      }

      const user = req.user;
      let officeIds = null;
      // Для директора — только его офисы
      if (user && user.role === 'director') {
        const [offices] = await db.query('SELECT id FROM offices WHERE owner_id = ?', [user.id]);
        officeIds = offices.map(o => o.id);
      } else if (user && user.office_id) {
        officeIds = [user.office_id];
      }

      const revenueData = await Office.getRevenueByPeriod(period, officeIds);
      return res.json(revenueData);
    } catch (error) {
      console.error('Ошибка при получении данных о выручке:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Получить все офисы (с учётом прав пользователя)
   */
  async getAllOffices(req, res) {
    try {
      const user = req.user;
      
      // Получаем актуальную информацию из БД
      if (user && !user.office_id) {
        const [dbUser] = await db.query('SELECT office_id, role FROM users WHERE id = ?', [user.id]);
        if (dbUser.length > 0 && dbUser[0].office_id) {
          user.office_id = dbUser[0].office_id;
          user.role = dbUser[0].role;
        }
      }
      
      let offices;
      
      if (user && user.role === 'director') {
        offices = await Office.getAllByOwner(user.id);
        // Фоллбек: если owner_id не установлен, берём офис по office_id
        if (offices.length === 0 && user.office_id) {
          const userOffice = await Office.getById(user.office_id);
          offices = userOffice ? [userOffice] : [];
        }
      } else if (user && user.office_id) {
        const userOffice = await Office.getById(user.office_id);
        offices = userOffice ? [userOffice] : [];
      } else {
        offices = [];
      }
      
      res.json({
        success: true,
        data: offices
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
   * Получить список офисов текущего директора (для переключателя)
   */
  async getMyOffices(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
      }

      const [dbUser] = await db.query('SELECT role FROM users WHERE id = ?', [user.id]);
      const role = dbUser[0]?.role || user.role;

      if (role !== 'director') {
        // Для не-директоров возвращаем их единственный офис
        if (user.office_id || dbUser[0]?.office_id) {
          const officeId = user.office_id || dbUser[0]?.office_id;
          const office = await Office.getById(officeId);
          return res.json({ success: true, data: office ? [{ id: office.id, name: office.name, address: office.address }] : [] });
        }
        return res.json({ success: true, data: [] });
      }

      const [offices] = await db.query(
        'SELECT id, name, address, contact_phone, website, created_at FROM offices WHERE owner_id = ? ORDER BY name',
        [user.id]
      );
      
      res.json({ success: true, data: offices });
    } catch (error) {
      console.error('Error getting my offices:', error);
      res.status(500).json({ success: false, message: 'Ошибка при получении офисов' });
    }
  },

  /**
   * Переключить активный офис для директора
   */
  async switchOffice(req, res) {
    try {
      const user = req.user;
      const { officeId } = req.body;

      if (!officeId) {
        return res.status(400).json({ success: false, message: 'officeId обязателен' });
      }

      // Проверяем, что директор владеет этим офисом
      const [offices] = await db.query(
        'SELECT id, name FROM offices WHERE id = ? AND owner_id = ?',
        [officeId, user.id]
      );

      if (offices.length === 0) {
        return res.status(403).json({ success: false, message: 'У вас нет доступа к этому офису' });
      }

      // Обновляем office_id пользователя
      await db.query('UPDATE users SET office_id = ? WHERE id = ?', [officeId, user.id]);

      // Генерируем новый JWT с обновлённым office_id
      const jwt = require('jsonwebtoken');
      const config = require('../config');
      const token = jwt.sign(
        { id: user.id, email: user.email, role: 'director', office_id: officeId },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        office: offices[0]
      });
    } catch (error) {
      console.error('Error switching office:', error);
      res.status(500).json({ success: false, message: 'Ошибка при переключении офиса' });
    }
  },

  /**
   * Получить офис по ID
   */
  async getOfficeById(req, res) {
    try {
      const { officeId } = req.params;
      
      const office = await Office.getById(officeId);
      if (!office) {
        return res.status(404).json({ success: false, message: 'Офис не найден' });
      }
      
      const formattedOffice = formatOfficeResponse(office);
      return res.json(formattedOffice);
    } catch (error) {
      console.error('Ошибка при получении офиса:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Создать новый офис
   */
  async createOffice(req, res) {
    try {
      const { name, address, contact_phone, website, ip_surname, ip_name, ip_middle_name, inn, ogrn, work_phone, work_phone2 } = req.body;
      const userRole = (req.user?.role || "").toLowerCase();
      if (userRole !== "director") {
        return res.status(403).json({ success: false, message: "Доступ запрещён" });
      }

      
      if (!name) {
        return res.status(400).json({ success: false, message: 'Название офиса обязательно' });
      }
      
      const officeData = { name, address, contact_phone, website, ip_surname, ip_name, ip_middle_name, inn, ogrn, work_phone, work_phone2 };
      const office = await Office.create(officeData);
      
      // Устанавливаем owner_id — привязываем офис к текущему пользователю
      if (req.user) {
        await db.query('UPDATE offices SET owner_id = ? WHERE id = ?', [req.user.id, office.id]);
        office.owner_id = req.user.id;

        // Если у директора ещё нет активного офиса — ставим этот
        const [rows] = await db.query('SELECT office_id FROM users WHERE id = ?', [req.user.id]);
        if (rows[0] && !rows[0].office_id) {
          await db.query('UPDATE users SET office_id = ? WHERE id = ?', [office.id, req.user.id]);
          req.user.office_id = office.id;
        }
      }
      
      const formattedOffice = formatOfficeResponse(office);
      return res.status(201).json(formattedOffice);
    } catch (error) {
      console.error('Ошибка при создании офиса:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Обновить существующий офис
   */
  async updateOffice(req, res) {
    try {
      const { officeId } = req.params;
      const { name, address, contact_phone, website } = req.body;

      const existingOffice = await Office.getById(officeId);
      if (!existingOffice) {
        return res.status(404).json({ success: false, message: 'Офис не найден' });
      }

      const allowed = await isOfficeOwner(req.user, officeId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Доступ запрещён' });
      }

      if (!name) {
        return res.status(400).json({ success: false, message: 'Название офиса обязательно' });
      }
      
      const officeData = { name, address, contact_phone, website };
      await Office.update(officeId, officeData);
      
      const updatedOffice = await Office.getById(officeId);
      const formattedOffice = formatOfficeResponse(updatedOffice);
      return res.json(formattedOffice);
    } catch (error) {
      console.error('Ошибка при обновлении офиса:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Удалить офис
   */
  async deleteOffice(req, res) {
    try {
      const { officeId } = req.params;

      const office = await Office.getById(officeId);
      if (!office) {
        return res.status(404).json({ success: false, message: 'Офис не найден' });
      }

      const allowed = await isOfficeOwner(req.user, officeId);
      if (!allowed) {
        return res.status(403).json({ success: false, message: 'Доступ запрещён' });
      }

      await Office.delete(officeId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при удалении офиса:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
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
        res.json({ success: true, message: 'Статистика обновлена успешно' });
      } else {
        res.status(400).json({ success: false, message: 'Ошибка при обновлении статистики' });
      }
    } catch (error) {
      console.error('Error updating office stats:', error);
      res.status(500).json({ success: false, message: 'Ошибка при обновлении статистики офиса' });
    }
  }
};

module.exports = officeController;
