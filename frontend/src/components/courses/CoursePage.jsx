import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HeroPage from '../general/HeroPage';
import CourseSectionComponent from './CourseSectionComponent';
import { useCourses } from '../../hooks/useData';
import API from '../../services/api';
import { appConfig } from '../../config';
import { getCourseImage } from '../../utils/courseImageHelper';
import { formatCoursePrice } from '../../utils/currency';
import './css/CoursePage.css';

const CoursePage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { courses, loading: coursesLoading } = useCourses();
  const [organizedCourses, setOrganizedCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseLoading, setCourseLoading] = useState(false);

  // Load individual course if courseId is provided
  useEffect(() => {
    const loadCourse = async () => {
      if (courseId) {
        setCourseLoading(true);
        try {
          const courseData = await API.courses.getCourseById(courseId);
          console.log(courseData)
          setSelectedCourse(courseData);
        } catch (error) {
          console.error('Failed to load course:', error);
          // Navigate back to courses if course not found
          navigate('/courses');
        } finally {
          setCourseLoading(false);
        }
      } else {
        setSelectedCourse(null);
      }
    };

    loadCourse();
  }, [courseId, navigate]);

  // Organize courses by subject for category display
  useEffect(() => {
    if (Array.isArray(courses)) {
      const organized = courses.reduce((acc, course) => {
        const subject = course.subject || 'General';
        if (!acc[subject]) {
          acc[subject] = [];
        }
        acc[subject].push({
          id: course.id,
          // Properties expected by CourseDisplayComponent
          image: getCourseImage(course),
          courseTitle: course.title,
          courseDescription: course.description,
          courseCost: formatCoursePrice(course),
          buttonName: 'View Course',
          // Additional properties for reference
          title: course.title,
          description: course.description,
          price: course.price,
          duration: course.duration,
          level: course.level,
          thumbnail: getCourseImage(course),
          learningOutcomes: course.learning_outcomes || [],
          status: course.status || 'active'
        });
        return acc;
      }, {});
      
      setOrganizedCourses(organized);
    }
  }, [courses]);

  // Loading states
  if (coursesLoading || courseLoading) {
    return (
      <div className="course-page">
        <HeroPage textList={appConfig.coursePage.heroText} />
        <div className="loading-message" style={{ textAlign: 'center', padding: '2rem' }}>
          {courseId ? 'Loading course details...' : 'Loading courses...'}
        </div>
      </div>
    );
  }

  // Individual course display
  if (courseId && selectedCourse) {
    return (
      <div className="course-page">
        <div className="individual-course-container">
          <div className="course-header">
            <button 
              className="back-button" 
              onClick={() => navigate('/courses')}
            >
              ← Back to Courses
            </button>
            <div className="course-title-section">
              <h1>{selectedCourse.title}</h1>
              <span className={`status-badge ${selectedCourse.status || 'active'}`}>
                {selectedCourse.status || 'Active'}
              </span>
            </div>
          </div>

          <div className="course-content">
            <div className="course-main-info">
              <div className="course-description-section">
                <h2>Course Description</h2>
                <p>{selectedCourse.description || 'No description available'}</p>
              </div>

              <div className="course-details-grid">
                <div className="detail-card">
                  <h3>Course Information</h3>
                  <div className="detail-item">
                    <span className="label">Course ID:</span>
                    <span className="value">{selectedCourse.id}</span>
                  </div>
                  {selectedCourse.subject && (
                    <div className="detail-item">
                      <span className="label">Subject:</span>
                      <span className="value">{selectedCourse.subject}</span>
                    </div>
                  )}
                  {selectedCourse.gradeLevel && (
                    <div className="detail-item">
                      <span className="label">Grade Level:</span>
                      <span className="value">{selectedCourse.gradeLevel}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="label">Price:</span>
                    <span className="value">{formatCoursePrice(selectedCourse)}</span>
                  </div>
                  {selectedCourse.duration && (
                    <div className="detail-item">
                      <span className="label">Duration:</span>
                      <span className="value">{selectedCourse.duration}</span>
                    </div>
                  )}
                </div>

                <div className="detail-card">
                  <h3>Course Stats</h3>
                  <div className="detail-item">
                    <span className="label">Total Modules:</span>
                    <span className="value">{selectedCourse.totalModules || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Enrolled Students:</span>
                    <span className="value">{selectedCourse.enrolledStudents || 0}</span>
                  </div>
                  {selectedCourse.assignedTutors && (
                    <div className="detail-item">
                      <span className="label">Assigned Tutors:</span>
                      <span className="value">
                        {Array.isArray(selectedCourse.assignedTutors) 
                          ? selectedCourse.assignedTutors.join(', ') 
                          : selectedCourse.assignedTutors
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedCourse.learningOutcomes && selectedCourse.learningOutcomes.length > 0 && (
                <div className="learning-outcomes-section">
                  <h3>Learning Outcomes</h3>
                  <ul className="outcomes-list">
                    {selectedCourse.learningOutcomes.map((outcome, index) => (
                      <li key={index}>{outcome}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Course listing display (default)
  return (
    <div className="course-page">
      <HeroPage textList={appConfig.coursePage.heroText} />
      <CourseSectionComponent 
        courseDetailObject={Object.keys(organizedCourses).length > 0 ? organizedCourses : appConfig.coursePage.courseDetailObject}
        isFromDatabase={Object.keys(organizedCourses).length > 0}
      />
    </div>
  );
};

export default CoursePage;