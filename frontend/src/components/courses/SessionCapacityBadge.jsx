import React from 'react';
import './css/SessionCapacityIndicator.css';

const SessionCapacityBadge = ({
  enrollmentCount = 0,
  maxStudents = 5,
  capacityStatus = 'empty',
  isFull = false,
  variant = 'compact' // compact, detailed
}) => {

  const getBadgeText = () => {
    if (variant === 'detailed') {
      switch (capacityStatus) {
        case 'empty':
          return 'Available';
        case 'partial':
          return `${enrollmentCount}/${maxStudents}`;
        case 'full':
          return 'Full';
        default:
          return `${enrollmentCount}/${maxStudents}`;
      }
    } else {
      return `${enrollmentCount}/${maxStudents}`;
    }
  };

  const getBadgeClassName = () => {
    const baseClass = 'session-capacity-badge';
    const statusClass = `badge-${capacityStatus}`;
    const variantClass = `badge-${variant}`;
    return `${baseClass} ${statusClass} ${variantClass}`;
  };

  return (
    <span className={getBadgeClassName()}>
      {getBadgeText()}
    </span>
  );
};

export default SessionCapacityBadge;