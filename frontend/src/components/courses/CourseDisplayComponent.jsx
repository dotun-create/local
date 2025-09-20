import React from 'react';
import CourseCard from './CourseCard';
import './css/CourseDisplayComponent.css';

const CourseDisplayComponent = ({ listOfCourseObjects, onCourseAction }) => {
  const getGridColumns = () => {
    const itemCount = listOfCourseObjects ? listOfCourseObjects.length : 0;
    if (itemCount === 0) return 1;
    if (itemCount <= 3) return itemCount;
    return 3;
  };

  return (
    <div className="course-display-component">
      <div 
        className="course-display-grid"
        style={{ gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)` }}
      >
        {listOfCourseObjects && listOfCourseObjects.map((course, index) => (
          <CourseCard
            key={index}
            image={course.image}
            courseTitle={course.courseTitle}
            courseDescription={course.courseDescription}
            courseCost={course.courseCost}
            buttonName={course.buttonName}
            buttonFunction={() => onCourseAction && onCourseAction(course)}
          />
        ))}
      </div>
    </div>
  );
};

export default CourseDisplayComponent;