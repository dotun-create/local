import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuizQuestion from './QuizQuestion';
import QuizResults from './QuizResults';
import API from '../../services/api';
import './css/Quiz.css';

const Quiz = ({ quizData: propQuizData, onQuizComplete, onQuizExit }) => {
  const navigate = useNavigate();
  const { quizId } = useParams();
  
  // Sample quiz data - in a real app, this would come from an API or props
  const sampleQuizData = {
    id: 'quiz_001',
    title: 'GCSE Mathematics - Algebra Fundamentals',
    description: 'Test your understanding of algebraic concepts including equations, expressions, and problem-solving.',
    course: 'GCSE Mathematics',
    module: 'Algebra Fundamentals',
    instructor: 'Mr. David Brown',
    timeLimit: 45, // minutes
    totalPoints: 100,
    passingScore: 70,
    attempts: 1,
    maxAttempts: 3,
    shuffleQuestions: false,
    showResultsImmediately: true,
    allowReview: true,
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        text: 'What is the value of x in the equation 2x + 5 = 13?',
        description: 'Solve for x by isolating the variable.',
        points: 10,
        difficulty: 'Easy',
        timeLimit: 5,
        options: [
          { id: 'a', text: 'x = 3' },
          { id: 'b', text: 'x = 4' },
          { id: 'c', text: 'x = 5' },
          { id: 'd', text: 'x = 6' }
        ],
        correctAnswer: 'b',
        explanation: 'Subtract 5 from both sides: 2x = 8, then divide by 2: x = 4',
        reference: 'Chapter 3: Linear Equations'
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        text: 'Simplify the expression: 3x² + 2x - x² + 4x',
        points: 15,
        difficulty: 'Medium',
        timeLimit: 7,
        options: [
          { id: 'a', text: '2x² + 6x' },
          { id: 'b', text: '3x² + 6x' },
          { id: 'c', text: '2x² + 2x' },
          { id: 'd', text: 'x² + 6x' }
        ],
        correctAnswer: 'a',
        explanation: 'Combine like terms: (3x² - x²) + (2x + 4x) = 2x² + 6x',
        reference: 'Chapter 2: Algebraic Expressions'
      },
      {
        id: 'q3',
        type: 'essay',
        text: 'Explain the difference between an equation and an expression. Provide examples of each.',
        description: 'Your answer should demonstrate understanding of both concepts and include clear examples.',
        points: 25,
        difficulty: 'Medium',
        timeLimit: 15,
        minLength: 200,
        maxLength: 500,
        rubric: [
          'Correctly defines what an equation is (5 points)',
          'Correctly defines what an expression is (5 points)',
          'Provides a clear example of an equation (5 points)',
          'Provides a clear example of an expression (5 points)',
          'Explains the key differences clearly (5 points)'
        ]
      },
      {
        id: 'q4',
        type: 'multiple-choice',
        text: 'Which of the following is equivalent to (x + 3)²?',
        image: '/images/algebra-diagram.png', // Optional image
        points: 20,
        difficulty: 'Hard',
        timeLimit: 10,
        options: [
          { id: 'a', text: 'x² + 6x + 9' },
          { id: 'b', text: 'x² + 3x + 9' },
          { id: 'c', text: 'x² + 6x + 6' },
          { id: 'd', text: 'x² + 9' }
        ],
        correctAnswer: 'a',
        explanation: 'Using the formula (a + b)² = a² + 2ab + b²: (x + 3)² = x² + 2(x)(3) + 3² = x² + 6x + 9',
        reference: 'Chapter 4: Quadratic Expressions'
      },
      {
        id: 'q5',
        type: 'essay',
        text: 'Solve the following word problem step by step: A rectangle has a length that is 3 units more than twice its width. If the perimeter is 30 units, find the dimensions of the rectangle.',
        description: 'Show all your working and explain each step clearly.',
        points: 30,
        difficulty: 'Hard',
        timeLimit: 20,
        minLength: 300,
        maxLength: 800,
        rubric: [
          'Sets up variables correctly (5 points)',
          'Writes correct equation for length in terms of width (5 points)',
          'Writes correct perimeter equation (5 points)',
          'Solves the equation correctly (10 points)',
          'States the final answer clearly (5 points)'
        ]
      }
    ]
  };

  const [quizData, setQuizData] = useState(propQuizData || sampleQuizData);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('intro'); // intro, quiz, results
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Initialize timer when quiz starts
  useEffect(() => {
    if (quizStarted && quizData.timeLimit && !quizCompleted) {
      setTimeRemaining(quizData.timeLimit * 60); // Convert minutes to seconds
    }
  }, [quizStarted, quizData.timeLimit, quizCompleted]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && quizStarted && !quizCompleted) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && quizStarted) {
      handleSubmitQuiz();
    }
  }, [timeRemaining, quizStarted, quizCompleted]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setStartTime(Date.now());
    setCurrentPhase('quiz');
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionNavigation = (index) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmitQuiz = async () => {
    try {
      setQuizSubmitted(true);
      
      // Calculate time spent (in minutes)
      const timeSpentMinutes = quizData.timeLimit 
        ? Math.max(0, quizData.timeLimit - Math.ceil(timeRemaining / 60))
        : Math.floor((Date.now() - (startTime || Date.now())) / 60000);

      // Prepare answers for submission
      const submissionAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));

      // Submit to backend
      if (quizId) {
        const response = await API.quizzes.submitQuizResults(quizId, {
          answers: submissionAnswers,
          timeSpent: timeSpentMinutes
        });
        
        if (response.result) {
          setQuizCompleted(true);
          setCurrentPhase('results');
          setShowResults(true);
          
          if (onQuizComplete) {
            onQuizComplete(response.result);
          }
        } else {
          throw new Error('Failed to submit quiz');
        }
      } else {
        // Fallback to local calculation if no quizId
        const results = calculateResults();
        setQuizCompleted(true);
        setCurrentPhase('results');
        setShowResults(true);
        
        if (onQuizComplete) {
          onQuizComplete(results);
        }
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      setQuizSubmitted(false);
      alert('Failed to submit quiz. Please try again.');
    }
  };

  const calculateResults = () => {
    let totalScore = 0;
    let maxScore = 0;
    let correctAnswers = 0;
    let attemptedQuestions = 0;
    
    const questionResults = quizData.questions.map(question => {
      maxScore += question.points;
      const userAnswer = answers[question.id];
      
      if (userAnswer && userAnswer.trim() !== '') {
        attemptedQuestions++;
      }
      
      let isCorrect = false;
      let score = 0;
      
      if (question.type === 'multiple-choice') {
        isCorrect = userAnswer === question.correctAnswer;
        if (isCorrect) {
          score = question.points;
          correctAnswers++;
        }
      } else {
        // Essay questions would need manual grading
        score = 0; // Placeholder - would be set by instructor
      }
      
      totalScore += score;
      
      return {
        questionId: question.id,
        question: question.text,
        type: question.type,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        points: question.points,
        score,
        explanation: question.explanation
      };
    });
    
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= quizData.passingScore;
    
    return {
      totalScore,
      maxScore,
      percentage,
      correctAnswers,
      attemptedQuestions,
      totalQuestions: quizData.questions.length,
      passed,
      timeSpent: quizData.timeLimit ? (quizData.timeLimit * 60) - (timeRemaining || 0) : null,
      questionResults,
      quizData
    };
  };

  const handleExitQuiz = () => {
    if (window.confirm('Are you sure you want to exit the quiz? Your progress will be lost.')) {
      if (onQuizExit) {
        onQuizExit();
      } else {
        navigate(-1); // Go back to previous page
      }
    }
  };

  const getAnsweredQuestionsCount = () => {
    return Object.keys(answers).filter(key => answers[key] && answers[key].trim() !== '').length;
  };

  const isQuestionAnswered = (questionId) => {
    const answer = answers[questionId];
    return answer && answer.trim() !== '';
  };

  const renderQuizIntro = () => (
    <div className="quiz-intro">
      <div className="quiz-header">
        <h1>{quizData.title}</h1>
        <p className="quiz-description">{quizData.description}</p>
        
        <div className="quiz-metadata">
          <div className="metadata-item">
            <span className="label">Course:</span>
            <span className="value">{quizData.course}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Module:</span>
            <span className="value">{quizData.module}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Instructor:</span>
            <span className="value">{quizData.instructor}</span>
          </div>
        </div>
      </div>
      
      <div className="quiz-details">
        <div className="detail-card">
          <h3>📝 Questions</h3>
          <p>{quizData.questions.length} questions</p>
        </div>
        <div className="detail-card">
          <h3>⏱️ Time Limit</h3>
          <p>{quizData.timeLimit ? `${quizData.timeLimit} minutes` : 'No time limit'}</p>
        </div>
        <div className="detail-card">
          <h3>📊 Total Points</h3>
          <p>{quizData.totalPoints} points</p>
        </div>
        <div className="detail-card">
          <h3>✅ Passing Score</h3>
          <p>{quizData.passingScore}%</p>
        </div>
        <div className="detail-card">
          <h3>🔄 Attempts</h3>
          <p>{quizData.attempts} of {quizData.maxAttempts}</p>
        </div>
      </div>
      
      <div className="quiz-instructions">
        <h3>Instructions:</h3>
        <ul>
          <li>Read each question carefully before answering</li>
          <li>You can navigate between questions using the navigation panel</li>
          <li>For multiple choice questions, select one option</li>
          <li>For essay questions, provide detailed answers</li>
          {quizData.timeLimit && <li>Complete the quiz within the time limit</li>}
          <li>Review your answers before submitting</li>
          <li>Once submitted, you cannot change your answers</li>
        </ul>
      </div>
      
      <div className="start-quiz-section">
        <button className="start-quiz-btn" onClick={handleStartQuiz}>
          Start Quiz
        </button>
        <button className="exit-quiz-btn" onClick={handleExitQuiz}>
          Exit
        </button>
      </div>
    </div>
  );

  const renderQuestionNavigation = () => (
    <div className="question-navigation">
      <h4>Questions</h4>
      <div className="question-grid">
        {quizData.questions.map((_, index) => (
          <button
            key={index}
            className={`question-nav-btn 
              ${index === currentQuestionIndex ? 'current' : ''}
              ${isQuestionAnswered(quizData.questions[index].id) ? 'answered' : 'unanswered'}
            `}
            onClick={() => handleQuestionNavigation(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div className="navigation-legend">
        <div className="legend-item">
          <span className="legend-color current"></span>
          <span>Current</span>
        </div>
        <div className="legend-item">
          <span className="legend-color answered"></span>
          <span>Answered</span>
        </div>
        <div className="legend-item">
          <span className="legend-color unanswered"></span>
          <span>Unanswered</span>
        </div>
      </div>
    </div>
  );

  if (currentPhase === 'intro') {
    return (
      <div className="quiz-container">
        {renderQuizIntro()}
      </div>
    );
  }

  if (currentPhase === 'results') {
    return (
      <div className="quiz-container">
        <QuizResults 
          results={calculateResults()} 
          onRetakeQuiz={() => {
            setCurrentPhase('intro');
            setQuizStarted(false);
            setQuizCompleted(false);
            setAnswers({});
            setCurrentQuestionIndex(0);
          }}
          onExitQuiz={handleExitQuiz}
        />
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header-bar">
        <div className="quiz-title-bar">
          <h2>{quizData.title}</h2>
          <button className="exit-btn" onClick={handleExitQuiz}>
            ✕ Exit Quiz
          </button>
        </div>
        
        <div className="quiz-progress-bar">
          <div className="progress-info">
            <span>Question {currentQuestionIndex + 1} of {quizData.questions.length}</span>
            <span>{getAnsweredQuestionsCount()} answered</span>
            {timeRemaining !== null && (
              <span className={`time-remaining ${timeRemaining < 300 ? 'warning' : ''}`}>
                ⏰ {formatTime(timeRemaining)}
              </span>
            )}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{width: `${((currentQuestionIndex + 1) / quizData.questions.length) * 100}%`}}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="quiz-content">
        <div className="quiz-main">
          <QuizQuestion
            question={quizData.questions[currentQuestionIndex]}
            onAnswerChange={handleAnswerChange}
            currentAnswer={answers[quizData.questions[currentQuestionIndex].id]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={quizData.questions.length}
          />
          
          <div className="quiz-navigation-buttons">
            <button 
              className="nav-btn prev-btn" 
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              ← Previous
            </button>
            
            <div className="middle-buttons">
              {currentQuestionIndex === quizData.questions.length - 1 ? (
                <button 
                  className="submit-btn"
                  onClick={handleSubmitQuiz}
                  disabled={quizSubmitted}
                >
                  {quizSubmitted ? 'Submitted' : 'Submit Quiz'}
                </button>
              ) : (
                <button 
                  className="nav-btn next-btn" 
                  onClick={handleNextQuestion}
                >
                  Next →
                </button>
              )}
            </div>
            
            <button 
              className="flag-btn"
              title="Flag for review"
            >
              🚩 Flag
            </button>
          </div>
        </div>
        
        <div className="quiz-sidebar">
          {renderQuestionNavigation()}
          
          <div className="quiz-summary">
            <h4>Quiz Progress</h4>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-value">{getAnsweredQuestionsCount()}</span>
                <span className="stat-label">Answered</span>
              </div>
              <div className="stat">
                <span className="stat-value">{quizData.questions.length - getAnsweredQuestionsCount()}</span>
                <span className="stat-label">Remaining</span>
              </div>
              <div className="stat">
                <span className="stat-value">{quizData.totalPoints}</span>
                <span className="stat-label">Total Points</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;