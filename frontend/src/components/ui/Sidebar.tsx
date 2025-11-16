import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaUsers,
  FaFileContract,
  FaCalendarAlt,
  FaChartLine,
  FaMoneyBillWave,
  FaUserTie,
  FaRobot,
  FaBox,
  FaUserFriends,
  FaClock,
  FaChevronLeft,
  FaChevronRight,
  FaUser,
  FaCog,
  FaSignOutAlt
} from 'react-icons/fa';
import './Sidebar.css';
import MiniCalendar from './MiniCalendar';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  activeTab: string;
  onTabClick: (tab: string) => void;
  isMobile: boolean;
  user?: {
    name?: string;
    surname?: string;
    email?: string;
    avatar?: string;
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
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { key: 'Офис', icon: <FaBuilding />, label: 'Офис' },
    { key: 'Клиенты', icon: <FaUserFriends />, label: 'Клиенты' },
    { key: 'Договоры', icon: <FaFileContract />, label: 'Договоры' },
    { key: 'Календарь', icon: <FaCalendarAlt />, label: 'Календарь' },
    { key: 'Записи', icon: <FaClock />, label: 'Записи' },
    { key: 'Сотрудники', icon: <FaUsers />, label: 'Сотрудники' },
    { key: 'Приходы', icon: <FaChartLine />, label: 'Приходы' },
    { key: 'Расходы', icon: <FaMoneyBillWave />, label: 'Расходы' },
    { key: 'Ресепшен', icon: <FaUserTie />, label: 'Ресепшен' },
    { key: 'Материалы', icon: <FaBox />, label: 'Материалы' },
    { key: 'AI инструменты', icon: <FaRobot />, label: 'AI инструменты' },
  ];

  const handleProfileClick = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  if (isMobile) {
    return null;
  }

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo">
            <span className="logo-text">LawTech CRM</span>
          </div>
        )}
        <button
          className="collapse-button"
          onClick={() => onCollapse(!collapsed)}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>

      {!collapsed && (
        <div className="sidebar-calendar">
          <MiniCalendar />
        </div>
      )}

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => onTabClick(item.key)}
            title={collapsed ? item.label : ''}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-item"
          onClick={handleSettingsClick}
          title={collapsed ? 'Настройки' : ''}
        >
          <span className="sidebar-icon"><FaCog /></span>
          {!collapsed && <span className="sidebar-label">Настройки</span>}
        </button>
        
        <div className="sidebar-user-menu" ref={userMenuRef}>
          <button
            className="sidebar-item sidebar-profile"
            onClick={handleProfileClick}
            title={collapsed ? 'Профиль' : ''}
          >
            <span className="sidebar-icon">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="user-avatar" />
              ) : (
                <FaUser />
              )}
            </span>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name">
                  {user?.name || user?.surname ? `${user.surname || ''} ${user.name || ''}`.trim() : 'Пользователь'}
                </span>
                <span className="user-email">{user?.email || ''}</span>
              </div>
            )}
          </button>
          
          {isUserMenuOpen && !collapsed && (
            <div className="user-dropdown-menu">
              <button className="user-menu-item" onClick={handleLogout}>
                <FaSignOutAlt className="user-menu-icon" />
                <span>Выйти</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
