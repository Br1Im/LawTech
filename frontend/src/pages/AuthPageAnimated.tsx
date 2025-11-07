import { Button, Form, Input, message, Select, Tabs } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import BG from '../assets/Auth/BG.png';
import { buildApiUrl } from '../shared/utils/apiUtils';

interface LoginFormValues {
  email: string;
  password: string;
}

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  userType: 'lawyer' | 'office' | 'manager' | 'okk' | 'expert' | 'admin' | 'representative';
  officeType?: 'new' | 'existing' | '';
  officeId?: string;
}

// Анимации
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const pulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(212, 175, 55, 0);
  }
`;

// Styled Components
const AuthContainer = styled.div`
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-image: url(${BG});
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.5), rgba(212, 175, 55, 0.2));
    pointer-events: none;
  }
`;

const FloatingParticle = styled.div<{ delay: number; duration: number; left: string; top: string }>`
  position: absolute;
  width: 6px;
  height: 6px;
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  border-radius: 50%;
  left: ${props => props.left};
  top: ${props => props.top};
  animation: ${float} ${props => props.duration}s ease-in-out infinite;
  animation-delay: ${props => props.delay}s;
  opacity: 0.6;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
  z-index: 1;
`;

const AuthFormContainer = styled.div<{ isExpanded: boolean }>`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 20px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: ${props => props.isExpanded ? '900px' : '750px'};
  overflow: hidden;
  position: relative;
  z-index: 2;
  animation: ${scaleIn} 0.6s ease forwards;
  border: 1px solid rgba(212, 175, 55, 0.2);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #d4af37, #f5d97b, #d4af37);
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
  }

  @media (max-width: 768px) {
    padding: 30px 20px;
    max-width: 90%;
  }
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 30px;
  animation: ${fadeIn} 0.8s ease forwards;
  animation-delay: 0.2s;
  opacity: 0;
`;

const LogoText = styled.h1`
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  margin-bottom: 8px;
`;

const LogoSubtext = styled.p`
  font-size: 14px;
  color: var(--color-muted);
  margin: 0;
`;

const StyledTabs = styled(Tabs)`
  animation: ${fadeIn} 0.8s ease forwards;
  animation-delay: 0.4s;
  opacity: 0;

  .ant-tabs-nav {
    margin-bottom: 30px;
  }

  .ant-tabs-tab {
    font-size: 16px;
    font-weight: 600;
    padding: 12px 24px;
    transition: all 0.3s ease;

    &:hover {
      color: #d4af37;
    }
  }

  .ant-tabs-tab-active {
    .ant-tabs-tab-btn {
      color: #d4af37;
    }
  }

  .ant-tabs-ink-bar {
    background: linear-gradient(90deg, #d4af37, #f5d97b);
    height: 3px;
  }
`;

const FormWrapper = styled.div<{ isVisible: boolean }>`
  animation: ${props => props.isVisible ? slideIn : 'none'} 0.5s ease forwards;
  opacity: ${props => props.isVisible ? 1 : 0};
  transform: ${props => props.isVisible ? 'translateX(0)' : 'translateX(-30px)'};
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
`;

const StyledForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 20px;
    animation: ${fadeIn} 0.5s ease forwards;
    animation-delay: calc(var(--item-index) * 0.1s);
    opacity: 0;
  }

  .ant-input,
  .ant-select-selector {
    border-radius: 8px;
    border: 2px solid #e0e0e0;
    padding: 10px 15px;
    transition: all 0.3s ease;
    font-size: 14px;

    &:hover {
      border-color: #d4af37;
    }

    &:focus {
      border-color: #d4af37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
    }
  }

  .ant-input-password {
    border-radius: 8px;
    border: 2px solid #e0e0e0;
    transition: all 0.3s ease;

    &:hover {
      border-color: #d4af37;
    }

    &:focus-within {
      border-color: #d4af37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
    }
  }
`;

const SubmitButton = styled(Button)`
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  border: none;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(212, 175, 55, 0.6);
  }

  &:hover::before {
    left: 100%;
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const BackLink = styled(Link)`
  font-family: Arial, sans-serif;
  font-size: 14px;
  color: var(--color-muted);
  text-decoration: none;
  text-align: center;
  display: block;
  margin-top: 20px;
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.8s ease forwards;
  animation-delay: 0.6s;
  opacity: 0;

  &:hover {
    color: #d4af37;
    transform: translateX(-5px);
  }
`;

const TestAccountsButton = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 15px;
  background: transparent;
  border: 2px dashed rgba(212, 175, 55, 0.3);
  border-radius: 8px;
  color: var(--color-muted);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.8s ease forwards;
  animation-delay: 0.8s;
  opacity: 0;

  &:hover {
    border-color: #d4af37;
    color: #d4af37;
    background: rgba(212, 175, 55, 0.05);
  }
`;

const TestAccountsList = styled.div<{ isVisible: boolean }>`
  margin-top: 15px;
  padding: 15px;
  background: rgba(212, 175, 55, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(212, 175, 55, 0.2);
  max-height: ${props => props.isVisible ? '400px' : '0'};
  opacity: ${props => props.isVisible ? 1 : 0};
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
`;

const TestAccountItem = styled.div`
  padding: 12px;
  margin-bottom: 10px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  animation: ${slideIn} 0.5s ease forwards;
  animation-delay: calc(var(--item-index) * 0.1s);
  opacity: 0;

  &:hover {
    border-color: #d4af37;
    transform: translateX(5px);
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const TestAccountName = styled.div`
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
`;

const TestAccountCredentials = styled.div`
  font-size: 12px;
  color: var(--color-muted);
`;

export default AuthPageAnimated;
