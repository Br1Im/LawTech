import { Navigate } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';
import { isAuthenticated, isTokenValid, logout } from '../shared/utils/authUtils';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      // Просто проверяем наличие токена
      const authenticated = isAuthenticated();
      
      if (authenticated) {
        // Проверяем валидность только если токен есть
        const tokenValid = isTokenValid();
        
        if (tokenValid) {
          setIsAuth(true);
        } else {
          // Токен невалиден - выполняем выход
          console.warn('Токен невалиден, выполняем выход');
          logout();
          setIsAuth(false);
        }
      } else {
        setIsAuth(false);
      }
      
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  // Показываем загрузку пока проверяем авторизацию
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-text)'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid var(--color-accent-light)',
            borderTop: '4px solid var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Проверка авторизации...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Если не авторизован - редирект на страницу авторизации
  if (!isAuth) {
    return <Navigate to="/auth" replace />;
  }

  // Если авторизован - показываем контент
  return <>{children}</>;
};

export default ProtectedRoute;
