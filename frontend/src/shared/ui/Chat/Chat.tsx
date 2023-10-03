import React from 'react';
import styled from 'styled-components';
import { ChatProvider } from '../../lib/context/ChatContext';
import { ChatConversationList } from '../ChatConversationList';
import { ChatMessageList } from '../ChatMessageList';
import { ChatMessageInput } from '../ChatMessageInput';

const Container = styled.div`
  display: flex;
  height: 600px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 300px;
  border-right: 1px solid #f0f0f0;
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const MessageArea = styled.div`
  flex: 1;
  overflow-y: auto;
`;

interface ChatProps {
  initialUserId?: number;
}

export const Chat: React.FC<ChatProps> = ({ initialUserId }) => {
  return (
    <ChatProvider initialUserId={initialUserId}>
      <Container>
        <Sidebar>
          <ChatConversationList />
        </Sidebar>
        <Content>
          <MessageArea>
            <ChatMessageList />
          </MessageArea>
          <ChatMessageInput />
        </Content>
      </Container>
    </ChatProvider>
  );
}; 