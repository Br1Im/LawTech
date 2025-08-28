const LegalDocument = require('../models/legalDocument');
const vectorSearch = require('../services/vectorSearch');

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
    
    await LegalDocument.delete(documentId);
    await vectorSearch.removeDocument(documentId);
    
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
    
    // Здесь должна быть логика получения документов для конкретного офиса
    // Пока возвращаем тестовые данные, так как модель документов не связана с офисами
    const documents = [
      { id: 1, title: 'Договор купли-продажи №123', type: 'Купля-продажа', status: 'Подписан', date: '12.04.2023', client: 'ООО "Ромашка"' },
      { id: 2, title: 'Договор оказания услуг №456', type: 'Услуги', status: 'На согласовании', date: '15.05.2023', client: 'ИП Петров А.А.' },
      { id: 3, title: 'Договор аренды №789', type: 'Аренда', status: 'Черновик', date: '01.06.2023', client: 'ООО "Техносервис"' },
      { id: 4, title: 'Трудовой договор №234', type: 'Трудовой', status: 'Подписан', date: '20.03.2023', client: 'Иванов И.И.' },
      { id: 5, title: 'Договор поставки №567', type: 'Поставка', status: 'Расторгнут', date: '10.01.2023', client: 'ООО "Альфа"' },
    ];
    
    res.json({ documents });
  } catch (error) {
    console.error('Error retrieving office documents:', error);
    res.status(500).json({ error: 'Failed to retrieve office documents' });
  }
};

// Создание нового документа
exports.createDocument = async (req, res) => {
  try {
    const { clientName, representativeName, contractDate, contractSubject, officeId } = req.body;
    
    if (!clientName || !contractSubject || !officeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Здесь должна быть логика создания документа в базе данных
    // Пока возвращаем тестовые данные
    const newDocument = {
      id: Math.floor(Math.random() * 1000) + 6, // Генерируем случайный ID
      title: `Договор с ${clientName}`,
      type: contractSubject.includes('Документы') ? 'Документы' : 'Представление интересов',
      status: 'Черновик',
      date: contractDate || new Date().toLocaleDateString('ru-RU'),
      client: clientName
    };
    
    // В реальном приложении здесь будет сохранение в базу данных
    
    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
};