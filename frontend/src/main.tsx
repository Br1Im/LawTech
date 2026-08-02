import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './responsive.css'
import './mobile.css'
import './lawtech-design-system.css'
import App from './App.tsx'
import { setupAuthInterceptor } from './shared/utils/authUtils'
import { installTunnelAuthPatch } from './shared/utils/tunnelAuthPatch'

// При работе за HTTP Basic Auth тоннелем (devinapps expose) переводим
// JWT Bearer из Authorization в X-Auth-Token, чтобы не конфликтовать с Basic.
installTunnelAuthPatch();

// Настраиваем перехватчик для автоматического выхода при 401
setupAuthInterceptor();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Считаем данные свежими 30 сек — за это время повторное открытие вкладки
      // или возврат к компоненту берёт данные из кэша мгновенно, без HTTP-запроса.
      staleTime: 30_000,
      // Не теребить сервер при каждом фокусе окна (Antd Drawer, переключение таба).
      refetchOnWindowFocus: false,
      // 1 ретрай — нет смысла долбить упавший endpoint.
      retry: 1,
    },
  },
})

// Прячем boot-loader, как только React начал рендер
requestAnimationFrame(() => {
  const el = document.getElementById('boot-loader');
  if (el) { el.classList.add('hidden'); setTimeout(() => el.remove(), 300); }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

