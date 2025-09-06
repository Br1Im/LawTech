import React, { useState, useEffect } from "react";
import { Layout, theme } from "antd";
import Office from "../components/Office";
import AITools from '../components/AITools/AITools';
import Employees from '../components/Employees';
import Documents from '../components/Documents';
import Arrivals from '../components/Arrivals';
import Expenses from '../components/Expenses';
import Reception from '../components/Reception';
import Materials from '../components/Materials';
import Clients from '../components/Clients';
import Header from "../widgets/homePage/Header";
import Sidebar from "../components/ui/Sidebar";
import MobileTabs from "../components/ui/MobileTabs";

const { Content } = Layout;

const SRM = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  const [activeTab, setActiveTab] = useState<string>("Офис");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Определение мобильного вида при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      marginTop: isMobile ? "140px" : "88px",
      padding: "24px",
      backgroundColor: "var(--color-bg)",
      transition: "margin-left 0.3s ease, margin-top 0.3s ease",
      overflow: "auto",
      flex: 1,
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
      <Header main={false} />
      <div style={styles.mainLayout}>
        <MobileTabs
          activeTab={activeTab}
          onTabClick={handleTabClick}
          isMobile={isMobile}
        />
        <Sidebar
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          activeTab={activeTab}
          onTabClick={handleTabClick}
          isMobile={isMobile}
        />
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