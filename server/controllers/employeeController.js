/**
 * Контроллер для работы с сотрудниками
 */
const Employee = require('../models/employee');

const employeeController = {
  /**
   * Получить всех сотрудников офиса
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getOfficeEmployees(req, res) {
    try {
      const { officeId } = req.params;
      
      if (!officeId) {
        return res.status(400).json({ error: 'ID офиса обязателен' });
      }
      
      const employees = await Employee.getByOfficeId(officeId);
      
      return res.json({ employees });
    } catch (error) {
      console.error('Ошибка при получении сотрудников:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Получить сотрудника по ID
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async getEmployeeById(req, res) {
    try {
      const { employeeId } = req.params;
      
      const employee = await Employee.getById(employeeId);
      if (!employee) {
        return res.status(404).json({ error: 'Сотрудник не найден' });
      }
      
      return res.json({ employee });
    } catch (error) {
      console.error('Ошибка при получении сотрудника:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Обновить данные сотрудника
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async updateEmployee(req, res) {
    try {
      const { employeeId } = req.params;
      const employeeData = req.body;
      
      const updatedEmployee = await Employee.update(employeeId, employeeData);
      
      return res.json({ employee: updatedEmployee });
    } catch (error) {
      console.error('Ошибка при обновлении сотрудника:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  },
  
  /**
   * Удалить сотрудника
   * @param {Object} req - объект запроса Express
   * @param {Object} res - объект ответа Express
   */
  async deleteEmployee(req, res) {
    try {
      const { employeeId } = req.params;
      
      await Employee.delete(employeeId);
      
      return res.json({ success: true });
    } catch (error) {
      console.error('Ошибка при удалении сотрудника:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }
};

module.exports = employeeController;