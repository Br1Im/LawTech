import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useState } from 'react';
import {
  Users,
  Briefcase,
  Bot,
  BarChart3,
  FileText,
  Check,
  ArrowRight,
  Search,
} from 'lucide-react';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
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

const Tabs = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 32px;
  padding: 6px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  width: fit-content;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 640px) {
    flex-direction: column;
    width: 100%;
    border-radius: var(--radius-lg);
  }
`;

const TabBtn = styled.button<{ $active: boolean }>`
  border: 0;
  background: ${(p) => (p.$active ? 'var(--gradient-gold)' : 'transparent')};
  color: ${(p) => (p.$active ? '#1a1a1a' : 'var(--color-text-secondary)')};
  padding: 10px 18px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s var(--ease-out);
  box-shadow: ${(p) => (p.$active ? '0 8px 18px rgba(212,175,55,0.35)' : 'none')};

  svg { width: 16px; height: 16px; }

  &:hover {
    color: ${(p) => (p.$active ? '#1a1a1a' : 'var(--color-text)')};
  }
`;

const PreviewWrap = styled.div`
  background: var(--glass-bg-strong);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 0;
  animation: ${fadeIn} 0.4s var(--ease-out);

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const InfoCol = styled.div`
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(135deg, rgba(212,175,55,0.08), transparent 60%);

  @media (max-width: 960px) {
    padding: 36px 28px;
  }
`;

const Kicker = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: var(--color-accent);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 14px;
`;

const InfoTitle = styled.h3`
  font-family: var(--font-display);
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  color: var(--color-text);
`;

const InfoText = styled.p`
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--color-text-secondary);
  margin: 0 0 22px;
`;

const BulletList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Bullet = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14.5px;
  color: var(--color-text);

  .check {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--gradient-gold);
    color: #1a1a1a;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    svg { width: 13px; height: 13px; stroke-width: 3; }
  }
`;

const Learn = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-accent);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  transition: gap 0.25s var(--ease-out);

  &:hover { gap: 10px; }

  svg { width: 16px; height: 16px; }
`;

const VisualCol = styled.div`
  padding: 40px;
  background: var(--color-bg);
  border-left: 1px solid var(--color-border);
  min-height: 440px;

  [data-theme='dark'] & {
    background: rgba(20, 20, 22, 0.7);
  }

  @media (max-width: 960px) {
    border-left: 0;
    border-top: 1px solid var(--color-border);
    padding: 28px;
  }
`;

const Mock = styled.div`
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  height: 100%;
`;

const MockHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-alt);
  gap: 10px;

  .title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 15px;
    color: var(--color-text);
  }
`;

const MockSearch = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: 11px;
  color: var(--color-muted);

  svg { width: 12px; height: 12px; }
`;

const MockBody = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 36px 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: border-color 0.25s var(--ease-out);

  &:hover {
    border-color: rgba(212, 175, 55, 0.45);
  }
`;

const Avatar = styled.div<{ $bg: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${(p) => p.$bg};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
`;

const RowInfo = styled.div`
  .name {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--color-text);
  }
  .sub {
    font-size: 11.5px;
    color: var(--color-muted);
  }
`;

const RowMeta = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
`;

const Chip = styled.span<{ $tone: 'green' | 'gold' | 'blue' | 'red' }>`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  background: ${({ $tone }) =>
    $tone === 'green' ? 'rgba(48,209,88,0.15)' :
    $tone === 'gold'  ? 'rgba(212,175,55,0.18)' :
    $tone === 'blue'  ? 'rgba(10,132,255,0.15)' :
                        'rgba(255,69,58,0.15)'};
  color: ${({ $tone }) =>
    $tone === 'green' ? '#1e8a3a' :
    $tone === 'gold'  ? 'var(--color-accent-dark)' :
    $tone === 'blue'  ? '#0a6fc2' :
                        '#c9342a'};
`;

const AIChat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 4px;
`;

const ChatRow = styled.div<{ $ai?: boolean }>`
  align-self: ${(p) => (p.$ai ? 'flex-start' : 'flex-end')};
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.45;
  background: ${(p) => (p.$ai ? 'rgba(212,175,55,0.14)' : 'rgba(120,120,120,0.12)')};
  color: var(--color-text);
  border: 1px solid ${(p) => (p.$ai ? 'rgba(212,175,55,0.3)' : 'var(--color-border)')};

  code {
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 12px;
    background: rgba(0,0,0,0.06);
    padding: 1px 5px;
    border-radius: 4px;
  }
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const StatCell = styled.div`
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 14px;

  .label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
    margin-bottom: 6px;
  }

  .value {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.02em;
  }

  .delta {
    font-size: 11px;
    margin-top: 4px;
    color: #1e8a3a;
    font-weight: 600;
  }
`;

const Spark = styled.svg`
  width: 100%;
  height: 60px;
  margin-top: 10px;
`;

type TabKey = 'clients' | 'cases' | 'ai' | 'analytics';

