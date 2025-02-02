import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

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
  font-size: 48px;
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 16px;
  color: var(--color-accent);
  text-align: center;

  @media (max-width: 768px) {
    font-size: 36px;
  }

  @media (max-width: 480px) {
    font-size: 28px;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 2px solid var(--color-accent-light);
  margin: 20px 0 40px;
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
  background: var(--color-bg-alt);
  border-radius: 8px;
  padding: 16px;
  width: 300px;
  min-width: 300px;
  margin: 0 10px;
  box-sizing: border-box;
  border: 1px solid var(--color-accent-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    width: 250px;
    min-width: 250px;
    padding: 12px;
    margin: 0 8px;
  }

  @media (max-width: 480px) {
    width: 200px;
    min-width: 200px;
    padding: 10px;
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
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);

  @media (max-width: 768px) {
    font-size: 16px;
  }

  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

const ReviewText = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-muted);

  @media (max-width: 768px) {
    font-size: 12px;
  }

  @media (max-width: 480px) {
    font-size: 11px;
    line-height: 1.4;
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
    <ReviewsContainer id="advantages">
      <InnerContainer>
        <Title>Что мы предлагаем:</Title>
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