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
    
    try {
      const result = await db.query(sql, [title, content, category, embedding]);
      return { id: result.insertId, ...document };
    } catch (err) {
      // If any column is missing, attempt to add it and retry
      if (/(no such column|has no column named)/i.test(err.message)) {
        console.warn('Missing columns detected in legal_documents table, performing automatic migration...');
        
        // Add missing columns one by one
        const columnsToAdd = [
          { name: 'category', definition: 'TEXT' },
          { name: 'embedding', definition: 'TEXT' },
          { name: 'office_id', definition: 'INTEGER' },
          { name: 'tags', definition: 'TEXT' },
          { name: 'file_path', definition: 'TEXT' }
        ];
        
        for (const column of columnsToAdd) {
          try {
            await db.query(`ALTER TABLE legal_documents ADD COLUMN ${column.name} ${column.definition}`);
            console.log(`✅ Added column ${column.name} to legal_documents table`);
          } catch (addErr) {
            // Column might already exist, ignore duplicate column errors
            if (!/(duplicate column|already exists)/i.test(addErr.message)) {
              console.warn(`Failed to add column ${column.name}:`, addErr.message);
            }
          }
        }
        
        // Retry the original query
        const result = await db.query(sql, [title, content, category, embedding]);
        return { id: result.insertId, ...document };
      }
      throw err;
    }
  }
  
  static async update(id, document) {
    const { title, content, category, embedding } = document;
    
    const sql = `
      UPDATE legal_documents
      SET title = ?, content = ?, category = ?, embedding = ?, updated_at = datetime('now')
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