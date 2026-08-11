import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Spin, Modal, Input, Select, Button, App as AntApp } from 'antd';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { officeAPI } from '../shared/api/office';
import type { Office } from '../shared/api/office';
import { apiInstance } from '../shared/api/instance';
import { receptionAPI } from '../shared/api/reception';
import type { Message, ChatChannel, ChatParticipant, ChatChannelInfo, ChatCandidate } from '../shared/api/reception';
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

const ChatAttachment: React.FC<{ msg: Message }> = ({ msg }) => {
  const [url,setUrl]=useState(''); const [failed,setFailed]=useState(false);
  useEffect(() => { if (!msg.fileUrl) return; let objectUrl='',alive=true;
    apiInstance.get(`/chat/files/${msg.id}`,{responseType:'blob'}).then(r=>{if(!alive)return;objectUrl=URL.createObjectURL(r.data);setUrl(objectUrl)}).catch(()=>{if(alive)setFailed(true)});
    return()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl)};
  },[msg.id,msg.fileUrl]);
  if(failed)return <span className="tg-msg-file tg-file-error">Файл недоступен</span>;
  if(!url)return <span className="tg-msg-file tg-file-loading">Загрузка файла…</span>;
  if(msg.fileType==='image')return <img className="tg-msg-image" src={url} alt={msg.fileName||'image'} onClick={()=>window.open(url,'_blank','noopener,noreferrer')}/>;
  return <a className="tg-msg-file" href={url} download={msg.fileName||'file'}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg><span>{msg.fileName||'Файл'}</span></a>;
};

const POLL_INTERVAL = 3000;

