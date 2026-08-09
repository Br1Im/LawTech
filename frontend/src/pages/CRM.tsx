import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Layout } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useAuth } from '../shared/lib/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
const Office = React.lazy(() => import("../components/Office"));
const AITools = React.lazy(() => import('../components/AITools/AITools'));
const Employees = React.lazy(() => import('../components/Employees'));
const Documents = React.lazy(() => import('../components/Documents'));
const Arrivals = React.lazy(() => import('../components/Arrivals'));
const Expenses = React.lazy(() => import('../components/Expenses'));
const Balance = React.lazy(() => import('../components/Balance'));
const Reception = React.lazy(() => import('../components/Reception'));
const CallCenter = React.lazy(() => import('../components/CallCenter'));
const CallCenterConnections = React.lazy(() => import('../components/CallCenterConnections'));
const Materials = React.lazy(() => import('../components/Materials'));
const Clients = React.lazy(() => import('../components/Clients'));
const Acts = React.lazy(() => import('../components/Acts'));
const Salary = React.lazy(() => import('../components/Salary'));
const Appointments = React.lazy(() => import('../components/Appointments'));
const MyCases = React.lazy(() => import('../components/MyCases'));
const Settings = React.lazy(() => import('../components/Settings'));
import MiniCalendar from '../components/ui/MiniCalendar';
import { FaCalendarAlt, FaTimes } from 'react-icons/fa';
import NotificationPanel from '../components/NotificationPanel';
const OfficeChat = React.lazy(() => import('../components/OfficeChat'));
const CashRegister = React.lazy(() => import('../components/CashRegister'));
const Applications = React.lazy(() => import('../components/Applications'));
const Cases = React.lazy(() => import('../components/Cases'));

import Sidebar from "../components/ui/Sidebar";
import MobileSidebar from "../components/ui/MobileSidebar";
import MobileIconRail from "../components/ui/MobileIconRail";
import HamburgerButton from "../components/ui/HamburgerButton";
import ChangePasswordModal from "../components/ChangePasswordModal";
import { receptionAPI } from '../shared/api/reception';
import { apiInstance } from '../shared/api/instance';

const { Content } = Layout;

