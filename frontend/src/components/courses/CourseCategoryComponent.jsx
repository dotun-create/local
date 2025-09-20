import React from 'react';
import './css/CourseCategoryComponent.css';

const CourseCategoryComponent = ({ courseCategory, courseInfo, onCategorySelect }) => {
  const handleButtonClick = (categoryName) => {
    const listOfCourseObjects = courseInfo[categoryName] || [];
    onCategorySelect(listOfCourseObjects);
  };

  return (
    <div className="course-category-component">
      <div className="category-buttons-container">
        {courseCategory && courseCategory.map((category, index) => (
          <button
            key={index}
            className="category-button"
            onClick={() => handleButtonClick(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CourseCategoryComponent;