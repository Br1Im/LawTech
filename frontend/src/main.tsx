import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './responsive.css'
import './mobile.css'
import './lawtech-design-system.css'
import './dark-theme.css'
import './graphite-theme.css'
import App from './App.tsx'
import { setupAuthInterceptor } from './shared/utils/authUtils'
import { installTunnelAuthPatch } from './shared/utils/tunnelAuthPatch'

// При работе за HTTP Basic Auth тоннелем (devinapps expose) переводим
// JWT Bearer из Authorization в X-Auth-Token, чтобы не конфликтовать с Basic.
installTunnelAuthPatch();

// Настраиваем перехватчик для автоматического выхода при 401
setupAuthInterceptor();


// Legacy-form accessibility bridge. Shared form components already provide labels;
// this only names controls that have no associated label at all.
const ensureAccessibleControlNames = (root: ParentNode = document) => {
  root.querySelectorAll<HTMLElement>('input, select, textarea, button').forEach((el) => {
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return;
    const id = el.getAttribute('id');
    if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) return;
    if (el.closest('label')) return;
    const text = (el.textContent || '').trim();
    const hint = el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('title') || text;
    if (hint) el.setAttribute('aria-label', hint.slice(0, 120));
  });
};
const accessibilityObserver = new MutationObserver((records) => {
  records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node instanceof HTMLElement) ensureAccessibleControlNames(node);
  }));
});
requestAnimationFrame(() => {
  ensureAccessibleControlNames();
  accessibilityObserver.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
});

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

