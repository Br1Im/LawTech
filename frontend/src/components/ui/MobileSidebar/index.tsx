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
  CalendarOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

interface MobileSidebarProps {
  activeTab: string;
  onTabClick: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  user?: {
    role: string;
    [key: string]: any;
  };
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  activeTab,
  onTabClick,
  isOpen,
  onClose,
  user,
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
    onClose();
  };

  const handleProfile = () => {
    navigate('/profile');
    onClose();
  };

  const allTabNames = [
    { name: "Офис", key: "1", icon: <ApartmentOutlined /> },
    { name: "AI инструменты", key: "10", icon: <RobotOutlined /> },
    { name: "Сотрудники", key: "2", icon: <TeamOutlined /> },
    { name: "Договоры", key: "3", icon: <FileTextOutlined /> },
    { name: "Приходы", key: "4", icon: <DollarOutlined /> },
    { name: "Расходы", key: "5", icon: <FallOutlined /> },
    { name: "Ресепшен", key: "6", icon: <BellOutlined /> },
    { name: "Материалы", key: "7", icon: <BookOutlined /> },
    { name: "Клиенты", key: "9", icon: <ContactsOutlined /> },
    { name: "Календарь", key: "11", icon: <CalendarOutlined /> },
  ];

  // Фильтрация пунктов меню для юристов
  const lawyerTabNames = [
    { name: "Офис", key: "1", icon: <ApartmentOutlined /> },
    { name: "AI инструменты", key: "10", icon: <RobotOutlined /> },
    { name: "Договоры", key: "3", icon: <FileTextOutlined /> },
    { name: "Материалы", key: "7", icon: <BookOutlined /> },
    { name: "Клиенты", key: "9", icon: <ContactsOutlined /> },
    { name: "Календарь", key: "11", icon: <CalendarOutlined /> },
  ];

  // Фильтрация пунктов меню для экспертов
  const expertTabNames = [
    { name: "AI инструменты", key: "10", icon: <RobotOutlined /> },
    { name: "Сотрудники", key: "2", icon: <TeamOutlined /> },
    { name: "Материалы", key: "7", icon: <BookOutlined /> },
    { name: "Клиенты", key: "9", icon: <ContactsOutlined /> },
    { name: "Календарь", key: "11", icon: <CalendarOutlined /> },
  ];

  // Фильтрация пунктов меню для администраторов
  const adminTabNames = [
    { name: "AI инструменты", key: "10", icon: <RobotOutlined /> },
    { name: "Договоры", key: "3", icon: <FileTextOutlined /> },
    { name: "Приходы", key: "4", icon: <DollarOutlined /> },
    { name: "Ресепшен", key: "6", icon: <BellOutlined /> },
    { name: "Записи", key: "8", icon: <CalendarOutlined /> },
    { name: "Календарь", key: "11", icon: <CalendarOutlined /> },
  ];

  const getTabNamesByRole = (role: string) => {
    switch (role) {
      case 'lawyer':
        return lawyerTabNames;
      case 'expert':
        return expertTabNames;
      case 'admin':
        return adminTabNames;
      default:
        return allTabNames;
    }
  };

  const tabNames = user?.role ? getTabNamesByRole(user.role) : allTabNames;

  const handleTabClick = (tabName: string) => {
    onTabClick(tabName);
    onClose();
  };

  const styles = {
    overlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 1000,
      opacity: isOpen ? 1 : 0,
      visibility: isOpen ? "visible" as const : "hidden" as const,
      transition: "opacity 0.3s ease, visibility 0.3s ease",
    } satisfies React.CSSProperties,
    sidebar: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      width: "280px",
      height: "100vh",
      backgroundColor: "var(--color-bg-alt)",
      boxShadow: "2px 0 8px rgba(0, 0, 0, 0.15)",
      zIndex: 1001,
      transform: isOpen ? "translateX(0)" : "translateX(-100%)",
      transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    } satisfies React.CSSProperties,
    header: {
      padding: "20px",
      borderBottom: "1px solid var(--color-border)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "var(--color-bg-alt)",
    } satisfies React.CSSProperties,
    logo: {
      fontSize: "20px",
      fontWeight: "bold" as const,
      color: "var(--color-accent)",
    } satisfies React.CSSProperties,
    closeButton: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      border: "none",
      backgroundColor: "transparent",
      color: "var(--color-text)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color 0.2s ease",
    } satisfies React.CSSProperties,
    menuContainer: {
      flex: 1,
      overflowY: "auto" as const,
      padding: "10px 0",
    } satisfies React.CSSProperties,
    menuItem: {
      display: "flex",
      alignItems: "center",
      padding: "12px 20px",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
      borderLeftWidth: "3px",
      borderLeftStyle: "solid",
      borderLeftColor: "transparent",
      color: "var(--color-text)",
    } satisfies React.CSSProperties,
    menuItemActive: {
      backgroundColor: "var(--color-accent)",
      color: "white",
      borderLeftColor: "var(--color-accent)",
    } satisfies React.CSSProperties,
    menuItemIcon: {
      fontSize: "18px",
      marginRight: "12px",
      minWidth: "18px",
    } satisfies React.CSSProperties,
    menuItemText: {
      fontSize: "14px",
      fontWeight: "500" as const,
    } satisfies React.CSSProperties,
    footer: {
      borderTop: "1px solid var(--color-border)",
      padding: "10px 0",
    } satisfies React.CSSProperties,
    accountItem: {
      display: "flex",
      alignItems: "center",
      padding: "12px 20px",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
      color: "var(--color-text)",
    } satisfies React.CSSProperties,
    accountItemIcon: {
      fontSize: "16px",
      marginRight: "12px",
      minWidth: "16px",
    } satisfies React.CSSProperties,
    accountItemText: {
      fontSize: "14px",
    } satisfies React.CSSProperties,
  };

  // Сайдбар должен отображаться независимо от isMobile
  // Видимость контролируется через isOpen

  return (
    <>
      {/* Overlay */}
      <div style={styles.overlay} onClick={onClose} />
      
      {/* Sidebar */}
      <div style={styles.sidebar}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>LawTech</div>
          <button
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-border)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <CloseOutlined />
          </button>
        </div>

        {/* Menu Items */}
        <div style={styles.menuContainer}>
          {tabNames.map(tab => (
            <div
              key={tab.key}
              style={{
                ...styles.menuItem,
                ...(activeTab === tab.name ? styles.menuItemActive : {})
              }}
              onClick={() => handleTabClick(tab.name)}
              onMouseEnter={(e) => {
                if (activeTab !== tab.name) {
                  e.currentTarget.style.backgroundColor = 'var(--color-border)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.name) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={styles.menuItemIcon}>{tab.icon}</span>
              <span style={styles.menuItemText}>{tab.name}</span>
            </div>
          ))}
        </div>

        {/* Footer with account actions */}
        <div style={styles.footer}>
          <div
            style={styles.accountItem}
            onClick={toggleTheme}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-border)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={styles.accountItemIcon}><BulbOutlined /></span>
            <span style={styles.accountItemText}>
              {isDarkTheme ? "Светлая тема" : "Темная тема"}
            </span>
          </div>
          
          <div
            style={styles.accountItem}
            onClick={handleProfile}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-border)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={styles.accountItemIcon}><UserOutlined /></span>
            <span style={styles.accountItemText}>Профиль</span>
          </div>
          
          <div
            style={{
              ...styles.accountItem,
              color: '#ff4d4f'
            }}
            onClick={handleLogout}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{...styles.accountItemIcon, color: '#ff4d4f'}}>
              <LogoutOutlined />
            </span>
            <span style={{...styles.accountItemText, color: '#ff4d4f'}}>
              Выйти
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;