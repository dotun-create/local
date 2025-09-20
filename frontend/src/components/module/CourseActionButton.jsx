import React from 'react';
import CourseProgress from './CourseProgress';
import './css/CourseActionButton.css';

const CourseActionButton = ({
  courseTitle,
  userAvatar,
  headerTitle,
  visualImage,
  progressValue = 0,
  actionButtonText = "Start/ Continue Module",
  onActionClick
}) => {
  return (
    <div className="course-action-container">
      {/* Visual Illustration */}
      <div className="visual-illustration-section">
        <img 
          src={visualImage} 
          alt="Course illustration" 
          className="course-illustration"
        />
      </div>

      {/* Progress Indicator */}
      <CourseProgress progressValue={progressValue} />

      {/* Action Button */}
      <div className="action-button-section">
        <button 
          className="course-action-button"
          onClick={onActionClick}
          title={`Click to ${actionButtonText.toLowerCase()}`}
        >
          {actionButtonText}
        </button>
      </div>
    </div>
  );
};

export default CourseActionButton;