const SRM = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Функция для определения первой вкладки по роли
  const getDefaultTabByRole = (role?: string): string => {
    switch (role) {
      case 'expert':
        return 'Клиенты';
      case 'lawyer':
        return 'Клиенты';
      case 'representative':
        return 'Мои дела';
      case 'administrator':
      case 'admin':
        return 'Записи';
      case 'cc_manager':
        return 'Подключения';
      case 'cc_operator':
        return 'Колл-центр';
      case 'director':
      case 'manager':
      case 'okk':
        return 'Офис';
      default:
        return 'Офис';
    }
  };

  // Проверка авторизации
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth');
      return;
    }
  }, [navigate]);

  const location = useLocation();
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  
  // Получаем параметры из URL
  const searchParams = new URLSearchParams(location.search);
  const rawTabParam = searchParams.get('tab');
  // Обратная совместимость: старые ссылки на ?tab=Договоры перенаправляем на Клиенты.
  const tabParam = rawTabParam === 'Договоры' ? 'Клиенты' : rawTabParam;
  const contractIdParam = searchParams.get('contractId');
  
  const [activeTab, setActiveTab] = useState<string>(tabParam || getDefaultTabByRole(user?.role));
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(() => localStorage.getItem('must_change_password') === 'true');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatSoundEnabled, setChatSoundEnabled] = useState(() => localStorage.getItem('chatNotificationSound') !== 'off');
  const unreadPreviousRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const unreadPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';
  const [notifications, setNotifications] = useState([]);
  const reloadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setNotifications(list.map((n) => ({ id: String(n.id), title: n.title, message: n.message || '', type: (n.type === 'error' || n.type === 'warning' || n.type === 'success') ? n.type : 'info', timestamp: new Date(n.created_at), read: !!n.is_read })));
    } catch { /* noop */ }
  }, []);
  useEffect(() => { reloadNotifications(); const t = setInterval(reloadNotifications, 60000); return () => clearInterval(t); }, [reloadNotifications]);

  // Определение мобильного вида при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth <= 768;
      setIsMobile(isMobileView);
      // rail handles default mobile nav
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Тема (светлая/тёмная) управляется единым AntThemeProvider через useThemeMode().
  // Здесь намеренно нет дублирующей логики data-theme, чтобы не было рассинхрона с Ant Design.

  const playChatSound = useCallback(() => {
    if (!chatSoundEnabled || typeof window === 'undefined') return;
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = audioContextRef.current || new AudioContextCtor();
    audioContextRef.current = context;
    if (context.state === 'suspended') context.resume().catch(() => {});
    const now = context.currentTime;
    [659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.05625, now + index * 0.09 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.09);
      oscillator.stop(now + index * 0.09 + 0.18);
    });
  }, [chatSoundEnabled]);

  useEffect(() => {
    const unlockAudio = () => {
      const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextCtor();
      if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  // Poll unread chat messages for badge and play a short Telegram-style chime for new incoming messages.
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const officeId = localStorage.getItem('activeOfficeId') || user?.office_id;
        if (!officeId) return;
        const counts = await receptionAPI.getUnreadCounts(String(officeId));
        const total = Object.values(counts).reduce((sum: number, value: any) => sum + (Number(value) || 0), 0);
        const previous = unreadPreviousRef.current;
        if (previous !== null && total > previous && activeTab !== '???') {
          playChatSound();
          setNotifications(prev => [{
            id: 'chat-' + Date.now(),
            title: '????? ????????? ? ????',
            message: '????????? ????? ????????? ?? ???????',
            type: 'info' as const,
            timestamp: new Date(),
            read: false,
          }, ...prev].slice(0, 50));
        }
        unreadPreviousRef.current = total;
        setUnreadChatCount(total);
      } catch { /* ignore */ }
    };
    checkUnread();
    unreadPollRef.current = setInterval(checkUnread, 5000);
    return () => { if (unreadPollRef.current) clearInterval(unreadPollRef.current); };
  }, [user?.office_id, activeTab, playChatSound]);

  // Reset badge when user is on Chat tab
  useEffect(() => {
    if (activeTab === 'Чат') {
      setUnreadChatCount(0);
    }
  }, [activeTab]);



  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    // Сбрасываем выбранный договор при переключении на другую вкладку
    if (tab !== "Клиенты") {
      setSelectedContractId(null);
    }
  };

  const handleContractSelect = (contractId: number) => {
    const safeContractId = contractId || 0;
    setSelectedContractId(safeContractId.toString());
    // Обновляем URL с новым contractId
    const newUrl = `/crm?tab=Клиенты&contractId=${safeContractId}`;
    window.history.pushState({}, '', newUrl);
  };

  const toggleChatSound = () => {
    setChatSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('chatNotificationSound', next ? 'on' : 'off');
      return next;
    });
  };

  const handleNotificationClick = () => {
    setIsNotificationPanelOpen(true);
  };

  const handleCloseNotificationPanel = () => {
    setIsNotificationPanelOpen(false);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    fetch(`/api/notifications/${id}/read`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }).catch(() => {});
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetch('/api/notifications/read-all', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }).catch(() => {});
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column" as const,
      height: "100vh",
      width: "100vw",
      backgroundColor: "var(--color-bg)",
      overflow: "hidden",
    } satisfies React.CSSProperties,
    mainLayout: {
      display: "flex",
      flex: 1,
      overflow: "hidden",
      position: "relative" as const,
    } satisfies React.CSSProperties,

    content: {
      flex: 1,
      marginLeft: isMobile ? "0" : (collapsed ? "64px" : "216px"),
      marginTop: "0px",
      padding: isMobile ? "10px 10px 76px" : "22px",
      backgroundColor: "var(--color-bg)",
      transition: "margin-left 0.24s cubic-bezier(0.22, 1, 0.36, 1), max-width 0.24s cubic-bezier(0.22, 1, 0.36, 1)",
      height: "100vh",
      maxWidth: isMobile ? "100vw" : `calc(100vw - ${collapsed ? "64px" : "216px"})`,
      overflow: "auto",
      position: "relative" as const,
      WebkitOverflowScrolling: "touch" as const,
      boxSizing: "border-box" as const,
    } satisfies React.CSSProperties,
    topButtons: {
      position: "fixed" as const,
      top: "16px",
      right: "24px",
      display: "flex",
      alignItems: "center",
      zIndex: 1001,
    } satisfies React.CSSProperties,
    notificationBar: {
      position: "fixed" as const,
      top: isMobile ? "10px" : "14px",
      right: isMobile ? "14px" : "24px",
      zIndex: 1001,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      pointerEvents: "none" as const,
    } satisfies React.CSSProperties,
    notificationButton: {
      position: "relative" as const,
      width: 42,
      height: 42,
      boxSizing: "border-box" as const,
      borderRadius: 12,
      border: "1px solid #DFE5F2",
      background: "rgba(255,255,255,0.94)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 6px 18px rgba(31,35,87,0.10)",
      flex: "0 0 auto",
      pointerEvents: "auto" as const,
    } satisfies React.CSSProperties,

  };



  return (
    <div style={styles.container} data-v="3">
      <style>
        {`
          .ant-layout-content::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          .ant-layout-content::-webkit-scrollbar-track {
            background: var(--color-bg-alt);
            border-radius: 4px;
          }

          .ant-layout-content::-webkit-scrollbar-thumb {
            background: var(--brand-blue, var(--color-accent));
            border-radius: 4px;
            transition: background 0.3s ease;
          }

          .ant-layout-content::-webkit-scrollbar-thumb:hover {
            background: var(--brand-blue-soft, var(--color-accent-light));
          }

          .ant-layout-content {
            scrollbar-width: thin;
            scrollbar-color: var(--brand-blue, var(--color-accent)) var(--color-bg-alt);
          }
        `}
      </style>

      <div style={styles.mainLayout}>
      {isMobile && (
        <MobileIconRail
          userRole={user?.role}
          activeTab={activeTab}
          onTabClick={handleTabClick}
          onMoreClick={() => setIsMobileSidebarOpen(true)}
        />
      )}

        <Sidebar
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          activeTab={activeTab}
          onTabClick={handleTabClick}
          isMobile={isMobile}
          user={user ? { ...user } : undefined}
          unreadChatCount={unreadChatCount}
        />
        <Content className="lawtech-workspace" style={styles.content}>
          {!isAdmin && (
            <div className="lawtech-notification-bar" style={styles.notificationBar}>
              <button
                className="lawtech-notification-button"
                onClick={handleNotificationClick}
                title="Уведомления"
                aria-label="Открыть уведомления"
                style={styles.notificationButton}
              >
                <BellOutlined style={{ fontSize: 18, color: 'var(--brand-blue, var(--color-primary))' }} />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>
            </div>
          )}
          <Suspense fallback={<div style={{padding:48,textAlign:"center",color:"var(--color-text-muted)"}}>Загрузка…</div>}>
            <div
              key={activeTab}
              className={`lawtech-page-stage${activeTab === "Чат" ? " is-chat" : ""}`}
            >
              {activeTab === "Офис" && (<Office />)}
              {activeTab === "AI инструменты" && <AITools />}
              {activeTab === "Сотрудники" && <Employees />}
              {activeTab === "Договоры" && <Documents contractId={contractIdParam || selectedContractId} />}
              {activeTab === "Приходы" && <Arrivals />}
              {activeTab === "Расходы" && <Expenses />}
              {activeTab === "Баланс" && <Balance />}
              {activeTab === "Колл-центр" && <CallCenter />}
              {activeTab === "Подключения" && <CallCenterConnections />}
              {activeTab === "Материалы" && <Materials />}
              {activeTab === "Клиенты" && (<Clients onTabClick={handleTabClick} onContractSelect={handleContractSelect} />)}
              {activeTab === "Акты" && (<Acts />)}
              {activeTab === "Зарплата" && (<Salary />)}
              {activeTab === "Записи" && <Appointments />}
              {activeTab === "Мои дела" && <MyCases />}
              {activeTab === "Чат" && <OfficeChat />}
              {activeTab === "Настройки" && <Settings />}
              {activeTab === "Касса" && <CashRegister />}
              {activeTab === "Представители" && <MyCases />}
              {activeTab === "Заявления" && <Applications />}
              {activeTab === "Суды" && <Cases />}
            </div>
          </Suspense>

        </Content>
      </div>
      
      {!isAdmin && (
        <NotificationPanel
          isOpen={isNotificationPanelOpen}
          onClose={handleCloseNotificationPanel}
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          soundEnabled={chatSoundEnabled}
          onToggleSound={toggleChatSound}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal onDone={() => setShowChangePassword(false)} />
      )}


    </div>
  );
};

export default SRM;
