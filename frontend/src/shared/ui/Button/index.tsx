import React from 'react';
import type { ButtonHTMLAttributes } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

// Стили на основе варианта
const getVariantStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case 'primary':
      return css`
        background-color: var(--color-accent);
        color: var(--color-button-text);
        border: none;
        
        &:hover:not(:disabled) {
          background-color: var(--color-accent-light);
        }
      `;
    case 'secondary':
      return css`
        background-color: var(--color-bg-alt);
        color: var(--color-text);
        border: none;
        
        &:hover:not(:disabled) {
          background-color: var(--color-muted);
        }
      `;
    case 'outline':
      return css`
        background-color: transparent;
        color: var(--color-accent);
        border: 1px solid var(--color-accent);
        
        &:hover:not(:disabled) {
          background-color: var(--color-accent-light);
          color: var(--color-button-text);
        }
      `;
    case 'text':
      return css`
        background-color: transparent;
        color: var(--color-accent);
        border: none;
        
        &:hover:not(:disabled) {
          text-decoration: underline;
        }
      `;
    default:
      return '';
  }
};

// Стили на основе размера
const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'small':
      return css`
        padding: 6px 12px;
        font-size: 14px;
      `;
    case 'medium':
      return css`
        padding: 10px 16px;
        font-size: 16px;
      `;
    case 'large':
      return css`
        padding: 12px 24px;
        font-size: 18px;
      `;
    default:
      return '';
  }
};

const StyledButton = styled.button<{
  variant: ButtonVariant;
  size: ButtonSize;
  fullWidth: boolean;
  isLoading: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  width: ${({ fullWidth }) => (fullWidth ? '100%' : 'auto')};
  
  ${({ variant }) => getVariantStyles(variant)}
  ${({ size }) => getSizeStyles(size)}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  ${({ isLoading }) => isLoading && css`
    position: relative;
    color: transparent;
    
    &::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: var(--color-button-text);
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `}
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  icon,
  isLoading = false,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      isLoading={isLoading}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {icon && !isLoading && icon}
      {children}
    </StyledButton>
  );
};

export default Button; 