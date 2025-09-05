import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface PieChartData {
  label: string;
  value: number;
}

interface PieChartProps {
  title: string;
  data?: PieChartData[];
}

const PieChartComponent: React.FC<PieChartProps> = ({ title, data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Получаем текстовый цвет из CSS переменных для адаптации к теме
  const getTextColor = () => {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#fff';
  };

  // Получаем цвет фона из CSS переменных для адаптации к теме
  const getBackgroundColor = () => {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-bg') || '#1a1a2e';
  };

  // Обновляем график при изменении темы
  useEffect(() => {
    // Функция-обработчик для отслеживания изменений атрибута data-theme в корневом элементе
    const observer = new MutationObserver(() => {
      // Уничтожаем предыдущий экземпляр графика для пересоздания
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      
      // Инициируем пересоздание графика
      if (chartRef.current) {
        const ctx = chartRef.current.getContext('2d');
        if (ctx) {
          // Временно устанавливаем таймаут для корректного получения обновленных CSS переменных
          setTimeout(() => {
            createChart(ctx);
          }, 50);
        }
      }
    });

    // Начинаем отслеживать изменения атрибута data-theme в корневом элементе
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    // Очищаем обработчик при размонтировании компонента
    return () => observer.disconnect();
  }, []);

  // Функция создания графика (выносим для переиспользования)
  const createChart = (ctx: CanvasRenderingContext2D) => {
    // Проверяем наличие данных и их валидность
    const hasValidData = data && data.length > 0 && data.some(item => item.value > 0);

    // Подготовка данных для графика
    const chartData = hasValidData ? 
      {
        labels: data.map(item => item.label),
        datasets: [{
          label: 'Выручка юристов',
          data: data.map(item => item.value),
          backgroundColor: [
            'rgba(142, 68, 255, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 21, 133, 0.8)',
            'rgba(50, 205, 50, 0.8)',
            'rgba(255, 215, 0, 0.8)'
          ],
          borderColor: [
            'rgba(142, 68, 255, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 21, 133, 1)',
            'rgba(50, 205, 50, 1)',
            'rgba(255, 215, 0, 1)'
          ],
          borderWidth: 1,
          hoverOffset: 5
        }]
      } : 
      {
        labels: [],
        datasets: [{
          label: 'Выручка юристов',
          data: [1],
          backgroundColor: ['rgba(200, 200, 200, 0.2)'],
          borderColor: ['rgba(200, 200, 200, 0.3)'],
          borderWidth: 1,
          hoverOffset: 0
        }]
      };

    const textColor = getTextColor();
    const backgroundColor = getBackgroundColor();
    const isDarkTheme = backgroundColor.includes('1a') || backgroundColor.includes('2e') || backgroundColor.includes('33');

    // Создаем новый экземпляр графика
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            align: 'center',
            labels: {
              color: textColor,
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
                weight: 'bold'
              },
              filter: function(legendItem, data) {
                // Скрываем легенду при отсутствии данных
                return !!hasValidData;
              }
            }
          },
          title: {
            display: true,
            text: title,
            color: textColor,
            font: {
              size: 16,
              weight: 'bold',
              family: "'Arial', sans-serif"
            },
            padding: {
              top: 0,
              bottom: 15
            }
          },
          tooltip: {
            backgroundColor: isDarkTheme ? 'rgba(20, 30, 45, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            titleColor: isDarkTheme ? '#fff' : '#333',
            bodyColor: isDarkTheme ? '#fff' : '#333',
            borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            borderWidth: 1,
            displayColors: true,
            padding: 10,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                if (!hasValidData) {
                  return '';
                }
                const label = context.label || '';
                const value = context.raw as number;
                return `${label}: ${value.toLocaleString()} ₽`;
              }
            }
          }
        }
      }
    });
  };

  useEffect(() => {
    if (chartRef.current) {
      // Уничтожаем предыдущий экземпляр графика, если он существует
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        createChart(ctx);
      }
    }

    // Очистка при размонтировании компонента
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [title, data]);

  return (
    <div className="chart-placeholder">
      <canvas ref={chartRef} />
    </div>
  );
};

export default PieChartComponent;