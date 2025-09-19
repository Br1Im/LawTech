import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import { BulbOutlined, BellOutlined } from "@ant-design/icons";
import { useAuth } from '../shared/lib/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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
import MobileTabs from "../components/ui/MobileTabs";

const { Content } = Layout;

const CRM: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
  }, [navigate, isAuthenticated]);

  const [activeTab, setActiveTab] = useState<string>("Офис");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );
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
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Обработчик переключения темы
  const toggleTheme = () => {
    const newTheme = isDarkTheme ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    setIsDarkTheme(!isDarkTheme);
    localStorage.setItem('theme', newTheme);
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

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-text)',
    } as React.CSSProperties,
    content: {
      flex: 1,
      padding: isMobile ? '10px' : '20px',
      overflow: 'auto',
      backgroundColor: 'var(--color-background)',
    } as React.CSSProperties,
    mobileHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 15px',
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky' as const,
      top: 0,
      zIndex: 1000,
    } as React.CSSProperties,
    headerButtons: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
    } as React.CSSProperties,
    headerButton: {
      background: 'none',
      border: 'none',
      color: 'var(--color-text)',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '6px',
      transition: 'background-color 0.2s',
      position: 'relative' as const,
    } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      {!isMobile && (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          isDarkTheme={isDarkTheme}
          toggleTheme={toggleTheme}
        />
      )}
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <div style={styles.mobileHeader}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              {activeTab}
            </h2>
            <div style={styles.headerButtons}>
              <button
                onClick={toggleTheme}
                style={{
                  ...styles.headerButton,
                  backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                }}
                title={isDarkTheme ? 'Светлая тема' : 'Темная тема'}
              >
                <BulbOutlined style={{ fontSize: '18px' }} />
              </button>
              
              <button
                onClick={handleNotificationClick}
                style={{
                  ...styles.headerButton,
                  backgroundColor: notifications.filter(n => !n.read).length > 0 
                    ? 'rgba(255, 107, 107, 0.1)' 
                    : 'rgba(0, 0, 0, 0.05)',
                }}
                title="Уведомления"
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
          </div>
        )}
        
        {isMobile && (
          <MobileTabs 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
          />
        )}
        
        {!isMobile && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            gap: '10px',
            zIndex: 1000,
          }}>
            <button
              onClick={toggleTheme}
              style={{
                ...styles.headerButton,
                backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              }}
              title={isDarkTheme ? 'Светлая тема' : 'Темная тема'}
            >
              <BulbOutlined style={{ fontSize: '18px' }} />
            </button>
            
            <button
              onClick={handleNotificationClick}
              style={{
                ...styles.headerButton,
                backgroundColor: notifications.filter(n => !n.read).length > 0 
                  ? 'rgba(255, 107, 107, 0.1)' 
                  : 'rgba(0, 0, 0, 0.05)',
              }}
              title="Уведомления"
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
        )}
        
        <Content style={styles.content}>
          {activeTab === "Офис" && <Office />}
          {activeTab === "AI инструменты" && <AITools />}
          {activeTab === "Сотрудники" && <Employees />}
          {activeTab === "Договоры" && <Documents />}
          {activeTab === "Приходы" && <Arrivals />}
          {activeTab === "Расходы" && <Expenses />}
          {activeTab === "Ресепшен" && <Reception />}
          {activeTab === "Материалы" && <Materials />}
          {activeTab === "Клиенты" && <Clients />}
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

export default CRM;