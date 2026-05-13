import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { Loader2, Plus, Building2, ArrowRight } from 'lucide-react';
import apiClient from '../shared/api/apiClient';

interface OfficeForm {
  name: string;
  address: string;
  contact_phone: string;
  website: string;
}

interface CreatedOffice {
  id: number;
  name: string;
  address?: string;
}

const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: var(--color-bg-secondary, #f5f5f5);
  padding: 2rem;
`;

const Container = styled.div`
  max-width: 36rem;
  width: 100%;
  margin: 2.5rem auto;
  padding: 2rem;
  background: var(--color-bg);
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: var(--color-muted);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
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
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  font-size: 1rem;
  outline: none;
  box-sizing: border-box;
  &:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent);
  }
  &::placeholder {
    color: var(--color-muted);
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  width: 100%;
  padding: 0.625rem 1rem;
  background: ${p => p.variant === 'secondary' ? 'transparent' : 'var(--color-button-bg)'};
  color: ${p => p.variant === 'secondary' ? 'var(--color-text)' : 'var(--color-button-text)'};
  border: ${p => p.variant === 'secondary' ? '1px solid var(--color-border)' : 'none'};
  font-size: 1rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const OfficeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const OfficeCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-secondary, #f9f9f9);
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
`;

const OfficeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--color-accent);
  color: white;
  border-radius: 0.375rem;
`;

const OfficeInfo = styled.div`
  flex: 1;
`;

const OfficeName = styled.div`
  font-weight: 600;
  color: var(--color-text);
`;

const OfficeAddress = styled.div`
  font-size: 0.85rem;
  color: var(--color-muted);
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1.5rem 0;
`;

const NewOfficeSetup: React.FC = () => {
  const [form, setForm] = useState<OfficeForm>({
    name: '',
    address: '',
    contact_phone: '',
    website: '',
  });
  const [createdOffices, setCreatedOffices] = useState<CreatedOffice[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setFormError('Название офиса обязательно');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/offices', {
        name: form.name,
        address: form.address,
        contact_phone: form.contact_phone,
        website: form.website,
      });

      const office = response.data;
      const newOffice: CreatedOffice = {
        id: office.id,
        name: office.name || form.name,
        address: office.address || form.address,
      };

      setCreatedOffices(prev => [...prev, newOffice]);

      // Устанавливаем первый созданный офис как активный
      if (createdOffices.length === 0) {
        localStorage.setItem('activeOfficeId', String(newOffice.id));
      }

      // Обновляем данные пользователя
      try {
        const meResponse = await apiClient.get('/auth/me');
        if (meResponse.data?.user) {
          localStorage.setItem('user', JSON.stringify(meResponse.data.user));
        }
      } catch (_) { /* ignore */ }

      // Сбрасываем форму
      setForm({ name: '', address: '', contact_phone: '', website: '' });
      setShowForm(false);
    } catch (err) {
      setFormError('Ошибка при создании офиса');
      console.error('Ошибка:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToCRM = () => {
    if (createdOffices.length > 0) {
      localStorage.setItem('activeOfficeId', String(createdOffices[0].id));
    }
    navigate('/crm');
  };

  return (
    <PageWrapper>
      <Container>
        <Title>Создайте офисы вашей компании</Title>
        <Subtitle>
          Каждый офис — отдельная среда со своими сотрудниками, клиентами и финансами.
          Вы сможете переключаться между ними в CRM.
        </Subtitle>

        {createdOffices.length > 0 && (
          <>
            <OfficeList>
              {createdOffices.map((office) => (
                <OfficeCard key={office.id}>
                  <OfficeIcon><Building2 size={18} /></OfficeIcon>
                  <OfficeInfo>
                    <OfficeName>{office.name}</OfficeName>
                    {office.address && <OfficeAddress>{office.address}</OfficeAddress>}
                  </OfficeInfo>
                </OfficeCard>
              ))}
            </OfficeList>
            <Divider />
          </>
        )}

        {showForm ? (
          <Form onSubmit={handleSubmit}>
            {formError && <ErrorText>{formError}</ErrorText>}
            <FormGroup>
              <Label>Название офиса <Required>*</Required></Label>
              <Input
                type="text"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                placeholder='Например, "Центральный офис"'
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Адрес</Label>
              <Input
                type="text"
                name="address"
                value={form.address}
                onChange={handleInputChange}
                placeholder="ул. Пушкина, д. 10"
              />
            </FormGroup>
            <FormGroup>
              <Label>Телефон</Label>
              <Input
                type="text"
                name="contact_phone"
                value={form.contact_phone}
                onChange={handleInputChange}
                placeholder="+7 (999) 123-45-67"
              />
            </FormGroup>
            <FormGroup>
              <Label>Веб-сайт</Label>
              <Input
                type="text"
                name="website"
                value={form.website}
                onChange={handleInputChange}
                placeholder="https://example.com"
              />
            </FormGroup>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Plus size={18} />}
              {isSubmitting ? 'Создание...' : `Создать ${createdOffices.length > 0 ? 'ещё один ' : ''}офис`}
            </Button>
          </Form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Добавить ещё офис
            </Button>
            <Button onClick={handleGoToCRM}>
              Перейти в CRM <ArrowRight size={18} />
            </Button>
          </div>
        )}
      </Container>
    </PageWrapper>
  );
};

export default NewOfficeSetup;
