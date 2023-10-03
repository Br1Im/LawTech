import React from 'react';
import styled from '@emotion/styled';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Container = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
`;

const Label = styled.label`
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--color-text);
`;

const StyledTextArea = styled.textarea<{ $hasError?: boolean }>`
  padding: 10px 12px;
  border: 1px solid ${props => props.$hasError ? '#ef4444' : 'var(--color-accent-light)'};
  border-radius: 6px;
  font-size: 14px;
  color: var(--color-text);
  background-color: var(--color-bg);
  resize: vertical;
  min-height: 80px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#ef4444' : 'var(--color-accent)'};
  }
`;

const HelperText = styled.div<{ $isError?: boolean }>`
  margin-top: 4px;
  font-size: 12px;
  color: ${props => props.$isError ? '#ef4444' : 'var(--color-muted)'};
`;

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  fullWidth,
  ...rest
}) => {
  return (
    <Container $fullWidth={fullWidth}>
      {label && <Label>{label}</Label>}
      <StyledTextArea $hasError={!!error} {...rest} />
      {(error || helperText) && (
        <HelperText $isError={!!error}>
          {error || helperText}
        </HelperText>
      )}
    </Container>
  );
}; 