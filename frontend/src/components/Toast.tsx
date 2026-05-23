import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: (id: string) => void;
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastWrapper = styled.div<{ type: ToastProps['type']; isClosing: boolean }>`
  position: relative;
  min-width: 300px;
  max-width: 500px;
  padding: 16px 20px;
  margin-bottom: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: ${props => props.isClosing ? slideOut : slideIn} 0.3s ease-in-out;
  
  ${props => {
    switch (props.type) {
      case 'success':
        return `
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          border-left: 4px solid #2E7D32;
        `;
      case 'error':
        return `
          background: linear-gradient(135deg, #f44336, #d32f2f);
          color: white;
          border-left: 4px solid #C62828;
        `;
      case 'warning':
        return `
          background: linear-gradient(135deg, #ff9800, #f57c00);
          color: white;
          border-left: 4px solid #E65100;
        `;
      case 'info':
        return `
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          border-left: 4px solid #0D47A1;
        `;
      default:
        return `
          background: linear-gradient(135deg, #2196F3, #1976D2);
          color: white;
          border-left: 4px solid #0D47A1;
        `;
    }
  }}
`;

const ToastContent = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const ToastIcon = styled.div`
  margin-right: 12px;
  font-size: 20px;
  display: flex;
  align-items: center;
`;

const ToastMessage = styled.div`
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  margin-left: 12px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const ProgressBar = styled.div<{ duration: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 0 0 8px 8px;
  animation: progress ${props => props.duration}ms linear;

  @keyframes progress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
`;

const getIcon = (type: ToastProps['type']) => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ℹ';
    default:
      return 'ℹ';
  }
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration = 5000,
  onClose
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  }, [id, onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleClose]);



  return (
    <ToastWrapper type={type} isClosing={isClosing}>
      <ToastContent>
        <ToastIcon>{getIcon(type)}</ToastIcon>
        <ToastMessage>{message}</ToastMessage>
      </ToastContent>
      <CloseButton onClick={handleClose}>
        ✕
      </CloseButton>
      {!isClosing && <ProgressBar duration={duration} />}
    </ToastWrapper>
  );
};

const ToastContainerWrapper = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`;

export interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <ToastContainerWrapper>
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </ToastContainerWrapper>
  );
};