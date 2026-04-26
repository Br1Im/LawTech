import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useEffect, useRef } from 'react';
import {
  Zap,
  Bot,
  BarChart3,
  Shield,
  Cloud,
  CalendarCheck,
  Sparkles,
  ArrowUpRight,
  FileSearch,
  MessageSquare,
  Clock,
  TrendingUp,
} from 'lucide-react';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`;

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
  margin-bottom: 56px;
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
  margin-bottom: 18px;

  svg { width: 14px; height: 14px; }
`;

const Title = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 60px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: var(--color-text);
  margin: 0 auto 16px;
  max-width: 900px;

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
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 1fr;
  gap: 20px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.article<{ $variant?: 'wide' | 'tall' | 'default'; $dark?: boolean }>`
  grid-column: span ${(p) => (p.$variant === 'wide' ? 4 : 2)};
  grid-row: span ${(p) => (p.$variant === 'tall' ? 2 : 1)};
  min-height: ${(p) => (p.$variant === 'tall' ? '380px' : '220px')};
  padding: 28px;
  border-radius: var(--radius-xl);
  background: ${(p) =>
    p.$dark
      ? 'linear-gradient(145deg, #17191f 0%, #0a0b0e 100%)'
      : 'var(--glass-bg)'};
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid ${(p) => (p.$dark ? 'rgba(255,255,255,0.08)' : 'var(--color-border)')};
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
  color: ${(p) => (p.$dark ? '#f5f5f5' : 'var(--color-text)')};
  transition: transform 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out), border-color 0.35s var(--ease-out);
  opacity: 0;
  transform: translateY(30px);

  &.in-view {
    animation: ${fadeInUp} 0.8s var(--ease-out) forwards;
  }

  &:hover {
    transform: translateY(-6px);
    border-color: ${(p) => (p.$dark ? 'rgba(212,175,55,0.5)' : 'rgba(212,175,55,0.4)')};
    box-shadow: var(--shadow-xl);
  }

  @media (max-width: 960px) {
    grid-column: span 2;
    grid-row: auto;
    min-height: auto;
    padding: 24px;
  }

  @media (max-width: 560px) {
    grid-column: span 1;
  }
`;

const IconBox = styled.div<{ $dark?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${(p) =>
    p.$dark ? 'rgba(212, 175, 55, 0.14)' : 'var(--gradient-gold)'};
  border: 1px solid ${(p) => (p.$dark ? 'rgba(212, 175, 55, 0.35)' : 'transparent')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${(p) => (p.$dark ? '#f5d97b' : '#1a1a1a')};
  margin-bottom: 16px;
  box-shadow: ${(p) => (p.$dark ? 'none' : '0 8px 20px rgba(212, 175, 55, 0.28)')};

  svg { width: 22px; height: 22px; stroke-width: 2.2; }
`;

const CardTitle = styled.h3`
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.015em;
  margin: 0 0 10px;
`;

const CardText = styled.p<{ $dark?: boolean }>`
  font-size: 14.5px;
  line-height: 1.55;
  color: ${(p) => (p.$dark ? 'rgba(245,245,245,0.72)' : 'var(--color-text-secondary)')};
  margin: 0;
  max-width: 480px;
`;

const BigMetric = styled.div`
  font-family: var(--font-display);
  font-size: clamp(56px, 6vw, 92px);
  font-weight: 800;
  line-height: 1;
  background: var(--gradient-gold);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 5s linear infinite;
  letter-spacing: -0.04em;
  margin-top: auto;
`;

const MetricLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 6px;
`;

const ColSplit = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const MiniChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 72px;
  margin-top: 20px;
`;

const Bar = styled.span<{ $h: number; $accent?: boolean }>`
  flex: 1;
  height: ${(p) => p.$h}%;
  border-radius: 4px 4px 2px 2px;
  background: ${(p) =>
    p.$accent
      ? 'var(--gradient-gold)'
      : 'rgba(120, 120, 120, 0.22)'};
  transition: height 0.6s var(--ease-out);
`;

const ChatPreview = styled.div`
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChatLine = styled.div<{ $ai?: boolean }>`
  align-self: ${(p) => (p.$ai ? 'flex-start' : 'flex-end')};
  max-width: 85%;
  padding: 9px 13px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.4;
  background: ${(p) =>
    p.$ai
      ? 'rgba(212, 175, 55, 0.16)'
      : 'rgba(120, 120, 120, 0.15)'};
  color: ${(p) => (p.$ai ? 'var(--color-accent-dark)' : 'var(--color-text)')};
  border: 1px solid ${(p) =>
    p.$ai ? 'rgba(212, 175, 55, 0.32)' : 'var(--color-border)'};
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(212, 175, 55, 0.14);
  border: 1px solid rgba(212, 175, 55, 0.3);
  color: var(--color-accent-dark);
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  margin-top: 14px;

  svg { width: 12px; height: 12px; }
`;

const DarkPattern = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.18), transparent 55%),
    radial-gradient(circle at 10% 90%, rgba(0, 113, 227, 0.14), transparent 55%);
  opacity: 0.9;
