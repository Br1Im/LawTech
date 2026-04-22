import React, { useState, useEffect, useRef, useMemo } from "react";
import { FaPaperPlane, FaSearch, FaTrashAlt } from 'react-icons/fa';
import { MdDone, MdDoneAll, MdAttachFile, MdEmojiEmotions } from 'react-icons/md';
import { notification, Spin, Tooltip, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { officeAPI } from '../shared/api/office';
import type { Office } from '../shared/api/office';
import { receptionAPI } from '../shared/api/reception';
import type { Message } from '../shared/api/reception';
import './Reception.css';

interface ExtendedMessage extends Message {
  error?: boolean;
}

const MESSAGES_REFRESH_INTERVAL = 5000;

const getInitials = (value?: string | null) => {
  if (!value) return '··';
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p.charAt(0).toUpperCase()).join('') || value.charAt(0).toUpperCase();
};

const formatDateDivider = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
};

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const Reception: React.FC = () => {
  const { user } = useAuth();
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [selectedOfficeName, setSelectedOfficeName] = useState<string>("");
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [officeSearch, setOfficeSearch] = useState<string>("");
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

  useEffect(() => {
    const fetchOffices = async () => {
      setLoading(true);
      try {
        const response = await officeAPI.getAll();
        const data = Array.isArray(response)
          ? response
          : (response && typeof response === 'object' && 'data' in response
              ? (response as { data: Office[] }).data
              : []);

        setOffices(data);
        if (data.length > 0) {
          setSelectedOfficeId(data[0].id);
          setSelectedOfficeName(data[0].title);
        }
      } catch (error) {
        console.error('Ошибка при загрузке офисов:', error);
        notification.error({
          message: 'Ошибка загрузки',
          description: 'Не удалось загрузить список офисов'
        });
        setOffices([]);
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
  }, []);

  useEffect(() => {
    if (messageRefreshInterval.current) {
      clearInterval(messageRefreshInterval.current);
    }

    if (selectedOfficeId) {
      fetchMessages();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOfficeId]);

  const fetchMessages = async (showLoading = true) => {
    if (!selectedOfficeId) return;
    if (showLoading) setLoadingMessages(true);

    try {
      const msgs = await receptionAPI.getMessages(selectedOfficeId);
      setMessages(msgs);

      const unreadMessages = msgs.filter(msg => !msg.isMine && !msg.isRead);
      if (unreadMessages.length > 0) {
        await Promise.all(unreadMessages.map(msg => receptionAPI.markAsRead(msg.id)));
      }
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error);
      if (showLoading) {
        notification.error({
          message: 'Ошибка загрузки',
          description: 'Не удалось загрузить сообщения'
        });
        setMessages([]);
      }
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedOfficeId) {
      setSendingMessage(true);
      try {
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

        setMessages(prev => [...prev, tempMessage]);
        const messageText = newMessage.trim();
        setNewMessage("");

        const sentMessage = await receptionAPI.sendMessage(selectedOfficeId, messageText);
        setMessages(prev => prev.map(msg => (msg.id === tempMessage.id ? sentMessage : msg)));
      } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        notification.error({
          message: 'Ошибка отправки',
          description: 'Не удалось отправить сообщение'
        });
        setMessages(prev =>
          prev.map(msg => (msg.id.startsWith('temp-') ? { ...msg, error: true } : msg))
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
      content: 'Это действие необратимо.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          setMessages(prev => prev.filter(msg => msg.id !== messageId));
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
    const selectedOffice = offices.find(o => o.id === officeId);
    setSelectedOfficeId(officeId);
    setSelectedOfficeName(selectedOffice ? selectedOffice.title : "");
    setMessages([]);
  };

  const handleFileUpload = () => {
    notification.info({
      message: 'Загрузка файла',
      description: 'Функция в разработке'
    });
  };

  const filteredOffices = useMemo(() => {
    const q = officeSearch.trim().toLowerCase();
    if (!q) return offices;
    return offices.filter(o =>
      (o.title || '').toLowerCase().includes(q) || (o.name || '').toLowerCase().includes(q)
    );
  }, [offices, officeSearch]);

  const selectedOffice = offices.find(o => o.id === selectedOfficeId);

  // Группируем сообщения по дню для вставки разделителей
  const groupedMessages = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: ExtendedMessage[] }> = [];
    for (const m of messages) {
      const key = dayKey(m.createdAt);
      const existing = groups[groups.length - 1];
      if (existing && existing.key === key) {
        existing.items.push(m);
      } else {
        groups.push({ key, label: formatDateDivider(m.createdAt), items: [m] });
      }
    }
    return groups;
  }, [messages]);

  return (
    <div className="reception-layout">
      <aside className="reception-sidebar">
        <div className="reception-sidebar__head">
          <h3>Диалоги</h3>
          <span className="reception-sidebar__count">{offices.length}</span>
        </div>

        <div className="reception-search">
          <FaSearch className="reception-search__icon" />
          <input
            type="text"
            placeholder="Поиск офиса..."
            value={officeSearch}
            onChange={e => setOfficeSearch(e.target.value)}
          />
        </div>

        <div className="reception-offices">
          {loading && offices.length === 0 ? (
            <div className="reception-loading">
              <Spin />
              <span>Загрузка...</span>
            </div>
          ) : filteredOffices.length === 0 ? (
            <div className="reception-empty">
              <p>Офисы не найдены</p>
            </div>
          ) : (
            filteredOffices.map((office) => (
              <button
                key={office.id}
                className={`reception-office ${selectedOfficeId === office.id ? 'is-active' : ''}`}
                onClick={() => handleOfficeChange(office.id)}
              >
                <div className={`reception-avatar ${office.online ? 'is-online' : ''}`}>
                  {getInitials(office.title || office.name)}
                  <span className="reception-avatar__dot" />
                </div>
                <div className="reception-office__body">
                  <div className="reception-office__row">
                    <span className="reception-office__title">{office.title}</span>
                    {office.lastActivity && (
                      <span className="reception-office__time">{office.lastActivity}</span>
                    )}
                  </div>
                  <div className="reception-office__row reception-office__sub">
                    <span>{office.online ? 'В сети' : 'Не в сети'}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="reception-chat">
        {!selectedOfficeId ? (
          <div className="reception-empty-state">
            <div className="reception-empty-state__icon">💬</div>
            <h3>Выберите диалог</h3>
            <p>Выберите офис слева, чтобы начать переписку</p>
          </div>
        ) : (
          <>
            <header className="reception-chat__header">
              <div className={`reception-avatar reception-avatar--lg ${selectedOffice?.online ? 'is-online' : ''}`}>
                {getInitials(selectedOfficeName)}
                <span className="reception-avatar__dot" />
              </div>
              <div className="reception-chat__title">
                <h3>{selectedOfficeName || 'Диалог'}</h3>
                <span className={`reception-chat__status ${selectedOffice?.online ? 'is-online' : ''}`}>
                  {selectedOffice?.online ? 'онлайн' : 'не в сети'}
                </span>
              </div>
            </header>

            <div className="reception-messages" ref={messageContainerRef}>
              {loadingMessages ? (
                <div className="reception-loading">
                  <Spin />
                  <span>Загрузка сообщений...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="reception-empty-state reception-empty-state--sm">
                  <div className="reception-empty-state__icon">✨</div>
                  <h4>Здесь пока пусто</h4>
                  <p>Отправьте первое сообщение</p>
                </div>
              ) : (
                groupedMessages.map((group) => (
                  <div className="reception-day-group" key={group.key}>
                    <div className="reception-day-divider">
                      <span>{group.label}</span>
                    </div>
                    {group.items.map((message) => (
                      <div
                        key={message.id}
                        className={`reception-msg ${message.isMine ? 'is-mine' : ''} ${message.error ? 'is-error' : ''}`}
                      >
                        {!message.isMine && (
                          <div className="reception-avatar reception-avatar--sm">
                            {getInitials(message.sender)}
                          </div>
                        )}
                        <div className="reception-msg__bubble">
                          {!message.isMine && (
                            <span className="reception-msg__sender">{message.sender}</span>
                          )}
                          <p className="reception-msg__text">{message.text}</p>
                          <div className="reception-msg__meta">
                            <span>{message.timestamp}</span>
                            {message.isMine && (
                              <span className="reception-msg__read">
                                {message.isRead ? <MdDoneAll /> : <MdDone />}
                              </span>
                            )}
                          </div>
                        </div>
                        {(message.isMine || user?.role === 'admin') && (
                          <Tooltip title="Удалить">
                            <button
                              className="reception-msg__delete"
                              onClick={() => handleDeleteMessage(message.id)}
                              aria-label="Удалить сообщение"
                            >
                              <FaTrashAlt />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="reception-composer">
              <Tooltip title="Прикрепить файл">
                <button
                  className="reception-composer__icon-btn"
                  onClick={handleFileUpload}
                  aria-label="Прикрепить файл"
                >
                  <MdAttachFile />
                </button>
              </Tooltip>
              <textarea
                placeholder="Напишите сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!selectedOfficeId || loadingMessages || sendingMessage}
                rows={1}
              />
              <Tooltip title="Эмодзи">
                <button
                  className="reception-composer__icon-btn"
                  onClick={() => notification.info({ message: 'Скоро' })}
                  aria-label="Эмодзи"
                  type="button"
                >
                  <MdEmojiEmotions />
                </button>
              </Tooltip>
              <button
                className="reception-composer__send"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !selectedOfficeId || loadingMessages || sendingMessage}
                aria-label="Отправить"
              >
                {sendingMessage ? <Spin size="small" /> : <FaPaperPlane />}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Reception;
