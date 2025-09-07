import React, { useState, useEffect } from "react";
import { Layout } from "antd";
import { BulbOutlined, BellOutlined } from "@ant-design/icons";
import { useAuth } from '../shared/lib/hooks/useAuth';
import Office from "../components/Office";
import AITools from '../components/AITools/AITools';
import Employees from '../components/Employees';
import Documents from '../components/Documents';
import Arrivals from '../components/Arrivals';
import Expenses from '../components/Expenses';
import Reception from '../components/Reception';
import Materials from '../components/Materials';
import Clients from '../components/Clients';

import Sidebar from "../components/ui/Sidebar";
import MobileTabs from "../components/ui/MobileTabs";

const { Content } = Layout;

const SRM = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("Офис");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );

  // Определение мобильного вида при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column" as const,
      height: "100vh",
      width: "100vw",
      backgroundColor: "var(--color-bg)",
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
      padding: "12px",
      backgroundColor: "var(--color-bg)",
      transition: "margin-left 0.3s ease, margin-top 0.3s ease",
      height: `calc(100vh - ${isMobile ? "70px" : "24px"})`,
      overflow: "hidden",
      position: "relative" as const,
    } satisfies React.CSSProperties,
    topButtons: {
      position: "fixed" as const,
      top: "18px",
      right: "24px",
      display: "flex",
      gap: "8px",
      zIndex: 999,
    } satisfies React.CSSProperties,
    topButton: {
      width: "40px",
      height: "40px",
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
        <MobileTabs
          activeTab={activeTab}
          onTabClick={handleTabClick}
          isMobile={isMobile}
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
          <button
            onClick={toggleTheme}
            style={styles.topButton}
            title={isDarkTheme ? 'Светлая тема' : 'Темная тема'}
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
            <BulbOutlined style={{ fontSize: '18px' }} />
          </button>
          
          <button
            style={styles.topButton}
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
          </button>
        </div>
        
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
        </Content>
      </div>
    </div>
  );
};

export default SRM;