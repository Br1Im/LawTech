import React from 'react';
import styled from 'styled-components';
import { List, Avatar, Badge } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useChatContext } from '../../lib/context/ChatContext';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const StyledList = styled(List)`
  border-right: 1px solid #f0f0f0;
  height: 100%;
  overflow-y: auto;
`;

const ConversationItem = styled(List.Item)<{ $active?: boolean }>`
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
  background-color: ${props => props.$active ? '#e6f7ff' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.$active ? '#e6f7ff' : '#f5f5f5'};
  }
`;

const UserName = styled.div`
  font-weight: 500;
`;

const LastMessageTime = styled.div`
  font-size: 12px;
  color: #8c8c8c;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

export const ChatConversationList: React.FC = () => {
  const { conversations, currentUserId, openChat } = useChatContext();

  const handleSelectConversation = (userId: number) => {
    openChat(userId);
  };

  return (
    <StyledList
      dataSource={conversations}
      renderItem={(item: any) => (
        <ConversationItem
          $active={item.conversation_with_id === currentUserId}
          onClick={() => handleSelectConversation(item.conversation_with_id)}
        >
          <List.Item.Meta
            avatar={
              <Badge count={item.unread_count} size="small">
                <Avatar src={item.user.avatar} icon={!item.user.avatar && <UserOutlined />} />
              </Badge>
            }
            title={<UserName>{item.user.username}</UserName>}
            description={
              <UserInfo>
                <LastMessageTime>
                  {formatDistanceToNow(new Date(item.last_message_time), { 
                    addSuffix: true,
                    locale: ru 
                  })}
                </LastMessageTime>
              </UserInfo>
            }
          />
        </ConversationItem>
      )}
    />
  );
}; 