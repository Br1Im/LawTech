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
  FaUser,
  FaCog,
  FaSignOutAlt
} from 'react-icons/fa';
import MiniCalendar from './MiniCalendar';
import './MobileSidebar.css';

interface MobileSidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  activeTab: string;
  onTabClick: (tab: string) => void;
  user?: {
    name?: string;
    surname?: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  isMobile,
  onClose,
  activeTab,
  onTabClick,
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
        return [allItems.ai, allItems.employees, allItems.materials, allItems.clients];
      case 'lawyer':
        return [allItems.office, allItems.ai, allItems.contracts, allItems.materials, allItems.clients];
      case 'admin':
        return [allItems.ai, allItems.contracts, allItems.revenue, allItems.reception];
      case 'director':
        return [
          allItems.office, allItems.clients, allItems.contracts, allItems.calendar,
          allItems.appointments, allItems.employees, allItems.revenue, allItems.expenses,
          allItems.reception, allItems.materials, allItems.ai,
        ];
      default:
        return [
          allItems.office, allItems.clients, allItems.contracts, allItems.calendar,
          allItems.appointments, allItems.employees, allItems.revenue, allItems.expenses,
          allItems.reception, allItems.materials, allItems.ai,
        ];
    }
  };

  const menuItems = getMenuItemsByRole(user?.role);

  const handleProfileClick = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
    onClose();
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

  if (!isMobile) {
    return null;
  }

  return (
    <>
      <div 
        className={`mobile-sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />
      <div className={`mobile-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <div className="mobile-sidebar-logo">
            <span className="logo-text">LawTech CRM</span>
          </div>
          <button className="mobile-sidebar-close" onClick={onClose} aria-label="Закрыть меню">
            ✕
          </button>
        </div>

        <div className="mobile-sidebar-calendar">
          <MiniCalendar />
        </div>

        <nav className="mobile-sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className={`mobile-sidebar-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => onTabClick(item.key)}
            >
              <span className="mobile-sidebar-icon">{item.icon}</span>
              <span className="mobile-sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mobile-sidebar-footer">
          <button
            className="mobile-sidebar-item"
            onClick={handleSettingsClick}
          >
            <span className="mobile-sidebar-icon"><FaCog /></span>
            <span className="mobile-sidebar-label">Настройки</span>
          </button>
          
          <div className="mobile-sidebar-user-menu" ref={userMenuRef}>
            <button
              className="mobile-sidebar-item mobile-sidebar-profile"
              onClick={handleProfileClick}
            >
              <span className="mobile-sidebar-icon">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="user-avatar" />
                ) : (
                  <FaUser />
                )}
              </span>
              <div className="user-info">
                <span className="user-name">
                  {user?.name || user?.surname ? `${user.surname || ''} ${user.name || ''}`.trim() : 'Пользователь'}
                </span>
                <span className="user-email">{user?.email || ''}</span>
              </div>
            </button>
            
            {isUserMenuOpen && (
              <div className="mobile-user-dropdown-menu">
                <button className="mobile-user-menu-item" onClick={handleLogout}>
                  <FaSignOutAlt className="mobile-user-menu-icon" />
                  <span>Выйти</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
