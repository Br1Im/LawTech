import React from 'react';
import { Button } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface StartChatButtonProps {
  userId: number;
  className?: string;
}

export const StartChatButton: React.FC<StartChatButtonProps> = ({ userId, className }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/chat?userId=${userId}`);
  };

  return (
    <Button 
      type="primary" 
      icon={<MessageOutlined />} 
      onClick={handleClick}
      className={className}
    >
      Начать чат
    </Button>
  );
}; 