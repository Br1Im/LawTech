import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./SalesChart.css";

interface SalesChartProps {
  filter: "daily" | "weekly" | "monthly";
  setFilter: React.Dispatch<React.SetStateAction<"daily" | "weekly" | "monthly">>;
}

const SalesChart: React.FC<SalesChartProps> = ({ filter, setFilter }) => {
  const dataDaily = [
    { name: "1", Кемерово: 85000, Красноярск: 92000, Новокузнецк: 88000 },
    { name: "2", Кемерово: 87000, Красноярск: 95000, Новокузнецк: 90000 },
    { name: "3", Кемерово: 86000, Красноярск: 93000, Новокузнецк: 89000 },
    { name: "4", Кемерово: 89000, Красноярск: 97000, Новокузнецк: 91000 },
    { name: "5", Кемерово: 92000, Красноярск: 99000, Новокузнецк: 94000 },
    { name: "6", Кемерово: 94000, Красноярск: 101000, Новокузнецк: 96000 },
    { name: "7", Кемерово: 96000, Красноярск: 103000, Новокузнецк: 98000 },
    { name: "8", Кемерово: 98000, Красноярск: 105000, Новокузнецк: 100000 },
    { name: "9", Кемерово: 100000, Красноярск: 107000, Новокузнецк: 102000 },
    { name: "10", Кемерово: 102000, Красноярск: 109000, Новокузнецк: 104000 },
    { name: "11", Кемерово: 104000, Красноярск: 111000, Новокузнецк: 106000 },
    { name: "12", Кемерово: 106000, Красноярск: 113000, Новокузнецк: 108000 },
    { name: "13", Кемерово: 108000, Красноярск: 115000, Новокузнецк: 110000 },
    { name: "14", Кемерово: 110000, Красноярск: 117000, Новокузнецк: 112000 },
    { name: "15", Кемерово: 112000, Красноярск: 119000, Новокузнецк: 114000 },
  ];

  // Данные для недель
  const dataWeekly = [
    { name: "Неделя 1", sales: 400000 },
    { name: "Неделя 2", sales: 550000 },
  ];

  // Данные для месяцев
  const dataMonthly = [
    { name: "Дек 2024", sales: 1200000 },
    { name: "Ян 2025", sales: 1500000 },
  ];

  // Выбор данных в зависимости от фильтра
  const data =
    filter === "daily"
      ? dataDaily
      : filter === "weekly"
      ? dataWeekly
      : dataMonthly;

  return (
    <div className="sales-chart-container">
      <div className="sales-chart-header">
        <h2 className="sales-chart-title">Статистика выручки</h2>
        <select
            className="sales-chart-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as "daily" | "weekly" | "monthly")}
        >
          <option value="daily">По дням</option>
          <option value="weekly">По неделям</option>
          <option value="monthly">По месяцам</option>
        </select>
      </div>
      <ResponsiveContainer width="95%" height={280}>
        <AreaChart data={data} margin={{ top: 15, right: 25, left: 25, bottom: 15 }}>
          {/* Определение градиента */}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#3B4252" />
          <XAxis
            dataKey="name"
            stroke="var(--color-text)"
            tick={{ fontSize: 14, fill: "var(--color-text)" }}
            label={{ value: "Дни", position: "insideBottom", offset: -5, fill: "var(--color-text)", fontSize: 14 }}
          />
          <YAxis
            stroke="var(--color-text)"
            tickFormatter={(value) => `${(value / 1000).toLocaleString()}k ₽`}
            domain={[0, "auto"]}
            ticks={[0, 50000, 100000, 150000, 200000]}
            tick={{ fontSize: 14, fill: "var(--color-text)" }}
            label={{
              value: "Сумма (₽)",
              angle: -90,
              position: "insideLeft",
              fill: "var(--color-text)",
              fontSize: 14,
              offset: 10,
              dx: -20,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#2E3440",
              border: "none",
              color: "var(--color-text)",
              fontSize: 14,
            }}
            labelStyle={{ color: "var(--color-text)" }}
            formatter={(value) => `${value.toLocaleString()} ₽`}
          />
          {filter === "daily" ? (
            <>
              {/* Кемерово */}
              <Area
                type="monotone"
                dataKey="Кемерово"
                name="Кемерово"
                stroke="#F59E0B"
                fill="url(#gradient)"
                dot={{ stroke: "#F2AC34", strokeWidth: 1, r: 5 }}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="Кемерово"
                name="Кемерово"
                stroke="#F59E0B"
                dot={{ stroke: "#F2AC34", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
              {/* Красноярск */}
              <Area
                type="monotone"
                dataKey="Красноярск"
                name="Красноярск"
                stroke="#34D399"
                fill="url(#gradient)"
                dot={{ stroke: "#F2AC34", strokeWidth: 1, r: 5 }}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="Красноярск"
                name="Красноярск"
                stroke="#34D399"
                dot={{ stroke: "#F2AC34", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
              {/* Новокузнецк */}
              <Area
                type="monotone"
                dataKey="Новокузнецк"
                name="Новокузнецк"
                stroke="#60A5FA"
                fill="url(#gradient)"
                dot={{ stroke: "#F2AC34", strokeWidth: 1, r: 5 }}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="Новокузнецк"
                name="Новокузнецк"
                stroke="#60A5FA"
                dot={{ stroke: "#F2AC34", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
            </>
          ) : (
            <>
              {/* Для недель и месяцев */}
              <Area
                type="monotone"
                dataKey="sales"
                name="Общая выручка"
                stroke="var(--color-text)"
                fill="url(#gradient)"
                dot={{ stroke: "#F2AC34", strokeWidth: 1, r: 5 }}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                name="Общая выручка"
                stroke="var(--color-text)"
                dot={{ stroke: "#F2AC34", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesChart;