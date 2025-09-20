import { useState, useEffect } from 'react';
import './css/QuizQuestion.css';

const QuizQuestion = ({ 
  question, 
  onAnswerChange, 
  currentAnswer, 
  questionNumber, 
  totalQuestions,
  isReviewMode = false,
  showCorrectAnswer = false 
}) => {
  // Normalize question type and ensure defaults
  const normalizeQuestion = (q) => {
    const normalized = { ...q };
    
    // Default to multiple choice if type is missing or invalid
    if (!normalized.type || (normalized.type !== 'multiple-choice' && normalized.type !== 'multiple_choice' && normalized.type !== 'essay')) {
      normalized.type = 'multiple_choice';
    }
    
    // Ensure options exist for multiple choice questions
    if ((normalized.type === 'multiple-choice' || normalized.type === 'multiple_choice') && !normalized.options) {
      normalized.options = [];
    }
    
    return normalized;
  };

  const normalizedQuestion = normalizeQuestion(question);
  const isMultipleChoice = normalizedQuestion.type === 'multiple-choice' || normalizedQuestion.type === 'multiple_choice';
  
  const [selectedAnswer, setSelectedAnswer] = useState(currentAnswer || '');
  const [essayAnswer, setEssayAnswer] = useState(currentAnswer || '');

  useEffect(() => {
    if (isMultipleChoice) {
      setSelectedAnswer(currentAnswer || '');
    } else {
      setEssayAnswer(currentAnswer || '');
    }
  }, [currentAnswer, normalizedQuestion.type, isMultipleChoice]);

  const handleMultipleChoiceChange = (optionId) => {
    if (isReviewMode) return;
    
    setSelectedAnswer(optionId);
    onAnswerChange(normalizedQuestion.id, optionId);
  };

  const handleEssayChange = (e) => {
    if (isReviewMode) return;
    
    const value = e.target.value;
    setEssayAnswer(value);
    onAnswerChange(normalizedQuestion.id, value);
  };

  const getOptionClass = (optionId) => {
    let classes = ['quiz-option'];
    
    if (isMultipleChoice) {
      if (showCorrectAnswer) {
        if (optionId === normalizedQuestion.correctAnswer) {
          classes.push('correct-answer');
        } else if (optionId === selectedAnswer && optionId !== normalizedQuestion.correctAnswer) {
          classes.push('incorrect-answer');
        }
      } else if (selectedAnswer === optionId) {
        classes.push('selected');
      }
      
      if (isReviewMode) {
        classes.push('review-mode');
      }
    }
    
    return classes.join(' ');
  };

  const getQuestionStatus = () => {
    if (!showCorrectAnswer) return null;
    
    if (isMultipleChoice) {
      return selectedAnswer === normalizedQuestion.correctAnswer ? 'correct' : 'incorrect';
    } else {
      // For essay questions, we'll assume they need manual grading
      return 'pending';
    }
  };

  const renderMultipleChoice = () => (
    <div className="multiple-choice-container">
      {normalizedQuestion.options && normalizedQuestion.options.length > 0 ? normalizedQuestion.options.map((option) => (
        <div 
          key={option.id} 
          className={getOptionClass(option.id)}
          onClick={() => handleMultipleChoiceChange(option.id)}
        >
          <div className="option-indicator">
            <input
              type="radio"
              id={`question-${normalizedQuestion.id}-option-${option.id}`}
              name={`question-${normalizedQuestion.id}`}
              value={option.id}
              checked={selectedAnswer === option.id}
              onChange={() => handleMultipleChoiceChange(option.id)}
              disabled={isReviewMode}
            />
            <label 
              htmlFor={`question-${normalizedQuestion.id}-option-${option.id}`}
              className="option-label"
            >
              {option.id.toUpperCase()}
            </label>
          </div>
          <div className="option-text">
            {option.text}
          </div>
          {showCorrectAnswer && option.id === normalizedQuestion.correctAnswer && (
            <div className="correct-indicator">✓</div>
          )}
        </div>
      )) : (
        <div className="no-options-message">
          <p>No options available for this question.</p>
        </div>
      )}
    </div>
  );

  const renderEssay = () => (
    <div className="essay-container">
      <textarea
        className="essay-input"
        value={essayAnswer}
        onChange={handleEssayChange}
        placeholder="Type your answer here..."
        rows={8}
        disabled={isReviewMode}
        maxLength={normalizedQuestion.maxLength || 2000}
      />
      <div className="essay-info">
        <span className="character-count">
          {essayAnswer.length}/{normalizedQuestion.maxLength || 2000} characters
        </span>
        {normalizedQuestion.minLength && (
          <span className={`word-count ${essayAnswer.length < normalizedQuestion.minLength ? 'insufficient' : 'sufficient'}`}>
            Minimum: {normalizedQuestion.minLength} characters
          </span>
        )}
      </div>
      {isReviewMode && normalizedQuestion.rubric && (
        <div className="essay-rubric">
          <h4>Grading Rubric:</h4>
          <ul>
            {normalizedQuestion.rubric.map((criterion, index) => (
              <li key={index}>{criterion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className={`quiz-question ${normalizedQuestion.type} ${getQuestionStatus() || ''}`}>
      <div className="question-header">
        <div className="question-number">
          Question {questionNumber} of {totalQuestions}
        </div>
        <div className="question-type-badge">
          {isMultipleChoice ? 'Multiple Choice' : 'Essay'}
        </div>
      </div>

      <div className="question-content">
        <h3 className="question-text">{normalizedQuestion.text || normalizedQuestion.question}</h3>
        
        {normalizedQuestion.description && (
          <p className="question-description">{normalizedQuestion.description}</p>
        )}
        
        {normalizedQuestion.image && (
          <div className="question-image">
            <img src={normalizedQuestion.image} alt="Question illustration" />
          </div>
        )}

        <div className="question-metadata">
          <span className="points">Points: {normalizedQuestion.points || 1}</span>
          {normalizedQuestion.difficulty && (
            <span className={`difficulty ${normalizedQuestion.difficulty.toLowerCase()}`}>
              {normalizedQuestion.difficulty}
            </span>
          )}
          {normalizedQuestion.timeLimit && (
            <span className="time-limit">
              Time limit: {normalizedQuestion.timeLimit} minutes
            </span>
          )}
        </div>
      </div>

      <div className="answer-section">
        {isMultipleChoice ? renderMultipleChoice() : renderEssay()}
      </div>

      {showCorrectAnswer && isMultipleChoice && (
        <div className="explanation-section">
          {normalizedQuestion.explanation && (
            <div className="answer-explanation">
              <h4>Explanation:</h4>
              <p>{normalizedQuestion.explanation}</p>
            </div>
          )}
          {normalizedQuestion.reference && (
            <div className="reference">
              <strong>Reference:</strong> {normalizedQuestion.reference}
            </div>
          )}
        </div>
      )}

      {getQuestionStatus() && (
        <div className={`question-status ${getQuestionStatus()}`}>
          {getQuestionStatus() === 'correct' && '✓ Correct'}
          {getQuestionStatus() === 'incorrect' && '✗ Incorrect'}
          {getQuestionStatus() === 'pending' && '⏳ Pending Review'}
        </div>
      )}
    </div>
  );
};

export default QuizQuestion;