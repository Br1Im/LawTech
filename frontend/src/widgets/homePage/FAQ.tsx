import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import minusSVG from '../../assets/Header/minus.svg';
import plusSVG from '../../assets/Header/plus.svg';
import diva from '../../assets/Header/molot.png';

interface Review {
  question: string;
  answer: string;
}

const faqs: Review[] = [
  {
    question: 'Что такое автоматизация юридических процессов?',
    answer:
      'Автоматизация юридических процессов — это использование технологий для упрощения и оптимизации рутинных задач в юридической практике, таких как обработка документов, управление делами и взаимодействие с клиентами.',
  },
  {
    question: 'Как автоматизация помогает юристам?',
    answer:
      'Автоматизация позволяет юристам сократить время на выполнение рутинных задач, таких как составление документов и анализ данных, что позволяет им сосредоточиться на более сложных аспектах своей работы.',
  },
  {
    question: 'Может ли автоматизация заменить юристов?',
    answer:
      'Хотя автоматизация значительно улучшает эффективность работы юристов, она не предназначена для замены профессионалов. Технологии служат инструментами, которые помогают юристам принимать более обоснованные решения.',
  },
  {
    question: 'Безопасно ли использовать автоматизированные системы в юриспруденции?',
    answer:
      'Автоматизированные системы разрабатываются с учетом строгих стандартов безопасности и конфиденциальности. Однако важно помнить, что они должны использоваться как вспомогательные инструменты, а не как самостоятельные решения, и ответственность за юридические решения всегда остается за юристом.',
  },
];

const slideInTop = keyframes`
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const Container = styled.div`
  color: var(--color-text);
  padding: 150px;
  border-radius: 8px;
  max-width: 800px;
  margin: 100px auto;
  box-sizing: border-box;
  position: relative;

  @media (max-width: 768px) {
    padding: 50px;
  }


  @media (max-width: 375px) {
    padding: 20px;
  }
`;

const ImageWrapper = styled.div`
  position: absolute;
  top: -150px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  z-index: 1;

  @media (max-width: 768px) {
    top: -120px;
    gap: 10px;
  }

  @media (max-width: 375px) {
    top: -100px;
    gap: 8px;
  }
`;

const Molot = styled.img`
  width: 500px;
  opacity: 0;
  transition: opacity 0.5s ease, transform 0.5s ease;

  &.animate {
    animation: ${slideInTop} 1.5s forwards;
  }

  @media (max-width: 768px) {
    width: 300px;
  }

  @media (max-width: 375px) {
    width: 150px;
  }
`;

const Title = styled.h2`
  font-size: 50px;
  font-weight: 100;
  line-height: 40px;
  text-align: center;
  color: var(--color-accent);

  @media (max-width: 600px) {
    font-size: 40px;
    line-height: 58px;
  }

  @media (max-width: 375px) {
    font-size: 32px;
    line-height: 40px;
  }

  @media (max-width: 320px) {
    font-size: 28px;
    line-height: 34px;
  }
`;

const Divider = styled.hr`
  width: 160px;
  margin: 40px auto 40px;
  border: none;
  border-top: 2px solid var(--color-accent-light);
`;

const FaqList = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
`;

const FaqItem = styled.div<{ isTop?: boolean }>`
  padding: 24px 12px;
  border-top: 1px solid var(--color-border);
  border-top: ${({ isTop }) => (isTop ? 'none' : '1px solid var(--color-border)')};
  z-index: 2;
`;

const FaqQuestion = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 24px;
  font-weight: 400;
  line-height: 24px;
  color: var(--color-text);
  cursor: pointer;

  @media (max-width: 375px) {
    font-size: 18px;
    line-height: 24px;
  }
`;

const FaqIcon = styled.img`
  width: 20px;
  height: 20px;
`;

const FaqAnswer = styled.div<{ active: boolean }>`
  overflow: hidden;
  max-height: ${({ active }) => (active ? '600px' : '0')};
  opacity: ${({ active }) => (active ? '1' : '0')};
  transform: ${({ active }) => (active ? 'translateY(0)' : 'translateY(-10px)')};
  transition: max-height 1s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.5s ease,
    transform 0.5s ease;
`;

const FaqAnswerContent = styled.div`
  margin-top: 24px;
  padding: 10px;
  font-size: 18px;
  font-weight: 200;
  line-height: 24px;
  color: var(--color-muted);

  @media (max-width: 320px) {
    font-size: 14px;
    line-height: 22px;
  }
`;

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleMouseEnter = (index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  return (
    <Container id="faq">
      <ImageWrapper>
        <Molot src={diva} className="animate" alt="molot" />
      </ImageWrapper>
      <Title>Часто задаваемые вопросы</Title>
      <Divider />
      <FaqList>
        {faqs.map((faq, index) => (
          <FaqItem
            key={index}
            isTop={index === 0}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            <FaqQuestion>
              {faq.question}
              <FaqIcon
                src={activeIndex === index ? minusSVG : plusSVG}
                alt={activeIndex === index ? 'Свернуть' : 'Развернуть'}
              />
            </FaqQuestion>
            <FaqAnswer active={activeIndex === index}>
              <FaqAnswerContent>{faq.answer}</FaqAnswerContent>
            </FaqAnswer>
          </FaqItem>
        ))}
      </FaqList>
    </Container>
  );
};

export default FAQ;