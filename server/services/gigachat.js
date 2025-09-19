/**
 * Сервис для взаимодействия с GigaChat API
 */
const axios = require('axios');
const config = require('../config');
const { generateUUID } = require('../utils');

// Хранилище токенов GigaChat
let gigaChatToken = null;
let tokenExpireTime = 0;

// Функция для получения актуального токена GigaChat API
const getGigaChatToken = async () => {
  const currentTime = Date.now();
  
  // Проверяем, не истек ли токен (даем запас в 1 минуту)
  if (gigaChatToken && tokenExpireTime > currentTime + 60000) {
    return gigaChatToken;
  }
  
  // Форматируем данные для запроса токена согласно новому API v2/oauth
  const authData = new URLSearchParams();
  authData.append('scope', config.gigachat.SCOPE);
  
  try {
    console.log('Отправляем запрос на получение токена GigaChat, URL:', config.gigachat.AUTH_URL);
    
    // Создаем уникальный RqUID для запроса в формате UUID
    const requestId = generateUUID();
    console.log('Используем RqUID:', requestId);
    
    // Получаем токен с использованием Basic-авторизации согласно новому API
    const response = await axios.post(
      config.gigachat.AUTH_URL, 
      authData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${config.gigachat.AUTH_KEY}`,
          'RqUID': requestId,
          'User-Agent': 'LawTech-Client/1.0'
        },
        httpsAgent: config.gigachat.httpsAgent,
        timeout: 60000
      }
    );
    
    if (response.data && response.data.access_token) {
      gigaChatToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 1800; // По умолчанию 30 минут
      tokenExpireTime = currentTime + (expiresIn * 1000);
      console.log('Получен новый токен GigaChat API, действителен до:', new Date(tokenExpireTime).toISOString());
      return gigaChatToken;
    } else {
      throw new Error('Не удалось получить токен доступа (неожиданный формат ответа)');
    }
  } catch (error) {
    console.error('Ошибка при запросе токена:', error.message);
    if (error.response) {
      console.error('Детали ошибки:', error.response.data || {});
      console.error('Статус:', error.response.status);
    }
    
    console.log('Не удалось подключиться к GigaChat API, будем использовать локальную обработку запросов');
    return null;
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
  
  // Формируем запрос к GigaChat API с использованием базовой модели GigaChat
  const requestData = {
    model: "GigaChat",
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
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'RqUID': requestId,
        'User-Agent': 'LawTech-Client/1.0'
      },
      httpsAgent: config.gigachat.httpsAgent,
      timeout: 60000
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