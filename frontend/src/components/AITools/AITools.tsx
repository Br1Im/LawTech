import React from 'react';
import './AITools.css';
import ChatInterface from './ChatInterface';

const AITools: React.FC = () => {
  return (
    <div className="ai-tools-container">
      <div className="ai-tools-content">
        <ChatInterface />
      </div>
    </div>
  );
};

export default AITools;