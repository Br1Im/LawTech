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
const Reception = React.lazy(() => import('../components/Reception'));
const CallCenter = React.lazy(() => import('../components/CallCenter'));
const Materials = React.lazy(() => import('../components/Materials'));
const Clients = React.lazy(() => import('../components/Clients'));
const Acts = React.lazy(() => import('../components/Acts'));
const Salary = React.lazy(() => import('../components/Salary'));
const Appointments = React.lazy(() => import('../components/Appointments'));
const MyCases = React.lazy(() => import('../components/MyCases'));
import MiniCalendar from '../components/ui/MiniCalendar';
import { FaCalendarAlt, FaTimes } from 'react-icons/fa';
import NotificationPanel from '../components/NotificationPanel';
const OfficeChat = React.lazy(() => import('../components/OfficeChat'));
const CashRegister = React.lazy(() => import('../components/CashRegister'));
const Applications = React.lazy(() => import('../components/Applications'));
const Cases = React.lazy(() => import('../components/Cases'));

import Sidebar from "../components/ui/Sidebar";
import MobileSidebar from "../components/ui/MobileSidebar";
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
        return 'Офис';
      case 'representative':
        return 'Мои дела';
      case 'admin':
        return 'Клиенты';
      case 'cc_manager':
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(window.innerWidth <= 768);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });
  const [showChangePassword, setShowChangePassword] = useState(() => localStorage.getItem('must_change_password') === 'true');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const unreadPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'administrator';
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Новый документ',
      message: 'Получен новый договор от клиента ООО "Рога и копыта"',
      type: 'info' as const,
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 минут назад
      read: false
    },
    {
      id: '2',
      title: 'Задача выполнена',
      message: 'Анализ договора №123 завершен успешно',
      type: 'success' as const,
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 минут назад
      read: false
    },
    {
      id: '3',
      title: 'Требуется внимание',
      message: 'В договоре №456 обнаружены потенциальные риски',
      type: 'warning' as const,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 часа назад
      read: true
    },
    {
      id: '4',
      title: 'Ошибка системы',
      message: 'Не удалось загрузить документ. Попробуйте позже',
      type: 'error' as const,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 день назад
      read: true
    }
  ]);

  // Определение мобильного вида при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth <= 768;
      setIsMobile(isMobileView);
      setIsMobileSidebarOpen(isMobileView);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const theme = isDarkTheme ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [isDarkTheme]);

  // Poll unread chat messages for badge
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const officeId = localStorage.getItem('activeOfficeId') || user?.office_id;
        if (!officeId) return;
        const counts = await receptionAPI.getUnreadCounts(String(officeId));
        const total = Object.values(counts).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
        setUnreadChatCount(total);
      } catch { /* ignore */ }
    };
    checkUnread();
    unreadPollRef.current = setInterval(checkUnread, 15000);
    return () => { if (unreadPollRef.current) clearInterval(unreadPollRef.current); };
  }, [user?.office_id]);

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

  const handleNotificationClick = () => {
    setIsNotificationPanelOpen(true);
  };

  const handleCloseNotificationPanel = () => {
    setIsNotificationPanelOpen(false);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
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
      marginLeft: isMobile ? "0" : (collapsed ? "64px" : "240px"),
      marginTop: isMobile ? "70px" : "0px",
      padding: isMobile ? "8px" : "16px",
      backgroundColor: "var(--color-bg)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      height: isMobile ? `calc(100vh - 70px)` : "100vh",
      maxWidth: isMobile ? "100%" : `calc(100vw - ${collapsed ? "64px" : "240px"})`,
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
            background: var(--color-accent);
            border-radius: 4px;
            transition: background 0.3s ease;
          }

          .ant-layout-content::-webkit-scrollbar-thumb:hover {
            background: var(--color-accent-light);
          }

          .ant-layout-content {
            scrollbar-width: thin;
            scrollbar-color: var(--color-accent) var(--color-bg-alt);
          }
        `}
      </style>

      <div style={styles.mainLayout}>
        {isMobile && (
          <HamburgerButton
            isOpen={isMobileSidebarOpen}
            onClick={toggleMobileSidebar}
          />
        )}
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          isMobile={isMobile}
          onClose={() => setIsMobileSidebarOpen(false)}
          activeTab={activeTab}
          onTabClick={(tab) => {
            handleTabClick(tab);
            setIsMobileSidebarOpen(false);
          }}
          user={user ? { ...user } : undefined}
        />
        <Sidebar
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          activeTab={activeTab}
          onTabClick={handleTabClick}
          isMobile={isMobile}
          user={user ? { ...user } : undefined}
          unreadChatCount={unreadChatCount}
        />
        <Content style={styles.content}>
          <Suspense fallback={<div style={{padding:48,textAlign:"center",color:"var(--color-text-muted)"}}>Загрузка…</div>}>
          {activeTab === "Офис" && (<Office />)}
          {activeTab === "AI инструменты" && <AITools />}
          {activeTab === "Сотрудники" && <Employees />}
          {activeTab === "Договоры" && <Documents contractId={contractIdParam || selectedContractId} />}
          {activeTab === "Приходы" && <Arrivals />}
          {activeTab === "Расходы" && <Expenses />}
          {activeTab === "Колл-центр" && <CallCenter />}
          {activeTab === "Материалы" && <Materials />}
          {activeTab === "Клиенты" && (<Clients onTabClick={handleTabClick} onContractSelect={handleContractSelect} />)}
          {activeTab === "Акты" && (<Acts />)}
          {activeTab === "Зарплата" && (<Salary />)}
          {activeTab === "Записи" && <Appointments />}
          {activeTab === "Мои дела" && <MyCases />}
          {activeTab === "Чат" && <OfficeChat />}
          {activeTab === "Касса" && <CashRegister />}
          {activeTab === "Представители" && <MyCases />}
          {activeTab === "Заявления" && <Applications />}
          {activeTab === "Суды" && <Cases />}
          </Suspense>

        </Content>
      </div>
      
      {showChangePassword && (
        <ChangePasswordModal onDone={() => setShowChangePassword(false)} />
      )}


    </div>
  );
};

export default SRM;