const OfficeChat: React.FC = () => {
  const { user } = useAuth();
  const { message } = AntApp.useApp();
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsgs,setLoadingMsgs]=useState(true);
  const [loadingOlder,setLoadingOlder]=useState(false);
  const [hasMoreMessages,setHasMoreMessages]=useState(false);
  const [messagesError,setMessagesError]=useState('');
  const [participantsError,setParticipantsError]=useState('');
  const [sending, setSending] = useState(false);
  const [channels, setChannels] = useState<ChatChannelInfo[]>([]);
  const [canManageChat, setCanManageChat] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [candidates, setCandidates] = useState<ChatCandidate[]>([]);
  const [memberToAdd, setMemberToAdd] = useState<number | undefined>();
  const [savingChat, setSavingChat] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChatChannel>('');
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

  const loadChannels = useCallback(async (preferred?: string) => {
    if (!selectedOfficeId) return;
    try {
      const result = await receptionAPI.getChannels(selectedOfficeId);
      setChannels(result.channels);
      setCanManageChat(result.canManage);
      const next = preferred || activeChannel;
      if (result.channels.some(ch => ch.key === next)) setActiveChannel(next);
      else if (result.channels.length) setActiveChannel(result.channels[0].key);
      else {
        setActiveChannel('');
        setMessages([]);
        setMessagesError('');
        setParticipantsError('');
        setLoadingMsgs(false);
      }
    } catch {
      setChannels([]);
      setActiveChannel('');
      setMessages([]);
      setMessagesError('');
      setLoadingMsgs(false);
      setCanManageChat(false);
    }
  }, [selectedOfficeId, activeChannel]);

  useEffect(() => { if (selectedOfficeId) loadChannels(); }, [selectedOfficeId]);

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
    if (!selectedOfficeId || !activeChannel) return;
    try {
      const page=await receptionAPI.getMessages(selectedOfficeId,activeChannel);
      const arr=page.messages;
      setMessages(prev => {
        const older=prev.filter(old=>!arr.some(fresh=>fresh.id===old.id));
        return [...older,...arr].sort((a,b)=>Number(a.id)-Number(b.id));
      });
      setHasMoreMessages(page.hasMore);
      setMessagesError(''); setLoadingMsgs(false);
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
    } catch { setMessagesError('Не удалось загрузить сообщения'); setLoadingMsgs(false); }
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
      if (!activeChannel) { setParticipants([]); return; }
      const result = await receptionAPI.getParticipants(selectedOfficeId, activeChannel);
      setParticipants(result.participants);
      setCanManageChat(result.canManage); setParticipantsError('');
    } catch { setParticipantsError('Не удалось загрузить участников'); }
  }, [selectedOfficeId, activeChannel]);

  // Poll messages + unread
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (selectedOfficeId) {
      fetchUnread();
      if (activeChannel) {
        setLoadingMsgs(true);
        fetchMessages();
        fetchParticipants();
        pollRef.current = setInterval(() => { fetchMessages(); fetchUnread(); }, POLL_INTERVAL);
      } else {
        setMessages([]);
        setMessagesError('');
        setParticipants([]);
        setParticipantsError('');
        setLoadingMsgs(false);
      }
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
    if ((!newMessage.trim() && !file) || !selectedOfficeId || !activeChannel || sending) return;
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

  const loadOlderMessages=async()=>{
    if(!selectedOfficeId||!activeChannel||!messages.length||loadingOlder)return;
    setLoadingOlder(true);
    try{
      const page=await receptionAPI.getMessages(selectedOfficeId,activeChannel,messages[0].id);
      setMessages(prev=>[...page.messages.filter(x=>!prev.some(y=>y.id===x.id)),...prev]);
      setHasMoreMessages(page.hasMore); setMessagesError('');
    }catch{setMessagesError('Не удалось загрузить ранние сообщения')}finally{setLoadingOlder(false)}
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

  const loadCandidates = async () => {
    if (!selectedOfficeId || !activeChannel) return;
    try { setCandidates(await receptionAPI.getCandidates(selectedOfficeId, activeChannel)); }
    catch { setCandidates([]); }
  };

  const openCreateChat = async () => {
    setNewChatName(''); setSelectedMemberIds([]); setCreateOpen(true);
    if (!selectedOfficeId) return;
    try { setCandidates(await receptionAPI.getCandidates(selectedOfficeId, '__new__')); }
    catch { setCandidates([]); }
  };

  const createChat = async () => {
    if (!selectedOfficeId || newChatName.trim().length < 2) return;
    setSavingChat(true);
    try {
      const channel = await receptionAPI.createChannel(selectedOfficeId, newChatName.trim(), selectedMemberIds);
      setCreateOpen(false); message.success('Чат создан'); await loadChannels(channel.key);
    } catch (e: any) { message.error(e?.response?.data?.message || 'Не удалось создать чат'); }
    finally { setSavingChat(false); }
  };

  const openManageMembers = async () => {
    setManageOpen(true); setMemberToAdd(undefined); await loadCandidates();
  };

  const addMember = async () => {
    if (!selectedOfficeId || !activeChannel || !memberToAdd) return;
    setSavingChat(true);
    try {
      await receptionAPI.addMember(selectedOfficeId, activeChannel, memberToAdd);
      setMemberToAdd(undefined); await Promise.all([fetchParticipants(), loadCandidates(), loadChannels(activeChannel)]);
      message.success('Участник добавлен');
    } catch (e: any) { message.error(e?.response?.data?.message || 'Не удалось добавить участника'); }
    finally { setSavingChat(false); }
  };

  const removeMember = async (userId: number) => {
    if (!selectedOfficeId || !activeChannel) return;
    try {
      await receptionAPI.removeMember(selectedOfficeId, activeChannel, userId);
      await Promise.all([fetchParticipants(), loadCandidates(), loadChannels(activeChannel)]);
      message.success('Участник удалён');
    } catch (e: any) { message.error(e?.response?.data?.message || 'Не удалось удалить участника'); }
  };

  const renameChat = async () => {
    if (!selectedOfficeId || !activeChannel || renameValue.trim().length < 2) return;
    setSavingChat(true);
    try { await receptionAPI.renameChannel(selectedOfficeId, activeChannel, renameValue.trim()); setRenameOpen(false); await loadChannels(activeChannel); message.success('Название изменено'); }
    catch (e: any) { message.error(e?.response?.data?.message || 'Не удалось переименовать чат'); }
    finally { setSavingChat(false); }
  };

  const archiveChat = () => {
    if (!selectedOfficeId || !activeChannel) return;
    Modal.confirm({
      title: 'Удалить чат?', content: 'История останется в базе, но чат исчезнет у участников.',
      okText: 'Удалить', okButtonProps: { danger: true }, cancelText: 'Отмена',
      onOk: async () => { await receptionAPI.archiveChannel(selectedOfficeId, activeChannel); message.success('Чат удалён'); await loadChannels(); },
    });
  };

  const candidateOptions = Object.entries(candidates.reduce((acc, person) => {
    const group = person.callCenterName ? `Колл-центр: ${person.callCenterName}` : 'Сотрудники офиса';
    (acc[group] ||= []).push({ label: `${person.name} · ${ROLE_LABELS[person.role] || person.role}`, value: person.id, disabled: person.isMember });
    return acc;
  }, {} as Record<string, { label: string; value: number; disabled?: boolean }[]>)).map(([label, options]) => ({ label, options }));

  const switchChannel = (ch: ChatChannel) => {
    setActiveChannel(ch);
    setMessages([]); setHasMoreMessages(false); setMessagesError('');
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
              {msg.fileUrl && <ChatAttachment msg={msg} />}
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
              {canManageChat && (
                <button className="tg-sidebar-icon-btn tg-create-chat-btn" title="Создать чат" aria-label="Создать чат" onClick={openCreateChat}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              )}
            </div>
          </div>
          <div className="tg-channel-list">
            {channels.length === 0 && (
              <div className="tg-channel-list-empty">
                <span>У вас пока нет чатов</span>
                {canManageChat && <button onClick={openCreateChat}>Создать первый</button>}
              </div>
            )}
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
              <button className="tg-header-members" onClick={() => { setShowParticipants(!showParticipants); if (!showParticipants) fetchParticipants(); }}>
                {participants.length} участников
              </button>
            </div>
          </div>
          <div className="tg-header-actions">
            <button className="tg-icon-btn" onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); setSearchResults([]); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            {canManageChat && activeChannel && (
              <button className="tg-icon-btn" title="Управление чатом" aria-label="Управление чатом" onClick={openManageMembers}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.4-3.2 2.4-5 5.5-5s5.1 1.8 5.5 5M17 8v6M14 11h6"/></svg>
              </button>
            )}
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
            {activeChannel && messagesError && <div className="tg-chat-error"><span>{messagesError}</span><button onClick={()=>fetchMessages()}>Повторить</button></div>}
            {hasMoreMessages && !loadingMsgs && <button className="tg-load-older" disabled={loadingOlder} onClick={loadOlderMessages}>{loadingOlder?'Загрузка…':'Показать ранние сообщения'}</button>}
            {!activeChannel ? (
              <div className="tg-chat-center tg-no-chat">
                <div className="tg-empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                <p>Нет доступных чатов</p><span>Администратор добавит вас в нужный чат</span>
              </div>
            ) : loadingMsgs ? (
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
                {participantsError && <div className="tg-participants-empty"><span>{participantsError}</span><button onClick={()=>fetchParticipants()}>Повторить</button></div>}
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
                    <div className="tg-participant-actions">
                      {p.callCenterName && <span className="tg-cc-chip">{p.callCenterName}</span>}
                      <span className={`tg-participant-status ${p.online ? 'online' : 'offline'}`}>
                        <span className="tg-status-dot" /> {p.online ? 'Онлайн' : 'Офлайн'}
                      </span>
                      {canManageChat && (
                        <button className="tg-member-remove" title="Удалить из чата" aria-label={`Удалить ${p.name}`} onClick={() => removeMember(p.id)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
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
            disabled={sending || !activeChannel}
          />
          <button className="tg-send-btn" onClick={() => handleSend()} disabled={!activeChannel || !newMessage.trim() || sending}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>


        <Modal title="Новый чат" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={createChat}
          okText="Создать" cancelText="Отмена" confirmLoading={savingChat}
          okButtonProps={{ disabled: newChatName.trim().length < 2 }} width={520}>
          <div className="tg-dialog-stack">
            <label><span>Название</span><Input autoFocus maxLength={100} placeholder="Например, Судебный отдел" value={newChatName} onChange={e => setNewChatName(e.target.value)} /></label>
            <label><span>Участники</span><Select mode="multiple" allowClear showSearch optionFilterProp="label" placeholder="Выберите сотрудников" value={selectedMemberIds} onChange={setSelectedMemberIds} options={candidateOptions} /></label>
            <div className="tg-dialog-note">Вы автоматически будете добавлены в новый чат. Сотрудники подключённых колл-центров показаны отдельными группами.</div>
          </div>
        </Modal>

        <Modal title="Управление чатом" open={manageOpen} onCancel={() => setManageOpen(false)} footer={null} width={560}>
          <div className="tg-dialog-stack">
            <div className="tg-manage-chat-title">
              <div><span>Чат</span><strong>{activeChannelLabel}</strong></div>
              <div className="tg-manage-actions">
                <Button onClick={() => { setRenameValue(activeChannelLabel); setRenameOpen(true); }}>Переименовать</Button>
                {!channels.find(ch => ch.key === activeChannel)?.isSystem && <Button danger onClick={archiveChat}>Удалить чат</Button>}
              </div>
            </div>
            <div className="tg-add-member-row">
              <Select showSearch optionFilterProp="label" placeholder="Добавить сотрудника" value={memberToAdd} onChange={setMemberToAdd} options={candidateOptions} />
              <Button type="primary" disabled={!memberToAdd} loading={savingChat} onClick={addMember}>Добавить</Button>
            </div>
            <div className="tg-manage-list">
              {participants.map(p => <div className="tg-manage-person" key={p.id}>
                <div className="tg-participant-avatar" style={{ background: ROLE_COLORS[p.role] || '#6B7280' }}>{p.name[0]?.toUpperCase()}</div>
                <div><strong>{p.name}</strong><span>{ROLE_LABELS[p.role] || p.role}{p.callCenterName ? ` · ${p.callCenterName}` : ''}</span></div>
                <button className="tg-member-remove" title="Удалить из чата" onClick={() => removeMember(p.id)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>)}
            </div>
          </div>
        </Modal>

        <Modal title="Переименовать чат" open={renameOpen} onCancel={() => setRenameOpen(false)} onOk={renameChat}
          okText="Сохранить" cancelText="Отмена" confirmLoading={savingChat} okButtonProps={{ disabled: renameValue.trim().length < 2 }}>
          <Input autoFocus maxLength={100} value={renameValue} onChange={e => setRenameValue(e.target.value)} onPressEnter={renameChat} />
        </Modal>

      </div>
    </div>
  );
};

export default OfficeChat;
