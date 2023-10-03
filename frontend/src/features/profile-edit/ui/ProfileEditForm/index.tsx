import React, { useState, useRef } from 'react';
import styled from '@emotion/styled';
import { FiEdit2, FiSave, FiKey, FiUpload, FiTrash2, FiUser } from 'react-icons/fi';
import type { User } from '../../../../entities/user/model/types';
import type { ProfileUpdateData } from '../../../../shared/types';
import { Button } from '../../../../shared/ui/Button';
import { Input } from '../../../../shared/ui/Input';
import { TextArea } from '../../../../shared/ui/TextArea';
import { api } from '../../../../shared/api/api';

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

const SuccessMessage = styled.div`
  color: #10b981;
  padding: 12px;
  border-radius: 6px;
  background-color: rgba(16, 185, 129, 0.1);
  margin-top: 16px;
`;

const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const AvatarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Avatar = styled.div<{ $hasImage: boolean }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: ${props => props.$hasImage ? 'transparent' : 'var(--color-accent-light)'};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  svg {
    width: 40px;
    height: 40px;
    color: var(--color-accent);
  }
`;

const AvatarButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  user,
  onSave,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    bio: user.bio || '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: user.name,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      bio: user.bio || '',
      password: '',
      confirmPassword: '',
    });
    setAvatarPreview(user.avatar || null);
    setError(null);
    setSuccess(null);
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
    setSuccess(null);

    try {
      // Убираем confirmPassword и пустой пароль перед отправкой
      const dataToSend = {
        name: formData.name,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        bio: formData.bio,
        ...(formData.password ? { password: formData.password } : {}),
      };

      await onSave(dataToSend);
      setSuccess('Профиль успешно обновлен');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при сохранении');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Предварительный просмотр
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Загрузка на сервер
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.profile.uploadAvatar(file);
      setSuccess('Аватар успешно загружен');
    } catch (err) {
      setError('Ошибка при загрузке аватара');
      setAvatarPreview(user.avatar || null); // Возвращаем предыдущий аватар
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.profile.deleteAvatar();
      setAvatarPreview(null);
      setSuccess('Аватар успешно удален');
    } catch (err) {
      setError('Ошибка при удалении аватара');
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
              <AvatarSection>
                <SectionTitle>Фотография профиля</SectionTitle>
                <AvatarContainer>
                  <Avatar 
                    $hasImage={!!avatarPreview} 
                    onClick={handleAvatarClick}
                    style={{ cursor: isEditing ? 'pointer' : 'default' }}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" />
                    ) : (
                      <FiUser size={40} />
                    )}
                  </Avatar>
                  <AvatarButtons>
                    <Button 
                      type="button" 
                      variant="outline" 
                      icon={<FiUpload />} 
                      onClick={handleAvatarClick}
                      disabled={isLoading}
                    >
                      Загрузить фото
                    </Button>
                    {avatarPreview && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        icon={<FiTrash2 />} 
                        onClick={handleDeleteAvatar}
                        disabled={isLoading}
                      >
                        Удалить фото
                      </Button>
                    )}
                    <HiddenFileInput 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      onChange={handleFileChange} 
                    />
                  </AvatarButtons>
                </AvatarContainer>
              </AvatarSection>

              <SectionTitle>Личная информация</SectionTitle>
              <FormGrid>
                <Input
                  label="Имя"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  fullWidth
                />
                <Input
                  label="Фамилия"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  fullWidth
                />
              </FormGrid>
              
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
              
              <Input
                label="Телефон"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                fullWidth
              />
              
              <TextArea
                label="О себе"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                fullWidth
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
              {success && <SuccessMessage>{success}</SuccessMessage>}
              
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