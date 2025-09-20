import React from 'react';
import HowItWorksCard from './HowItWorksCard';
import './css/HowItWorksContainer.css';

const HowItWorksContainer = ({ 
  titleText, 
  howItWorksCardsContent, 
  actionButtonName, 
  actionButtonActionFunction 
}) => {
  return (
    <div className="how-it-works-container-wrapper">
      <div className="container-title-row">
        <h2 className="container-title">{titleText}</h2>
      </div>
      
      <div className="container-cards-row">
        {howItWorksCardsContent.map((cardContent, index) => (
          <div key={index} className="card-column">
            <HowItWorksCard
              image={cardContent.image}
              text={cardContent.text}
            />
          </div>
        ))}
      </div>
      
      <div className="container-action-row">
        <button 
          className="container-action-button"
          onClick={actionButtonActionFunction}
        >
          {actionButtonName}
        </button>
      </div>
    </div>
  );
};

export default HowItWorksContainer;