import React from 'react';
import './css/CourseCard.css';

const CourseCard = ({ 
  image, 
  courseTitle, 
  courseDescription, 
  courseCost, 
  buttonName, 
  buttonFunction 
}) => {
  return (
    <div className="course-card-component">
      <div className="course-card-image">
        <img src={image} alt={courseTitle} />
      </div>
      
      <div className="course-card-title">
        <h3>{courseTitle}</h3>
      </div>
      
      <div className="course-card-description">
        <p>{courseDescription}</p>
      </div>
      
      <div className="course-card-cost">
        <span className="cost">{courseCost}</span>
      </div>
      
      <div className="course-card-button">
        <button onClick={buttonFunction} className="course-btn">
          {buttonName}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;