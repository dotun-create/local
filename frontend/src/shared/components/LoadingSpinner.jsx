import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({
  size = 'medium',
  color = 'primary',
  text = '',
  overlay = false,
  className = ''
}) => {
  const spinnerClass = `loading-spinner ${size} ${color} ${className}`;

  const content = (
    <div className={spinnerClass}>
      <div className="spinner" />
      {text && <span className="loading-text">{text}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;