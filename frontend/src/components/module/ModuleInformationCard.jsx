import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './css/ModuleInformationCard.css';

const ModuleInformationCard = ({ moduleData }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clickedLessons, setClickedLessons] = useState(new Set());
  const courseId = searchParams.get('courseId');

  // Extract module information
  const {
    topic = "Module Topic",
    lessons = [],
    totalLessons = lessons.length,
    completedLessons = lessons.filter(lesson => lesson.completed).length
  } = moduleData || {};

  const handleLessonClick = (lesson) => {
    // Add to clicked lessons
    setClickedLessons(prev => new Set(prev).add(lesson.id));
    
    // Navigate to quiz page with lesson topic
    const topic = lesson.name.toLowerCase().replace(/\s+/g, '-');
    navigate(`/quiz?courseId=${courseId}&topic=${topic}`, {
      state: {
        lessonData: lesson,
        fromModulePage: true,
        courseId: courseId
      }
    });
  };

  return (
    <div className="module-information-card">
      {/* Module Header */}
      <div className="module-header">
        <h3 className="module-topic">{topic}</h3>
        <span className="module-progress-text">
          {completedLessons}/{totalLessons} lessons complete
        </span>
      </div>

      {/* Lessons List */}
      <div className="lessons-list">
        {lessons.map((lesson) => {
          const isClicked = clickedLessons.has(lesson.id);
          const isCompleted = lesson.completed;

          return (
            <div
              key={lesson.id}
              className={`lesson-item ${isClicked ? 'clicked' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => handleLessonClick(lesson)}
              title={`${lesson.name}${isCompleted ? ' (Completed)' : ''} - Click to take quiz`}
            >
              <div className="lesson-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  readOnly
                  className="lesson-checkbox"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="custom-checkbox">
                  {isCompleted && <span className="checkmark">✓</span>}
                </span>
              </div>
              <span className="lesson-name">{lesson.name}</span>
              {lesson.duration && (
                <span className="lesson-duration">{lesson.duration}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip for completion status */}
      {completedLessons === totalLessons && (
        <div className="completion-badge" title="All lessons completed!">
          <span className="badge-icon">🎉</span>
          <span className="badge-text">Module Complete!</span>
        </div>
      )}
    </div>
  );
};

export default ModuleInformationCard;