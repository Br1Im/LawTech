import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FiEdit2, FiSave, FiKey } from 'react-icons/fi';
import { User } from '../../../../entities/user/model/types';
import { ProfileUpdateData } from '../../../../shared/types';
import { Button } from '../../../../shared/ui/Button';
import { Input } from '../../../../shared/ui/Input';

interface ProfileEditFormProps {
  user: User;
  onSave: (data: ProfileUpdateData) => Promise<void>;
  className?: string;
}

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  padding: 12px;
  border-radius: 6px;
  background-color: rgba(239, 68, 68, 0.1);
  margin-top: 16px;
`;

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  user,
  onSave,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Убираем confirmPassword и пустой пароль перед отправкой
      const dataToSend = {
        name: formData.name,
        email: formData.email,
        ...(formData.password ? { password: formData.password } : {}),
      };

      await onSave(dataToSend);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormContainer className={className}>
      <form onSubmit={handleSubmit}>
        <Section>
          {!isEditing ? (
            <Button 
              variant="outline" 
              icon={<FiEdit2 />} 
              onClick={handleEdit}
              type="button"
            >
              Редактировать профиль
            </Button>
          ) : (
            <>
              <SectionTitle>Личная информация</SectionTitle>
              <Input
                label="Имя пользователя"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
              />
              
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                fullWidth
                required
              />
              
              <SectionTitle>
                <FiKey /> Изменить пароль (не обязательно)
              </SectionTitle>
              
              <Input
                label="Новый пароль"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                fullWidth
                helperText="Оставьте пустым, если не хотите менять"
              />
              
              <Input
                label="Подтверждение пароля"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                fullWidth
                error={
                  formData.password &&
                  formData.confirmPassword &&
                  formData.password !== formData.confirmPassword
                    ? 'Пароли не совпадают'
                    : undefined
                }
              />
              
              {error && <ErrorMessage>{error}</ErrorMessage>}
              
              <ButtonGroup>
                <Button 
                  type="submit" 
                  icon={<FiSave />} 
                  isLoading={isLoading}
                >
                  Сохранить изменения
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Отменить
                </Button>
              </ButtonGroup>
            </>
          )}
        </Section>
      </form>
    </FormContainer>
  );
};

export default ProfileEditForm; 