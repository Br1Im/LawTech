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
    role?: string;
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

  // Определяем пункты меню в зависимости от роли
  const getMenuItemsByRole = (role?: string) => {
    const allItems = {
      office: { key: 'Офис', icon: <FaBuilding />, label: 'Офис' },
      clients: { key: 'Клиенты', icon: <FaUserFriends />, label: 'Клиенты' },
      contracts: { key: 'Договоры', icon: <FaFileContract />, label: 'Договоры' },
      calendar: { key: 'Календарь', icon: <FaCalendarAlt />, label: 'Календарь' },
      appointments: { key: 'Записи', icon: <FaClock />, label: 'Записи' },
      employees: { key: 'Сотрудники', icon: <FaUsers />, label: 'Сотрудники' },
      revenue: { key: 'Приходы', icon: <FaChartLine />, label: 'Приходы' },
      expenses: { key: 'Расходы', icon: <FaMoneyBillWave />, label: 'Расходы' },
      reception: { key: 'Ресепшен', icon: <FaUserTie />, label: 'Ресепшен' },
      materials: { key: 'Материалы', icon: <FaBox />, label: 'Материалы' },
      ai: { key: 'AI инструменты', icon: <FaRobot />, label: 'AI инструменты' },
    };

    switch (role) {
      case 'expert':
        // Эксперт: AI-инструменты, Сотрудники, Материалы, Клиенты, Календарь
        return [allItems.ai, allItems.employees, allItems.materials, allItems.clients, allItems.calendar];
      
      case 'lawyer':
        // Юрист: Офис, AI-инструменты, Договоры, Материалы, Клиенты, Календарь
        return [allItems.office, allItems.ai, allItems.contracts, allItems.materials, allItems.clients, allItems.calendar];
      
      case 'admin':
        // Администратор: AI-инструменты, Договоры, Приходы, Ресепшен, Календарь
        return [allItems.ai, allItems.contracts, allItems.revenue, allItems.reception, allItems.calendar];
      
      case 'director':
        // Директор: все пункты меню
        return [
          allItems.office,
          allItems.clients,
          allItems.contracts,
          allItems.calendar,
          allItems.appointments,
          allItems.employees,
          allItems.revenue,
          allItems.expenses,
          allItems.reception,
          allItems.materials,
          allItems.ai,
        ];
      
      default:
        // По умолчанию показываем все (для обратной совместимости)
        return [
          allItems.office,
          allItems.clients,
          allItems.contracts,
          allItems.calendar,
          allItems.appointments,
          allItems.employees,
          allItems.revenue,
          allItems.expenses,
          allItems.reception,
          allItems.materials,
          allItems.ai,
        ];
    }
  };

  const menuItems = getMenuItemsByRole(user?.role);

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
