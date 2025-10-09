import os
import json
import numpy as np
import faiss
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('faiss-service')

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
INDEX_PATH = os.path.join(DATA_DIR, 'faiss_index.bin')
DOCUMENTS_PATH = os.path.join(DATA_DIR, 'documents.json')
EMBEDDING_SIZE = 384

# Создаем директорию для данных, если она не существует
os.makedirs(DATA_DIR, exist_ok=True)

class FAISSService:
    def __init__(self):
        self.index = None
        self.documents = []
        self.model = SentenceTransformer('distilbert-base-nli-mean-tokens')
        self.initialized = False
        
    def initialize(self):
        try:
            self.load_documents()
            self.load_or_create_index()
            self.initialized = True
            logger.info(f"FAISS service initialized with {len(self.documents)} documents")
        except Exception as e:
            logger.error(f"Error initializing FAISS service: {str(e)}")
            raise
    
    def load_documents(self):
        if os.path.exists(DOCUMENTS_PATH):
            with open(DOCUMENTS_PATH, 'r', encoding='utf-8') as f:
                self.documents = json.load(f)
            logger.info(f"Loaded {len(self.documents)} documents from {DOCUMENTS_PATH}")
        else:
            self.documents = []
            logger.info("No document file found, starting with empty document list")
    
    def save_documents(self):
        with open(DOCUMENTS_PATH, 'w', encoding='utf-8') as f:
            json.dump(self.documents, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved {len(self.documents)} documents to {DOCUMENTS_PATH}")
    
    def load_or_create_index(self):
        if os.path.exists(INDEX_PATH):
            self.index = faiss.read_index(INDEX_PATH)
            logger.info(f"Loaded FAISS index from {INDEX_PATH}")
        else:
            self.index = faiss.IndexFlatL2(EMBEDDING_SIZE)
            
            # Если есть документы, добавляем их в индекс
            if self.documents:
                embeddings = [np.array(doc.get('embedding', [])) for doc in self.documents]
                if embeddings and len(embeddings[0]) == EMBEDDING_SIZE:
                    embeddings_array = np.array(embeddings).astype('float32')
                    self.index.add(embeddings_array)
            
            faiss.write_index(self.index, INDEX_PATH)
            logger.info(f"Created new FAISS index at {INDEX_PATH}")
    
    def generate_embedding(self, text):
        embedding = self.model.encode([text])[0]
        return embedding.tolist()
    
    def add_document(self, document):
        if not self.initialized:
            self.initialize()
        
        # Генерируем ID для нового документа
        doc_id = max([doc.get('id', 0) for doc in self.documents], default=0) + 1
        
        # Генерируем embedding, если его нет
        if 'embedding' not in document:
            document['embedding'] = self.generate_embedding(document['content'])
        
        # Добавляем ID и сохраняем документ
        document['id'] = doc_id
        self.documents.append(document)
        self.save_documents()
        
        # Добавляем embedding в индекс
        embedding = np.array([document['embedding']]).astype('float32')
        self.index.add(embedding)
        faiss.write_index(self.index, INDEX_PATH)
        
        return doc_id
    
    def update_document(self, doc_id, document):
        if not self.initialized:
            self.initialize()
        
        # Находим документ по ID
        for i, doc in enumerate(self.documents):
            if doc.get('id') == doc_id:
                # Если контент изменился, обновляем embedding
                if document.get('content') and document['content'] != doc.get('content'):
                    document['embedding'] = self.generate_embedding(document['content'])
                
                # Обновляем документ, сохраняя ID
                updated_doc = {**doc, **document, 'id': doc_id}
                self.documents[i] = updated_doc
                self.save_documents()
                
                # Пересоздаем индекс (в FAISS нельзя обновить отдельный вектор)
                self.rebuild_index()
                
                return doc_id
        
        # Если документ не найден
        raise ValueError(f"Document with ID {doc_id} not found")
    
    def delete_document(self, doc_id):
        if not self.initialized:
            self.initialize()
        
        # Находим документ по ID
        for i, doc in enumerate(self.documents):
            if doc.get('id') == doc_id:
                # Удаляем документ
                del self.documents[i]
                self.save_documents()
                
                # Пересоздаем индекс
                self.rebuild_index()
                
                return True
        
        # Если документ не найден
        return False
    
    def rebuild_index(self):
        # Создаем новый индекс
        self.index = faiss.IndexFlatL2(EMBEDDING_SIZE)
        
        # Добавляем все embeddings
        if self.documents:
            embeddings = [np.array(doc.get('embedding', [])) for doc in self.documents]
            if embeddings and len(embeddings[0]) == EMBEDDING_SIZE:
                embeddings_array = np.array(embeddings).astype('float32')
                self.index.add(embeddings_array)
        
        # Сохраняем индекс
        faiss.write_index(self.index, INDEX_PATH)
        logger.info("FAISS index rebuilt")
    
    def search(self, query, limit=5):
        if not self.initialized:
            self.initialize()
        
        # Если индекс пустой, возвращаем пустой результат
        if self.index.ntotal == 0:
            return []
        
        # Генерируем embedding для запроса
        query_embedding = self.generate_embedding(query)
        query_embedding_array = np.array([query_embedding]).astype('float32')
        
        # Выполняем поиск
        distances, indices = self.index.search(query_embedding_array, min(limit, self.index.ntotal))
        
        # Формируем результаты
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.documents) and idx != -1:
                doc = self.documents[idx]
                results.append({
                    'id': doc.get('id'),
                    'title': doc.get('title', ''),
                    'content': doc.get('content', ''),
                    'category': doc.get('category', ''),
                    'score': float(distances[0][i]),
                    'similarity': 1.0 / (1.0 + float(distances[0][i]))  # Преобразуем расстояние в сходство
                })
        
        # Сортируем по сходству (от большего к меньшему)
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        return results
    
    def search_by_embedding(self, embedding, limit=5):
        if not self.initialized:
            self.initialize()
        
        # Если индекс пустой, возвращаем пустой результат
        if self.index.ntotal == 0:
            return []
        
        # Преобразуем embedding в numpy array
        query_embedding_array = np.array([embedding]).astype('float32')
        
        # Выполняем поиск
        distances, indices = self.index.search(query_embedding_array, min(limit, self.index.ntotal))
        
        # Формируем результаты
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.documents) and idx != -1:
                doc = self.documents[idx]
                results.append({
                    'id': doc.get('id'),
                    'title': doc.get('title', ''),
                    'content': doc.get('content', ''),
                    'category': doc.get('category', ''),
                    'score': float(distances[0][i]),
                    'similarity': 1.0 / (1.0 + float(distances[0][i]))
                })
        
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        return results

