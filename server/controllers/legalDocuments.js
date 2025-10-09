const LegalDocument = require('../models/legalDocument');
const vectorSearch = require('../services/vectorSearch');
const db = require('../db');

exports.getAllDocuments = async (req, res) => {
  try {
    const category = req.query.category;
    
    let documents;
    if (category) {
      documents = await LegalDocument.findByCategory(category);
    } else {
      documents = await LegalDocument.findAll();
    }
    
    res.json({ documents });
  } catch (error) {
    console.error('Error retrieving documents:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const document = await LegalDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ document });
  } catch (error) {
    console.error('Error retrieving document:', error);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
};

exports.createDocument = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const embedding = await vectorSearch.generateEmbedding(content);
    
    const document = await LegalDocument.create({
      title,
      content,
      category,
      embedding: JSON.stringify(embedding)
    });
    
    await vectorSearch.addDocument(document, embedding);
    
    res.status(201).json({ document });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const { title, content, category } = req.body;
    
    const document = await LegalDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const embedding = content !== document.content 
      ? await vectorSearch.generateEmbedding(content)
      : document.embedding ? JSON.parse(document.embedding) : await vectorSearch.generateEmbedding(content);
    
    const updatedDocument = await LegalDocument.update(documentId, {
      title: title || document.title,
      content: content || document.content,
      category: category || document.category,
      embedding: JSON.stringify(embedding)
    });
    
    await vectorSearch.updateDocument(documentId, embedding);
    
    res.json({ document: updatedDocument });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const document = await LegalDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Удаляем документ из базы данных
    await LegalDocument.delete(documentId);
    
    // Пытаемся удалить из векторного поиска, но не падаем если сервис недоступен
    try {
      await vectorSearch.removeDocument(documentId);
      console.log(`Document ${documentId} removed from vector search successfully`);
    } catch (vectorError) {
      console.warn(`Failed to remove document ${documentId} from vector search:`, vectorError.message);
      // Продолжаем выполнение, так как основное удаление из БД прошло успешно
    }
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

exports.searchDocuments = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await vectorSearch.search(query, 10);
    
    res.json({ results });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.getSimilarDocuments = async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    const document = await LegalDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (!document.embedding) {
      return res.status(400).json({ error: 'Document has no embedding' });
    }
    
    const embedding = JSON.parse(document.embedding);
    const results = await vectorSearch.searchByEmbedding(embedding, 5);
    
    const filteredResults = results.filter(result => result.id !== documentId);
    
    res.json({ results: filteredResults });
  } catch (error) {
    console.error('Error finding similar documents:', error);
    res.status(500).json({ error: 'Failed to find similar documents' });
  }
};

exports.getOfficeDocuments = async (req, res) => {
  try {
    const officeId = req.params.officeId;
    
    if (!officeId) {
      return res.status(400).json({ error: 'Office ID is required' });
    }
    
    // Возвращаем пустой массив документов
    const documents = [];
    
    res.json({ documents });
  } catch (error) {
    console.error('Error retrieving office documents:', error);
    res.status(500).json({ error: 'Failed to retrieve office documents' });
  }
};

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С CONTRACTS =====

/**
 * Получить все договоры для офиса
 */
exports.getOfficeContracts = async (req, res) => {
  try {
    const officeId = req.params.officeId;
    
    if (!officeId) {
      return res.status(400).json({ error: 'Office ID is required' });
    }
    
    const [contracts] = await db.query(`
      SELECT 
        c.*,
        u.username as created_by_name
      FROM contracts c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.office_id = ?
      ORDER BY c.created_at DESC
    `, [officeId]);
    
    res.json({ contracts });
  } catch (error) {
    console.error('Error retrieving office contracts:', error);
    res.status(500).json({ error: 'Failed to retrieve office contracts' });
  }
};

/**
 * Создать новый договор
 */
exports.createContract = async (req, res) => {
  try {
    const { 
      client_name, 
      contract_type, 
      subject, 
      amount, 
      status = 'active',
      contract_date 
    } = req.body;
    
    const userId = req.user?.id;
    const officeId = req.user?.office_id;
    
    if (!userId || !officeId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    if (!client_name || !contract_type || !amount) {
      return res.status(400).json({ error: 'Client name, contract type, and amount are required' });
    }
    
    // Генерируем уникальный номер договора
    const contractNumber = `DOG-${Date.now()}`;
    
    const [result] = await db.query(`
      INSERT INTO contracts (
        office_id, 
        created_by, 
        client_name, 
        contract_number, 
        contract_type, 
        subject, 
        amount, 
        status, 
        contract_date,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      officeId,
      userId,
      client_name,
      contractNumber,
      contract_type,
      subject,
      amount,
      status,
      contract_date
    ]);
    
    // Обновляем финансы офиса
    await updateOfficeRevenue(officeId, amount);
    
    // Получаем созданный договор с информацией об авторе
    const [contracts] = await db.query(`
      SELECT 
        c.*,
        u.username as created_by_name
      FROM contracts c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `, [result.insertId]);
    
    const contract = contracts[0];
    
    res.status(201).json({ 
      message: 'Contract created successfully',
      contract: contract
    });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
};

/**
 * Обновить финансы офиса при создании договора
 */
const updateOfficeRevenue = async (officeId, amount) => {
  try {
    // Получаем текущую статистику офиса
    const [statsRows] = await db.query(`
      SELECT revenue FROM office_stats WHERE office_id = ?
    `, [officeId]);
    
    const stats = statsRows[0];
    
    if (stats) {
      // Обновляем существующую статистику
      await db.query(`
        UPDATE office_stats 
        SET revenue = revenue + ? 
        WHERE office_id = ?
      `, [amount, officeId]);
    } else {
      // Создаем новую статистику
      await db.query(`
        INSERT INTO office_stats (office_id, revenue, expenses, profit)
        VALUES (?, ?, 0, ?)
      `, [officeId, amount, amount]);
    }
  } catch (error) {
    console.error('Error updating office revenue:', error);
    throw error;
  }
};

/**
 * Получить договор по ID
 */
exports.getContractById = async (req, res) => {
  try {
    const contractId = req.params.id;
    
    const [contracts] = await db.query(`
      SELECT 
        c.*,
        u.username as created_by_name
      FROM contracts c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `, [contractId]);
    
    const contract = contracts[0];
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    res.json({ contract });
  } catch (error) {
    console.error('Error retrieving contract:', error);
    res.status(500).json({ error: 'Failed to retrieve contract' });
  }
};

/**
 * Удалить договор по ID
 */
exports.deleteContract = async (req, res) => {
  try {
    const contractId = req.params.id;
    const userId = req.user?.id;
    const officeId = req.user?.office_id;
    
    if (!userId || !officeId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Проверяем существование договора
    const [contracts] = await db.query('SELECT * FROM contracts WHERE id = ? AND office_id = ?', [contractId, officeId]);
    
    if (contracts.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Удаляем договор
    await db.query('DELETE FROM contracts WHERE id = ?', [contractId]);
    
    res.status(200).json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    res.status(500).json({ error: 'Failed to delete contract' });
  }
};
