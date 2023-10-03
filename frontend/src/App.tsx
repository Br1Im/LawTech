import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import WelcomePage from './pages/WelcomePage';
import CRM from './pages/CRM';
import ProfilePage from './pages/ProfilePage';
import JoinPage from './pages/JoinPage';
import PendingRequestPage from './pages/PendingRequestPage';
import { ChatPage } from './pages/ChatPage';
import { useState, useEffect } from 'react';
import { UserStatusProvider } from './shared/lib/context/UserStatusContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);
  
  return (
    <BrowserRouter>
      {isAuthenticated && (
        <UserStatusProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path='/welcome' element={<WelcomePage />} />
            <Route path='/crm' element={<CRM />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/join" element={<JoinPage isAuthenticated={isAuthenticated} />} />
            <Route path="/pending-request" element={<PendingRequestPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<h1>Страница не найдена</h1>} />
          </Routes>
        </UserStatusProvider>
      )}
      
      {!isAuthenticated && (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/join" element={<JoinPage isAuthenticated={isAuthenticated} />} />
          <Route path="*" element={<AuthPage />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
