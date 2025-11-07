import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ErrorContainer = styled.div`
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  color: white;
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
  animation: ${fadeIn} 0.3s ease, ${shake} 0.5s ease 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ErrorIcon = styled.div`
  font-size: 24px;
  flex-shrink: 0;
`;

const ErrorContent = styled.div`
  flex: 1;
`;

const ErrorTitle = styled.div`
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
`;

const ErrorMessage = styled.div`
  font-size: 14px;
  opacity: 0.95;
  line-height: 1.4;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

interface ErrorDisplayProps {
  message: string;
  onClose?: () => void;
}

const ErrorDisplay = ({ message, onClose }: ErrorDisplayProps) => {
  return (
    <ErrorContainer>
      <ErrorIcon>⚠️</ErrorIcon>
      <ErrorContent>
        <ErrorTitle>Ошибка</ErrorTitle>
        <ErrorMessage>{message}</ErrorMessage>
      </ErrorContent>
      {onClose && (
        <CloseButton onClick={onClose}>×</CloseButton>
      )}
    </ErrorContainer>
  );
};

export default ErrorDisplay;
