import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CourseCategoryComponent from './CourseCategoryComponent';
import CourseDisplayComponent from './CourseDisplayComponent';
import './css/CourseSectionComponent.css';

const CourseSectionComponent = ({ courseDetailObject, isFromDatabase = false }) => {
  const [selectedCourses, setSelectedCourses] = useState([]);
  const navigate = useNavigate();

  // Get category names from courseDetailObject keys
  const courseCategory = courseDetailObject ? Object.keys(courseDetailObject) : [];

  // Set first category as default when component loads
  useEffect(() => {
    if (courseCategory.length > 0 && courseDetailObject) {
      const firstCategory = courseCategory[0];
      const firstCategoryCourses = courseDetailObject[firstCategory] || [];
      setSelectedCourses(firstCategoryCourses);
    }
  }, [courseDetailObject]);

  const handleCategorySelect = (listOfCourseObjects) => {
    setSelectedCourses(listOfCourseObjects);
  };

  console.log(selectedCourses)

  const handleCourseAction = (course) => {
    if (course && course.id) {
      navigate(`/courses/${course.id}`);
    } else {
      console.error('Course ID not found:', course);
    }
  };

  if (!courseDetailObject || Object.keys(courseDetailObject).length === 0) {
    return (
      <div className="course-section-component">
        <div className="no-courses-message" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No courses available</h3>
          <p>Check back later for new courses!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="course-section-component">
      <CourseCategoryComponent
        courseCategory={courseCategory}
        courseInfo={courseDetailObject}
        onCategorySelect={handleCategorySelect}
      />
      
      <CourseDisplayComponent
        listOfCourseObjects={selectedCourses}
        onCourseAction={handleCourseAction}
      />
    </div>
  );
};

export default CourseSectionComponent;