import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useChatContext } from '../../lib/context/ChatContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
`;

const MessageGroup = styled.div`
  margin-bottom: 16px;
`;

const Message = styled.div<{ $isMine: boolean }>`
  display: flex;
  flex-direction: ${props => props.$isMine ? 'row-reverse' : 'row'};
  margin-bottom: 8px;
`;

const MessageContent = styled.div<{ $isMine: boolean }>`
  max-width: 70%;
  margin-left: ${props => props.$isMine ? '0' : '8px'};
  margin-right: ${props => props.$isMine ? '8px' : '0'};
`;

const MessageBubble = styled.div<{ $isMine: boolean }>`
  background-color: ${props => props.$isMine ? '#1890ff' : '#f0f0f0'};
  color: ${props => props.$isMine ? '#fff' : '#000'};
  border-radius: 12px;
  padding: 8px 12px;
  word-wrap: break-word;
`;

const MessageTime = styled.div<{ $isMine: boolean }>`
  font-size: 12px;
  color: #8c8c8c;
  text-align: ${props => props.$isMine ? 'right' : 'left'};
  margin-top: 4px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8c8c8c;
`;

export const ChatMessageList: React.FC = () => {
  const { currentMessages, currentUserInfo } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Прокрутка к последнему сообщению при обновлении списка
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages]);

  // Если нет выбранного пользователя или сообщений
  if (!currentUserInfo) {
    return (
      <EmptyState>
        <p>Выберите чат для начала общения</p>
      </EmptyState>
    );
  }

  return (
    <Container>
      {currentMessages.length === 0 ? (
        <EmptyState>
          <p>Нет сообщений</p>
          <p>Начните общение прямо сейчас!</p>
        </EmptyState>
      ) : (
        currentMessages.map((message: any) => {
          const isMine = message.sender_id !== currentUserInfo.id;
          
          return (
            <Message key={message.id} $isMine={isMine}>
              {!isMine && (
                <Avatar 
                  src={currentUserInfo.avatar} 
                  icon={!currentUserInfo.avatar && <UserOutlined />} 
                />
              )}
              <MessageContent $isMine={isMine}>
                <MessageBubble $isMine={isMine}>
                  {message.text}
                </MessageBubble>
                <MessageTime $isMine={isMine}>
                  {format(new Date(message.created_at), 'HH:mm', { locale: ru })}
                </MessageTime>
              </MessageContent>
            </Message>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </Container>
  );
}; 