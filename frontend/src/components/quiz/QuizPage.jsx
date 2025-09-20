import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Quiz from './Quiz';
import QuizResults from './QuizResults';
import API from '../../services/api';
import './css/QuizPage.css';

const QuizPage = () => {
  const { courseId, moduleId, quizId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [quizState, setQuizState] = useState('loading'); // 'loading', 'intro', 'active', 'results'
  const [quizResults, setQuizResults] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load current user from session storage
  useEffect(() => {
    try {
      const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }, []);
  
  // Load quiz data from backend
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await API.quizzes.getQuizById(quizId);
        
        if (response.quiz) {
          setQuizData(response.quiz);
          setQuizState('intro');
        } else {
          throw new Error('Quiz not found');
        }
      } catch (err) {
        console.error('Failed to load quiz:', err);
        setError('Failed to load quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const handleQuizComplete = (results) => {
    setQuizResults(results);
    setQuizState('results');
  };

  const handleQuizExit = () => {
    handleBackNavigation();
  };

  const handleRetakeQuiz = () => {
    setQuizResults(null);
    setQuizState('intro');
  };

  const handleBackNavigation = () => {
    // Route back to appropriate course page based on user type
    if (currentUser?.accountType === 'student') {
      navigate(`/student-course-detail/${courseId}`);
    } else {
      // For admin/tutor, go to course workspace
      navigate(`/courses/${courseId}`);
    }
  };

  // Show loading state
  if (loading || quizState === 'loading') {
    return (
      <div className="quiz-page">
        <div className="quiz-loading">
          <div className="loading-spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="quiz-page">
        <div className="quiz-error">
          <h2>Error Loading Quiz</h2>
          <p>{error}</p>
          <button onClick={handleBackNavigation} className="back-to-course-btn">
            ← Back to Course
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no quiz data
  if (!quizData) {
    return (
      <div className="quiz-page">
        <div className="quiz-empty">
          <h2>Quiz Not Available</h2>
          <p>This quiz could not be found or is not available.</p>
          <button onClick={handleBackNavigation} className="back-to-course-btn">
            ← Back to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-page-header">
        <button 
          className="back-to-module-btn"
          onClick={handleBackNavigation}
        >
          ← Back to Course
        </button>
        <div className="quiz-page-title">
          <h1>{quizData.title}</h1>
          {quizData.description && (
            <p className="quiz-description">{quizData.description}</p>
          )}
        </div>
      </div>

      <div className="quiz-content">
        {quizState === 'intro' && (
          <div className="quiz-intro">
            <div className="quiz-info-card">
              <h2>Ready to start your quiz?</h2>
              <p>{quizData.description}</p>
              <div className="quiz-stats">
                <div className="stat-item">
                  <span className="stat-label">Questions:</span>
                  <span className="stat-value">{quizData.questions?.length || 0}</span>
                </div>
                {quizData.timeLimit && (
                  <div className="stat-item">
                    <span className="stat-label">Time Limit:</span>
                    <span className="stat-value">{quizData.timeLimit} minutes</span>
                  </div>
                )}
                <div className="stat-item">
                  <span className="stat-label">Passing Score:</span>
                  <span className="stat-value">{quizData.passingScore || 70}%</span>
                </div>
              </div>
              <button 
                className="start-quiz-btn"
                onClick={() => setQuizState('active')}
              >
                Start Quiz
              </button>
            </div>
          </div>
        )}

        {quizState === 'active' && (
          <Quiz 
            quizData={quizData}
            onQuizComplete={handleQuizComplete}
            onQuizExit={handleQuizExit}
          />
        )}

        {quizState === 'results' && quizResults && (
          <QuizResults 
            results={quizResults}
            onRetakeQuiz={handleRetakeQuiz}
            onExitQuiz={handleQuizExit}
            showDetailedResults={true}
          />
        )}
      </div>
    </div>
  );
};

export default QuizPage;