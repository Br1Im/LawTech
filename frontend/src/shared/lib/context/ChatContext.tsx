import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useChat } from '../hooks/useChat';
import type { Message, Conversation, UserInfo } from '../../api/chat';

interface ChatContextType {
  conversations: Conversation[];
  currentMessages: Message[];
  currentUserId: number | null;
  currentUserInfo: UserInfo | null;
  loading: boolean;
  error: string | null;
  openChat: (userId: number) => void;
  sendMessage: (text: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
  initialUserId?: number;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children, initialUserId }) => {
  const chatData = useChat(initialUserId);
  
  return (
    <ChatContext.Provider value={chatData}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  
  return context;
}; 