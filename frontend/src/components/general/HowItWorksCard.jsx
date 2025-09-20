import React, { useState } from 'react';
import './css/HowItWorksCard.css';

const HowItWorksCard = ({ image, text }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  return (
    <div className="how-it-works-card">
      <div className="how-it-works-image">
        <img src={image} alt="Missing Image" />
      </div>
      
      <div className="how-it-works-text">
        <div 
          className={`collapsible-text ${isExpanded ? 'expanded' : 'collapsed'}`}
          onClick={toggleExpanded}
        >
          <div className="text-content">
            {text}
          </div>
          <div className="expand-indicator">
            {isExpanded ? '−' : '+'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksCard;