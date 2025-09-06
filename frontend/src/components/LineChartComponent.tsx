import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

interface OfficeRevenueData {
  id: string;
  name: string;
  revenue: number[];
  color?: string;
}

interface LineChartData {
  labels: string[];
  offices: OfficeRevenueData[];
}

interface LineChartProps {
  title: string;
  data?: LineChartData;
}

// Массив цветов для разных офисов
const OFFICE_COLORS = [
  {
    borderColor: 'rgba(159, 90, 253, 1)',
    backgroundColor: 'rgba(159, 90, 253, 0.3)',
    pointBackgroundColor: 'rgba(159, 90, 253, 1)'
  },
  {
    borderColor: 'rgba(110, 44, 247, 1)',
    backgroundColor: 'rgba(110, 44, 247, 0.3)',
    pointBackgroundColor: 'rgba(110, 44, 247, 1)'
  },
  {
    borderColor: 'rgba(255, 99, 132, 1)',
    backgroundColor: 'rgba(255, 99, 132, 0.3)',
    pointBackgroundColor: 'rgba(255, 99, 132, 1)'
  },
  {
    borderColor: 'rgba(54, 162, 235, 1)',
    backgroundColor: 'rgba(54, 162, 235, 0.3)',
    pointBackgroundColor: 'rgba(54, 162, 235, 1)'
  },
  {
    borderColor: 'rgba(255, 206, 86, 1)',
    backgroundColor: 'rgba(255, 206, 86, 0.3)',
    pointBackgroundColor: 'rgba(255, 206, 86, 1)'
  }
];

const LineChartComponent: React.FC<LineChartProps> = ({ title, data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [chartKey, setChartKey] = useState<number>(0); // Ключ для принудительного пересоздания графика

  // Получаем текстовый цвет из CSS переменных для адаптации к теме
  const getTextColor = () => {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#fff';
  };

  // Получаем цвет сетки из CSS переменных
  const getGridColor = () => {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-accent-light') || 'rgba(255, 255, 255, 0.1)';
  };

  // Получаем цвет фона из CSS переменных для адаптации к теме
  const getBackgroundColor = () => {
    return getComputedStyle(document.documentElement).getPropertyValue('--color-bg') || '#1a1a2e';
  };

  // Обновляем график при изменении темы
  useEffect(() => {
    // Функция-обработчик для отслеживания изменений атрибута data-theme в корневом элементе
    const observer = new MutationObserver(() => {
      // Инкрементируем ключ для принудительного пересоздания графика
      setChartKey(prev => prev + 1);
    });

    // Начинаем отслеживать изменения атрибута data-theme в корневом элементе
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    // Очищаем обработчик при размонтировании компонента
    return () => observer.disconnect();
  }, []);

  // Принудительное обновление при изменении меток или данных
  useEffect(() => {
    if (data) {
      console.log("LineChartComponent: Обновление данных графика", { 
        labels: data.labels, 
        officesCount: data.offices?.length 
      });
      
      // Принудительно уничтожаем старый график перед обновлением
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      
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
          console.log("LineChartComponent: Отрисовка графика с метками", chartLabels);
              
          // Подготовка данных для графика
          const chartData = {
            labels: chartLabels, // Всегда используем метки из пропсов
            datasets: hasValidData 
              ? data.offices.map((office, index) => {
                  const colorIndex = index % OFFICE_COLORS.length;
                  const colors = OFFICE_COLORS[colorIndex];
                  
                  return {
                    fill: true,
                    label: office.name,
                    data: office.revenue || [],
                    borderColor: colors.borderColor,
                    backgroundColor: colors.backgroundColor,
                    tension: 0.4,
                    pointBackgroundColor: colors.pointBackgroundColor,
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6
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
            type: 'line',
            data: chartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    color: textColor,
                    usePointStyle: true,
                    padding: 15,
                    font: {
                      size: 12,
                      weight: 'bold'
                    },
                    filter: function(legendItem, data) {
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
                    top: 5,
                    bottom: 15
                  }
                },
                tooltip: {
                  enabled: hasValidData,
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
                      const label = context.dataset.label || '';
                      const value = context.raw as number;
                      return `${label}: ${value.toLocaleString()} ₽`;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: gridColor,
                    display: true
                  },
                  ticks: {
                    color: textColor,
                    padding: 10,
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
                    color: gridColor,
                    display: true
                  },
                  ticks: {
                    color: textColor,
                    padding: 10,
                    font: {
                      size: 12
                    }
                  }
                }
              }
            }
          });
        }
      }
    }, 50); // Небольшая задержка для корректного рендеринга

    // Очистка при размонтировании компонента
    return () => {
      clearTimeout(timer);
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [title, data, chartKey]); // Зависимость от chartKey обеспечивает пересоздание при изменении меток

  return (
    <div className="chart-placeholder" key={chartKey}>
      <canvas 
        ref={chartRef} 
        key={`canvas-${chartKey}`} 
        width={300} 
        height={200}
      />
    </div>
  );
};

export default LineChartComponent;