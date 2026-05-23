const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { authenticateToken } = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Получить все договоры офиса
router.get('/', contractController.getAllContracts);

// Получить договоры конкретного офиса
router.get('/office/:officeId', contractController.getAllContracts);

// Получить расторгнутые договоры
router.get('/terminated', contractController.getTerminatedContracts);

// Получить статистику по договорам
router.get('/stats', contractController.getContractStats);

// Генерация номера договора DDMMYYXX
router.get('/generate-number', contractController.generateNumber);

// Получить договор по ID
router.get('/:id', contractController.getContractById);

// Расторгнуть договор
router.post('/:id/terminate', contractController.terminateContract);

// Подтвердить возврат денег
router.post('/:id/confirm-refund', contractController.confirmRefund);

// Создать новый договор
router.post('/', contractController.createContract);

// Обновить данные карточки клиента (документы, обстоятельства, эксперт, тема)
router.patch('/:id/card-data', async (req, res) => {
  try {
    const contractId = req.params.id;
    const { document_types, custom_documents, circumstances, expert_id, title, customer_goal, legal_cost_comp, moral_comp } = req.body;
    const db = require('../db');

    const sets = [];
    const params = [];

    if (document_types !== undefined) {
      sets.push('document_types = ?');
      params.push(JSON.stringify(document_types));
    }
    if (custom_documents !== undefined) {
      sets.push('custom_documents = ?');
      params.push(JSON.stringify(custom_documents));
    }
    if (circumstances !== undefined) {
      sets.push('circumstances = ?');
      params.push(circumstances);
    }
    if (expert_id !== undefined) {
      sets.push('expert_id = ?');
      params.push(expert_id ? Number(expert_id) : null);
    }
    if (title !== undefined) {
      sets.push('title = ?');
      params.push(title);
    }
    if (customer_goal !== undefined) {
      sets.push('customer_goal = ?');
      params.push(customer_goal || null);
    }
    if (legal_cost_comp !== undefined) {
      sets.push('legal_cost_comp = ?');
      params.push(legal_cost_comp === null || legal_cost_comp === '' ? null : Number(legal_cost_comp));
    }
    if (moral_comp !== undefined) {
      sets.push('moral_comp = ?');
      params.push(moral_comp === null || moral_comp === '' ? null : Number(moral_comp));
    }

    if (sets.length === 0) {
      return res.status(400).json({ message: 'Нет данных для обновления' });
    }

    params.push(contractId);
    await db.query(
      `UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating card data:', error);
    res.status(500).json({ message: 'Ошибка при сохранении данных карточки' });
  }
});

// Обновить договор
router.put('/:id', contractController.updateContract);

// Удалить договор
router.delete('/:id', contractController.deleteContract);

module.exports = router;
