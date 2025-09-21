import React from 'react';
import { Card, Button, Badge } from '@shared/components/ui';
import { quizService } from '../services/quizService';
import './QuizCard.css';

const QuizCard = ({
  quiz,
  variant = 'default', // default, compact, detailed
  showActions = true,
  showProgress = false,
  onStart,
  onEdit,
  onDelete,
  onView,
  userAttempt = null,
  className = ''
}) => {
  const formatDuration = (minutes) => {
    if (!minutes) return 'No time limit';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'var(--color-text-secondary)',
      published: 'var(--color-success)',
      archived: 'var(--color-warning)',
      completed: 'var(--color-primary)',
      in_progress: 'var(--color-info)',
      not_started: 'var(--color-text-secondary)'
    };
    return colors[status] || colors.not_started;
  };

  const getAttemptStatus = () => {
    if (!userAttempt) return 'not_started';
    if (userAttempt.submitted) return 'completed';
    return 'in_progress';
  };

  const getAttemptStatusText = () => {
    const status = getAttemptStatus();
    const statusTexts = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      completed: 'Completed'
    };
    return statusTexts[status];
  };

  const renderQuizStats = () => (
    <div className="quiz-stats">
      <div className="stat-item">
        <span className="stat-icon">📝</span>
        <span className="stat-text">{quiz.questionCount || quiz.questions?.length || 0} questions</span>
      </div>

      <div className="stat-item">
        <span className="stat-icon">⏱</span>
        <span className="stat-text">{formatDuration(quiz.timeLimit)}</span>
      </div>

      <div className="stat-item">
        <span className="stat-icon">📊</span>
        <span className="stat-text">{quiz.totalPoints || 0} points</span>
      </div>

      {quiz.passingScore && (
        <div className="stat-item">
          <span className="stat-icon">✅</span>
          <span className="stat-text">{quiz.passingScore}% to pass</span>
        </div>
      )}
    </div>
  );

  const renderAttemptInfo = () => {
    if (!userAttempt) return null;

    return (
      <div className="attempt-info">
        <div className="attempt-header">
          <Badge
            variant={getAttemptStatus() === 'completed' ? 'success' : 'info'}
            className="attempt-status"
          >
            {getAttemptStatusText()}
          </Badge>

          {userAttempt.score !== undefined && (
            <div className="attempt-score">
              <span className="score-value">{userAttempt.score}%</span>
              <span className="score-label">
                {userAttempt.passed ? 'Passed' : 'Failed'}
              </span>
            </div>
          )}
        </div>

        {userAttempt.submitted && (
          <div className="attempt-details">
            <span className="attempt-date">
              Completed: {new Date(userAttempt.submittedAt).toLocaleDateString()}
            </span>
            {userAttempt.timeSpent && (
              <span className="attempt-time">
                Time: {quizService.formatQuizTime(userAttempt.timeSpent)}
              </span>
            )}
          </div>
        )}

        {showProgress && userAttempt.progress && (
          <div className="progress-info">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${userAttempt.progress}%` }}
              />
            </div>
            <span className="progress-text">{userAttempt.progress}% complete</span>
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => {
    if (!showActions) return null;

    const status = getAttemptStatus();

    return (
      <div className="quiz-actions">
        {status === 'not_started' && (
          <Button
            variant="primary"
            onClick={() => onStart?.(quiz)}
            className="start-button"
          >
            Start Quiz
          </Button>
        )}

        {status === 'in_progress' && (
          <Button
            variant="primary"
            onClick={() => onStart?.(quiz)}
            className="resume-button"
          >
            Resume Quiz
          </Button>
        )}

        {status === 'completed' && (
          <Button
            variant="secondary"
            onClick={() => onView?.(quiz, userAttempt)}
            className="view-results-button"
          >
            View Results
          </Button>
        )}

        {quiz.allowRetake && status === 'completed' && userAttempt?.attemptsRemaining > 0 && (
          <Button
            variant="outline"
            onClick={() => onStart?.(quiz)}
            className="retake-button"
          >
            Retake ({userAttempt.attemptsRemaining} left)
          </Button>
        )}

        {onEdit && (
          <Button
            variant="outline"
            onClick={() => onEdit?.(quiz)}
            className="edit-button"
          >
            Edit
          </Button>
        )}

        {onDelete && (
          <Button
            variant="outline"
            onClick={() => onDelete?.(quiz)}
            className="delete-button"
          >
            Delete
          </Button>
        )}
      </div>
    );
  };

  if (variant === 'compact') {
    return (
      <Card className={`quiz-card quiz-card--compact ${className}`}>
        <div className="quiz-compact-content">
          <div className="quiz-compact-info">
            <h4 className="quiz-title">{quiz.title}</h4>
            <div className="quiz-meta">
              <span>{quiz.questionCount || 0} questions</span>
              <span>•</span>
              <span>{formatDuration(quiz.timeLimit)}</span>
              {userAttempt && (
                <>
                  <span>•</span>
                  <Badge variant={getAttemptStatus() === 'completed' ? 'success' : 'info'}>
                    {getAttemptStatusText()}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {showActions && (
            <div className="quiz-compact-actions">
              {getAttemptStatus() === 'not_started' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onStart?.(quiz)}
                >
                  Start
                </Button>
              )}
              {getAttemptStatus() === 'in_progress' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onStart?.(quiz)}
                >
                  Resume
                </Button>
              )}
              {getAttemptStatus() === 'completed' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onView?.(quiz, userAttempt)}
                >
                  Results
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`quiz-card quiz-card--${variant} ${className}`}>
      <div className="quiz-card-header">
        <div className="quiz-title-section">
          <h3 className="quiz-title">{quiz.title}</h3>
          {quiz.status && (
            <Badge
              variant={quiz.status === 'published' ? 'success' : 'secondary'}
              style={{ backgroundColor: getStatusColor(quiz.status) }}
            >
              {quiz.status}
            </Badge>
          )}
        </div>

        {quiz.description && (
          <p className="quiz-description">{quiz.description}</p>
        )}
      </div>

      <div className="quiz-card-content">
        {quiz.course && (
          <div className="quiz-course">
            <span className="course-label">Course:</span>
            <span className="course-name">{quiz.course}</span>
          </div>
        )}

        {quiz.instructor && (
          <div className="quiz-instructor">
            <span className="instructor-label">Instructor:</span>
            <span className="instructor-name">{quiz.instructor}</span>
          </div>
        )}

        {renderQuizStats()}

        {userAttempt && renderAttemptInfo()}

        {variant === 'detailed' && quiz.instructions && (
          <div className="quiz-instructions">
            <h4>Instructions:</h4>
            <p>{quiz.instructions}</p>
          </div>
        )}

        {quiz.dueDate && (
          <div className="quiz-due-date">
            <span className="due-date-label">Due:</span>
            <span className="due-date-value">
              {new Date(quiz.dueDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {quiz.attempts && quiz.maxAttempts && (
          <div className="quiz-attempts">
            <span className="attempts-label">Attempts:</span>
            <span className="attempts-value">
              {quiz.attempts} of {quiz.maxAttempts}
            </span>
          </div>
        )}
      </div>

      {renderActions()}
    </Card>
  );
};

export default QuizCard;