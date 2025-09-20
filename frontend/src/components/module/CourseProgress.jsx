import React from 'react';
import './css/CourseProgress.css';

const CourseProgress = ({ progressValue = 0 }) => {
  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(Math.max(progressValue, 0), 100);
  
  return (
    <div className="course-progress-container">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${normalizedProgress}%` }}
          title={`${normalizedProgress}% complete`}
        >
          <span className="progress-glow"></span>
        </div>
      </div>
      <span className="progress-label">{normalizedProgress}% Complete</span>
    </div>
  );
};

export default CourseProgress;