`;

const BentoFeatures = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const cards = el.querySelectorAll<HTMLElement>('[data-bento-card]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting) {
            const delay = idx * 80;
            setTimeout(() => entry.target.classList.add('in-view'), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, []);

  return (
    <Section id="advantages">
      <Inner ref={containerRef}>
        <HeadBlock>
          <Eyebrow>
            <Sparkles /> Преимущества
          </Eyebrow>
          <Title>
            Один продукт — <em>вся операционка</em> юрфирмы
          </Title>
          <Subtitle>
            От первой встречи с клиентом до исполнения решения. Без таблиц,
            бесконечных переписок и пропущенных сроков.
          </Subtitle>
        </HeadBlock>

        <Grid>
          {/* Hero card: AI assistant - wide */}
          <Card $variant="wide" $dark data-bento-card>
            <DarkPattern />
            <ColSplit style={{ position: 'relative', zIndex: 1 }}>
              <IconBox $dark>
                <Bot />
              </IconBox>
              <CardTitle>AI-ассистент на базе Llama 3.1</CardTitle>
              <CardText $dark>
                Отвечает на вопросы, готовит черновики, ищет прецеденты по всей
                вашей базе. Локально, без отправки данных наружу.
              </CardText>
              <ChatPreview>
                <ChatLine>Найди договоры с ООО «Квант» за 2024</ChatLine>
                <ChatLine $ai>Нашёл 7 документов. Самый свежий — 12.11.2024.</ChatLine>
                <ChatLine $ai>Сформировать сводку?</ChatLine>
              </ChatPreview>
            </ColSplit>
          </Card>

          {/* Speed metric - compact */}
          <Card $variant="tall" data-bento-card>
            <ColSplit>
              <IconBox><Zap /></IconBox>
              <CardTitle>10×</CardTitle>
              <CardText>
                Быстрее обработка дел за счёт автоматизации документооборота и
                шаблонов.
              </CardText>
              <MiniChart>
                <Bar $h={25} />
                <Bar $h={38} />
                <Bar $h={32} />
                <Bar $h={55} />
                <Bar $h={48} />
                <Bar $h={70} />
                <Bar $h={62} />
                <Bar $h={88} $accent />
                <Bar $h={95} $accent />
              </MiniChart>
              <MetricLabel>↑ Производительность за квартал</MetricLabel>
            </ColSplit>
          </Card>

          {/* Analytics */}
          <Card data-bento-card>
            <IconBox><BarChart3 /></IconBox>
            <CardTitle>Аналитика в реальном времени</CardTitle>
            <CardText>
              Дашборд по делам, юристам, срокам и выручке — обновляется живьём.
            </CardText>
          </Card>

          {/* Search */}
          <Card data-bento-card>
            <IconBox><FileSearch /></IconBox>
            <CardTitle>Векторный поиск FAISS</CardTitle>
            <CardText>
              Ищите по смыслу, а не по точной формулировке. Ответ — за 1.2
              секунды на архиве в 50K документов.
            </CardText>
            <Tag><Clock /> 1.2s · 50K docs</Tag>
          </Card>

          {/* Security - big */}
          <Card $variant="wide" data-bento-card>
            <ColSplit>
              <IconBox><Shield /></IconBox>
              <CardTitle>Безопасность, сделанная для юристов</CardTitle>
              <CardText>
                End-to-end шифрование, ФЗ-152, GDPR, журнал доступа,
                двухфакторная аутентификация. Ваши данные — только ваши.
              </CardText>
              <BigMetric>256-bit</BigMetric>
              <MetricLabel>AES · Zero-trust архитектура</MetricLabel>
            </ColSplit>
          </Card>

          {/* Calendar */}
          <Card data-bento-card>
            <IconBox><CalendarCheck /></IconBox>
            <CardTitle>Никаких пропущенных сроков</CardTitle>
            <CardText>
              AI следит за календарём, регламентами и напоминает о дедлайнах
              заранее — с нужными документами.
            </CardText>
            <Tag><TrendingUp /> +40% к эффективности</Tag>
          </Card>

          {/* Cloud */}
          <Card data-bento-card>
            <IconBox><Cloud /></IconBox>
            <CardTitle>Работа из любой точки</CardTitle>
            <CardText>
              Облако, десктоп, мобильный — всё синхронно. 99.9% uptime.
            </CardText>
          </Card>

          {/* Collaboration */}
          <Card data-bento-card>
            <IconBox><MessageSquare /></IconBox>
            <CardTitle>Чат, комментарии и задачи</CardTitle>
            <CardText>
              Обсуждайте дела внутри карточки — без Telegram и почтовой
              переписки.
            </CardText>
            <Tag>
              <ArrowUpRight /> Встроено
            </Tag>
          </Card>
        </Grid>
      </Inner>
    </Section>
  );
};

export default BentoFeatures;
