import React, { useState, forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';

export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'small' | 'medium' | 'large';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  variant?: InputVariant;
  size?: InputSize;
  error?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

const InputWrapper = styled.div<{ fullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${({ fullWidth }) => (fullWidth ? '100%' : 'auto')};
  position: relative;
`;

const Label = styled.label`
  font-size: 14px;
  color: var(--color-muted);
  margin-bottom: 6px;
`;

const getVariantStyles = (variant: InputVariant, hasError: boolean) => {
  switch (variant) {
    case 'default':
      return css`
        border: 1px solid ${hasError ? '#ef4444' : 'var(--color-accent-light)'};
        background-color: var(--color-bg);
        
        &:focus {
          border-color: ${hasError ? '#ef4444' : 'var(--color-accent)'};
          box-shadow: 0 0 0 2px ${hasError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
        }
      `;
    case 'filled':
      return css`
        border: none;
        background-color: var(--color-bg-alt);
        border-bottom: 2px solid ${hasError ? '#ef4444' : 'var(--color-accent-light)'};
        
        &:focus {
          border-bottom-color: ${hasError ? '#ef4444' : 'var(--color-accent)'};
        }
      `;
    case 'outlined':
      return css`
        border: 2px solid ${hasError ? '#ef4444' : 'var(--color-accent-light)'};
        background-color: transparent;
        
        &:focus {
          border-color: ${hasError ? '#ef4444' : 'var(--color-accent)'};
        }
      `;
    default:
      return '';
  }
};

const getSizeStyles = (size: InputSize) => {
  switch (size) {
    case 'small':
      return css`
        padding: 6px 10px;
        font-size: 14px;
      `;
    case 'medium':
      return css`
        padding: 10px 12px;
        font-size: 16px;
      `;
    case 'large':
      return css`
        padding: 12px 16px;
        font-size: 18px;
      `;
    default:
      return '';
  }
};

const StyledInput = styled.input<{
  $variant: InputVariant;
  $size: InputSize;
  $hasError: boolean;
  $hasIcon: boolean;
  $hasRightIcon: boolean;
}>`
  width: 100%;
  border-radius: 6px;
  color: var(--color-text);
  transition: all 0.2s ease-in-out;
  outline: none;
  padding-left: ${({ $hasIcon }) => ($hasIcon ? '36px' : '')};
  padding-right: ${({ $hasRightIcon }) => ($hasRightIcon ? '36px' : '')};
  
  ${({ $variant, $hasError }) => getVariantStyles($variant, $hasError)}
  ${({ $size }) => getSizeStyles($size)}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: var(--color-muted);
  }
`;

const IconWrapper = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const LeftIconWrapper = styled(IconWrapper)`
  left: 10px;
`;

const RightIconWrapper = styled(IconWrapper)`
  right: 10px;
`;

const ErrorText = styled.div`
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
`;

const HelperText = styled.div`
  color: var(--color-muted);
  font-size: 12px;
  margin-top: 4px;
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      variant = 'default',
      size = 'medium',
      error,
      fullWidth = false,
      icon,
      rightIcon,
      helperText,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasError = !!error;

    return (
      <InputWrapper fullWidth={fullWidth}>
        {label && <Label>{label}</Label>}
        <div style={{ position: 'relative' }}>
          {icon && <LeftIconWrapper>{icon}</LeftIconWrapper>}
          <StyledInput
            ref={ref}
            $variant={variant}
            $size={size}
            $hasError={hasError}
            $hasIcon={!!icon}
            $hasRightIcon={!!rightIcon}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {rightIcon && <RightIconWrapper>{rightIcon}</RightIconWrapper>}
        </div>
        {hasError && <ErrorText>{error}</ErrorText>}
        {!hasError && helperText && <HelperText>{helperText}</HelperText>}
      </InputWrapper>
    );
  }
);

Input.displayName = 'Input';

export default Input; 