# Создаем экземпляр сервиса
service = FAISSService()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'version': '1.0.0'})

@app.route('/initialize', methods=['POST'])
def initialize():
    try:
        service.initialize()
        return jsonify({'status': 'ok', 'message': 'FAISS service initialized'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/embed', methods=['POST'])
def embed():
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'status': 'error', 'message': 'Missing text field'}), 400
    
    try:
        embedding = service.generate_embedding(data['text'])
        return jsonify({'status': 'ok', 'embedding': embedding})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    
    if not data:
        return jsonify({'status': 'error', 'message': 'Missing request body'}), 400
    
    try:
        if 'query' in data:
            # Поиск по текстовому запросу
            limit = int(data.get('limit', 5))
            results = service.search(data['query'], limit)
            return jsonify({'status': 'ok', 'results': results})
        elif 'embedding' in data:
            # Поиск по embedding
            limit = int(data.get('limit', 5))
            results = service.search_by_embedding(data['embedding'], limit)
            return jsonify({'status': 'ok', 'results': results})
        else:
            return jsonify({'status': 'error', 'message': 'Missing query or embedding field'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/documents', methods=['POST'])
def add_document():
    data = request.get_json()
    
    if not data or 'content' not in data or 'title' not in data:
        return jsonify({'status': 'error', 'message': 'Missing required fields'}), 400
    
    try:
        doc_id = service.add_document(data)
        return jsonify({'status': 'ok', 'id': doc_id})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/documents/<int:doc_id>', methods=['PUT'])
def update_document(doc_id):
    data = request.get_json()
    
    if not data:
        return jsonify({'status': 'error', 'message': 'Missing request body'}), 400
    
    try:
        service.update_document(doc_id, data)
        return jsonify({'status': 'ok', 'id': doc_id})
    except ValueError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/documents/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    try:
        success = service.delete_document(doc_id)
        if success:
            return jsonify({'status': 'ok'})
        else:
            return jsonify({'status': 'error', 'message': f'Document with ID {doc_id} not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    # Инициализируем сервис при запуске
    try:
        service.initialize()
    except Exception as e:
        logger.error(f"Failed to initialize service: {str(e)}")
    
    # Запускаем Flask-сервер
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)