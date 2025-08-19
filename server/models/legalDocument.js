const db = require('../db');

class LegalDocument {
  static async findAll() {
    const sql = `
      SELECT id, title, content, category, created_at, updated_at, embedding 
      FROM legal_documents
      ORDER BY created_at DESC
    `;
    
    return await db.query(sql);
  }

  static async findById(id) {
    const sql = `
      SELECT id, title, content, category, created_at, updated_at, embedding 
      FROM legal_documents
      WHERE id = ?
    `;
    
    const results = await db.query(sql, [id]);
    return results[0];
  }

  static async findByCategory(category) {
    const sql = `
      SELECT id, title, content, category, created_at, updated_at, embedding
      FROM legal_documents
      WHERE category = ?
      ORDER BY created_at DESC
    `;
    
    return await db.query(sql, [category]);
  }
  
  static async findBySimilarity(embedding, limit = 5) {
    const sql = `
      SELECT id, title, content, category, created_at, updated_at, 
             embedding, 
             (SELECT vector_similarity(embedding, ?)) as similarity
      FROM legal_documents
      ORDER BY similarity DESC
      LIMIT ?
    `;
    
    return await db.query(sql, [embedding, limit]);
  }
  
  static async create(document) {
    const { title, content, category, embedding } = document;
    
    const sql = `
      INSERT INTO legal_documents (title, content, category, embedding)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await db.query(sql, [title, content, category, embedding]);
    return { id: result.insertId, ...document };
  }
  
  static async update(id, document) {
    const { title, content, category, embedding } = document;
    
    const sql = `
      UPDATE legal_documents
      SET title = ?, content = ?, category = ?, embedding = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await db.query(sql, [title, content, category, embedding, id]);
    return { id, ...document };
  }
  
  static async delete(id) {
    const sql = `
      DELETE FROM legal_documents
      WHERE id = ?
    `;
    
    await db.query(sql, [id]);
    return { id };
  }
}

module.exports = LegalDocument; 