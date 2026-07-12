import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Spin } from 'antd';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { officeAPI } from '../shared/api/office';
import type { Office } from '../shared/api/office';
import { receptionAPI } from '../shared/api/reception';
import type { Message, ChatChannel, ChatParticipant } from '../shared/api/reception';
import { apiInstance } from '../shared/api/instance';
import './OfficeChat.css';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор', administrator: 'Администратор', manager: 'Менеджер',
  okk: 'Руководитель', director: 'Директор', lawyer: 'Юрист', expert: 'Эксперт',
  cc_manager: 'Начальник КЦ', cc_operator: 'Оператор',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#6B7280', administrator: '#6B7280', manager: 'var(--color-primary)',
  okk: '#8B5CF6', director: '#EF4444', lawyer: '#10B981', expert: '#F59E0B',
  cc_manager: '#F97316', cc_operator: '#06B6D4',
};

const CHANNEL_COLORS: Record<string, string> = {
  reception: 'var(--color-primary)',
  call_center: '#EF4444',
  cc_internal: '#8B5CF6',
};

const CHANNEL_ABBR: Record<string, string> = {
  reception: 'Р',
  call_center: 'КЦ',
  cc_internal: 'Ю',
};

const POLL_INTERVAL = 3000;

interface ChannelInfo { key: ChatChannel; label: string }

const API_BASE = '';

