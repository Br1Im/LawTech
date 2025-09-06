import React from "react";
import { Layout, Menu } from "antd";
import {
  ApartmentOutlined,
  FileTextOutlined,
  DollarOutlined,
  FallOutlined,
  BellOutlined,
  BookOutlined,
  TeamOutlined,
  ContactsOutlined,
  RobotOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  activeTab: string;
  onTabClick: (tab: string) => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onCollapse,
  activeTab,
  onTabClick,
  isMobile,
}) => {
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

  const styles = {
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
  };

  if (isMobile) {
    return null;
  }

  return (
    <>
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
        `}
      </style>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={onCollapse}
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
            if (selectedTab) onTabClick(selectedTab);
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
    </>
  );
};

export default Sidebar;