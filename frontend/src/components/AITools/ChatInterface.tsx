import React, { useState, useRef, useEffect } from 'react';
import { FiTrash2, FiUser, FiClipboard, FiPaperclip, FiDownload } from 'react-icons/fi';
import { FaRobot, FaBrain } from 'react-icons/fa';
import { buildApiUrl, getAuthHeaders } from '../../shared/utils/apiUtils';
import Scanner from '../Scan/Scanner';
import './ChatInterface.css';

// Тип сообщения
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  image?: string;
  recognizedText?: string;
  docxUrl?: string;
}

// Функция проверки статуса сервера
const checkServerHealth = async (): Promise<{ isHealthy: boolean; message: string; details?: any }> => {
  try {
    const response = await fetch(buildApiUrl('/health'), {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 секунд таймаут для проверки здоровья
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        isHealthy: true,
        message: 'Сервер работает нормально',
        details: data
      };
    } else {
      return {
        isHealthy: false,
        message: `Сервер вернул ошибку ${response.status}`,
        details: { status: response.status, statusText: response.statusText }
      };
    }
  } catch (error: any) {
    return {
      isHealthy: false,
      message: 'Сервер недоступен',
      details: { error: error.message }
    };
  }
};

const ChatInterface: React.FC = () => {
  // Состояния
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Очистка URL для предпросмотра при размонтировании
  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  // Функция для сжатия изображения перед загрузкой
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          // Создаем canvas для сжатия изображения
          const canvas = document.createElement('canvas');
          
          // Определяем размеры с сохранением пропорций
          let width = img.width;
          let height = img.height;
          
          // Максимальные размеры для сжатия
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Конвертируем canvas в blob с качеством 80%
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Не удалось создать Blob'));
                return;
              }
              
              // Создаем новый файл из blob с тем же именем, но сжатый
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              console.log(`Размер оригинального файла: ${file.size / 1024} KB`);
              console.log(`Размер сжатого файла: ${compressedFile.size / 1024} KB`);
              
              // Если сжатый файл все еще больше 1МБ, сжимаем сильнее
              if (compressedFile.size > 1024 * 1024) {
                // Рекурсивно сжимаем с более низким качеством
                canvas.toBlob(
                  (blob2) => {
                    if (!blob2) {
                      reject(new Error('Не удалось создать Blob при повторном сжатии'));
                      return;
                    }
                    
                    const moreCompressedFile = new File([blob2], file.name, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    
                    console.log(`Размер повторно сжатого файла: ${moreCompressedFile.size / 1024} KB`);
                    resolve(moreCompressedFile);
                  },
                  'image/jpeg',
                  0.5  // Более сильное сжатие (50% качества)
                );
              } else {
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            0.8  // Качество 80%
          );
        };
        
        img.onerror = () => {
          reject(new Error('Не удалось загрузить изображение'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('Не удалось прочитать файл'));
      };
    });
  };

  // Обработка выбора изображения
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Проверка, что файл - изображение
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    
    setSelectedImage(file);
    
    // Создаем URL для предпросмотра
    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);
  };

  // Отмена выбора изображения
  const handleCancelImage = () => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    setSelectedImage(null);
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Функция для распознавания текста с изображения с использованием серверного API
  const recognizeText = async (imageFile: File): Promise<{ text: string, docxFileName: string }> => {
    try {
      setIsProcessingImage(true);
      
      // Сжимаем изображение перед отправкой
      const compressedImage = await compressImage(imageFile);
      
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('image', compressedImage);
      
      // Получаем JWT-токен из localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }
      
      // Отправляем запрос на сервер
      const response = await fetch(buildApiUrl('/ocr'), {
        method: 'POST',
        body: formData,
        headers: (() => { const h = getAuthHeaders(); delete (h as any)['Content-Type']; return h; })(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
      }
      
      const result = await response.json();
      return {
        text: result.text,
        docxFileName: result.docxFileName
      };
    } catch (error) {
      console.error('Ошибка при распознавании текста:', error);
      throw error;
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Функция для скачивания docx файла с сервера
  const downloadDocx = (fileName: string, messageId: string) => {
    // Получаем JWT-токен из localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Требуется авторизация');
      return;
    }

    // Создаем ссылку для скачивания
    const downloadUrl = buildApiUrl(`/docx/${fileName}`);
    
    // Создаем временную ссылку для скачивания
    const link = document.createElement('a');
    link.href = `${downloadUrl}?token=${encodeURIComponent(token)}`;
    link.download = `распознанный_текст_${messageId}.docx`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Функция для получения ответа от GigaChat API через сервер
  const getGigaChatResponse = async (message: string): Promise<string> => {
    try {
      // Получаем JWT-токен из localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        return '❌ **Ошибка авторизации**\n\nВы не авторизованы в системе. Пожалуйста, войдите в аккаунт для использования AI-помощника.\n\n**Что делать:**\n• Перейдите на страницу входа\n• Введите ваши учетные данные\n• Попробуйте снова';
      }
      
      // Проверяем доступность сервера
      let response: Response;
      try {
        response = await fetch(buildApiUrl('/chat'), {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ message }),
          signal: AbortSignal.timeout(30000) // 30 секунд таймаут
        });
      } catch (fetchError: any) {
        console.error('Ошибка сети при запросе к GigaChat:', fetchError);
        
        // Обработка различных типов сетевых ошибок
        if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
          return '⏱️ **Превышено время ожидания**\n\nСервер не отвечает в течение 30 секунд.\n\n**Возможные причины:**\n• Медленное интернет-соединение\n• Высокая нагрузка на сервер GigaChat\n• Временные проблемы с сетью\n\n**Что делать:**\n• Проверьте интернет-соединение\n• Попробуйте снова через несколько секунд\n• Сократите длину сообщения';
        }
        
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
          // Проверяем статус сервера для более точной диагностики
          try {
            const serverHealth = await checkServerHealth();
            if (serverHealth.isHealthy) {
              return '🌐 **Ошибка сети при запросе к GigaChat**\n\nСервер работает, но запрос к GigaChat API не прошел.\n\n**Возможные причины:**\n• Проблемы с внешним API GigaChat\n• Временные сетевые проблемы\n• Блокировка запросов\n\n**Что делать:**\n• Попробуйте снова через несколько секунд\n• Проверьте настройки сети\n• Обратитесь к администратору';
            } else {
              return `🔧 **Сервер недоступен**\n\n${serverHealth.message}\n\n**Возможные причины:**\n• Сервер не запущен\n• Проблемы с подключением к базе данных\n• Технические работы\n\n**Что делать:**\n• Обновите страницу через минуту\n• Обратитесь к администратору\n• Проверьте статус сервера`;
            }
          } catch {
            return '🌐 **Ошибка сети**\n\nНе удается подключиться к серверу.\n\n**Возможные причины:**\n• Отсутствует интернет-соединение\n• Сервер временно недоступен\n• Проблемы с DNS\n\n**Что делать:**\n• Проверьте подключение к интернету\n• Обновите страницу (F5)\n• Попробуйте снова через минуту\n• Обратитесь к администратору, если проблема повторяется';
          }
        }
        
        return `🔌 **Ошибка подключения**\n\nНе удается установить соединение с сервером.\n\n**Техническая информация:**\n${fetchError.message || 'Неизвестная ошибка сети'}\n\n**Что делать:**\n• Проверьте интернет-соединение\n• Попробуйте обновить страницу\n• Обратитесь в техподдержку, если проблема не решается`;
      }
      
      // Обработка HTTP ошибок
      if (!response.ok) {
        let errorMessage = '';
        let errorData: any = {};
        
        try {
          errorData = await response.json();
        } catch {
          // Если не удается распарсить JSON ответ
        }
        
        switch (response.status) {
          case 400:
            errorMessage = '📝 **Некорректный запрос**\n\nСервер не может обработать ваше сообщение.\n\n**Возможные причины:**\n• Слишком длинное сообщение\n• Некорректные символы в тексте\n• Неподдерживаемый формат\n\n**Что делать:**\n• Сократите длину сообщения\n• Уберите специальные символы\n• Попробуйте переформулировать вопрос';
            break;
            
          case 401:
            errorMessage = '🔐 **Ошибка авторизации**\n\nВаша сессия истекла или токен недействителен.\n\n**Что делать:**\n• Выйдите из аккаунта и войдите снова\n• Обновите страницу\n• Очистите кэш браузера';
            break;
            
          case 403:
            errorMessage = '🚫 **Доступ запрещен**\n\nУ вас нет прав для использования AI-помощника.\n\n**Что делать:**\n• Обратитесь к администратору\n• Проверьте ваш тарифный план\n• Убедитесь, что ваш аккаунт активен';
            break;
            
          case 429:
            errorMessage = '⏳ **Превышен лимит запросов**\n\nВы отправили слишком много запросов за короткое время.\n\n**Что делать:**\n• Подождите несколько минут\n• Сократите частоту запросов\n• Попробуйте снова позже';
            break;
            
          case 500:
            errorMessage = '⚠️ **Ошибка сервера**\n\nВнутренняя ошибка на сервере.\n\n**Что делать:**\n• Попробуйте снова через несколько минут\n• Обратитесь в техподдержку, если проблема повторяется\n• Сообщите администратору о проблеме';
            break;
            
          case 502:
          case 503:
          case 504:
            errorMessage = '🔧 **Сервер недоступен**\n\nСервер временно недоступен или проходит обслуживание.\n\n**Что делать:**\n• Попробуйте снова через несколько минут\n• Проверьте статус сервиса\n• Обратитесь к администратору';
            break;
            
          default:
            errorMessage = `❌ **Ошибка HTTP ${response.status}**\n\nСервер вернул неожиданную ошибку.\n\n**Техническая информация:**\n${errorData.error || errorData.message || 'Неизвестная ошибка'}\n\n**Что делать:**\n• Попробуйте снова\n• Обратитесь в техподдержку с кодом ошибки ${response.status}`;
        }
        
        console.error(`HTTP Error ${response.status}:`, errorData);
        return errorMessage;
      }
      
      // Парсинг успешного ответа
      try {
        const result = await response.json();
        
        if (!result || typeof result.text !== 'string') {
          return '📄 **Ошибка формата ответа**\n\nСервер вернул некорректный ответ.\n\n**Что делать:**\n• Попробуйте переформулировать вопрос\n• Попробуйте снова через несколько секунд\n• Обратитесь в техподдержку, если проблема повторяется';
        }
        
        return result.text;
        
      } catch (parseError) {
        console.error('Ошибка парсинга ответа:', parseError);
        return '🔧 **Ошибка обработки ответа**\n\nНе удается обработать ответ от сервера.\n\n**Что делать:**\n• Попробуйте снова\n• Обновите страницу\n• Обратитесь в техподдержку, если проблема не решается';
      }
      
    } catch (error: any) {
      console.error('Неожиданная ошибка при запросе к GigaChat API:', error);
      
      // Обработка неожиданных ошибок
      return `🚨 **Неожиданная ошибка**\n\nПроизошла непредвиденная ошибка при обращении к AI-помощнику.\n\n**Техническая информация:**\n${error.message || error.toString()}\n\n**Что делать:**\n• Обновите страницу (F5)\n• Попробуйте снова\n• Обратитесь в техподдержку с описанием проблемы\n• Сообщите время возникновения ошибки: ${new Date().toLocaleString()}`;
    }
  };

  // Обработка отправки сообщения
  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage && !previewImage) return;
    
    // Создаем ID для нового сообщения
    const newMessageId = `msg_${Date.now()}`;
    
    // Добавляем сообщение пользователя
    const userMessage: Message = {
      id: newMessageId,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      image: previewImage || undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    let recognizedText = '';
    let docxFileName = '';
    let aiResponseContent = '';
    
    try {
      // Если было отправлено изображение
      if (userMessage.image) {
        try {
          // Для отсканированного изображения создаем File из Data URL
          let imageFile = selectedImage;
          
          if (!imageFile && previewImage) {
            // Преобразуем Data URL в File объект для отсканированного изображения
            const response = await fetch(previewImage);
            const blob = await response.blob();
            imageFile = new File([blob], 'scanned_image.jpg', { type: 'image/jpeg' });
          }
          
          if (imageFile) {
            // Распознаем текст с изображения через серверное API
            const result = await recognizeText(imageFile);
            recognizedText = result.text;
            docxFileName = result.docxFileName;
            aiResponseContent = `Я обработал ваше изображение и распознал текст:\n\n${recognizedText}\n\nФайл DOCX готов к скачиванию.`;
          }
        } catch (error: any) {
          recognizedText = `Ошибка при распознавании текста: ${error.message || 'неизвестная ошибка'}`;
          aiResponseContent = `Ошибка при распознавании текста: ${error.message || 'неизвестная ошибка'}`;
        }
      } else {
        // Для текстовых сообщений используем GigaChat API
        aiResponseContent = await getGigaChatResponse(inputMessage);
      }
      
      // Очищаем выбранное изображение
      if (selectedImage || previewImage) {
        handleCancelImage();
      }
      
      // Добавляем ответ ИИ
      const aiResponse: Message = {
        id: `msg_${Date.now()}`,
        content: aiResponseContent,
        sender: 'ai',
        timestamp: new Date(),
        recognizedText: recognizedText || undefined,
        docxUrl: docxFileName || undefined
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error: any) {
      // В случае ошибки выводим сообщение об ошибке
      const errorResponse: Message = {
        id: `msg_${Date.now()}`,
        content: `Произошла ошибка: ${error.message || 'неизвестная ошибка'}`,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  // Очистка чата
  const handleClearChat = () => {
    setMessages([]);
  };

  // Открытие диалога выбора файла
  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Форматирование контента сообщения с поддержкой базового форматирования
  const formatMessageContent = (content: string) => {
    // Заменяем переносы строк на <br>
    let formattedContent = content.replace(/\n/g, '<br>');
    
    // Заменяем заголовки (## Заголовок)
    formattedContent = formattedContent.replace(/## (.*?)(<br>|$)/g, '<h3>$1</h3>');
    
    // Обработка списков
    if (content.includes('\n* ') || content.includes('\n1. ')) {
      const lines = content.split('\n');
      let inUnorderedList = false;
      let inOrderedList = false;
      let resultHtml = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Маркированный список
        if (line.startsWith('* ')) {
          if (!inUnorderedList) {
            resultHtml += '<ul style="margin-top: 10px; margin-bottom: 10px;">';
            inUnorderedList = true;
          }
          resultHtml += `<li>${line.substring(2)}</li>`;
        } 
        // Нумерованный список
        else if (/^\d+\.\s/.test(line)) {
          if (!inOrderedList) {
            resultHtml += '<ol style="margin-top: 10px; margin-bottom: 10px;">';
            inOrderedList = true;
          }
          resultHtml += `<li>${line.substring(line.indexOf('.') + 2)}</li>`;
        }
        // Закрываем списки при выходе из них
        else {
          if (inUnorderedList) {
            resultHtml += '</ul>';
            inUnorderedList = false;
          }
          if (inOrderedList) {
            resultHtml += '</ol>';
            inOrderedList = false;
          }
          resultHtml += line + '<br>';
        }
      }
      
      // Закрываем списки, если достигли конца текста
      if (inUnorderedList) resultHtml += '</ul>';
      if (inOrderedList) resultHtml += '</ol>';
      
      // Заменяем содержимое с учетом списков
      formattedContent = resultHtml;
    } else {
      // Если нет списков, просто форматируем текст
      
      // Заменяем маркированные списки (* элемент)
      formattedContent = formattedContent.replace(/\* (.*?)(<br>|$)/g, '<li>$1</li>');
      formattedContent = formattedContent.replace(/<li>(.*?)<\/li>(\s*<li>)/g, '<ul><li>$1</li>$2');
      formattedContent = formattedContent.replace(/<li>(.*?)<\/li>(\s*)(?!<li>)/g, '<ul><li>$1</li></ul>');
      
      // Заменяем нумерованные списки (1. элемент)
      formattedContent = formattedContent.replace(/(\d+)\. (.*?)(<br>|$)/g, '<li>$2</li>');
    }
    
    // Заменяем жирный текст (**текст**)
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Заменяем курсив (*текст*)
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Заменяем простые таблицы в формате Markdown
    if (content.includes('|')) {
      const lines = content.split('\n');
      let tableStartIndex = -1;
      let tableEndIndex = -1;
      
      // Ищем начало и конец таблицы
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('|') && tableStartIndex === -1) {
          tableStartIndex = i;
        } else if (!lines[i].trim().startsWith('|') && tableStartIndex !== -1 && tableEndIndex === -1) {
          tableEndIndex = i - 1;
          break;
        }
      }
      
      if (tableStartIndex !== -1) {
        if (tableEndIndex === -1) tableEndIndex = lines.length - 1;
        
        // Формируем HTML таблицу
        let tableHtml = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin-top: 10px; margin-bottom: 10px;">';
        
        for (let i = tableStartIndex; i <= tableEndIndex; i++) {
          const row = lines[i].trim();
          
          // Пропускаем строку разделителя (|----|----|----|)
          if (row.replace(/\|/g, '').trim().replace(/-/g, '').trim() === '') continue;
          
          // Разбиваем строку на ячейки
          const cells = row.split('|').filter(cell => cell.trim() !== '');
          
          tableHtml += '<tr>';
          
          for (let j = 0; j < cells.length; j++) {
            // Первая строка - заголовок
            if (i === tableStartIndex) {
              tableHtml += `<th style="text-align: left; padding: 8px; border: 1px solid var(--color-accent-light);">${cells[j].trim()}</th>`;
            } else {
              tableHtml += `<td style="text-align: left; padding: 8px; border: 1px solid var(--color-accent-light);">${cells[j].trim()}</td>`;
            }
          }
          
          tableHtml += '</tr>';
        }
        
        tableHtml += '</table>';
        
        // Заменяем таблицу в Markdown на HTML таблицу
        const tableMarkdown = lines.slice(tableStartIndex, tableEndIndex + 1).join('<br>');
        formattedContent = formattedContent.replace(tableMarkdown, tableHtml);
      }
    }
    
    return formattedContent;
  };

  // Копирование сообщения в буфер обмена
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        // Можно добавить уведомление об успешном копировании
        console.log('Текст скопирован');
      })
      .catch(err => {
        console.error('Ошибка при копировании: ', err);
      });
  };

  // Обработка отправки по нажатию Enter (с Shift+Enter для новой строки)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Автоматическое изменение высоты текстового поля
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    setInputMessage(textarea.value);
  };

  return (
    <div className="chat-container">
      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-header-icon">
              <FaBrain />
            </div>
            <h2>AI-помощник для юридических задач</h2>
          </div>
        </div>
        <div className="chat-messages">
          {messages.length > 0 ? (
            <>
              {messages.map(message => (
                <div 
                  key={message.id} 
                  className={message.sender === 'user' ? 'user-message' : 'ai-message'}
                >
                  <div>
                    <div className="message-avatar">
                      {message.sender === 'user' ? <FiUser /> : <FaRobot />}
                    </div>
                    <div className="message-content">
                      {message.image && (
                        <div className="message-image">
                          <img src={message.image} alt="Изображение" />
                        </div>
                      )}
                      <div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
                      {message.docxUrl && (
                        <div className="docx-actions">
                          <button 
                            className="download-button" 
                            onClick={() => downloadDocx(message.docxUrl!, message.id)}
                            title="Скачать документ Word"
                          >
                            <FiDownload /> Скачать документ Word
                          </button>
                        </div>
                      )}
                      <div className="message-actions">
                        <button 
                          className="copy-button" 
                          onClick={() => handleCopyMessage(message.content)}
                          title="Копировать"
                        >
                          <FiClipboard />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(isTyping || isProcessingImage) && (
                <div className="ai-message typing">
                  <div>
                    <div className="message-avatar">
                      <FaRobot />
                    </div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      {isProcessingImage && <div className="processing-text">Обрабатываю изображение и распознаю текст через сервер...</div>}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-chat">
              <h2>AI-помощник для юридических задач</h2>
              <p>Задайте вопрос или загрузите изображение документа для обработки и конвертации в текстовый формат</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {messages.length > 0 && (
          <button className="clear-chat-button" onClick={handleClearChat} title="Очистить чат">
            <FiTrash2 />
          </button>
        )}
        
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            {previewImage && (
              <div className="image-preview-container">
                <div className="image-preview">
                  <img src={previewImage} alt="Предпросмотр" />
                  <button className="cancel-image-button" onClick={handleCancelImage}>
                    &times;
                  </button>
                </div>
              </div>
            )}
            <div className="chat-input-box">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button 
                className="attachment-button" 
                onClick={handleOpenFileDialog}
                title="Прикрепить изображение"
              >
                <FiPaperclip />
              </button>
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Напишите сообщение..."
                rows={1}
                className="chat-input"
                style={{ minHeight: '24px' }}
              />
              <button 
                className="send-button" 
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() && !selectedImage}
                title="Отправить"
              >
                ➤
              </button>
            </div>
          </div>
          <div className="input-info">
            Нажмите Enter для отправки, Shift+Enter для новой строки
          </div>
        </div>
      </div>
      {showScanner && (
        <Scanner 
          onScanComplete={(imageData) => {
            setPreviewImage(imageData);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;