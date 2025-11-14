import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import { BellOutlined } from "@ant-design/icons";
import ThemeToggle from '../components/ui/ThemeToggle';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import Office from "../components/Office";
import AITools from '../components/AITools/AITools';
import Employees from '../components/Employees';
import Documents from '../components/Documents';
import Arrivals from '../components/Arrivals';
import Expenses from '../components/Expenses';
import Reception from '../components/Reception';
import Materials from '../components/Materials';
import Clients from '../components/Clients';
import Appointments from '../components/Appointments';
import Calendar from '../components/Calendar';
import NotificationPanel from '../components/NotificationPanel';

import Sidebar from "../components/ui/Sidebar";
import MobileSidebar from "../components/ui/MobileSidebar";
import HamburgerButton from "../components/ui/HamburgerButton";

const { Content } = Layout;

const SRM = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

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
  
  const [activeTab, setActiveTab] = useState<string>(tabParam || "Офис");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(window.innerWidth <= 768);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
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
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  // Закрытие меню темы при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isThemeMenuOpen && !target.closest('[data-theme-menu]')) {
        setIsThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeMenuOpen]);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const toggleThemeMenu = () => {
    setIsThemeMenuOpen(!isThemeMenuOpen);
  };

  const selectTheme = (theme: 'light' | 'dark' | 'auto') => {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkTheme(prefersDark);
    } else {
      setIsDarkTheme(theme === 'dark');
    }
    setIsThemeMenuOpen(false);
  };

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

    content: {
      marginLeft: isMobile ? "0" : (collapsed ? "80px" : "260px"),
      marginTop: isMobile ? "70px" : "0px",
      padding: isMobile ? "8px" : "12px",
      backgroundColor: "var(--color-bg)",
      transition: "margin-left 0.3s ease, margin-top 0.3s ease, padding 0.3s ease",
      height: `calc(100vh - ${isMobile ? "70px" : "24px"})`,
      overflow: "auto",
      position: "relative" as const,
      WebkitOverflowScrolling: "touch" as const,
    } satisfies React.CSSProperties,
    topButtons: {
      position: "fixed" as const,
      top: isMobile ? "12px" : "18px",
      right: isMobile ? "12px" : "24px",
      display: "flex",
      gap: isMobile ? "6px" : "8px",
      zIndex: 999,
    } satisfies React.CSSProperties,
    themeMenuContainer: {
      position: "relative" as const,
    } satisfies React.CSSProperties,
    themeMenu: {
      position: "absolute" as const,
      top: "50px",
      right: "0",
      backgroundColor: "var(--color-bg)",
      border: "1px solid var(--color-border)",
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
      padding: "8px",
      minWidth: "180px",
      zIndex: 1000,
      opacity: isThemeMenuOpen ? 1 : 0,
      visibility: isThemeMenuOpen ? "visible" : "hidden",
      transform: isThemeMenuOpen ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.95)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      backdropFilter: "blur(10px)",
    } satisfies React.CSSProperties,
    themeOption: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px 16px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      fontSize: "14px",
      fontWeight: "500",
      color: "var(--color-text)",
    } satisfies React.CSSProperties,
    topButton: {
      width: isMobile ? "36px" : "40px",
      height: isMobile ? "36px" : "40px",
      borderRadius: "50%",
      border: "1px solid var(--color-border)",
      backgroundColor: "var(--color-bg)",
      color: "var(--color-muted)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
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
        <div style={styles.topButtons}>
          <ThemeToggle 
            isDark={isDarkTheme} 
            onToggle={toggleTheme}
            isMobile={isMobile}
          />
          
          <div style={styles.themeMenuContainer} data-theme-menu style={{ display: 'none' }}>
            <button
              onClick={toggleThemeMenu}
              style={styles.topButton}
              title="Выбор темы"
            >
            </button>
            
            <div style={styles.themeMenu}>
              <div 
                style={{
                  ...styles.themeOption,
                  backgroundColor: !isDarkTheme ? 'var(--color-accent-light)' : 'transparent',
                  color: !isDarkTheme ? 'var(--color-accent)' : 'var(--color-text)',
                }}
                onClick={() => selectTheme('light')}
                onMouseEnter={(e) => {
                  if (!(!isDarkTheme)) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(!isDarkTheme)) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '16px' }}>☀️</span>
                Светлая тема
              </div>
              
              <div 
                style={{
                  ...styles.themeOption,
                  backgroundColor: isDarkTheme ? 'var(--color-accent-light)' : 'transparent',
                  color: isDarkTheme ? 'var(--color-accent)' : 'var(--color-text)',
                }}
                onClick={() => selectTheme('dark')}
                onMouseEnter={(e) => {
                  if (!(isDarkTheme)) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(isDarkTheme)) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '16px' }}>🌙</span>
                Темная тема
              </div>
              
              <div 
                style={styles.themeOption}
                onClick={() => selectTheme('auto')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: '16px' }}>🔄</span>
                Системная тема
              </div>
            </div>
          </div>
          
          <button
            onClick={handleNotificationClick}
            style={{
              ...styles.topButton,
              position: 'relative' as const,
            }}
            title="Уведомления"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
              e.currentTarget.style.color = 'var(--color-accent)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg)';
              e.currentTarget.style.color = 'var(--color-muted)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <BellOutlined style={{ fontSize: '18px' }} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 5px',
                borderRadius: '10px',
                minWidth: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
              }}>
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        </div>
        
        <Content style={styles.content}>
          {activeTab === "Офис" && <Office />}
          {activeTab === "AI инструменты" && <AITools />}
          {activeTab === "Сотрудники" && <Employees />}
          {activeTab === "Договоры" && <Documents contractId={contractIdParam || selectedContractId} />}
          {activeTab === "Приходы" && <Arrivals />}
          {activeTab === "Расходы" && <Expenses />}
          {activeTab === "Ресепшен" && <Reception />}
          {activeTab === "Материалы" && <Materials />}
          {activeTab === "Клиенты" && <Clients onTabClick={handleTabClick} onContractSelect={handleContractSelect} />}
          {activeTab === "Записи" && <Appointments />}
          {activeTab === "Календарь" && <Calendar />}
        </Content>
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