import React, { useState } from 'react';
import styled from 'styled-components';
import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useChatContext } from '../../lib/context/ChatContext';

const Container = styled.div`
  display: flex;
  padding: 12px;
  border-top: 1px solid #f0f0f0;
`;

const StyledInput = styled(Input)`
  border-radius: 20px;
  margin-right: 8px;
`;

const SendButton = styled(Button)`
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ChatMessageInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const { sendMessage, currentUserId } = useChatContext();

  const handleSend = () => {
    if (message.trim() && currentUserId) {
      sendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Container>
      <StyledInput
        placeholder="Введите сообщение..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={!currentUserId}
      />
      <SendButton 
        type="primary" 
        icon={<SendOutlined />} 
        onClick={handleSend}
        disabled={!message.trim() || !currentUserId}
      />
    </Container>
  );
}; 