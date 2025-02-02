import React, { useState, useEffect, useRef } from "react";
import { FaTrashAlt, FaCircle, FaPaperPlane } from 'react-icons/fa';
import { MdDone, MdDoneAll, MdUpload } from 'react-icons/md';
import { notification, Spin, Tooltip, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { officeAPI } from '../shared/api/office';
import type { Office } from '../shared/api/office';
import { receptionAPI } from '../shared/api/reception';
import type { Message } from '../shared/api/reception';
import './Reception.css';

// Расширение интерфейса Message для добавления свойства error
interface ExtendedMessage extends Message {
  error?: boolean;
}

// Интервал обновления сообщений в мс (5 секунд)
const MESSAGES_REFRESH_INTERVAL = 5000;

const Reception: React.FC = () => {
  const { user } = useAuth();
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [selectedOfficeName, setSelectedOfficeName] = useState<string>("Не выбран");
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messageRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Обработка нажатия Enter для отправки сообщения
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Прокрутка до последнего сообщения при добавлении новых сообщений
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Загрузка списка офисов
  useEffect(() => {
    const fetchOffices = async () => {
      setLoading(true);
      try {
        const data = await officeAPI.getAll();
        
        setOffices(data);
        if (data.length > 0) {
          setSelectedOfficeId(data[0].id);
          setSelectedOfficeName(data[0].title);
        }
      } catch (error) {
        console.error('Ошибка при загрузке офисов:', error);
        notification.error({ 
          message: 'Ошибка загрузки данных',
          description: 'Не удалось загрузить список офисов'
        });
        
        // Временно используем моковые данные в случае ошибки
        const mockData = [
          { id: "1", title: "Кемерово", name: "Кемерово", description: "Кемерово", address: "Кемерово", online: true, lastActivity: "2 мин. назад", employee_count: 5, revenue: 0, orders: 0, data: [0, 0], contact_phone: null, website: null },
          { id: "2", title: "Красноярск", name: "Красноярск", description: "Красноярск", address: "Красноярск", online: false, lastActivity: "21.05.2023", employee_count: 3, revenue: 0, orders: 0, data: [0, 0], contact_phone: null, website: null },
          { id: "3", title: "Новокузнецк", name: "Новокузнецк", description: "Новокузнецк", address: "Новокузнецк", online: true, lastActivity: "1 ч. назад", employee_count: 4, revenue: 0, orders: 0, data: [0, 0], contact_phone: null, website: null },
        ];
        
        setOffices(mockData);
        setSelectedOfficeId(mockData[0].id);
        setSelectedOfficeName(mockData[0].title);
      } finally {
        setLoading(false);
      }
    };

    fetchOffices();

    // Очищаем интервал при размонтировании компонента
    return () => {
      if (messageRefreshInterval.current) {
        clearInterval(messageRefreshInterval.current);
      }
    };
  }, []);

  // Установка интервала обновления сообщений при выборе офиса
  useEffect(() => {
    if (messageRefreshInterval.current) {
      clearInterval(messageRefreshInterval.current);
    }

    if (selectedOfficeId) {
      fetchMessages();
      
      // Устанавливаем интервал для периодического обновления сообщений
      messageRefreshInterval.current = setInterval(() => {
        if (selectedOfficeId && !sendingMessage) {
          fetchMessages(false);
        }
      }, MESSAGES_REFRESH_INTERVAL);
    }

    return () => {
      if (messageRefreshInterval.current) {
        clearInterval(messageRefreshInterval.current);
      }
    };
  }, [selectedOfficeId]);

  // Функция для загрузки сообщений
  const fetchMessages = async (showLoading = true) => {
    if (!selectedOfficeId) return;
    
    if (showLoading) {
      setLoadingMessages(true);
    }
    
    try {
      const messages = await receptionAPI.getMessages(selectedOfficeId);
      setMessages(messages);
      
      // Отметить непрочитанные входящие сообщения как прочитанные
      const unreadMessages = messages.filter(msg => !msg.isMine && !msg.isRead);
      if (unreadMessages.length > 0) {
        await Promise.all(unreadMessages.map(msg => receptionAPI.markAsRead(msg.id)));
      }
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error);
      
      // Если это первая загрузка сообщений и произошла ошибка, показываем уведомление
      if (showLoading) {
        notification.error({ 
          message: 'Ошибка загрузки данных',
          description: 'Не удалось загрузить сообщения'
        });
        
        // Генерируем моковые сообщения
        const selectedOffice = offices.find(o => o.id === selectedOfficeId);
        if (selectedOffice) {
          const mockMessages: ExtendedMessage[] = [
            { 
              id: `${selectedOfficeId}-1`, 
              text: `Здравствуйте! Это сообщение из офиса "${selectedOffice.title}"`, 
              sender: "Менеджер", 
              timestamp: "10:00", 
              office_id: selectedOfficeId, 
              isRead: true, 
              isMine: false,
              createdAt: new Date().toISOString() 
            },
            { 
              id: `${selectedOfficeId}-2`, 
              text: "Привет! Как я могу помочь вам сегодня?", 
              sender: "Вы", 
              timestamp: "10:05", 
              office_id: selectedOfficeId, 
              isRead: true, 
              isMine: true,
              createdAt: new Date().toISOString() 
            }
          ];
          setMessages(mockMessages);
        }
      }
    } finally {
      if (showLoading) {
        setLoadingMessages(false);
      }
    }
  };

  // Отправка сообщения
  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedOfficeId) {
      setSendingMessage(true);
      
      try {
        // Создаем предварительное сообщение для немедленного отображения
        const tempMessage: ExtendedMessage = {
          id: `temp-${Date.now()}`,
          text: newMessage,
          sender: user?.username || "Вы",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          office_id: selectedOfficeId,
          isRead: false,
          isMine: true,
          createdAt: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, tempMessage]);
        const messageText = newMessage.trim();
        setNewMessage("");
        
        // Отправляем сообщение на сервер
        const sentMessage = await receptionAPI.sendMessage(selectedOfficeId, messageText);
        
        // Обновляем список сообщений
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempMessage.id 
              ? sentMessage 
              : msg
          )
        );
        
      } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        notification.error({ 
          message: 'Ошибка отправки',
          description: 'Не удалось отправить сообщение'
        });
        
        // Помечаем сообщение как неотправленное
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id.startsWith('temp-')
              ? { ...msg, error: true } 
              : msg
          )
        );
      } finally {
        setSendingMessage(false);
      }
    }
  };

  // Удаление сообщения
  const handleDeleteMessage = (messageId: string) => {
    Modal.confirm({
      title: 'Удалить сообщение?',
      icon: <ExclamationCircleOutlined />,
      content: 'Вы действительно хотите удалить это сообщение?',
      okText: 'Удалить',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          // Сначала удаляем из UI для мгновенной реакции
          setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
          
          // Затем отправляем запрос на сервер
          await receptionAPI.deleteMessage(messageId);
          
          notification.success({ 
            message: 'Сообщение удалено',
            description: 'Сообщение успешно удалено',
            duration: 2
          });
        } catch (error) {
          console.error('Ошибка при удалении сообщения:', error);
          notification.error({ 
            message: 'Ошибка',
            description: 'Не удалось удалить сообщение'
          });
          
          // В случае ошибки восстанавливаем сообщения
          fetchMessages();
        }
      }
    });
  };

  // Переключение между офисами
  const handleOfficeChange = (officeId: string) => {
    if (officeId === selectedOfficeId) return;
    
    const selectedOffice = offices.find((office) => office.id === officeId);
    setSelectedOfficeId(officeId);
    setSelectedOfficeName(selectedOffice ? selectedOffice.title : "Не выбран");
    setMessages([]);
  };

  // Загрузка файла
  const handleFileUpload = () => {
    // Имитируем загрузку файла
    notification.info({
      message: 'Загрузка файла',
      description: 'Функция загрузки файлов находится в разработке'
    });
  };

  return (
    <div className="reception-container">
      <h2 className="reception-title">Ресепшен</h2>
      <div className="reception-description">
        Централизованный чат с офисами компании
      </div>
      
      <div className="chat-container">
        <div className="office-list">
          <h3>Офисы</h3>
          {loading && offices.length === 0 ? (
            <div className="loading-container">
              <Spin />
              <span>Загрузка офисов...</span>
            </div>
          ) : (
            offices.map((office) => (
              <button
                key={office.id}
                className={`office-item ${selectedOfficeId === office.id ? "active" : ""}`}
                onClick={() => handleOfficeChange(office.id)}
              >
                <div className="office-info">
                  <span className="office-name-label">{office.title}</span>
                  {office.lastActivity && (
                    <span className="last-activity">{office.lastActivity}</span>
                  )}
                </div>
                <Tooltip title={office.online ? 'Онлайн' : 'Оффлайн'}>
                  <FaCircle 
                    className={`status-indicator ${office.online ? 'online' : 'offline'}`} 
                    size={12}
                  />
                </Tooltip>
              </button>
            ))
          )}
        </div>

        <div className="chat-section">
          <div className="chat-header">
            <h3>Чат: <span className="office-name">{selectedOfficeName}</span></h3>
          </div>
          
          <div className="messages-container" ref={messageContainerRef}>
            {loadingMessages ? (
              <div className="loading-container">
                <Spin />
                <span>Загрузка сообщений...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-messages">
                <p>Нет доступных сообщений</p>
                <p className="empty-hint">Отправьте новое сообщение, чтобы начать общение</p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.isMine ? 'mine' : ''} ${message.error ? 'error' : ''}`}
                >
                  <div className="message-content">
                    <span className="sender">{message.sender}</span>
                    <p className="text">{message.text}</p>
                    <div className="message-footer">
                      <span className="timestamp">{message.timestamp}</span>
                      {message.isMine && (
                        <span className="read-status">
                          {message.isRead ? <MdDoneAll /> : <MdDone />}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    className="delete-btn" 
                    onClick={() => handleDeleteMessage(message.id)}
                    disabled={!message.isMine && user?.role !== 'admin'}
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="input-section">
            <textarea
              placeholder="Введите сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!selectedOfficeId || loadingMessages || sendingMessage}
            />
            <div className="chat-actions">
              <Tooltip title="Загрузить файл">
                <button className="upload-button" onClick={handleFileUpload}>
                  <MdUpload />
                </button>
              </Tooltip>
              <button 
                className="send-button" 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !selectedOfficeId || loadingMessages || sendingMessage}
              >
                {sendingMessage ? <Spin size="small" /> : <FaPaperPlane />}
                <span>Отправить</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reception; 