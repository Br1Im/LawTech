import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Проверяет наличие и базовую валидность JWT-токена.
 * Если токен истёк — удаляем его и перенаправляем на /auth.
 */
const isTokenAlive = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));

    // Если в токене есть exp — проверяем, что он ещё не истёк
    if (payload.exp) {
      const expiresMs = payload.exp * 1000;
      if (Date.now() >= expiresMs) {
        // Токен истёк — чистим localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return false;
      }
    }

    return true;
  } catch {
    // Невалидный токен — удаляем
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  if (!isTokenAlive()) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
