import React, { useState, useEffect } from "react";
import { Layout, Menu, theme } from "antd";
import {
  ApartmentOutlined,
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  FallOutlined,
  BellOutlined,
  BookOutlined,
  TeamOutlined,
  ContactsOutlined,
  RobotOutlined,
} from "@ant-design/icons";
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

const { Sider, Content } = Layout;

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
    mobileTabs: {
      position: "fixed" as const,
      top: "70px",
      left: 0,
      right: 0,
      height: "60px",
      backgroundColor: "var(--color-bg-alt)",
      display: isMobile ? "flex" : "none",
      justifyContent: "flex-start",
      alignItems: "center",
      overflowX: "auto" as const,
      zIndex: 999,
      borderBottom: "1px solid var(--color-border)",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
      padding: "0 10px",
    } satisfies React.CSSProperties,
    mobileTab: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      padding: "8px 10px",
      minWidth: "60px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "background-color 0.3s ease",
      margin: "0 4px",
      backgroundColor: "transparent",
    } satisfies React.CSSProperties,
    mobileTabActive: {
      backgroundColor: "var(--color-accent)",
      color: "white",
    } satisfies React.CSSProperties,
    mobileTabIcon: {
      fontSize: "20px",
      marginBottom: "4px",
    } satisfies React.CSSProperties,
    mobileTabText: {
      fontSize: "10px",
      textAlign: "center" as const,
      whiteSpace: "nowrap" as const,
    } satisfies React.CSSProperties,
    sider: {
      backgroundColor: "var(--color-bg-alt)",
      borderRight: `1px solid var(--color-border)`,
      boxShadow: "2px 0 8px rgba(0, 0, 0, 0.05)",
      transition: "all 0.3s ease",
      marginTop: "70px",
      height: "calc(100vh - 70px)",
      position: "fixed" as const,
      left: 0,
      zIndex: 998,
      width: collapsed ? "80px" : "260px",
      display: isMobile ? "none" : "block",
    } satisfies React.CSSProperties,
    logo: {
      height: "64px",
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      paddingLeft: collapsed ? "0" : "24px",
      marginBottom: "24px",
      fontSize: "24px",
      fontWeight: 700,
      letterSpacing: "0.5px",
    } satisfies React.CSSProperties,
    primaryText: {
      color: "var(--color-primary)",
    } satisfies React.CSSProperties,
    accentText: {
      color: "var(--color-accent)",
    } satisfies React.CSSProperties,
    menu: {
      border: "none",
      backgroundColor: "transparent",
    } satisfies React.CSSProperties,
    menuItem: {
      margin: "4px 12px",
      borderRadius: "8px",
      fontWeight: 600,
      fontSize: "15px",
      transition: "all 0.3s ease, transform 0.2s ease",
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

  const tabNames = [
    { name: "Офис", key: "1", icon: <ApartmentOutlined /> },
    { name: "AI инструменты", key: "10", icon: <RobotOutlined /> },
    { name: "Сотрудники", key: "2", icon: <TeamOutlined /> },
    { name: "Договоры", key: "3", icon: <FileTextOutlined /> },
    { name: "Приходы", key: "4", icon: <DollarOutlined /> },
    { name: "Расходы", key: "5", icon: <FallOutlined /> },
    { name: "Ресепшен", key: "6", icon: <BellOutlined /> },
    { name: "Материалы", key: "7", icon: <BookOutlined /> },
    { name: "Клиенты", key: "9", icon: <ContactsOutlined /> },
  ];

  return (
    <div style={styles.container}>
      <style>
        {`
          .custom-menu .ant-menu-item-selected,
          .custom-menu .ant-menu-item:active {
            background-color: var(--color-accent) !important;
            color: var(--color-bg) !important;
          }
          .custom-menu .ant-menu-item-selected .anticon,
          .custom-menu .ant-menu-item:active .anticon {
            color: var(--color-bg) !important;
          }
          .custom-menu .ant-menu-item:hover {
            background-color: var(--color-accent-light) !important;
            transform: scale(1.05);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          .custom-menu .ant-menu-item {
            color: var(--color-text);
          }
          .custom-menu .ant-menu-item .anticon {
            color: var(--color-muted);
          }

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
            
          .ant-layout-sider-trigger {
            background-color: var(--color-bg-alt);
            color: var(--color-primary);
            border-top: 1px solid var(--color-border);
            transition: all 0.3s ease;
          }

          .ant-layout-sider-trigger:hover {
            background-color: var(--color-accent-light);
            color: var(--color-bg);
          }

          .ant-layout-sider-trigger .anticon {
            font-size: 18px;
          }

          .ant-layout-sider .ant-layout-sider-trigger {
            background-color: var(--color-bg-alt, #f5f5f5) !important;
            color: var(--color-muted, #1890ff) !important;
            border-top: 1px solid var(--color-border, #d9d9d9) !important;
            transition: all 0.3s ease;
          }

          .ant-layout-sider .ant-layout-sider-trigger:hover {
            background-color: var(--color-accent-light, #e6f7ff) !important;
            color: var(--color-bg, #ffffff) !important;
          }

          .ant-layout-sider .ant-layout-sider-trigger .anticon {
            font-size: 18px;
          }

          @media (max-width: 768px) {
            .mobile-menu-scroll::-webkit-scrollbar {
              display: none;
            }
            .mobile-menu-scroll {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          }
        `}
      </style>
      <Header main={false} />
      <div style={styles.mainLayout}>
        {isMobile && (
          <div style={styles.mobileTabs} className="mobile-menu-scroll">
            {tabNames.map(tab => (
              <div
                key={tab.key}
                style={{
                  ...styles.mobileTab,
                  ...(activeTab === tab.name ? styles.mobileTabActive : {})
                }}
                onClick={() => handleTabClick(tab.name)}
              >
                <span style={styles.mobileTabIcon}>{tab.icon}</span>
                <span style={styles.mobileTabText}>{tab.name}</span>
              </div>
            ))}
          </div>
        )}
        {!isMobile && (
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
            style={styles.sider}
            width={260}
            theme="light"
          >
            <Menu
              mode="inline"
              selectedKeys={[tabNames.find((tab) => tab.name === activeTab)?.key || "1"]}
              style={styles.menu}
              className="custom-menu"
              onClick={({ key }) => {
                const selectedTab = tabNames.find((tab) => tab.key === key)?.name;
                if (selectedTab) handleTabClick(selectedTab);
              }}
              items={tabNames.map((tab) => ({
                key: tab.key,
                icon: tab.icon,
                label: tab.name,
                title: tab.name,
                style: styles.menuItem,
              }))}
            />
          </Sider>
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
        </Content>
      </div>
    </div>
  );
};

export default SRM;