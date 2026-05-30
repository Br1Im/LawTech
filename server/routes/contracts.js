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

// Подтвердить оплату остатка
router.post('/:id/confirm-remainder', contractController.confirmRemainder);

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

    // Авто-снятие needs_lawyer_input если ТЗ заполнено
    try {
      const [rows] = await db.query(
        'SELECT contract_type, customer_goal, circumstances, document_types, custom_documents FROM contracts WHERE id = ?',
        [contractId]
      );
      const c = rows && rows[0];
      if (c) {
        const isCourtRep = (c.contract_type || 'docs') === 'court_rep';
        const hasCircum = c.circumstances && String(c.circumstances).trim().length > 0;
        let isFilled = false;
        if (isCourtRep) {
          isFilled = hasCircum;
        } else {
          const hasGoal = c.customer_goal && String(c.customer_goal).trim().length > 0;
          const hasDocs = (() => {
            try {
              const dt = typeof c.document_types === 'string' ? JSON.parse(c.document_types) : c.document_types;
              const cd = typeof c.custom_documents === 'string' ? JSON.parse(c.custom_documents) : c.custom_documents;
              return (Array.isArray(dt) && dt.length > 0) || (Array.isArray(cd) && cd.length > 0);
            } catch { return false; }
          })();
          isFilled = hasGoal && hasCircum && hasDocs;
        }
        if (isFilled) {
          await db.query('UPDATE contracts SET needs_lawyer_input = 0 WHERE id = ?', [contractId]);
        }
      }
    } catch (e) {
      console.error('needs_lawyer_input auto-clear failed:', e.message);
    }

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
