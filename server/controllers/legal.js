/**
 * Контроллеры для обработки юридических запросов
 */
const { sendChatRequest } = require('../services/gigachat');
const { getLocalLegalResponse } = require('../utils');
const vectorSearch = require('../services/vectorSearch');
const axios = require('axios');

const generateEmbedding = async (text) => {
  try {
    const response = await fetch('http://localhost:5000/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return new Array(384).fill(0);
  }
};

// Обработка запроса к чат-боту (API или локальная обработка)
const handleChatRequest = async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Отсутствует обязательное поле "message"' });
        }

        try {
            // Поиск релевантных документов через векторный поиск
            const relevantDocuments = await vectorSearch.search(message, 3);
            
            // Формируем контекстную информацию из найденных документов
            const context = relevantDocuments.length > 0 
                ? relevantDocuments.map(doc => doc.content).join("\n\n") 
                : '';
            
            // Дополняем запрос контекстом
            const enhancedMessage = context 
                ? `Вопрос: ${message}\n\nКонтекст из базы знаний:\n${context}` 
                : message;

            // Отправляем запрос в GigaChat API
            const apiResponse = await sendChatRequest(enhancedMessage);
            
            // Проверяем, есть ли ошибка при обращении к API
            if (apiResponse.error) {
                console.log('Не удалось получить ответ от GigaChat API, используем локальную обработку');
                
                // Если не удалось получить ответ от API, используем локальную обработку
                const localResponse = getLocalLegalResponse(message);
                return res.json({ 
                    text: localResponse, 
                    source: 'local', 
                    relatedDocuments: relevantDocuments 
                });
            }
            
            // Возвращаем ответ от API с найденными документами
            return res.json({ 
                ...apiResponse, 
                source: 'gigachat', 
                relatedDocuments: relevantDocuments 
            });
        } catch (searchError) {
            console.error('Ошибка при поиске документов:', searchError);
            
            // Если произошла ошибка при поиске, просто продолжаем без контекста документов
            const apiResponse = await sendChatRequest(message);
            
            if (apiResponse.error) {
                const localResponse = getLocalLegalResponse(message);
                return res.json({ text: localResponse, source: 'local' });
            }
            
            return res.json({ ...apiResponse, source: 'gigachat' });
        }
        
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};

module.exports = {
    handleChatRequest
}; 