interface TabData {
  key: TabKey;
  label: string;
  icon: React.ReactElement;
  kicker: string;
  title: string;
  text: string;
  bullets: string[];
}

const TABS: TabData[] = [
  {
    key: 'clients',
    label: 'Клиенты',
    icon: <Users />,
    kicker: 'CRM · Клиенты',
    title: 'Вся информация о клиенте — в одном окне',
    text:
      'Контакты, договоры, платежи, переписка, дела — без перехода между вкладками. Всё связано и всё на виду.',
    bullets: [
      'Автообогащение из открытых реестров',
      'История коммуникации и заметок',
      'Связанные дела, документы, счета',
    ],
  },
  {
    key: 'cases',
    label: 'Дела',
    icon: <Briefcase />,
    kicker: 'Управление делами',
    title: 'Дела с дедлайнами, ролями и пайплайном',
    text:
      'Kanban или список, сроки с напоминаниями, исполнители, связи с клиентами — всё, как вы привыкли, только без Excel.',
    bullets: [
      'Kanban-доски и временные шкалы',
      'Автоматические напоминания о слушаниях',
      'Согласования и комментарии внутри карточки',
    ],
  },
  {
    key: 'ai',
    label: 'AI-ассистент',
    icon: <Bot />,
    kicker: 'AI · Llama 3.1 + FAISS',
    title: 'Юрист, который не уходит в отпуск',
    text:
      'Задайте вопрос на естественном языке — AI найдёт нужный документ, процитирует место и предложит черновик ответа.',
    bullets: [
      'Семантический поиск по всей базе',
      'Генерация черновиков и резюме',
      'Сравнение документов и извлечение данных',
    ],
  },
  {
    key: 'analytics',
    label: 'Аналитика',
    icon: <BarChart3 />,
    kicker: 'Дашборд',
    title: 'KPI юрфирмы, которые видно сразу',
    text:
      'Выручка, загрузка юристов, сроки, конверсия, NPS — всё в одном дашборде с drill-down до конкретного дела.',
    bullets: [
      'Дашборды по юристам, клиентам, делам',
      'Прогнозы по выручке и загрузке',
      'Экспорт отчётов в PDF / Excel',
    ],
  },
];

