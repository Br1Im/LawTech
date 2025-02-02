import "./StatCard.css";
import { FaArrowUp, FaArrowDown, FaEquals } from "react-icons/fa";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  colorIcon: string;
  percentage: string | null;
  isIncrease: boolean | null;
  description: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorIcon, percentage, isIncrease, description }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-title">
        <span>{title}</span>
      </div>
      
      <div className="stat-card-icon" style={{ backgroundColor: colorIcon }}>
        {icon}
      </div>
      
      <div className="stat-card-value">
        {value}
      </div>
      
      <div className={`stat-card-percentage ${isIncrease === true ? "positive" : isIncrease === false ? "negative" : "neutral"}`}>
        {isIncrease === true ? (
          <FaArrowUp className="arrow-icon" />
        ) : isIncrease === false ? (
          <FaArrowDown className="arrow-icon" />
        ) : (
          <FaEquals className="arrow-icon" />
        )}
        <span>{percentage ? `${percentage}%` : "Без изменений"}</span>
        <span className="description">{description}</span>
      </div>
    </div>
  );
};

export default StatCard;