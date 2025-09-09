import React, { useState, useEffect } from "react";
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
  UserOutlined,
  LogoutOutlined,
  CalendarOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  activeTab: string;
  onTabClick: (tab: string) => void;
  isMobile: boolean;
  user?: {
    role: string;
    [key: string]: any;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed, 
  onCollapse, 
  activeTab, 
  onTabClick, 
  isMobile,
  user 
}) => {
  const [isDarkTheme] = useState<boolean>(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );
  const [accountMenuOpen, setAccountMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  // Функция для перевода ролей на русский язык
  const getRoleDisplayName = (role: string): string => {
    const roleMap: { [key: string]: string } = {
      'admin': 'Администратор',
      'lawyer': 'Юрист',
      'expert': 'Эксперт',
      'manager': 'Менеджер',
      'office': 'Офис',
      'okk': 'ОКК',
      'representative': 'Представитель',
      'director': 'Директор',
      'owner': 'Собственник'
    };
    return roleMap[role] || role || 'Пользователь';
  };



  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
    setAccountMenuOpen(false);
  };

  const handleProfile = () => {
    navigate('/profile');
    setAccountMenuOpen(false);
  };

  const handleSettings = () => {
    // Здесь будет логика для настроек
    console.log('Открыть настройки');
    setAccountMenuOpen(false);
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
  ];

  // Фильтрация пунктов меню для юристов
  const lawyerTabNames = [
    { name: "Офис", key: "1", icon: <ApartmentOutlined /> },
    { name: "AI инструменты", key: "10", icon: <RobotOutlined /> },
    { name: "Договоры", key: "3", icon: <FileTextOutlined /> },
    { name: "Материалы", key: "7", icon: <BookOutlined /> },
    { name: "Клиенты", key: "9", icon: <ContactsOutlined /> },
  ];

  // Фильтрация пунктов меню для экспертов
  const expertTabNames = [
    { name: "AI инструменты", key: "10", icon: <RobotOutlined /> },
    { name: "Сотрудники", key: "2", icon: <TeamOutlined /> },
    { name: "Материалы", key: "7", icon: <BookOutlined /> },
    { name: "Клиенты", key: "9", icon: <ContactsOutlined /> },
  ];

  // Фильтрация пунктов меню для администраторов
  const adminTabNames = [
    { name: "AI инструменты", key: "10", icon: <RobotOutlined /> },
    { name: "Договоры", key: "3", icon: <FileTextOutlined /> },
    { name: "Приходы", key: "4", icon: <DollarOutlined /> },
    { name: "Ресепшен", key: "6", icon: <BellOutlined /> },
    { name: "Записи", key: "11", icon: <CalendarOutlined /> },
  ];

  const getTabNamesByRole = (role: string) => {
    console.log('🔍 Определение вкладок для роли:', role);
    switch (role) {
      case 'lawyer':
        console.log('👨‍💼 Роль юриста - показываем ограниченные вкладки');
        return lawyerTabNames;
      case 'expert':
        console.log('🔬 Роль эксперта - показываем экспертные вкладки');
        return expertTabNames;
      case 'admin':
        console.log('👑 Роль администратора - показываем админские вкладки');
        return adminTabNames;
      default:
        console.log('❓ Неизвестная роль или роль не определена - показываем вкладки юриста по умолчанию');
        return lawyerTabNames; // Изменено с allTabNames на lawyerTabNames
    }
  };

  // Добавляем отладочную информацию
  console.log('👤 Информация о пользователе в Sidebar:', user);
  const tabNames = user?.role ? getTabNamesByRole(user.role) : lawyerTabNames; // Изменено с allTabNames на lawyerTabNames



  const styles = {
    sider: {
      backgroundColor: "var(--color-bg-alt)",
      borderRight: `1px solid var(--color-border)`,
      boxShadow: "2px 0 8px rgba(0, 0, 0, 0.05)",
      transition: "all 0.3s ease",
      marginTop: "0px",
      height: "100vh",
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
          
          /* Выравнивание иконок при свернутом сайдбаре */
          .ant-layout-sider-collapsed .custom-menu .ant-menu-item {
            padding-left: 0 !important;
            padding-right: 0 !important;
            text-align: center !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
          
          .ant-layout-sider-collapsed .custom-menu .ant-menu-item .anticon {
            margin-right: 0 !important;
            margin-left: 0 !important;
          }
          
          .ant-layout-sider-collapsed .custom-menu .ant-menu-item .ant-menu-title-content {
            display: none !important;
          }
          
          /* Дополнительное выравнивание для меню аккаунта */
          .ant-layout-sider-collapsed .account-menu .ant-menu-item {
            padding: 0 !important;
            margin: 0 !important;
            height: 40px !important;
            line-height: 40px !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
          
          .ant-layout-sider-collapsed .account-menu .ant-menu-item .anticon {
            margin: 0 !important;
            font-size: 16px !important;
          }
          
          /* Анимация для выпадающего меню */
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }           
           /* Анимация для выпадающего меню */
           @keyframes slideUp {
             from {
               opacity: 0;
               transform: translateY(10px);
             }
             to {
               opacity: 1;
               transform: translateY(0);
             }
           }
           
           @keyframes popUpCenter {
             from {
               opacity: 0;
               transform: translateX(-50%) translateY(10px) scale(0.95);
             }
             to {
               opacity: 1;
               transform: translateX(-50%) translateY(0) scale(1);
             }
           }
           
           @keyframes popUpRight {
             from {
               opacity: 0;
               transform: translateX(8px) translateY(10px) scale(0.95);
             }
             to {
               opacity: 1;
               transform: translateX(8px) translateY(0) scale(1);
             }
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid var(--color-border)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? '0' : '12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            minHeight: '64px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '16px',
              flexShrink: 0,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              LT
            </div>
            <div style={{
              overflow: 'hidden',
              width: collapsed ? '0px' : '120px',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <span style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: 'var(--color-accent)',
                whiteSpace: 'nowrap',
                display: 'block',
                transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                LawTech
              </span>
            </div>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[tabNames.find((tab) => tab.name === activeTab)?.key || "1"]}
            style={{ ...styles.menu, flex: 1 }}
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
          
          <div style={{ borderTop: '1px solid var(--color-border)', position: 'relative' }}>
            <div 
              style={{ 
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: accountMenuOpen ? 'var(--color-accent)' : 'var(--color-bg-alt)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                gap: collapsed ? '0' : '12px',
                borderRadius: collapsed ? '8px' : '0px',
                margin: collapsed ? '8px' : '0px',
                boxShadow: accountMenuOpen ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none'
              }}
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              onMouseEnter={(e) => {
                if (!accountMenuOpen) {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!accountMenuOpen) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
              title="Меню аккаунта"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <UserOutlined style={{ 
                    fontSize: '16px', 
                    color: '#fff'
                  }} />
                </div>
                {!collapsed && (
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--color-text)'
                    }}>
                      {getRoleDisplayName(user?.role || '')}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--color-muted)'
                    }}>
                      {user?.email || 'Не указан'}
                    </div>
                  </div>
                )}
              </div>
              {!collapsed && (
                <div style={{
                  transform: accountMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--color-muted)'
                  }}>
                    ▼
                  </span>
                </div>
              )}
            </div>
            
            {accountMenuOpen && (
              <div style={{
                position: 'absolute',
                bottom: collapsed ? '0' : '100%',
                left: collapsed ? '100%' : '50%',
                transform: collapsed ? 'translateX(8px)' : 'translateX(-50%)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                width: collapsed ? '180px' : '200px',
                marginBottom: collapsed ? '0' : '12px',
                overflow: 'hidden',
                animation: collapsed ? 'popUpRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'popUpCenter 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                <div 
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderBottom: '1px solid var(--color-border)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={handleProfile}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                    e.currentTarget.style.paddingLeft = '20px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.paddingLeft = '16px';
                  }}
                >
                  <UserOutlined style={{ fontSize: '14px', color: 'var(--color-accent)' }} />
                  <span style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: '500' }}>Профиль</span>
                </div>
                
                <div 
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderBottom: '1px solid var(--color-border)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={handleSettings}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                    e.currentTarget.style.paddingLeft = '20px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.paddingLeft = '16px';
                  }}
                >
                  <SettingOutlined style={{ fontSize: '14px', color: 'var(--color-accent)' }} />
                  <span style={{ fontSize: '14px', color: 'var(--color-text)', fontWeight: '500' }}>Настройки</span>
                </div>
                
                <div 
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={handleLogout}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff2f0';
                    e.currentTarget.style.paddingLeft = '20px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.paddingLeft = '16px';
                  }}
                >
                  <LogoutOutlined style={{ fontSize: '14px', color: '#ff4d4f' }} />
                  <span style={{ fontSize: '14px', color: '#ff4d4f', fontWeight: '500' }}>Выход</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Sider>
    </>
  );
};

export default Sidebar;