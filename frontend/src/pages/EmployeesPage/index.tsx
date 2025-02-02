import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FiAlertCircle, FiUsers, FiPlus, FiUserPlus, FiX, FiCopy, FiCheck } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import EmployeeCard from '../../entities/employee/ui/EmployeeCard';
import api from '../../shared/api/api';
import type { Employee } from '../../entities/employee/model/types';
import type { User } from '../../shared/types';
import type { JoinRequest } from '../../entities/joinRequest/model/types';

interface EmployeesPageProps {
  user: User;
}

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AddEmployeeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: var(--color-accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: var(--color-accent-dark);
  }
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  color: rgb(239, 68, 68);
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const LoadingState = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--color-muted);
`;

const EmployeesList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 0;
  color: var(--color-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  color: var(--color-muted);
`;

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--color-accent-light);
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background-color: transparent;
  border: none;
  border-bottom: 2px solid ${({ active }) => active ? 'var(--color-accent)' : 'transparent'};
  color: ${({ active }) => active ? 'var(--color-accent)' : 'var(--color-muted)'};
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--color-accent);
  }
`;

const InviteModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: var(--color-bg);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  position: relative;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background-color: transparent;
  border: none;
  color: var(--color-muted);
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: var(--color-accent);
  }
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 20px;
`;

const QRCodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
`;

const QRCode = styled.div`
  padding: 16px;
  background-color: white;
  border-radius: 8px;
`;

const LinkContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const LinkLabel = styled.div`
  font-size: 14px;
  color: var(--color-muted);
`;

const LinkField = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LinkInput = styled.input`
  flex: 1;
  padding: 10px;
  border: 1px solid var(--color-accent-light);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--color-bg-alt);
  color: var(--color-text);
`;

const CopyButton = styled.button`
  padding: 10px;
  border: none;
  border-radius: 6px;
  background-color: var(--color-accent-light);
  color: var(--color-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: var(--color-accent);
    color: white;
  }
`;

const JoinRequestsBadge = styled.div`
  background-color: rgb(239, 68, 68);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
`;

type TabType = 'all' | 'requests';

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ user }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const navigate = useNavigate();

  // Проверка, является ли пользователь собственником офиса
  const isOwner = user.role === 'owner';
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user.officeId) {
        setError('У вас нет доступа к офису');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Получаем список сотрудников
        const employeesResponse = await api.employees.getAll(user.officeId);
        setEmployees(employeesResponse.employees || []);
        
        // Если пользователь - собственник, получаем список заявок
        if (isOwner) {
          const requestsResponse = await api.joinRequests.getRequests(user.officeId);
          setJoinRequests(requestsResponse.requests || []);
        }
        
        // Создаем ссылку для приглашения
        const baseUrl = window.location.origin;
        setInviteLink(`${baseUrl}/join?officeId=${user.officeId}`);
      } catch (err) {
        setError('Не удалось загрузить данные');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, isOwner]);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Не удалось скопировать ссылку: ', err);
      });
  };
  
  // Получаем отфильтрованных сотрудников
  const filteredEmployees = employees.filter(employee => {
    if (activeTab === 'all') return employee.status === 'active';
    return false;
  });
  
  // Получаем только заявки со статусом "pending"
  const pendingRequests = joinRequests.filter(request => request.status === 'pending');
  
  if (loading) {
    return (
      <Container>
        <Header>
          <Title>
            <FiUsers size={24} />
            Сотрудники
          </Title>
        </Header>
        <LoadingState>Загрузка данных...</LoadingState>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container>
        <Header>
          <Title>
            <FiUsers size={24} />
            Сотрудники
          </Title>
        </Header>
        <ErrorMessage>
          <FiAlertCircle size={20} />
          {error}
        </ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <FiUsers size={24} />
          Сотрудники
        </Title>
        <AddEmployeeButton onClick={() => setShowInviteModal(true)}>
          <FiPlus size={16} />
          Пригласить сотрудника
        </AddEmployeeButton>
      </Header>
      
      <TabsContainer>
        <Tab 
          active={activeTab === 'all'} 
          onClick={() => setActiveTab('all')}
        >
          Все сотрудники
        </Tab>
        {isOwner && (
          <Tab 
            active={activeTab === 'requests'} 
            onClick={() => setActiveTab('requests')}
          >
            Заявки на присоединение
            {pendingRequests.length > 0 && (
              <JoinRequestsBadge>{pendingRequests.length}</JoinRequestsBadge>
            )}
          </Tab>
        )}
      </TabsContainer>
      
      {activeTab === 'requests' ? (
        pendingRequests.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <FiUserPlus />
            </EmptyIcon>
            <p>Нет новых заявок на присоединение к офису</p>
          </EmptyState>
        ) : (
          <div>
            {(() => {
              navigate('/join-requests');
              return null;
            })()}
          </div>
        )
      ) : filteredEmployees.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <FiUsers />
          </EmptyIcon>
          <p>Сотрудники не найдены</p>
        </EmptyState>
      ) : (
        <EmployeesList>
          {filteredEmployees.map(employee => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </EmployeesList>
      )}
      
      {showInviteModal && (
        <InviteModal>
          <ModalContent>
            <CloseButton onClick={() => setShowInviteModal(false)}>
              <FiX />
            </CloseButton>
            <ModalTitle>Пригласить нового сотрудника</ModalTitle>
            
            <QRCodeContainer>
              <QRCode>
                <QRCodeSVG value={inviteLink} size={200} />
              </QRCode>
            </QRCodeContainer>
            
            <LinkContainer>
              <LinkLabel>Ссылка для приглашения:</LinkLabel>
              <LinkField>
                <LinkInput value={inviteLink} readOnly />
                <CopyButton onClick={handleCopyLink}>
                  {copySuccess ? <FiCheck /> : <FiCopy />}
                </CopyButton>
              </LinkField>
            </LinkContainer>
            
            <p>
              Отправьте эту ссылку новому сотруднику или предложите отсканировать QR-код. 
              После регистрации вам нужно будет подтвердить заявку на присоединение.
            </p>
          </ModalContent>
        </InviteModal>
      )}
    </Container>
  );
};

export default EmployeesPage; 