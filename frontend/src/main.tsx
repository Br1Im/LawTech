import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './responsive.css'
import App from './App.tsx'
import { setupAuthInterceptor } from './shared/utils/authUtils'
import { installTunnelAuthPatch } from './shared/utils/tunnelAuthPatch'

// При работе за HTTP Basic Auth тоннелем (devinapps expose) переводим
// JWT Bearer из Authorization в X-Auth-Token, чтобы не конфликтовать с Basic.
installTunnelAuthPatch();

// Настраиваем перехватчик для автоматического выхода при 401
setupAuthInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
