/**
 * Контроллеры для обработки юридических запросов
 */
const { sendChatRequest } = require('../services/gigachat');
const { getLocalLegalResponse } = require('../utils');

// Обработка запроса к чат-боту (API или локальная обработка)
const handleChatRequest = async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Отсутствует обязательное поле "message"' });
        }

        // Сначала пытаемся использовать GigaChat API
        const apiResponse = await sendChatRequest(message);
        
        // Проверяем, есть ли ошибка при обращении к API
        if (apiResponse.error) {
            console.log('Не удалось получить ответ от GigaChat API, используем локальную обработку');
            
            // Если не удалось получить ответ от API, используем локальную обработку
            const localResponse = getLocalLegalResponse(message);
            return res.json({ text: localResponse, source: 'local' });
        }
        
        // Возвращаем ответ от API
        return res.json({ ...apiResponse, source: 'gigachat' });
        
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};

module.exports = {
    handleChatRequest
}; 