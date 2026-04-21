import { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';

interface Review {
  name: string;
  review: string;
}

const ReviewsContainer = styled.div`
  width: 100vw;
  margin: 25px auto;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;

  @media (max-width: 768px) {
    margin: 80px auto;
  }
`;

const InnerContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;

  @media (max-width: 768px) {
    padding: 0 10px;
  }
`;

const Title = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(32px, 4.2vw, 52px);
  font-weight: 800;
  line-height: 1.08;
  margin-bottom: 10px;
  text-align: center;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Divider = styled.hr`
  width: 80px;
  height: 3px;
  border: 0;
  border-radius: 3px;
  margin: 14px auto 40px;
  background: var(--gradient-gold);
`;

const LoopSlide = styled.div`
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  overflow: hidden;
  margin-bottom: 40px;

  @media (max-width: 768px) {
    margin-bottom: 32px;
  }
`;

const ReviewsTrack = styled.div`
  display: flex;
  width: max-content;
  will-change: transform;
`;

const ReviewCard = styled.div`
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  width: 320px;
  min-width: 320px;
  margin: 0 10px;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  transition: transform 0.35s var(--ease-out), border-color 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out);

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(212, 175, 55, 0.4);
    box-shadow: var(--shadow-lg);
  }

  @media (max-width: 768px) {
    width: 260px;
    min-width: 260px;
    padding: 16px;
    margin: 0 8px;
  }

  @media (max-width: 480px) {
    width: 220px;
    min-width: 220px;
    padding: 14px;
    margin: 0 6px;
  }
`;

const ReviewCardHeader = styled.div`
  margin-bottom: 12px;

  @media (max-width: 768px) {
    margin-bottom: 8px;
  }
`;

const ReviewAuthor = styled.p`
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;

  @media (max-width: 768px) {
    font-size: 15px;
  }

  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

const ReviewText = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary);

  @media (max-width: 768px) {
    font-size: 13px;
  }

  @media (max-width: 480px) {
    font-size: 12px;
    line-height: 1.5;
  }
`;

const Offer = () => {
  const firstRowReviews: Review[] = [
    {
      name: 'Автоматизация документооборота',
      review:
        'Современные системы автоматизации позволяют значительно ускорить процесс обработки документов, минимизируя время на рутинные задачи.',
    },
    {
      name: 'Уменьшение ошибок',
      review:
        'Автоматизация снижает вероятность ошибок при заполнении и обработке документов, что повышает надежность юридических процессов.',
    },
    {
      name: 'Улучшение доступа к информации',
      review:
        'Системы автоматизации обеспечивают быстрый доступ к необходимым данным и документам, что упрощает работу юристов.',
    },
    {
      name: 'Анализ данных',
      review:
        'Инструменты ИИ помогают анализировать большие объемы юридических данных, выявляя важные закономерности и тенденции.',
    },
    {
      name: 'Оптимизация рабочего времени',
      review:
        'Автоматизация рутинных задач позволяет юристам сосредоточиться на более сложных и важных аспектах своей работы.',
    },
  ];

  const secondRowReviews: Review[] = [
    {
      name: 'Электронные подписи',
      review:
        'Использование электронных подписей упрощает процесс подписания документов и повышает их юридическую силу.',
    },
    {
      name: 'Управление проектами',
      review:
        'Автоматизированные системы управления проектами помогают юристам эффективно планировать и контролировать выполнение задач.',
    },
    {
      name: 'Системы мониторинга',
      review:
        'Технологии позволяют отслеживать изменения в законодательстве и автоматически уведомлять об этом юристов.',
    },
    {
      name: 'Поддержка принятия решений',
      review:
        'Инструменты ИИ помогают юристам принимать обоснованные решения на основе анализа предыдущих дел и судебной практики.',
    },
    {
      name: 'Повышение клиентского сервиса',
      review:
        'Автоматизация процессов позволяет улучшить взаимодействие с клиентами и повысить уровень обслуживания.',
    },
  ];

  const ReviewRow = ({ reviews, initialOffset }: { reviews: Review[]; initialOffset: number }) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(initialOffset);

    useEffect(() => {
      const track = trackRef.current;
      let animationFrame: number;

      const speed = 1;

      const animate = () => {
        setOffset((prev: number) => {
          if (!track) return prev;
          const newOffset = prev - speed;
          if (Math.abs(newOffset) >= track.offsetWidth / 2) {
            return 0;
          }
          return newOffset;
        });
        animationFrame = requestAnimationFrame(animate);
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }, []);

    return (
      <ReviewsTrack
        ref={trackRef}
        style={{ transform: `translateX(${offset}px)` }}
      >
        {reviews.concat(reviews).map((review: Review, index: number) => (
          <ReviewCard key={index}>
            <ReviewCardHeader>
              <ReviewAuthor>{review.name}</ReviewAuthor>
            </ReviewCardHeader>
            <ReviewText>{review.review}</ReviewText>
          </ReviewCard>
        ))}
      </ReviewsTrack>
    );
  };

  return (
    <ReviewsContainer id="offer">
      <InnerContainer>
        <Title>Что мы предлагаем</Title>
        <Divider />
      </InnerContainer>
      <LoopSlide>
        <ReviewRow reviews={firstRowReviews} initialOffset={0} />
      </LoopSlide>
      <LoopSlide>
        <ReviewRow reviews={secondRowReviews} initialOffset={200} />
      </LoopSlide>
    </ReviewsContainer>
  );
};

export default Offer;