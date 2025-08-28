const OfficeDocument = require('../models/officeDocument');

/**
 * Контроллер для работы с документами офиса
 */
const officeDocumentsController = {
  /**
   * Получить все документы офиса
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getOfficeDocuments(req, res) {
    try {
      const { officeId } = req.params;
      
      if (!officeId) {
        return res.status(400).json({ error: 'ID офиса не указан' });
      }
      
      const documents = await OfficeDocument.findByOfficeId(officeId);
      res.json(documents);
    } catch (error) {
      console.error('Ошибка при получении документов офиса:', error);
      res.status(500).json({ error: 'Ошибка сервера при получении документов офиса' });
    }
  },

  /**
   * Получить документ по ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDocumentById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID документа не указан' });
      }
      
      const document = await OfficeDocument.findById(id);
      
      if (!document) {
        return res.status(404).json({ error: 'Документ не найден' });
      }
      
      res.json(document);
    } catch (error) {
      console.error('Ошибка при получении документа по ID:', error);
      res.status(500).json({ error: 'Ошибка сервера при получении документа' });
    }
  },

  /**
   * Создать новый документ офиса
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createDocument(req, res) {
    try {
      const { title, type, status, client, office_id, content } = req.body;
      
      if (!title || !type || !status || !client || !office_id) {
        return res.status(400).json({ 
          error: 'Не все обязательные поля заполнены',
          required: ['title', 'type', 'status', 'client', 'office_id']
        });
      }
      
      const document = await OfficeDocument.create({
        title,
        type,
        status,
        client,
        office_id,
        content: content || ''
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error('Ошибка при создании документа офиса:', error);
      res.status(500).json({ error: 'Ошибка сервера при создании документа' });
    }
  },

  /**
   * Обновить документ офиса
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updateDocument(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID документа не указан' });
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Нет данных для обновления' });
      }
      
      const document = await OfficeDocument.findById(id);
      
      if (!document) {
        return res.status(404).json({ error: 'Документ не найден' });
      }
      
      const updatedDocument = await OfficeDocument.update(id, updateData);
      res.json(updatedDocument);
    } catch (error) {
      console.error('Ошибка при обновлении документа офиса:', error);
      res.status(500).json({ error: 'Ошибка сервера при обновлении документа' });
    }
  },

  /**
   * Удалить документ офиса
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID документа не указан' });
      }
      
      const document = await OfficeDocument.findById(id);
      
      if (!document) {
        return res.status(404).json({ error: 'Документ не найден' });
      }
      
      await OfficeDocument.delete(id);
      res.status(204).end();
    } catch (error) {
      console.error('Ошибка при удалении документа офиса:', error);
      res.status(500).json({ error: 'Ошибка сервера при удалении документа' });
    }
  },

  /**
   * Получить документы по типу
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDocumentsByType(req, res) {
    try {
      const { officeId, type } = req.params;
      
      if (!officeId || !type) {
        return res.status(400).json({ error: 'ID офиса или тип документа не указаны' });
      }
      
      const documents = await OfficeDocument.findByType(officeId, type);
      res.json(documents);
    } catch (error) {
      console.error('Ошибка при получении документов по типу:', error);
      res.status(500).json({ error: 'Ошибка сервера при получении документов по типу' });
    }
  },

  /**
   * Получить документы по статусу
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getDocumentsByStatus(req, res) {
    try {
      const { officeId, status } = req.params;
      
      if (!officeId || !status) {
        return res.status(400).json({ error: 'ID офиса или статус документа не указаны' });
      }
      
      const documents = await OfficeDocument.findByStatus(officeId, status);
      res.json(documents);
    } catch (error) {
      console.error('Ошибка при получении документов по статусу:', error);
      res.status(500).json({ error: 'Ошибка сервера при получении документов по статусу' });
    }
  }
};

module.exports = officeDocumentsController;