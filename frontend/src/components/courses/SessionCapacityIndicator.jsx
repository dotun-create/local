import React from 'react';
import './css/SessionCapacityIndicator.css';

const SessionCapacityIndicator = ({
  enrollmentCount = 0,
  maxStudents = 5,
  capacityStatus = 'empty',
  isFull = false,
  availableSpots = 0,
  size = 'medium',
  showText = true,
  showIcon = true
}) => {

  const getCapacityText = () => {
    if (enrollmentCount === 0) {
      return `Available (${enrollmentCount}/${maxStudents})`;
    } else if (isFull) {
      return `Full (${enrollmentCount}/${maxStudents})`;
    } else {
      const spotsText = availableSpots === 1 ? 'spot' : 'spots';
      return `${availableSpots} ${spotsText} left (${enrollmentCount}/${maxStudents})`;
    }
  };

  const getCapacityIcon = () => {
    switch (capacityStatus) {
      case 'empty':
        return '⭕'; // Available
      case 'partial':
        return '🟡'; // Partial
      case 'full':
        return '🔴'; // Full
      default:
        return '⚪'; // Unknown
    }
  };

  const getStatusClassName = () => {
    return `capacity-status-${capacityStatus}`;
  };

  return (
    <div className={`session-capacity-indicator ${getStatusClassName()} size-${size}`}>
      {showIcon && (
        <span className="capacity-icon" aria-hidden="true">
          {getCapacityIcon()}
        </span>
      )}
      {showText && (
        <span className="capacity-text">
          {getCapacityText()}
        </span>
      )}
    </div>
  );
};

export default SessionCapacityIndicator;