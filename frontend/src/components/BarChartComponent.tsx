import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

interface OfficeRevenueData {
  id: string;
  name: string;
  revenue: number[];
  color?: string;
}

interface BarChartData {
  labels: string[];
  offices: OfficeRevenueData[];
}

interface BarChartProps {
  title: string;
  data?: BarChartData;
}

const BarChartComponent: React.FC<BarChartProps> = ({ title, data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [chartKey, setChartKey] = useState<number>(0);

  // Функция для получения цвета текста в зависимости от темы
  const getTextColor = () => {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    return theme === 'dark' ? '#E5E9F0' : '#2E3440';
  };

  // Функция для получения цвета сетки в зависимости от темы
  const getGridColor = () => {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    return theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  };

  // Функция для получения цвета фона в зависимости от темы
  const getBackgroundColor = () => {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    return theme === 'dark' ? '#2E3440' : '#FFFFFF';
  };
  
  // Функция для получения золотого цвета из CSS-переменной
  const getGoldColor = () => {
    // Получаем значение CSS-переменной --color-accent
    const computedStyle = getComputedStyle(document.documentElement);
    return computedStyle.getPropertyValue('--color-accent').trim() || '#d4af37';
  };

  // Отслеживание изменения темы
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          // Инкремент ключа для пересоздания компонента canvas
          setChartKey(prev => prev + 1);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Пересоздание графика при изменении данных
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
      // Инкремент ключа для пересоздания компонента canvas
      setChartKey(prev => prev + 1);
    }
  }, [data]);
  
  // Создание графика при изменении данных или ключа
  useEffect(() => {
    // Небольшая задержка для корректного рендеринга после обновления данных
    const timer = setTimeout(() => {
      if (chartRef.current) {
        // Уничтожаем предыдущий экземпляр графика, если он существует
        if (chartInstance.current) {
          chartInstance.current.destroy();
          chartInstance.current = null;
        }

        const ctx = chartRef.current.getContext('2d');
        if (ctx && data) {
          // Проверяем наличие данных и их валидность
          const hasValidData = data && 
            data.labels && 
            data.labels.length > 0 && 
            data.offices &&
            data.offices.length > 0 &&
            data.offices.some(office => office.revenue && office.revenue.some(val => val > 0));

          // Определяем метки графика: или из данных, или пустой массив
          const chartLabels = data.labels || [];

          // Подготовка данных для графика
          const chartData = {
            labels: chartLabels,
            datasets: hasValidData 
              ? data.offices.map((office) => {
                  return {
                    label: office.name,
                    data: office.revenue || [],
                    backgroundColor: getGoldColor(), // Получаем золотой цвет из CSS-переменной
                    borderColor: getGoldColor(),
                    borderWidth: 1,
                    borderRadius: 5,
                    barThickness: 40, // Увеличил толщину столбцов
                    maxBarThickness: 50
                  };
                })
              : []
          };

          const textColor = getTextColor();
          const gridColor = getGridColor();
          const backgroundColor = getBackgroundColor();
          const isDarkTheme = backgroundColor.includes('1a') || backgroundColor.includes('2e') || backgroundColor.includes('33');

          // Создаем новый экземпляр графика
          chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false, // Скрываем легенду
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
                    top: 5,
                    bottom: 15
                  }
                },
                tooltip: {
                  enabled: hasValidData,
                  backgroundColor: isDarkTheme ? 'rgba(20, 30, 45, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  titleColor: isDarkTheme ? '#E5E9F0' : '#2E3440',
                  bodyColor: isDarkTheme ? '#E5E9F0' : '#2E3440',
                  borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  borderWidth: 1,
                  padding: 10,
                  displayColors: true,
                  callbacks: {
                    label: function(context) {
                      let label = context.dataset.label || '';
                      if (label) {
                        label += ': ';
                      }
                      if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('ru-RU').format(context.parsed.y) + ' ₽';
                      }
                      return label;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: gridColor,
                    drawBorder: false
                  },
                  ticks: {
                    color: textColor,
                    font: {
                      size: 12
                    },
                    callback: function(value) {
                      return value.toLocaleString() + ' ₽';
                    }
                  }
                },
                x: {
                  grid: {
                    display: false
                  },
                  ticks: {
                    color: textColor,
                    font: {
                      size: 12
                    }
                  }
                }
              },
              animation: {
                duration: 1000,
                easing: 'easeOutQuart'
              },
              layout: {
                padding: {
                  left: 10,
                  right: 10,
                  top: 0,
                  bottom: 10
                }
              },
              backgroundColor: isDarkTheme ? '#1a1a1a' : '#FFFFFF'
            }
          });
        }
      }
    }, 100);

    // Очистка при размонтировании компонента
    return () => {
      clearTimeout(timer);
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [title, data, chartKey]);

  return (
    <div className="chart-placeholder" key={chartKey} style={{ backgroundColor: 'var(--color-bg-alt)', borderRadius: '8px', padding: '10px' }}>
      <canvas 
        ref={chartRef} 
        key={`canvas-${chartKey}`} 
        width={300} 
        height={240}
      />
    </div>
  );
};

export default BarChartComponent;