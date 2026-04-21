import styled from '@emotion/styled';
import { Quote, Star } from 'lucide-react';

const Section = styled.section`
  width: 100%;
  padding: 120px 24px;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 80px 20px;
  }
`;

const Inner = styled.div`
  max-width: 1240px;
  width: 100%;
`;

const HeadBlock = styled.div`
  text-align: center;
  margin-bottom: 48px;
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--color-accent-light);
  color: var(--color-accent-dark);
  border-radius: var(--radius-pill);
  border: 1px solid rgba(212, 175, 55, 0.35);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 60px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: var(--color-text);
  margin: 0 auto 16px;
  max-width: 860px;

  em {
    font-style: italic;
    background: var(--gradient-gold);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: var(--color-text-secondary);
  max-width: 620px;
  margin: 0 auto;
  line-height: 1.55;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.figure`
  margin: 0;
  padding: 28px;
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  position: relative;
  transition: transform 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out), border-color 0.35s var(--ease-out);
  display: flex;
  flex-direction: column;
  gap: 18px;

  &:hover {
    transform: translateY(-6px);
    border-color: rgba(212, 175, 55, 0.45);
    box-shadow: var(--shadow-xl);
  }
`;

const QuoteMark = styled.div`
  position: absolute;
  top: 18px;
  right: 22px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--gradient-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1a1a;
  box-shadow: 0 6px 14px rgba(212, 175, 55, 0.32);

  svg { width: 18px; height: 18px; }
`;

const Stars = styled.div`
  display: inline-flex;
  gap: 3px;
  color: var(--color-accent);

  svg {
    width: 15px;
    height: 15px;
    fill: currentColor;
  }
`;

const Body = styled.blockquote`
  margin: 0;
  font-size: 15.5px;
  line-height: 1.6;
  color: var(--color-text);
  flex: 1;
`;

const Person = styled.figcaption`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
`;

const Avatar = styled.div<{ $bg: string }>`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${(p) => p.$bg};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
`;

const PersonInfo = styled.div`
  display: flex;
  flex-direction: column;

  .name {
    font-weight: 700;
    font-size: 14.5px;
    color: var(--color-text);
  }

  .role {
    font-size: 12.5px;
    color: var(--color-muted);
  }
`;

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  avatarBg: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'За квартал перенесли в LawTech весь архив — 18 000 документов. AI-поиск находит нужное за секунды. Заменили нам три отдельных сервиса.',
    name: 'Анна Иванова',
    role: 'Партнёр, «Иванова и Петров»',
    avatarBg: 'linear-gradient(135deg,#d4af37,#a07c28)',
    initials: 'АИ',
  },
  {
    quote:
      'Дедлайны больше не «теряются» в календаре — система сама напоминает и сразу подтягивает релевантные документы. Пропусков стало ноль.',
    name: 'Сергей Петров',
    role: 'Управляющий партнёр, PetroffLegal',
    avatarBg: 'linear-gradient(135deg,#0a84ff,#2997ff)',
    initials: 'СП',
  },
  {
    quote:
      'Интерфейс приятный и быстрый. Юристы освоились за день. Команда саппорта отвечает меньше чем за час. Большая редкость на российском рынке.',
    name: 'Мария Самойлова',
    role: 'Head of Legal Operations, Квант-Групп',
    avatarBg: 'linear-gradient(135deg,#30d158,#0a8f3c)',
    initials: 'МС',
  },
];

const Testimonials = () => {
  return (
    <Section>
      <Inner>
        <HeadBlock>
          <Eyebrow>Отзывы</Eyebrow>
          <Title>
            Юристы, которые <em>уже переехали</em> в LawTech
          </Title>
          <Subtitle>
            От небольших бутиков до крупных юротделов — всем нужно было
            одно и то же: меньше рутины, больше клиентов.
          </Subtitle>
        </HeadBlock>

        <Grid>
          {TESTIMONIALS.map((t) => (
            <Card key={t.name}>
              <QuoteMark>
                <Quote />
              </QuoteMark>
              <Stars>
                <Star /><Star /><Star /><Star /><Star />
              </Stars>
              <Body>«{t.quote}»</Body>
              <Person>
                <Avatar $bg={t.avatarBg}>{t.initials}</Avatar>
                <PersonInfo>
                  <span className="name">{t.name}</span>
                  <span className="role">{t.role}</span>
                </PersonInfo>
              </Person>
            </Card>
          ))}
        </Grid>
      </Inner>
    </Section>
  );
};

export default Testimonials;
