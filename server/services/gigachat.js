/**
 * Сервис для взаимодействия с GigaChat API
 */
const axios = require('axios');
const config = require('../config');
const { generateUUID } = require('../utils');

// Хранилище токенов GigaChat
let gigaChatToken = null;
let tokenExpireTime = 0;

// Разбираем строку авторизации для прямой передачи учетных данных
const [clientId, clientSecret] = Buffer.from(config.gigachat.AUTH_KEY, 'base64')
  .toString('utf-8')
  .split(':');

// Функция для получения актуального токена GigaChat API
const getGigaChatToken = async () => {
  const currentTime = Date.now();
  
  // Проверяем, не истек ли токен (даем запас в 1 минуту)
  if (gigaChatToken && tokenExpireTime > currentTime + 60000) {
    return gigaChatToken;
  }
  
  // Форматируем данные для запроса токена
  const authData = new URLSearchParams();
  authData.append('scope', config.gigachat.SCOPE);
  authData.append('grant_type', 'client_credentials');
  
  try {
    console.log('Отправляем запрос на получение токена GigaChat, URL:', config.gigachat.AUTH_URL);
    
    // Создаем уникальный RqUID для запроса в формате UUID
    const requestId = generateUUID();
    console.log('Используем RqUID:', requestId);
    
    // Пробуем получить токен с использованием Basic-авторизации
    const response = await axios.post(
      config.gigachat.AUTH_URL, 
      authData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${config.gigachat.AUTH_KEY}`,
          'RqUID': requestId
        },
        httpsAgent: config.gigachat.httpsAgent
      }
    );
    
    if (response.data && (response.data.access_token || response.data.accessToken)) {
      gigaChatToken = response.data.access_token || response.data.accessToken;
      const expiresIn = response.data.expires_in || response.data.expiresIn || 1800; // По умолчанию 30 минут
      tokenExpireTime = currentTime + (expiresIn * 1000);
      console.log('Получен новый токен GigaChat API, действителен до:', new Date(tokenExpireTime).toISOString());
      return gigaChatToken;
    } else {
      throw new Error('Не удалось получить токен доступа (неожиданный формат ответа)');
    }
  } catch (error) {
    console.error('Ошибка при запросе токена:', error.message);
    
    try {
      console.log('Попытка альтернативного метода получения токена с client_id/client_secret');
      
      // Создаем уникальный RqUID для альтернативного запроса
      const altRequestId = generateUUID();
      console.log('Используем RqUID:', altRequestId);
      
      // Пробуем метод с явной передачей client_id и client_secret
      const altAuthData = new URLSearchParams();
      altAuthData.append('scope', config.gigachat.SCOPE);
      altAuthData.append('client_id', clientId);
      altAuthData.append('client_secret', clientSecret);
      altAuthData.append('grant_type', 'client_credentials');
      
      const altResponse = await axios.post(
        config.gigachat.AUTH_URL,
        altAuthData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'RqUID': altRequestId
          },
          httpsAgent: config.gigachat.httpsAgent
        }
      );
      
      if (altResponse.data && (altResponse.data.access_token || altResponse.data.accessToken)) {
        gigaChatToken = altResponse.data.access_token || altResponse.data.accessToken;
        const expiresIn = altResponse.data.expires_in || altResponse.data.expiresIn || 1800;
        tokenExpireTime = currentTime + (expiresIn * 1000);
        console.log('Получен новый токен GigaChat API (альтернативный метод), действителен до:', 
          new Date(tokenExpireTime).toISOString());
        return gigaChatToken;
      } else {
        throw new Error('Не удалось получить токен доступа (неожиданный формат ответа)');
      }
    } catch (altError) {
      console.error('Ошибка при альтернативном запросе токена:', altError.message);
      if (altError.response) {
        console.error('Детали ошибки:', altError.response.data || {});
        console.error('Статус:', altError.response.status);
      }
      
      console.log('Не удалось подключиться к GigaChat API, будем использовать локальную обработку запросов');
      return null;
    }
  }
};

// Функция для отправки запроса к GigaChat API
const sendChatRequest = async (message) => {
  // Получаем токен доступа
  const accessToken = await getGigaChatToken();
  
  // Если не удалось получить токен, возвращаем ошибку
  if (!accessToken) {
    return { error: 'Не удалось получить токен доступа' };
  }
  
  // Формируем запрос к GigaChat API
  const requestData = {
    model: "GigaChat:latest",
    messages: [
      {
        role: "system",
        content: "Вы - юридический ассистент, который специализируется на российском законодательстве. Отвечайте точно, корректно и по существу."
      },
      {
        role: "user",
        content: message
      }
    ],
    temperature: 0.7,
    max_tokens: 1500
  };
  
  try {
    console.log('Отправляем запрос к GigaChat API');
    
    // Создаем уникальный RqUID для запроса в формате UUID
    const requestId = generateUUID();
    console.log('Используем RqUID:', requestId);
    
    // Отправляем запрос к API
    const response = await axios.post(config.gigachat.API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'RqUID': requestId
      },
      httpsAgent: config.gigachat.httpsAgent
    });
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const aiResponse = response.data.choices[0].message.content;
      return { text: aiResponse };
    } else {
      console.error('Неожиданный формат ответа от GigaChat API:', response.data);
      return { error: 'Получен некорректный ответ от API' };
    }
  } catch (error) {
    console.error('Ошибка при запросе к GigaChat API:', error.message);
    
    if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data || {});
      
      // В случае ошибки 401 (недействительный токен) - сбрасываем текущий токен и пробуем еще раз
      if (error.response.status === 401) {
        console.log('Токен недействителен, сбрасываем и пробуем еще раз');
        gigaChatToken = null;
        tokenExpireTime = 0;
        
        try {
          // Повторная попытка с новым токеном
          return await sendChatRequest(message);
        } catch (retryError) {
          console.error('Ошибка при повторной попытке запроса:', retryError.message);
        }
      }
    }
    
    return { error: 'Ошибка при запросе к API' };
  }
};

module.exports = {
  getGigaChatToken,
  sendChatRequest
}; 