import React, { useState, useEffect } from "react";
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
  UserOutlined,
  LogoutOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

interface MobileTabsProps {
  activeTab: string;
  onTabClick: (tab: string) => void;
  isMobile: boolean;
}

const MobileTabs: React.FC<MobileTabsProps> = ({
  activeTab,
  onTabClick,
  isMobile,
}) => {
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleProfile = () => {
    navigate('/profile');
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

  const accountTabs = [
    { 
      name: isDarkTheme ? "Светлая" : "Темная", 
      key: "theme", 
      icon: <BulbOutlined />,
      onClick: toggleTheme 
    },
    { 
      name: "Профиль", 
      key: "profile", 
      icon: <UserOutlined />,
      onClick: handleProfile 
    },
    { 
      name: "Выйти", 
      key: "logout", 
      icon: <LogoutOutlined />,
      onClick: handleLogout 
    },
  ];

  const styles = {
    mobileTabs: {
      position: "fixed" as const,
      top: "0px",
      left: 0,
      right: 0,
      height: "70px",
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
  };

  if (!isMobile) {
    return null;
  }

  return (
    <>
      <style>
        {`
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
      <div style={styles.mobileTabs} className="mobile-menu-scroll">
        {tabNames.map(tab => (
          <div
            key={tab.key}
            style={{
              ...styles.mobileTab,
              ...(activeTab === tab.name ? styles.mobileTabActive : {})
            }}
            onClick={() => onTabClick(tab.name)}
          >
            <span style={styles.mobileTabIcon}>{tab.icon}</span>
            <span style={styles.mobileTabText}>{tab.name}</span>
          </div>
        ))}
        
        <div style={{ width: '1px', height: '40px', backgroundColor: 'var(--color-border)', margin: '0 8px' }} />
        
        {accountTabs.map(tab => (
          <div
            key={tab.key}
            style={styles.mobileTab}
            onClick={tab.onClick}
          >
            <span style={styles.mobileTabIcon}>{tab.icon}</span>
            <span style={styles.mobileTabText}>{tab.name}</span>
          </div>
        ))}
      </div>
    </>
  );
};

export default MobileTabs;