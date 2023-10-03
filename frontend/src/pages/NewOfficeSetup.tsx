import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import apiClient from '../shared/api/apiClient';
import { buildApiUrl } from '../shared/utils/apiUtils';

interface OfficeForm {
  officeName: string;
  officeAddress: string;
  employeeCount: string;
  contactPhone: string;
  website: string;
}

interface ContainerProps {
  wide?: boolean;
}

interface TextProps {
  mb?: boolean;
}

const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background-image: url('/src/assets/office-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const Container = styled.div<ContainerProps>`
  max-width: ${props => props.wide ? '32rem' : '24rem'};
  margin: 2.5rem auto;
  padding: 1.5rem;
  background: var(--color-bg);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 1.5rem;
`;

const Text = styled.p<TextProps>`
  color: var(--color-muted);
  margin-bottom: ${props => props.mb ? '1.5rem' : '0.5rem'};
`;

const ErrorText = styled.p`
  color: #ef4444;
  margin-bottom: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 0.25rem;
`;

const Required = styled.span`
  color: #ef4444;
`;

const Input = styled.input`
  width: 95%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  font-size: 1rem;
  outline: none;
  &:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent);
  }
  &::placeholder {
    color: var(--color-muted);
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 0.5rem 1rem;
  background: var(--color-button-bg);
  color: var(--color-button-text);
  font-size: 1rem;
  border-radius: 0.375rem;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover {
    background: var(--color-accent-light);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StyledLoader = styled(Loader2)`
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
  height: 1.25rem;
  width: 1.25rem;
`;

const NewOfficeSetup: React.FC = () => {
  const [form, setForm] = useState<OfficeForm>({
    officeName: '',
    officeAddress: '',
    employeeCount: '',
    contactPhone: '',
    website: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.officeName || !form.officeAddress) {
      setFormError('Название и адрес офиса обязательны');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Требуется авторизация');
        navigate('/auth');
        return;
      }

      await apiClient.post('/office', {
        officeName: form.officeName,
        officeAddress: form.officeAddress,
        employeeCount: form.employeeCount ? parseInt(form.employeeCount) : null,
        contactPhone: form.contactPhone,
        website: form.website,
      });

      navigate('/crm'); // Перенаправление на CRM после успешной отправки
    } catch (err) {
      setFormError('Ошибка сохранения данных офиса');
      console.error('Ошибка:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <Container wide>
        <Title>Настройка нового офиса</Title>
        <Text mb>Заполните данные вашего офиса, чтобы начать работу в нашей CRM.</Text>
        {formError && <ErrorText>{formError}</ErrorText>}
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>
              Название офиса <Required>*</Required>
            </Label>
            <Input
              type="text"
              name="officeName"
              value={form.officeName}
              onChange={handleInputChange}
              placeholder="Введите название офиса"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>
              Адрес офиса <Required>*</Required>
            </Label>
            <Input
              type="text"
              name="officeAddress"
              value={form.officeAddress}
              onChange={handleInputChange}
              placeholder="Введите адрес офиса"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Количество сотрудников</Label>
            <Input
              type="number"
              name="employeeCount"
              value={form.employeeCount}
              onChange={handleInputChange}
              placeholder="Введите количество сотрудников"
            />
          </FormGroup>
          <FormGroup>
            <Label>Контактный телефон</Label>
            <Input
              type="tel"
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleInputChange}
              placeholder="+7 (XXX) XXX-XX-XX"
            />
          </FormGroup>
          <FormGroup>
            <Label>Веб-сайт</Label>
            <Input
              type="url"
              name="website"
              value={form.website}
              onChange={handleInputChange}
              placeholder="https://example.com"
            />
          </FormGroup>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <StyledLoader />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </Form>
      </Container>
    </PageWrapper>
  );
};

export default NewOfficeSetup;