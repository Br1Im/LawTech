import React from 'react';
import styled from '@emotion/styled';

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

const SpinnerContainer = styled.div<{ $size: number }>`
  display: inline-block;
  position: relative;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
`;

const SpinnerCircle = styled.div<{ $size: number; $color?: string }>`
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: ${props => props.$size * 0.8}px;
  height: ${props => props.$size * 0.8}px;
  margin: ${props => props.$size * 0.1}px;
  border: ${props => Math.max(2, props.$size * 0.08)}px solid;
  border-radius: 50%;
  border-color: ${props => props.$color || 'var(--color-accent)'} transparent transparent transparent;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;

  &:nth-of-type(1) {
    animation-delay: -0.45s;
  }
  &:nth-of-type(2) {
    animation-delay: -0.3s;
  }
  &:nth-of-type(3) {
    animation-delay: -0.15s;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

export const Spinner: React.FC<SpinnerProps> = ({
  size = 24,
  color,
  className,
}) => {
  return (
    <SpinnerContainer $size={size} className={className}>
      <SpinnerCircle $size={size} $color={color} />
      <SpinnerCircle $size={size} $color={color} />
      <SpinnerCircle $size={size} $color={color} />
      <SpinnerCircle $size={size} $color={color} />
    </SpinnerContainer>
  );
}; 