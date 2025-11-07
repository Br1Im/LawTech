import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './responsive.css'
import App from './App.tsx'
import { setupAuthInterceptor } from './shared/utils/authUtils'

// Настраиваем перехватчик для автоматического выхода при 401
setupAuthInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
