import React from 'react';
import './css/HeroPage.css';

const HeroPage = ({ textList }) => {
  return (
    <div className="hero-page">
      {textList && textList.map((text, index) => (
        <div key={index} className="hero-text-row">
          <p className={`hero-text ${index === 0 ? 'hero-text-first' : 'hero-text-regular'}`}>
            {text}
          </p>
        </div>
      ))}
    </div>
  );
};

export default HeroPage;