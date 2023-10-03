import { FiHome, FiMessageSquare, FiUsers, FiSettings, FiUser } from 'react-icons/fi';
import type { NavItem } from '../../shared/types';

export const getNavItems = (role: string): NavItem[] => {
  const commonItems: NavItem[] = [
    {
      title: 'Дашборд',
      path: '/dashboard',
      icon: FiHome,
    },
    {
      title: 'Чат',
      path: '/chat',
      icon: FiMessageSquare,
    },
    {
      title: 'Профиль',
      path: '/profile',
      icon: FiUser,
    },
  ];

  // Добавляем пункты меню в зависимости от роли пользователя
  if (role === 'admin') {
    return [
      ...commonItems,
      {
        title: 'Пользователи',
        path: '/users',
        icon: FiUsers,
      },
      {
        title: 'Настройки',
        path: '/settings',
        icon: FiSettings,
      },
    ];
  }

  return commonItems;
}; 