const ProductShowcase = () => {
  const [tab, setTab] = useState<TabKey>('clients');
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <Section id="product">
      <Inner>
        <HeadBlock>
          <Eyebrow>Продукт</Eyebrow>
          <Title>
            Посмотрите, как это <em>выглядит внутри</em>
          </Title>
          <Subtitle>
            Один интерфейс — четыре сценария. Чистый, быстрый и
            продуманный для реальных юристов, а не для презентаций.
          </Subtitle>
        </HeadBlock>

        <Tabs role="tablist">
          {TABS.map((t) => (
            <TabBtn
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              $active={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.icon}
              {t.label}
            </TabBtn>
          ))}
        </Tabs>

        <PreviewWrap key={tab}>
          <InfoCol>
            <Kicker>{current.kicker}</Kicker>
            <InfoTitle>{current.title}</InfoTitle>
            <InfoText>{current.text}</InfoText>
            <BulletList>
              {current.bullets.map((b) => (
                <Bullet key={b}>
                  <span className="check">
                    <Check />
                  </span>
                  {b}
                </Bullet>
              ))}
            </BulletList>
            <Learn href="/auth">
              Попробовать <ArrowRight />
            </Learn>
          </InfoCol>

          <VisualCol>
            <Mock>
              <MockHeader>
                <span className="title">
                  {tab === 'clients'   && 'Клиенты'}
                  {tab === 'cases'     && 'Активные дела'}
                  {tab === 'ai'        && 'AI-чат'}
                  {tab === 'analytics' && 'Дашборд'}
                </span>
                {tab !== 'analytics' && (
                  <MockSearch>
                    <Search /> Поиск…
                  </MockSearch>
                )}
              </MockHeader>

              {tab === 'clients' && (
                <MockBody>
                  <Row>
                    <Avatar $bg="linear-gradient(135deg,#d4af37,#a07c28)">АП</Avatar>
                    <RowInfo>
                      <div className="name">Артём Петров</div>
                      <div className="sub">artem@lawfirm.ru · +7 (812) 555-01-12</div>
                    </RowInfo>
                    <RowMeta>3 дела</RowMeta>
                    <Chip $tone="green">VIP</Chip>
                  </Row>
                  <Row>
                    <Avatar $bg="linear-gradient(135deg,#0a84ff,#2997ff)">КГ</Avatar>
                    <RowInfo>
                      <div className="name">ООО «Квант-Групп»</div>
                      <div className="sub">legal@quant.com</div>
                    </RowInfo>
                    <RowMeta>7 дел</RowMeta>
                    <Chip $tone="gold">Партнёр</Chip>
                  </Row>
                  <Row>
                    <Avatar $bg="linear-gradient(135deg,#30d158,#0a8f3c)">МС</Avatar>
                    <RowInfo>
                      <div className="name">Мария Самойлова</div>
                      <div className="sub">m.samoilova@gmail.com</div>
                    </RowInfo>
                    <RowMeta>1 дело</RowMeta>
                    <Chip $tone="blue">Новый</Chip>
                  </Row>
                  <Row>
                    <Avatar $bg="linear-gradient(135deg,#ff9f0a,#c76d00)">ИА</Avatar>
                    <RowInfo>
                      <div className="name">ИП «Андреев и партнёры»</div>
                      <div className="sub">info@andreev.law</div>
                    </RowInfo>
                    <RowMeta>12 дел</RowMeta>
                    <Chip $tone="green">Активен</Chip>
                  </Row>
                </MockBody>
              )}

              {tab === 'cases' && (
                <MockBody>
                  <Row>
                    <Avatar $bg="rgba(212,175,55,0.2)">
                      <FileText />
                    </Avatar>
                    <RowInfo>
                      <div className="name">Налоговый спор №2025-014</div>
                      <div className="sub">ИП «Андреев» · отв. А. Иванова</div>
                    </RowInfo>
                    <RowMeta>до 24.11</RowMeta>
                    <Chip $tone="gold">Дедлайн</Chip>
                  </Row>
                  <Row>
                    <Avatar $bg="rgba(48,209,88,0.22)"><FileText /></Avatar>
                    <RowInfo>
                      <div className="name">Регистрация ТЗ №2025-021</div>
                      <div className="sub">ООО «Квант» · отв. С. Петров</div>
                    </RowInfo>
                    <RowMeta>2 задачи</RowMeta>
                    <Chip $tone="green">В работе</Chip>
                  </Row>
                  <Row>
                    <Avatar $bg="rgba(10,132,255,0.2)"><FileText /></Avatar>
                    <RowInfo>
                      <div className="name">Бракоразводный процесс №2025-019</div>
                      <div className="sub">М. Самойлова · отв. А. Иванова</div>
                    </RowInfo>
                    <RowMeta>28.11 слушание</RowMeta>
                    <Chip $tone="blue">Суд</Chip>
                  </Row>
                  <Row>
                    <Avatar $bg="rgba(255,69,58,0.18)"><FileText /></Avatar>
                    <RowInfo>
                      <div className="name">Трудовой спор №2025-007</div>
                      <div className="sub">А. Петров · отв. К. Сидоров</div>
                    </RowInfo>
                    <RowMeta>просрочено 2д</RowMeta>
                    <Chip $tone="red">Срочно</Chip>
                  </Row>
                </MockBody>
              )}

              {tab === 'ai' && (
                <MockBody>
                  <AIChat>
                    <ChatRow>
                      Найди все договоры поставки с ООО «Квант» за 2024
                    </ChatRow>
                    <ChatRow $ai>
                      Нашёл <code>7 договоров</code> за 2024. Самый свежий —{' '}
                      <code>№ПД-2024-112</code> от 12.11.2024 на сумму 2.4 млн ₽.
                    </ChatRow>
                    <ChatRow $ai>
                      Сводка условий:
                      <br />• срок поставки — 14 дней
                      <br />• неустойка — 0.1% в день
                      <br />• подсудность — АС Москвы
                    </ChatRow>
                    <ChatRow>Сделай черновик претензии по просрочке</ChatRow>
                    <ChatRow $ai>Готовлю…</ChatRow>
                  </AIChat>
                </MockBody>
              )}

              {tab === 'analytics' && (
                <MockBody>
                  <StatGrid>
                    <StatCell>
                      <div className="label">Выручка</div>
                      <div className="value">4.2M ₽</div>
                      <div className="delta">↑ 18% м/м</div>
                    </StatCell>
                    <StatCell>
                      <div className="label">Активных дел</div>
                      <div className="value">127</div>
                      <div className="delta">↑ 9</div>
                    </StatCell>
                    <StatCell>
                      <div className="label">Средн. срок</div>
                      <div className="value">14д</div>
                      <div className="delta">↓ 2д</div>
                    </StatCell>
                    <StatCell>
                      <div className="label">NPS</div>
                      <div className="value">72</div>
                      <div className="delta">↑ 4</div>
                    </StatCell>
                  </StatGrid>

                  <Spark viewBox="0 0 400 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#f5d97b" />
                      </linearGradient>
                      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4af37" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 48 L 40 40 L 80 44 L 120 30 L 160 34 L 200 22 L 240 26 L 280 14 L 320 18 L 360 8 L 400 12 L 400 60 L 0 60 Z"
                      fill="url(#sparkFill)"
                    />
                    <path
                      d="M0 48 L 40 40 L 80 44 L 120 30 L 160 34 L 200 22 L 240 26 L 280 14 L 320 18 L 360 8 L 400 12"
                      fill="none"
                      stroke="url(#spark)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </Spark>
                </MockBody>
              )}
            </Mock>
          </VisualCol>
        </PreviewWrap>
      </Inner>
    </Section>
  );
};

export default ProductShowcase;
