import { useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { ChevronDown } from 'lucide-react';

interface Faq {
  question: string;
  answer: string;
}

const faqs: Faq[] = [
  {
    question: 'Что такое автоматизация юридических процессов?',
    answer:
      'Автоматизация юридических процессов — это использование технологий для упрощения и оптимизации рутинных задач в юридической практике: обработка документов, управление делами, взаимодействие с клиентами.',
  },
  {
    question: 'Как автоматизация помогает юристам?',
    answer:
      'Автоматизация сокращает время на составление документов и анализ данных, позволяя юристам сосредоточиться на стратегических задачах и клиентском сервисе.',
  },
  {
    question: 'Может ли автоматизация заменить юристов?',
    answer:
      'Нет. Технологии — это инструменты, которые помогают юристам принимать более обоснованные решения. Ответственность и экспертиза всегда остаются за специалистом.',
  },
  {
    question: 'Безопасно ли использовать LawTech в юриспруденции?',
    answer:
      'Мы следуем строгим стандартам безопасности: шифрование, ролевой доступ, аудит действий и соответствие ФЗ-152 и GDPR. Вся чувствительная информация защищена.',
  },
];

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Container = styled.section`
  width: 100%;
  max-width: 860px;
  margin: 120px auto;
  padding: 0 20px;
  box-sizing: border-box;
  animation: ${fadeInUp} 0.8s var(--ease-out) forwards;

  @media (max-width: 768px) {
    margin: 80px auto;
  }
`;

const Tagline = styled.div`
  text-align: center;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-accent-light);
  color: var(--color-accent-dark);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0 auto 14px;
  border: 1px solid rgba(212, 175, 55, 0.3);
`;

const TagWrap = styled.div`
  display: flex;
  justify-content: center;
`;

const Title = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 52px);
  font-weight: 800;
  line-height: 1.08;
  text-align: center;
  margin-bottom: 12px;
  color: var(--color-text);

  em {
    font-style: normal;
    background: var(--gradient-gold);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Subtitle = styled.p`
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 16px;
  max-width: 560px;
  margin: 0 auto 40px;
  line-height: 1.55;
`;

const FaqList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FaqItem = styled.div<{ $active: boolean }>`
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid ${({ $active }) => ($active ? 'rgba(212, 175, 55, 0.55)' : 'var(--color-border)')};
  border-radius: var(--radius-lg);
  box-shadow: ${({ $active }) => ($active ? 'var(--shadow-lg)' : 'var(--shadow-sm)')};
  overflow: hidden;
  transition: all 0.3s var(--ease-out);
`;

const FaqQuestion = styled.button`
  width: 100%;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-family: var(--font-sans);
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text);
  transition: color 0.25s var(--ease-out);

  &:hover {
    color: var(--color-accent);
  }

  @media (max-width: 480px) {
    font-size: 15px;
    padding: 16px 18px;
  }
`;

const Chevron = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? 'var(--gradient-gold)' : 'var(--color-bg-alt)')};
  border: 1px solid ${({ $active }) => ($active ? 'transparent' : 'var(--color-border)')};
  color: ${({ $active }) => ($active ? '#1a1a1a' : 'var(--color-text-secondary)')};
  transition: all 0.3s var(--ease-out);
  transform: rotate(${({ $active }) => ($active ? '180deg' : '0deg')});
  flex-shrink: 0;

  svg {
    width: 18px;
    height: 18px;
    stroke-width: 2.2;
  }
`;

const FaqAnswer = styled.div<{ $active: boolean }>`
  max-height: ${({ $active }) => ($active ? '400px' : '0')};
  opacity: ${({ $active }) => ($active ? 1 : 0)};
  overflow: hidden;
  transition: max-height 0.45s var(--ease-out), opacity 0.3s var(--ease-out);
  padding: 0 24px;

  @media (max-width: 480px) {
    padding: 0 18px;
  }
`;

const FaqAnswerContent = styled.div`
  padding: 4px 0 22px;
  font-size: 15px;
  line-height: 1.65;
  color: var(--color-text-secondary);
`;

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  return (
    <Container id="faq">
      <TagWrap>
        <Tagline>FAQ</Tagline>
      </TagWrap>
      <Title>
        Часто задаваемые <em>вопросы</em>
      </Title>
      <Subtitle>
        Ответы на вопросы, которые чаще всего задают юристы и руководители офисов.
      </Subtitle>

      <FaqList>
        {faqs.map((faq, index) => {
          const isActive = activeIndex === index;
          return (
            <FaqItem key={index} $active={isActive}>
              <FaqQuestion
                onClick={() => toggle(index)}
                aria-expanded={isActive}
                aria-controls={`faq-answer-${index}`}
              >
                <span>{faq.question}</span>
                <Chevron $active={isActive} aria-hidden>
                  <ChevronDown />
                </Chevron>
              </FaqQuestion>
              <FaqAnswer $active={isActive} id={`faq-answer-${index}`}>
                <FaqAnswerContent>{faq.answer}</FaqAnswerContent>
              </FaqAnswer>
            </FaqItem>
          );
        })}
      </FaqList>
    </Container>
  );
};

export default FAQ;
