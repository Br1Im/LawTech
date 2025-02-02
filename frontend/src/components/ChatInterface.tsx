import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiPlus, FiUser, FiClipboard } from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import './ChatInterface.css';

// Тип сообщения
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

// Тип истории чата
interface ChatHistory {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

const ChatInterface: React.FC = () => {
  // Состояния
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Обработка отправки сообщения
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    // Создаем ID для нового сообщения
    const newMessageId = `msg_${Date.now()}`;
    
    // Добавляем сообщение пользователя
    const userMessage: Message = {
      id: newMessageId,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    // Имитируем ответ AI через 1 секунду
    setTimeout(() => {
      const aiResponse: Message = {
        id: `msg_${Date.now()}`,
        content: getAIResponse(inputMessage),
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      
      // Если это новый чат, создаем историю
      if (!activeChatId) {
        const newChatId = `chat_${Date.now()}`;
        const newChatHistory: ChatHistory = {
          id: newChatId,
          title: inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : ''),
          lastMessage: aiResponse.content.slice(0, 40) + (aiResponse.content.length > 40 ? '...' : ''),
          timestamp: new Date()
        };
        
        setChatHistories(prev => [newChatHistory, ...prev]);
        setActiveChatId(newChatId);
      } else {
        // Обновляем существующую историю
        setChatHistories(prev => 
          prev.map(chat => 
            chat.id === activeChatId 
              ? { 
                  ...chat, 
                  lastMessage: aiResponse.content.slice(0, 40) + (aiResponse.content.length > 40 ? '...' : ''),
                  timestamp: new Date() 
                } 
              : chat
          )
        );
      }
    }, 1000);
  };

  // Форматирование контента сообщения с поддержкой базового форматирования
  const formatMessageContent = (content: string) => {
    // Заменяем переносы строк на <br>
    let formattedContent = content.replace(/\n/g, '<br>');
    
    // Заменяем заголовки (## Заголовок)
    formattedContent = formattedContent.replace(/## (.*?)(\n|$)/g, '<h3>$1</h3>');
    
    // Заменяем списки (* элемент)
    formattedContent = formattedContent.replace(/\* (.*?)(\n|$)/g, '<li>$1</li>');
    formattedContent = formattedContent.replace(/<li>(.*?)<\/li>(\s*<li>)/g, '<ul><li>$1</li>$2');
    formattedContent = formattedContent.replace(/<li>(.*?)<\/li>(\s*)(?!<li>)/g, '<ul><li>$1</li></ul>');
    
    // Заменяем нумерованные списки (1. элемент)
    formattedContent = formattedContent.replace(/(\d+)\. (.*?)(\n|$)/g, '<li>$2</li>');
    
    // Заменяем жирный текст (**текст**)
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Заменяем курсив (*текст*)
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return formattedContent;
  };

  // Имитация ответов AI
  const getAIResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
      return 'Здравствуйте! Чем я могу вам помочь сегодня?';
    } else if (lowerMessage.includes('документ') || lowerMessage.includes('договор')) {
      return `## Документ подготовлен

Я создал черновик документа на основе вашего запроса. Вот что вы можете сделать дальше:

1. Просмотреть документ в системе документооборота
2. Отправить на согласование руководителю
3. Внести изменения в текущую версию

Документ содержит все необходимые разделы согласно стандартам компании.`;
    } else if (lowerMessage.includes('анализ') || lowerMessage.includes('статистика')) {
      return `Я проанализировал данные за последний квартал:

Показатель: Выручка
Значение: 2,450,000₽ 
Изменение: +12.3%

Показатель: Клиенты
Значение: 157
Изменение: +8.5%

Показатель: Сделки
Значение: 234
Изменение: +15.2%

Наиболее эффективным был отдел продаж в Санкт-Петербурге, увеличивший показатели на 18%.`;
    } else if (lowerMessage.includes('помощь') || lowerMessage.includes('помоги')) {
      return `Я могу помочь вам со следующими задачами:

* Составление и анализ документов
* Поиск информации в базе данных
* Подготовка отчетов и аналитики
* Планирование задач и встреч
* Автоматизация рутинных задач

Просто опишите, что вам нужно сделать, и я постараюсь помочь.`;
    } else {
      return 'Я обработал ваш запрос. Могу я помочь вам с чем-то еще?';
    }
  };

  // Создание нового чата
  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
  };

  // Переключение на существующий чат
  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    // В реальном приложении здесь был бы запрос на сервер за сообщениями
    setMessages([
      {
        id: `msg_${Date.now() - 1000}`,
        content: 'Чем я могу вам помочь?',
        sender: 'ai',
        timestamp: new Date(Date.now() - 1000)
      }
    ]);
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
      <div className="chat-sidebar">
        <button className="new-chat-button" onClick={handleNewChat}>
          <FiPlus /> Новый чат
        </button>
        
        <div className="chat-history">
          <h3>История чатов</h3>
          {chatHistories.length > 0 ? (
            <ul>
              {chatHistories.map(chat => (
                <li 
                  key={chat.id} 
                  className={activeChatId === chat.id ? 'active' : ''}
                  onClick={() => handleSelectChat(chat.id)}
                >
                  <div className="chat-history-item">
                    <span className="chat-title">{chat.title}</span>
                    <span className="chat-preview">{chat.lastMessage}</span>
                    <span className="chat-time">
                      {chat.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-history">Нет истории чатов</div>
          )}
        </div>
      </div>
      
      <div className="chat-main">
        <div className="chat-messages">
          {messages.length > 0 ? (
            <>
              {messages.map(message => (
                <div 
                  key={message.id} 
                  className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
                >
                  <div className="message-avatar">
                    {message.sender === 'user' ? <FiUser /> : <FaRobot />}
                  </div>
                  <div className="message-content">
                    <div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
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
              ))}
              {isTyping && (
                <div className="message ai-message">
                  <div className="message-avatar">
                    <FaRobot />
                  </div>
                  <div className="message-content typing">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-chat">
              <h2>AI-помощник для юридических задач</h2>
              <p>Задайте вопрос, и я помогу с составлением документов, анализом данных или поиском информации</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Напишите сообщение..."
              rows={1}
              className="chat-input"
            />
            <button 
              className="send-button" 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
            >
              <FiSend />
            </button>
          </div>
          <div className="input-info">
            Нажмите Enter для отправки, Shift+Enter для новой строки
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 