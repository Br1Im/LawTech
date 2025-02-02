import React from 'react';
import './AITools.css';
import ChatInterface from './ChatInterface';

const AITools: React.FC = () => {
  return (
    <div className="ai-tools-container">
      <div className="ai-tools-header">
        <h2>AI инструменты</h2>
        <p>Используйте искусственный интеллект для решения юридических задач</p>
      </div>
      
      <div className="ai-tools-content">
        <ChatInterface />
      </div>
    </div>
  );
};

export default AITools; 