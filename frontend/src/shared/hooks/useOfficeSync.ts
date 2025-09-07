import { useEffect, useCallback, useRef } from 'react';

// Типы событий синхронизации
export type SyncEventType = 
  | 'office_selected'
  | 'client_added'
  | 'employee_added'
  | 'expense_added'
  | 'document_added'
  | 'stats_updated'
  | 'office_updated';

// Интерфейс события синхронизации
export interface SyncEvent {
  type: SyncEventType;
  officeId: string;
  data: any;
  timestamp: number;
}

// Хук для синхронизации данных офиса между вкладками
export const useOfficeSync = () => {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const listenersRef = useRef<Map<SyncEventType, Set<(data: any) => void>>>(new Map());

  // Инициализация BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel('office-sync');
    
    // Обработчик входящих сообщений
    const handleMessage = (event: MessageEvent<SyncEvent>) => {
      const { type, data } = event.data;
      const listeners = listenersRef.current.get(type);
      
      if (listeners) {
        listeners.forEach(listener => listener(data));
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    return () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage);
        channelRef.current.close();
      }
    };
  }, []);

  // Отправка события синхронизации
  const broadcast = useCallback((type: SyncEventType, officeId: string, data: any) => {
    if (channelRef.current) {
      const event: SyncEvent = {
        type,
        officeId,
        data,
        timestamp: Date.now()
      };
      channelRef.current.postMessage(event);
    }
  }, []);

  // Подписка на события
  const subscribe = useCallback((type: SyncEventType, callback: (data: any) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type)!.add(callback);

    // Возвращаем функцию отписки
    return () => {
      const listeners = listenersRef.current.get(type);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersRef.current.delete(type);
        }
      }
    };
  }, []);

  return {
    broadcast,
    subscribe
  };
};