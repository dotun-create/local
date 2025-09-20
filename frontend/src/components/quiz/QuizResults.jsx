import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/QuizResults.css';

const QuizResults = ({ results, onRetakeQuiz, onExitQuiz, showDetailedResults = true }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  const toggleQuestionDetails = (questionId) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return '#10b981'; // Green
    if (percentage >= 80) return '#3b82f6'; // Blue
    if (percentage >= 70) return '#f59e0b'; // Yellow
    if (percentage >= 60) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getGradeLetter = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const getPerformanceMessage = (percentage, passed) => {
    if (percentage >= 95) return '🎉 Outstanding! Perfect performance!';
    if (percentage >= 90) return '⭐ Excellent work!';
    if (percentage >= 80) return '👍 Great job!';
    if (percentage >= 70) return '✅ Good work!';
    if (passed) return '👌 You passed!';
    return '📚 Keep studying and try again!';
  };

  const getQuestionTypeIcon = (type) => {
    return type === 'multiple-choice' ? '🔘' : '📝';
  };

  const renderSummaryTab = () => (
    <div className="results-summary">
      <div className="score-display">
        <div className="main-score">
          <div 
            className="score-circle"
            style={{ borderColor: getGradeColor(results.percentage) }}
          >
            <span className="score-percentage">{results.percentage}%</span>
            <span className="score-grade">{getGradeLetter(results.percentage)}</span>
          </div>
          <div className="score-details">
            <h3>{results.totalScore} / {results.maxScore} points</h3>
            <p className={`pass-status ${results.passed ? 'passed' : 'failed'}`}>
              {results.passed ? '✅ PASSED' : '❌ FAILED'}
            </p>
            <p className="performance-message">
              {getPerformanceMessage(results.percentage, results.passed)}
            </p>
          </div>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-grid">
          <div className="stat-item">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <span className="stat-value">{results.correctAnswers}</span>
              <span className="stat-label">Correct Answers</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <span className="stat-value">{results.attemptedQuestions}</span>
              <span className="stat-label">Questions Attempted</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <span className="stat-value">{results.totalQuestions}</span>
              <span className="stat-label">Total Questions</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <span className="stat-value">{formatTime(results.timeSpent)}</span>
              <span className="stat-label">Time Spent</span>
            </div>
          </div>
        </div>
      </div>

      <div className="performance-breakdown">
        <h4>Performance by Question Type</h4>
        <div className="breakdown-charts">
          {['multiple-choice', 'essay'].map(type => {
            const typeQuestions = results.questionResults.filter(q => q.type === type);
            if (typeQuestions.length === 0) return null;
            
            const typeCorrect = typeQuestions.filter(q => q.isCorrect).length;
            const typePercentage = Math.round((typeCorrect / typeQuestions.length) * 100);
            
            return (
              <div key={type} className="breakdown-item">
                <div className="breakdown-header">
                  <span className="breakdown-type">
                    {getQuestionTypeIcon(type)} {type === 'multiple-choice' ? 'Multiple Choice' : 'Essay'}
                  </span>
                  <span className="breakdown-score">{typeCorrect}/{typeQuestions.length}</span>
                </div>
                <div className="breakdown-bar">
                  <div 
                    className="breakdown-fill"
                    style={{ 
                      width: `${typePercentage}%`,
                      backgroundColor: getGradeColor(typePercentage)
                    }}
                  ></div>
                </div>
                <span className="breakdown-percentage">{typePercentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {results.quizData.allowReview && (
        <div className="review-notice">
          <div className="notice-icon">📋</div>
          <div className="notice-content">
            <h4>Review Available</h4>
            <p>Click on the "Question Review" tab to see detailed feedback on each question.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderQuestionReviewTab = () => (
    <div className="question-review">
      <div className="review-header">
        <h3>Detailed Question Review</h3>
        <p>Click on any question to see your answer and feedback</p>
      </div>
      
      <div className="questions-list">
        {results.questionResults.map((questionResult, index) => (
          <div 
            key={questionResult.questionId} 
            className={`question-review-item ${questionResult.isCorrect ? 'correct' : 'incorrect'} ${questionResult.type}`}
          >
            <div 
              className="question-header" 
              onClick={() => toggleQuestionDetails(questionResult.questionId)}
            >
              <div className="question-info">
                <span className="question-number">Q{index + 1}</span>
                <span className="question-type-icon">
                  {getQuestionTypeIcon(questionResult.type)}
                </span>
                <span className="question-text-preview">
                  {questionResult.question.length > 80 
                    ? `${questionResult.question.substring(0, 80)}...` 
                    : questionResult.question}
                </span>
              </div>
              <div className="question-status">
                <span className="question-score">
                  {questionResult.score}/{questionResult.points} pts
                </span>
                <span className={`status-icon ${questionResult.isCorrect ? 'correct' : questionResult.type === 'essay' ? 'pending' : 'incorrect'}`}>
                  {questionResult.type === 'essay' ? '⏳' : questionResult.isCorrect ? '✅' : '❌'}
                </span>
                <span className="expand-icon">
                  {expandedQuestions.has(questionResult.questionId) ? '▼' : '▶'}
                </span>
              </div>
            </div>
            
            {expandedQuestions.has(questionResult.questionId) && (
              <div className="question-details">
                <div className="question-full-text">
                  <h4>Question:</h4>
                  <p>{questionResult.question}</p>
                </div>
                
                <div className="answer-section">
                  <div className="user-answer">
                    <h4>Your Answer:</h4>
                    {questionResult.type === 'multiple-choice' ? (
                      <div className={`answer-choice ${questionResult.isCorrect ? 'correct' : 'incorrect'}`}>
                        <span className="choice-letter">{questionResult.userAnswer?.toUpperCase()}</span>
                        <span className="choice-text">
                          {/* In a real app, you'd look up the option text */}
                          Option {questionResult.userAnswer?.toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className="essay-answer">
                        <textarea 
                          value={questionResult.userAnswer || 'No answer provided'} 
                          readOnly 
                          rows="6"
                        />
                        <div className="essay-stats">
                          <span>Characters: {(questionResult.userAnswer || '').length}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {questionResult.type === 'multiple-choice' && (
                    <div className="correct-answer">
                      <h4>Correct Answer:</h4>
                      <div className="answer-choice correct">
                        <span className="choice-letter">{questionResult.correctAnswer?.toUpperCase()}</span>
                        <span className="choice-text">
                          Option {questionResult.correctAnswer?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {questionResult.explanation && (
                  <div className="explanation">
                    <h4>Explanation:</h4>
                    <p>{questionResult.explanation}</p>
                  </div>
                )}
                
                {questionResult.type === 'essay' && (
                  <div className="essay-feedback">
                    <div className="grading-notice">
                      <h4>⏳ Pending Manual Review</h4>
                      <p>Essay questions require manual grading by your instructor. You will be notified when your grade is available.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderCertificateTab = () => (
    <div className="certificate-section">
      {results.passed ? (
        <div className="certificate">
          <div className="certificate-border">
            <div className="certificate-content">
              <div className="certificate-header">
                <h2>🏆 Certificate of Completion</h2>
              </div>
              
              <div className="certificate-body">
                <p className="certificate-text">This is to certify that</p>
                <h3 className="student-name">Student Name</h3>
                <p className="certificate-text">has successfully completed</p>
                <h4 className="quiz-title">{results.quizData.title}</h4>
                
                <div className="certificate-details">
                  <div className="detail-row">
                    <span>Course:</span>
                    <span>{results.quizData.course}</span>
                  </div>
                  <div className="detail-row">
                    <span>Module:</span>
                    <span>{results.quizData.module}</span>
                  </div>
                  <div className="detail-row">
                    <span>Score:</span>
                    <span>{results.percentage}% ({getGradeLetter(results.percentage)})</span>
                  </div>
                  <div className="detail-row">
                    <span>Date:</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="certificate-signature">
                  <div className="signature-line">
                    <p>{results.quizData.instructor}</p>
                    <p className="signature-title">Course Instructor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="certificate-actions">
            <button className="download-btn">📄 Download Certificate</button>
            <button className="share-btn">🔗 Share Achievement</button>
          </div>
        </div>
      ) : (
        <div className="no-certificate">
          <div className="no-cert-icon">📚</div>
          <h3>Certificate Not Available</h3>
          <p>You need to achieve a passing score of {results.quizData.passingScore}% to earn a certificate.</p>
          <p>Your current score: {results.percentage}%</p>
          <button className="retake-btn" onClick={onRetakeQuiz}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="quiz-results-container">
      <div className="results-header">
        <div className="header-content">
          <h1>Quiz Results</h1>
          <p className="quiz-info">{results.quizData.course} • {results.quizData.module}</p>
        </div>
        <div className="header-actions">
          <button className="action-btn secondary" onClick={onExitQuiz}>
            Return to Course
          </button>
          {results.quizData.maxAttempts > results.quizData.attempts && (
            <button className="action-btn primary" onClick={onRetakeQuiz}>
              Retake Quiz
            </button>
          )}
        </div>
      </div>

      {showDetailedResults && (
        <div className="results-tabs">
          <div className="tab-buttons">
            <button 
              className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              📊 Summary
            </button>
            {results.quizData.allowReview && (
              <button 
                className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => setActiveTab('review')}
              >
                📋 Question Review
              </button>
            )}
            <button 
              className={`tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
              onClick={() => setActiveTab('certificate')}
            >
              🏆 Certificate
            </button>
          </div>
          
          <div className="tab-content">
            {activeTab === 'summary' && renderSummaryTab()}
            {activeTab === 'review' && renderQuestionReviewTab()}
            {activeTab === 'certificate' && renderCertificateTab()}
          </div>
        </div>
      )}

      <div className="results-actions">
        <div className="action-group">
          <button className="action-btn outline" onClick={() => window.print()}>
            🖨️ Print Results
          </button>
          <button className="action-btn outline">
            📧 Email Results
          </button>
          <button className="action-btn outline">
            💾 Save Progress
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;