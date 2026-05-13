import { useState } from 'react';
import styled from '@emotion/styled';
import { ChevronDown } from 'lucide-react';

const Section = styled.section`
  width: 100%;
  background: var(--color-bg-alt);
  padding: 80px 24px;

  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`;

const Inner = styled.div`
  max-width: 720px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(28px, 3.5vw, 40px);
  font-weight: 800;
  color: var(--color-text);
  text-align: center;
  margin-bottom: 48px;
  letter-spacing: -0.8px;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Item = styled.div`
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--color-border-strong);
  }
`;

const Question = styled.button<{ $open: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-sans);
  text-align: left;
  line-height: 1.4;

  svg {
    width: 20px;
    height: 20px;
    color: var(--color-muted);
    flex-shrink: 0;
    transition: transform 0.25s var(--ease-out);
    transform: ${({ $open }) => $open ? 'rotate(180deg)' : 'rotate(0)'};
  }
`;

const Answer = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => $open ? '300px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s var(--ease-out);
`;

const AnswerInner = styled.div`
  padding: 0 20px 18px;
  font-size: 15px;
  color: var(--color-text-secondary);
  line-height: 1.7;
  font-family: var(--font-sans);
`;

const faqData = [
  {
    q: 'Что такое автоматизация юридических процессов?',
    a: 'Это использование программных инструментов и AI для ускорения рутинных задач: документооборота, анализа дел, управления сроками и отчётности. Система берёт на себя повторяющиеся действия, чтобы юристы могли сосредоточиться на сложных задачах.',
  },
  {
    q: 'Как AI помогает юристам в работе?',
    a: 'AI-ассистент анализирует документы, находит релевантную судебную практику, проверяет договоры на риски и предлагает оптимальные формулировки. Средняя точность анализа — 95%, время ответа — менее 2 секунд.',
  },
  {
    q: 'Безопасно ли хранить данные клиентов в системе?',
    a: 'Да. Мы используем 256-битное шифрование, серверы размещены в России (соответствие ФЗ-152), данные резервируются ежечасно. Все соединения защищены TLS, а доступ контролируется через ролевую модель.',
  },
  {
    q: 'Можно ли интегрировать с 1C и другими системами?',
    a: 'Да, на тарифе «Корпорация» доступна интеграция с 1C, банковскими системами и электронным документооборотом. На тарифе «Бизнес» доступен API для custom-интеграций.',
  },
  {
    q: 'Сколько времени занимает внедрение?',
    a: 'Базовая настройка занимает 1 день. Полное внедрение с переносом данных и обучением сотрудников — от 3 до 7 рабочих дней в зависимости от размера фирмы.',
  },
];

const FAQ = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <Section id="faq">
      <Inner>
        <SectionTitle>Частые вопросы</SectionTitle>
        <List>
          {faqData.map((item, i) => (
            <Item key={i}>
              <Question
                $open={openIdx === i}
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
              >
                {item.q}
                <ChevronDown />
              </Question>
              <Answer $open={openIdx === i}>
                <AnswerInner>{item.a}</AnswerInner>
              </Answer>
            </Item>
          ))}
        </List>
      </Inner>
    </Section>
  );
};

export default FAQ;
