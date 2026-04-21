import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import { useAuth } from '../shared/lib/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import CrmTopbar from '../components/ui/CrmTopbar';
import Office from "../components/Office";
import AITools from '../components/AITools/AITools';
import Employees from '../components/Employees';
import Documents from '../components/Documents';
import Arrivals from '../components/Arrivals';
import Expenses from '../components/Expenses';
import Reception from '../components/Reception';
import CallCenter from '../components/CallCenter';
import Materials from '../components/Materials';
import Clients from '../components/Clients';
import Appointments from '../components/Appointments';
import Calendar from '../components/Calendar';
import NotificationPanel from '../components/NotificationPanel';

import Sidebar from "../components/ui/Sidebar";
import MobileSidebar from "../components/ui/MobileSidebar";
import HamburgerButton from "../components/ui/HamburgerButton";

const TAB_SUBTITLES: Record<string, string> = {
  'Офис': 'Обзор показателей вашего офиса',
  'AI инструменты': 'Поиск по документам и юридический ассистент',
  'Сотрудники': 'Команда вашего офиса',
  'Договоры': 'Документы и соглашения с клиентами',
  'Приходы': 'Поступления и платежи от клиентов',
  'Расходы': 'Операционные расходы офиса',
  'Ресепшен': 'Приём входящих обращений',
  'Колл-центр': 'Звонки и лиды',
  'Материалы': 'Шаблоны, образцы, внутренние документы',
  'Клиенты': 'База клиентов офиса — CRUD, поиск, фильтры',
  'Записи': 'Встречи и консультации',
  'Календарь': 'События офиса, суды, встречи',
};

const { Content } = Layout;

const SRM = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Функция для определения первой вкладки по роли
  const getDefaultTabByRole = (role?: string): string => {
    switch (role) {
      case 'expert':
        return 'Сотрудники';
      case 'lawyer':
        return 'Офис';
      case 'admin':
        return 'Договоры';
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
  const tabParam = searchParams.get('tab');
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
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
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



  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    // Сбрасываем выбранный договор при переключении на другую вкладку
    if (tab !== "Договоры") {
      setSelectedContractId(null);
    }
  };

  const handleContractSelect = (contractId: number) => {
    const safeContractId = contractId || 0;
    setSelectedContractId(safeContractId.toString());
    // Обновляем URL с новым contractId
    const newUrl = `/crm?tab=Договоры&contractId=${safeContractId}`;
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

    contentWrap: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      marginLeft: isMobile ? "0" : (collapsed ? "72px" : "260px"),
      marginTop: isMobile ? "70px" : "0px",
      backgroundColor: "var(--color-bg)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      minHeight: isMobile ? `calc(100vh - 70px)` : "100vh",
      maxWidth: isMobile ? "100%" : `calc(100vw - ${collapsed ? "72px" : "260px"})`,
      position: "relative" as const,
      boxSizing: "border-box" as const,
    } satisfies React.CSSProperties,
    content: {
      flex: 1,
      padding: isMobile ? "14px" : "24px 28px 32px",
      backgroundColor: "transparent",
      overflow: "auto",
      WebkitOverflowScrolling: "touch" as const,
      boxSizing: "border-box" as const,
    } satisfies React.CSSProperties,
  };



  return (
    <div style={styles.container}>
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
        />

        <div style={styles.contentWrap}>
          <CrmTopbar
            activeTab={activeTab}
            title={activeTab}
            subtitle={TAB_SUBTITLES[activeTab]}
            onNotificationClick={handleNotificationClick}
            unreadCount={notifications.filter(n => !n.read).length}
            user={user ? { ...user } as any : undefined}
            isMobile={isMobile}
          />
          <Content style={styles.content}>
          {activeTab === "Офис" && <Office />}
          {activeTab === "AI инструменты" && <AITools />}
          {activeTab === "Сотрудники" && <Employees />}
          {activeTab === "Договоры" && <Documents contractId={contractIdParam || selectedContractId} />}
          {activeTab === "Приходы" && <Arrivals />}
          {activeTab === "Расходы" && <Expenses />}
          {activeTab === "Ресепшен" && <Reception />}
          {activeTab === "Колл-центр" && <CallCenter />}
          {activeTab === "Материалы" && <Materials />}
          {activeTab === "Клиенты" && <Clients onTabClick={handleTabClick} onContractSelect={handleContractSelect} />}
          {activeTab === "Записи" && <Appointments />}
          {activeTab === "Календарь" && <Calendar onOpenContract={(contractId) => {
            setSelectedContractId(contractId);
            setActiveTab("Договоры");
          }} />}
          </Content>
        </div>
      </div>
      
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={handleCloseNotificationPanel}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </div>
  );
};

export default SRM;