const OfficeChat: React.FC = () => {
  const { user } = useAuth();
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [sending, setSending] = useState(false);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel>('reception');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const [lastMessages, setLastMessages] = useState<Record<string, { sender: string; text: string; time: string; createdAt?: string }>>({});
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMsgCountRef = useRef(0);
  const lastChannelRef = useRef<string>('');

  const formatMsgTime = (createdAt?: string, fallback?: string): string => {
    if (!createdAt) return fallback || '';
    try {
      return new Date(createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch { return fallback || ''; }
  };

  const scrollToBottom = useCallback((smooth = false) => {
    if (msgContainerRef.current) {
      msgContainerRef.current.scrollTo({
        top: msgContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    const channelChanged = lastChannelRef.current !== String(activeChannel);
    const wasEmpty = prevMsgCountRef.current === 0;
    if (channelChanged || wasEmpty) {
      // При загрузке / смене канала — сразу к последним сообщениям, без анимации
      scrollToBottom(false);
    } else if (messages.length > prevMsgCountRef.current) {
      scrollToBottom(true);
    }
    prevMsgCountRef.current = messages.length;
    lastChannelRef.current = String(activeChannel);
  }, [messages, activeChannel, scrollToBottom]);

  // Fetch channels
  useEffect(() => {
    (async () => {
      try {
        const res = await apiInstance.get('/chat/channels');
        const data: ChannelInfo[] = res.data?.channels || [];
        setChannels(data);
        if (data.length > 0) setActiveChannel(data[0].key);
      } catch {
        const role = user?.role;
        if (role === 'cc_operator') {
          setChannels([{ key: 'cc_internal' as ChatChannel, label: 'Внутренний чат КЦ' }]);
          setActiveChannel('cc_internal' as ChatChannel);
        } else if (role === 'cc_manager') {
          setChannels([
            { key: 'cc_internal' as ChatChannel, label: 'Внутренний чат КЦ' },
            { key: 'call_center' as ChatChannel, label: 'Колл-центр' },
          ]);
          setActiveChannel('cc_internal' as ChatChannel);
        } else {
          setChannels([
            { key: 'reception', label: 'Ресепшен' },
            { key: 'call_center' as ChatChannel, label: 'Колл-центр' },
          ]);
        }
      }
    })();
  }, [user]);

  // Fetch offices
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const response = await officeAPI.getAll();
        const data: Office[] = Array.isArray(response) ? response
          : (response && typeof response === 'object' && 'data' in response)
            ? (response as { data: Office[] }).data : [];
        setOffices(data);
        const uid = (user as Record<string, unknown>)?.office_id || (user as Record<string, unknown>)?.officeId;
        const match = uid ? data.find(o => o.id?.toString() === uid?.toString()) : null;
        const sel = match || data[0];
        if (sel) setSelectedOfficeId(sel.id?.toString());
      } catch { /* skip */ }
      finally { setLoading(false); }
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!selectedOfficeId) return;
    try {
      const data = await receptionAPI.getMessages(selectedOfficeId, activeChannel);
      const arr = Array.isArray(data) ? data : (data as unknown as { data: Message[] })?.data || [];
      setMessages(arr);
      setLoadingMsgs(false);
      // Update last message for current channel
      if (arr.length > 0) {
        const last = arr[arr.length - 1];
        setLastMessages(prev => ({
          ...prev,
          [`${selectedOfficeId}_${activeChannel}`]: {
            sender: last.sender?.split(' ')[0] || '',
            text: last.text || last.fileName || '',
            time: last.timestamp || '',
            createdAt: last.createdAt,
          }
        }));
      }
    } catch { setLoadingMsgs(false); }
  }, [selectedOfficeId, activeChannel]);

  // Fetch unread counts
  const fetchUnread = useCallback(async () => {
    if (!selectedOfficeId) return;
    try {
      const counts = await receptionAPI.getUnreadCounts(selectedOfficeId);
      setUnreadCounts(counts);
    } catch { /* skip */ }
  }, [selectedOfficeId]);

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!selectedOfficeId) return;
    try {
      const p = await receptionAPI.getParticipants(selectedOfficeId, activeChannel);
      setParticipants(p);
    } catch { /* skip */ }
  }, [selectedOfficeId, activeChannel]);

  // Poll messages + unread
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (selectedOfficeId) {
      setLoadingMsgs(true);
      fetchMessages();
      fetchUnread();
      fetchParticipants();
      pollRef.current = setInterval(() => { fetchMessages(); fetchUnread(); }, POLL_INTERVAL);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedOfficeId, activeChannel, fetchMessages, fetchUnread, fetchParticipants]);

  // Mark as read when viewing channel
  useEffect(() => {
    if (selectedOfficeId && messages.length > 0) {
      receptionAPI.markAllAsRead(selectedOfficeId, activeChannel).catch(() => {});
    }
  }, [selectedOfficeId, activeChannel, messages]);

  // Send message
  const handleSend = async (file?: File) => {
    if ((!newMessage.trim() && !file) || !selectedOfficeId || sending) return;
    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    if (!file) {
      const temp: Message = {
        id: `temp-${Date.now()}`, text, sender: user?.name || user?.email || 'Вы',
        senderRole: user?.role, timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false }),
        office_id: selectedOfficeId, isRead: false, isMine: true, status: 'sent', createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, temp]);
    }

    try {
      await receptionAPI.sendMessage(selectedOfficeId, text, activeChannel, file);
      await fetchMessages();
    } catch {
      if (!file) setMessages(prev => prev.map(m => m.id.startsWith('temp-') ? { ...m, error: true } : m));
    }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSend(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Search
  const handleSearch = useCallback(async () => {
    if (!selectedOfficeId || !searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await receptionAPI.searchMessages(selectedOfficeId, activeChannel, searchQuery);
      setSearchResults(results);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, [selectedOfficeId, activeChannel, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(handleSearch, 400);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  const switchChannel = (ch: ChatChannel) => {
    setActiveChannel(ch);
    setMessages([]);
    setLoadingMsgs(true);
    setSearchOpen(false);
    setSearchQuery('');
    setShowParticipants(false);
  };

  const onlineCount = participants.filter(p => p.online).length;
  const selectedOffice = offices.find(o => o.id?.toString() === selectedOfficeId);
  const activeChannelLabel = channels.find(c => c.key === activeChannel)?.label || 'Ресепшен';

  // Date separator helper
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  // Group messages with date separators
  const renderMessages = () => {
    let lastDate = '';
    return messages.map((msg, idx) => {
      const msgDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : '';
      let showSep = false;
      if (msgDate && msgDate !== lastDate) { showSep = true; lastDate = msgDate; }

      return (
        <React.Fragment key={msg.id}>
          {showSep && (
            <div className="tg-date-sep">
              <span>{getDateLabel(msg.createdAt)}</span>
            </div>
          )}
          <div className={`tg-msg ${msg.isMine ? 'mine' : 'other'} ${msg.error ? 'error' : ''}`}>
            {!msg.isMine && (
              <div className="tg-msg-avatar" style={{ background: ROLE_COLORS[msg.senderRole || ''] || 'var(--color-primary)' }}>
                {(msg.senderFirstName || msg.sender || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="tg-bubble">
              {!msg.isMine && (
                <div className="tg-msg-sender">
                  <span className="tg-msg-sender-name" style={{ color: ROLE_COLORS[msg.senderRole || ''] || 'var(--color-primary)' }}>
                    {msg.sender}
                  </span>
                  <span className="tg-msg-sender-role">{ROLE_LABELS[msg.senderRole || ''] || ''}</span>
                </div>
              )}
              {msg.fileUrl && msg.fileType === 'image' && (
                <img className="tg-msg-image" src={`${API_BASE}${msg.fileUrl}`} alt={msg.fileName || 'image'} onClick={() => window.open(`${API_BASE}${msg.fileUrl}`, '_blank')} />
              )}
              {msg.fileUrl && msg.fileType === 'document' && (
                <a className="tg-msg-file" href={`${API_BASE}${msg.fileUrl}`} target="_blank" rel="noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                  <span>{msg.fileName || 'Документ'}</span>
                </a>
              )}
              {msg.text && !(msg.fileUrl && !msg.text.trim()) && (
                <div className="tg-msg-text">{msg.text}</div>
              )}
              <div className="tg-msg-meta">
                <span className="tg-msg-time">{formatMsgTime(msg.createdAt, msg.timestamp)}</span>
                {msg.isMine && renderStatus(msg)}
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  /* Checkmark SVGs */
  const SingleCheck = () => (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
      <path d="M1 5.5L5.5 10L14.5 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const DoubleCheck = ({ read }: { read?: boolean }) => (
    <svg width="20" height="11" viewBox="0 0 20 11" fill="none">
      <path d="M1 5.5L5.5 10L14.5 1" stroke={read ? '#34D399' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 5.5L9.5 10L18.5 1" stroke={read ? '#34D399' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const renderStatus = (msg: Message) => {
    if (!msg.isMine) return null;
    if (msg.status === 'read') return <span className="msg-status"><DoubleCheck read /></span>;
    if (msg.status === 'delivered') return <span className="msg-status"><DoubleCheck /></span>;
    return <span className="msg-status"><SingleCheck /></span>;
  };

  if (loading) {
    return <div className="tg-chat-wrap"><div className="tg-chat-center"><Spin size="large" /><p>Загрузка чата...</p></div></div>;
  }

  return (
    <div className="tg-chat-wrap">
      {/* ─── LEFT SIDEBAR ─── */}
      <div className="tg-sidebar">
        {/* Offices section */}
        <div className="tg-sidebar-section">
          <div className="tg-sidebar-section-header">
            <span>Офисы</span>
          </div>
          <div className="tg-office-list">
            {offices.map(o => (
              <div
                key={o.id}
                className={`tg-office-item ${o.id?.toString() === selectedOfficeId ? 'active' : ''}`}
                onClick={() => setSelectedOfficeId(o.id?.toString())}
              >
                <span className="tg-office-name-text">{o.title || o.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chats section */}
        <div className="tg-sidebar-section tg-chats-section">
          <div className="tg-sidebar-section-header">
            <span>Чаты</span>
            <div className="tg-sidebar-section-actions">
              <button className="tg-sidebar-icon-btn" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </button>
            </div>
          </div>
          <div className="tg-channel-list">
            {channels.map(ch => {
              const lastMsg = lastMessages[`${selectedOfficeId}_${ch.key}`];
              const unread = unreadCounts[ch.key] || 0;
              return (
                <div
                  key={ch.key}
                  className={`tg-channel-item ${activeChannel === ch.key ? 'active' : ''}`}
                  onClick={() => switchChannel(ch.key)}
                >
                  <div className="tg-channel-avatar" style={{ background: CHANNEL_COLORS[ch.key] || 'var(--color-primary)' }}>
                    {CHANNEL_ABBR[ch.key] || ch.label[0]}
                  </div>
                  <div className="tg-channel-info">
                    <div className="tg-channel-top">
                      <span className="tg-channel-name">{ch.label}</span>
                      <span className="tg-channel-time">{formatMsgTime((lastMsg as any)?.createdAt, lastMsg?.time)}</span>
                    </div>
                    <div className="tg-channel-bottom">
                      <span className="tg-channel-preview">
                        {lastMsg ? `${lastMsg.sender}: ${lastMsg.text.substring(0, 28)}${lastMsg.text.length > 28 ? '...' : ''}` : 'Нет сообщений'}
                      </span>
                      {unread > 0 && <span className="tg-unread-badge">{unread}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── MAIN CHAT ─── */}
      <div className="tg-main">
        {/* Header */}
        <div className="tg-header">
          <div className="tg-header-left">
            <div className="tg-header-avatar" style={{ background: CHANNEL_COLORS[activeChannel] || 'var(--color-primary)' }}>
              {CHANNEL_ABBR[activeChannel] || activeChannelLabel[0]}
            </div>
            <div className="tg-header-info">
              <div className="tg-header-title">{activeChannelLabel}</div>
              <button className="tg-header-members" onClick={() => setShowParticipants(!showParticipants)}>
                {participants.length} участников
              </button>
            </div>
          </div>
          <div className="tg-header-actions">
            <button className="tg-icon-btn" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); setSearchResults([]); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            <button className="tg-icon-btn" onClick={() => setShowParticipants(!showParticipants)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="tg-search-bar">
            <input
              className="tg-search-input"
              placeholder="Поиск по сообщениям..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searching && <Spin size="small" />}
            <button className="tg-search-close" onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
            </button>
          </div>
        )}

        {searchOpen && searchQuery.trim() && (
          <div className="tg-search-results">
            {searchResults.length === 0 && !searching && <div className="tg-search-empty">Ничего не найдено</div>}
            {searchResults.map(msg => (
              <div key={msg.id} className="tg-search-result-item">
                <div className="tg-search-result-sender">{msg.sender} <span className="tg-search-result-time">{formatMsgTime(msg.createdAt, msg.timestamp)}</span></div>
                <div className="tg-search-result-text">{msg.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* Messages + Participants split */}
        <div className="tg-body">
          <div className="tg-messages" ref={msgContainerRef}>
            {loadingMsgs ? (
              <div className="tg-chat-center"><Spin /><p>Загрузка сообщений...</p></div>
            ) : messages.length === 0 ? (
              <div className="tg-chat-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                <p style={{ fontWeight: 600, color: '#6B7280' }}>Нет сообщений</p>
                <span style={{ color: '#9CA3AF', fontSize: 13 }}>Начните общение в этом канале</span>
              </div>
            ) : renderMessages()}
          </div>

          {/* Participants panel */}
          {showParticipants && (
            <div className="tg-participants-panel">
              <div className="tg-participants-header">
                <span>Участники чата</span>
                <button className="tg-participants-close" onClick={() => setShowParticipants(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="tg-participants-list">
                {participants.map(p => (
                  <div key={p.id} className="tg-participant-row">
                    <div className="tg-participant-avatar" style={{ background: ROLE_COLORS[p.role] || '#6B7280' }}>
                      {p.name[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="tg-participant-info">
                      <span className="tg-participant-name">{p.name}</span>
                      <span className="tg-participant-role" style={{ color: ROLE_COLORS[p.role] || '#6B7280' }}>
                        {ROLE_LABELS[p.role] || p.role}
                      </span>
                    </div>
                    <span className={`tg-participant-status ${p.online ? 'online' : 'offline'}`}>
                      <span className="tg-status-dot" /> {p.online ? 'Онлайн' : 'Офлайн'}
                    </span>
                  </div>
                ))}
                {participants.length === 0 && <div className="tg-participants-empty">Нет участников</div>}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="tg-input-area">
          <button className="tg-attach-btn" onClick={() => fileInputRef.current?.click()}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
          <textarea
            ref={inputRef}
            className="tg-textarea"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            rows={1}
            disabled={sending}
          />
          <button className="tg-send-btn" onClick={() => handleSend()} disabled={!newMessage.trim() || sending}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>


      </div>
    </div>
  );
};

export default OfficeChat;
