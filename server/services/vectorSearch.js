const fetch = require('node-fetch');
const axios = require('axios');
const LegalDocument = require('../models/legalDocument');
const config = require('../config');

const FAISS_SERVICE_URL = process.env.FAISS_SERVICE_URL || 'http://localhost:5000';

class VectorSearchService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      const response = await axios.post(`${FAISS_SERVICE_URL}/initialize`);
      
      if (response.status === 200 && response.data.status === 'ok') {
        this.initialized = true;
        console.log('Vector search service initialized successfully');
        return true;
      } else {
        throw new Error(`Failed to initialize vector search: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Failed to initialize vector search service:', error.message);
      this.initialized = false;
      return false;
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await axios.post(`${FAISS_SERVICE_URL}/embed`, {
        text
      });
      
      if (response.status === 200 && response.data.status === 'ok') {
        return response.data.embedding;
      } else {
        throw new Error(`Failed to generate embedding: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error generating embedding:', error.message);
      throw new Error('Failed to generate embedding');
    }
  }

  async search(query, limit = 5) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const response = await axios.post(`${FAISS_SERVICE_URL}/search`, {
        query,
        limit
      });
      
      if (response.status === 200 && response.data.status === 'ok') {
        return response.data.results;
      } else {
        throw new Error(`Search failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Vector search error:', error.message);
      throw new Error('Vector search failed');
    }
  }

  async searchByEmbedding(embedding, limit = 5) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const response = await axios.post(`${FAISS_SERVICE_URL}/search`, {
        embedding,
        limit
      });
      
      if (response.status === 200 && response.data.status === 'ok') {
        return response.data.results;
      } else {
        throw new Error(`Search by embedding failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Vector search by embedding error:', error.message);
      throw new Error('Vector search by embedding failed');
    }
  }

  async addDocument(document, vector) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const documentWithEmbedding = {
        ...document,
        embedding: vector
      };
      
      const response = await axios.post(`${FAISS_SERVICE_URL}/documents`, documentWithEmbedding);
      
      if (response.status === 200 && response.data.status === 'ok') {
        return response.data.id;
      } else {
        throw new Error(`Failed to add document: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Failed to add document to vector search:', error.message);
      throw new Error('Failed to index document');
    }
  }

  async updateDocument(documentId, vector) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const document = await LegalDocument.findById(documentId);
      if (!document) {
        throw new Error(`Document with ID ${documentId} not found`);
      }
      
      const updateData = {
        ...document,
        embedding: vector
      };
      
      const response = await axios.put(`${FAISS_SERVICE_URL}/documents/${documentId}`, updateData);
      
      if (response.status === 200 && response.data.status === 'ok') {
        return documentId;
      } else {
        throw new Error(`Failed to update document: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Failed to update document ${documentId} in vector search:`, error.message);
      throw new Error('Failed to update document in index');
    }
  }

  async removeDocument(documentId) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      const response = await axios.delete(`${FAISS_SERVICE_URL}/documents/${documentId}`);
      
      if (response.status === 200 && response.data.status === 'ok') {
        return documentId;
      } else {
        throw new Error(`Failed to remove document: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Failed to remove document ${documentId} from vector search:`, error.message);
      throw new Error('Failed to remove document from index');
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${FAISS_SERVICE_URL}/health`);
      return response.status === 200 && response.data.status === 'ok';
    } catch (error) {
      console.error('Vector search service health check failed:', error.message);
      return false;
    }
  }
}

module.exports = new VectorSearchService(); 