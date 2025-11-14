import { Navigate } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';
import { isAuthenticated, isTokenValid, logout } from '../shared/utils/authUtils';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Просто проверяем наличие токена
  const token = localStorage.getItem('token');
  
  console.log('🔒 ProtectedRoute: проверка токена', token ? 'есть' : 'нет');
  
  // Если токена нет - редирект на авторизацию
  if (!token) {
    console.log('🔒 ProtectedRoute: токена нет, редирект на /auth');
    return <Navigate to="/auth" replace />;
  }

  // Если токен есть - показываем контент
  console.log('🔒 ProtectedRoute: токен есть, показываем контент');
  return <>{children}</>;
};

export default ProtectedRoute;
