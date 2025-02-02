import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import WelcomePage from './pages/WelcomePage';
import CRM from './pages/CRM';
import ProfilePage from './pages/ProfilePage';
import JoinPage from './pages/JoinPage';
import PendingRequestPage from './pages/PendingRequestPage';
import { useState, useEffect } from 'react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path='/welcome' element={<WelcomePage />} />
        <Route path='/crm' element={<CRM />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/join" element={<JoinPage isAuthenticated={isAuthenticated} />} />
        <Route path="/pending-request" element={<PendingRequestPage />} />
        <Route path="*" element={<h1>Страница не найдена</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
