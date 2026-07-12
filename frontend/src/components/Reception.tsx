import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaTrashAlt, FaCircle, FaPaperPlane } from 'react-icons/fa';
import { MdDone, MdDoneAll, MdUpload } from 'react-icons/md';
import { notification, Spin, Tooltip, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { officeAPI } from '../shared/api/office';
import type { Office } from '../shared/api/office';
import { receptionAPI } from '../shared/api/reception';
import type { Message, ChatChannel } from '../shared/api/reception';
import './Reception.css';

interface ExtendedMessage extends Message {
  error?: boolean;
  senderRole?: string;
  senderFirstName?: string;
  senderLastName?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  okk: "Руководитель",
  cc_manager: "Нач. колл-центра",
  cc_operator: "Оператор КЦ",
  director: "Директор",
  lawyer: "Юрист",
  expert: "Эксперт",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#6B7280",
  manager: "#3b82f6",
  okk: "#8b5cf6",
  cc_manager: "#ef4444",
  cc_operator: "#f97316",
  director: "#dc2626",
  lawyer: "#10b981",
  expert: "#f59e0b",
};

const MESSAGES_REFRESH_INTERVAL = 4000;

const Reception: React.FC = () => {
  const { user } = useAuth();
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [selectedOfficeName, setSelectedOfficeName] = useState<string>("Не выбран");
  const isCallCenterRole = user?.role === 'cc_manager' || user?.role === 'cc_operator';
  const [activeChannel, setActiveChannel] = useState<ChatChannel>(isCallCenterRole ? 'call_center' : 'reception');
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const messageRefreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = useCallback(async (showLoading = true) => {
    if (!selectedOfficeId) return;
    
    if (showLoading) {
      setLoadingMessages(true);
    }
    
    try {
      const data = await receptionAPI.getMessages(selectedOfficeId, activeChannel);
      const messagesArray = Array.isArray(data) ? data : [];
      setMessages(messagesArray);
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error);
      if (showLoading) {
        notification.error({ 
          message: 'Ошибка загрузки данных',
          description: 'Не удалось загрузить сообщения'
        });
      }
    } finally {
      if (showLoading) {
        setLoadingMessages(false);
      }
    }
  }, [selectedOfficeId, activeChannel]);

  // Загрузка офисов
  useEffect(() => {
    const fetchOffices = async () => {
      setLoading(true);
      try {
        const response = await officeAPI.getAll();
        const data = Array.isArray(response) ? response : (response && typeof response === 'object' && 'data' in response ? (response as { data: Office[] }).data : []);
        
        setOffices(data);

        const userOfficeId = user?.office_id || user?.officeId;
        if (userOfficeId && data.length > 0) {
          const userOffice = data.find((o: Office) => o.id?.toString() === userOfficeId?.toString());
          if (userOffice) {
            setSelectedOfficeId(userOffice.id?.toString());
            setSelectedOfficeName(userOffice.title || userOffice.name || "");
          } else {
            setSelectedOfficeId(data[0].id?.toString());
            setSelectedOfficeName(data[0].title || data[0].name || "");
          }
        } else if (data.length > 0) {
          setSelectedOfficeId(data[0].id?.toString());
          setSelectedOfficeName(data[0].title || data[0].name || "");
        }
      } catch (error) {
        console.error('Ошибка при загрузке офисов:', error);
        notification.error({ 
          message: 'Ошибка загрузки данных',
          description: 'Не удалось загрузить список офисов'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOffices();

    return () => {
      if (messageRefreshInterval.current) {
        clearInterval(messageRefreshInterval.current);
      }
    };
  }, [user]);

  // Обновление сообщений при смене офиса или канала
  useEffect(() => {
    if (messageRefreshInterval.current) {
      clearInterval(messageRefreshInterval.current);
    }

    if (selectedOfficeId) {
      fetchMessages(true);
      
      messageRefreshInterval.current = setInterval(() => {
        fetchMessages(false);
      }, MESSAGES_REFRESH_INTERVAL);
    }

    return () => {
      if (messageRefreshInterval.current) {
        clearInterval(messageRefreshInterval.current);
      }
    };
  }, [selectedOfficeId, activeChannel, fetchMessages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedOfficeId) {
      setSendingMessage(true);
      
      try {
        const tempMessage: ExtendedMessage = {
          id: `temp-${Date.now()}`,
          text: newMessage,
          sender: user?.name || user?.username || "Вы",
          senderRole: user?.role,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          office_id: selectedOfficeId,
          isRead: false,
          isMine: true,
          createdAt: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, tempMessage]);
        const messageText = newMessage.trim();
        setNewMessage("");
        
        const sentMessage = await receptionAPI.sendMessage(selectedOfficeId, messageText, activeChannel);
        
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempMessage.id ? sentMessage : msg
          )
        );
        
      } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        notification.error({ 
          message: 'Ошибка отправки',
          description: 'Не удалось отправить сообщение'
        });
        
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

  const handleDeleteMessage = (messageId: string) => {
    Modal.confirm({
      title: 'Удалить сообщение?',
      icon: <ExclamationCircleOutlined />,
      content: 'Вы действительно хотите удалить это сообщение?',
      okText: 'Удалить',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
          await receptionAPI.deleteMessage(messageId);
          notification.success({ 
            message: 'Сообщение удалено',
            duration: 2
          });
        } catch (error) {
          console.error('Ошибка при удалении сообщения:', error);
          notification.error({ 
            message: 'Ошибка',
            description: 'Не удалось удалить сообщение'
          });
          fetchMessages();
        }
      }
    });
  };

  const handleOfficeChange = (officeId: string) => {
    if (officeId === selectedOfficeId) return;
    const selectedOffice = offices.find((office) => office.id === officeId);
    setSelectedOfficeId(officeId);
    setSelectedOfficeName(selectedOffice ? (selectedOffice.title || selectedOffice.name || "") : "Не выбран");
    setMessages([]);
  };

  const handleChannelChange = (channel: ChatChannel) => {
    if (channel === activeChannel) return;
    setActiveChannel(channel);
    setMessages([]);
    setLoadingMessages(true);
  };

  const getRoleLabel = (role?: string) => role ? ROLE_LABELS[role] || role : "";
  const getRoleColor = (role?: string) => role ? ROLE_COLORS[role] || "#6b7280" : "#6b7280";

  const getChannelParticipants = (channel: ChatChannel) => {
    if (channel === 'reception') {
      return (
        <>
          <span className="participant-badge" style={{ background: ROLE_COLORS.admin }}>Администратор</span>
          <span className="participant-badge" style={{ background: ROLE_COLORS.manager }}>Менеджер</span>
          <span className="participant-badge" style={{ background: ROLE_COLORS.okk }}>Руководитель</span>
        </>
      );
    }
    return (
      <>
        <span className="participant-badge" style={{ background: ROLE_COLORS.cc_manager }}>Нач. колл-центра</span>
        <span className="participant-badge" style={{ background: ROLE_COLORS.manager }}>Менеджер</span>
        <span className="participant-badge" style={{ background: ROLE_COLORS.okk }}>Руководитель</span>
      </>
    );
  };

  return (
    <div className="reception-container">
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
                  <span className="office-name-label">{office.title || office.name}</span>
                  {office.lastActivity && (
                    <span className="last-activity">{office.lastActivity}</span>
                  )}
                </div>
                <Tooltip title={office.online ? 'Онлайн' : 'Оффлайн'}>
                  <div>
                    <FaCircle 
                      className={`status-indicator ${office.online ? 'online' : 'offline'}`} 
                      size={12}
                    />
                  </div>
                </Tooltip>
              </button>
            ))
          )}
        </div>

        <div className="chat-section">
          {/* Табы каналов чата */}
          {!isCallCenterRole && (
          <div className="chat-channel-tabs">
            <button
              className={`channel-tab ${activeChannel === 'reception' ? 'active' : ''}`}
              onClick={() => handleChannelChange('reception')}
            >
              <span className="channel-tab-icon" style={{ background: ROLE_COLORS.admin }}></span>
              Ресепшен
            </button>
            <button
              className={`channel-tab ${activeChannel === 'call_center' ? 'active' : ''}`}
              onClick={() => handleChannelChange('call_center')}
            >
              <span className="channel-tab-icon" style={{ background: ROLE_COLORS.cc_manager }}></span>
              Колл-центр
            </button>
          </div>
          )}

          <div className="chat-header">
            <div className="chat-header-info">
              <h3>
                {isCallCenterRole ? 'Чат' : (activeChannel === 'reception' ? 'Чат: Ресепшен' : 'Чат: Колл-центр')}
                {selectedOfficeName && <span className="office-name"> — {selectedOfficeName}</span>}
              </h3>
            </div>
            <div className="chat-participants">
              {getChannelParticipants(activeChannel)}
            </div>
          </div>
          
          <div className="messages-container" ref={messageContainerRef}>
            {loadingMessages ? (
              <div className="loading-container">
                <Spin />
                <span>Загрузка сообщений...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-messages">
                <p>Нет сообщений</p>
                <p className="empty-hint">Отправьте сообщение, чтобы начать общение</p>
              </div>
            ) : (
              messages.map((message) => {
                const extMsg = message as ExtendedMessage;
                return (
                  <div 
                    key={message.id} 
                    className={`message ${message.isMine ? 'mine' : ''} ${message.error ? 'error' : ''}`}
                  >
                    <div className="message-content">
                      <div className="sender-info">
                        <span className="sender">{message.sender}</span>
                        {extMsg.senderRole && (
                          <span className="sender-role" style={{ color: getRoleColor(extMsg.senderRole) }}>
                            {getRoleLabel(extMsg.senderRole)}
                          </span>
                        )}
                      </div>
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
                    {message.isMine && (
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        <FaTrashAlt />
                      </button>
                    )}
                  </div>
                );
              })
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
                <div>
                  <button className="upload-button" onClick={() => notification.info({ message: 'В разработке' })}>
                    <MdUpload />
                  </button>
                </div>
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
