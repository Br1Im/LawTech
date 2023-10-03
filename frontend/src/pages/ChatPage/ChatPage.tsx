import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout, Typography } from 'antd';
import { Chat } from '../../shared/ui/Chat';

const { Content } = Layout;
const { Title } = Typography;

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [initialUserId, setInitialUserId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const userIdParam = searchParams.get('userId');
    if (userIdParam) {
      setInitialUserId(Number(userIdParam));
    }
  }, [searchParams]);

  return (
    <Layout>
      <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Title level={2}>Чат</Title>
        <Chat initialUserId={initialUserId} />
      </Content>
    </Layout>
  );
}; 