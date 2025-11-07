import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import WelcomePage from './pages/WelcomePage';
import CRM from './pages/CRM';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage.tsx';
import JoinPage from './pages/JoinPage';
import PendingRequestPage from './pages/PendingRequestPage';
import ProtectedRoute from './components/ProtectedRoute';
import { OfficeProvider } from './shared/contexts/OfficeContext';
import { useState, useEffect } from 'react';
import { useAuth } from './shared/lib/hooks/useAuth';

// Компонент для маршрутов, который использует useAuth внутри BrowserRouter
function AppRoutes() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { user } = useAuth();
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);
  
  return (
    <OfficeProvider user={user}>
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Защищенные маршруты */}
        <Route path='/welcome' element={
          <ProtectedRoute>
            <WelcomePage />
          </ProtectedRoute>
        } />
        <Route path='/crm' element={
          <ProtectedRoute>
            <CRM />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/join" element={
          <ProtectedRoute>
            <JoinPage isAuthenticated={isAuthenticated} />
          </ProtectedRoute>
        } />
        <Route path="/pending-request" element={
          <ProtectedRoute>
            <PendingRequestPage />
          </ProtectedRoute>
        } />
        
        {/* 404 */}
        <Route path="*" element={<h1>Страница не найдена</h1>} />
      </Routes>
    </OfficeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
