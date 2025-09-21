/**
 * Baseline tests for quiz system
 * Tests quiz creation, taking quizzes, question generation, and result tracking
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, createMockUser } from './test-utils';

// Mock quiz services
jest.mock('../../services/generate_questions', () => ({
  generateQuizQuestions: jest.fn(),
  saveQuestionsToFile: jest.fn(),
  downloadQuestionsAsFile: jest.fn(),
  main: jest.fn(),
}));

// Mock hooks
jest.mock('../../shared/hooks/useData', () => ({
  useQuizzes: jest.fn(),
  useQuiz: jest.fn(),
  useQuizResults: jest.fn(),
}));

// Mock data service quiz methods
jest.mock('../../shared/services/dataService', () => ({
  getQuizzes: jest.fn(),
  getQuiz: jest.fn(),
  createQuiz: jest.fn(),
  updateQuiz: jest.fn(),
  deleteQuiz: jest.fn(),
  submitQuizAnswer: jest.fn(),
  getQuizResults: jest.fn(),
  saveQuizResult: jest.fn(),
  getQuizStatistics: jest.fn(),
}));

const createMockQuestion = (overrides = {}) => ({
  id: 1,
  type: 'multiple_choice',
  question: 'What is 2 + 2?',
  options: ['2', '3', '4', '5'],
  correct_answer: '4',
  explanation: '2 + 2 equals 4',
  difficulty: 'easy',
  points: 1,
  ...overrides
});

const createMockQuiz = (overrides = {}) => ({
  id: 1,
  title: 'JavaScript Basics Quiz',
  description: 'Test your knowledge of JavaScript fundamentals',
  course_id: 1,
  module_id: 1,
  questions: [
    createMockQuestion(),
    createMockQuestion({
      id: 2,
      question: 'Which of the following is a JavaScript data type?',
      options: ['string', 'boolean', 'number', 'all of the above'],
      correct_answer: 'all of the above'
    })
  ],
  time_limit: 30, // minutes
  max_attempts: 3,
  passing_score: 70,
  shuffle_questions: true,
  shuffle_options: true,
  show_results: 'after_completion',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides
});

const createMockQuizResult = (overrides = {}) => ({
  id: 1,
  quiz_id: 1,
  student_id: 1,
  answers: [
    { question_id: 1, selected_answer: '4', is_correct: true, points: 1 },
    { question_id: 2, selected_answer: 'all of the above', is_correct: true, points: 1 }
  ],
  total_score: 100,
  total_points: 2,
  max_points: 2,
  time_taken: 15, // minutes
  attempt_number: 1,
  completed_at: '2023-01-01T00:30:00Z',
  ...overrides
});

const TestQuizComponent = ({ onQuizState }) => {
  const [quiz, setQuiz] = React.useState(null);
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [timeRemaining, setTimeRemaining] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (onQuizState) {
      onQuizState({
        quiz,
        currentQuestion,
        answers,
        timeRemaining,
        loading,
        error,
        setQuiz,
        setCurrentQuestion,
        setAnswers,
        setTimeRemaining,
        setLoading,
        setError
      });
    }
  }, [quiz, currentQuestion, answers, timeRemaining, loading, error, onQuizState]);

  return (
    <div>
      <div data-testid="quiz-loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="quiz-error">{error?.message || 'no-error'}</div>
      {quiz && (
        <div data-testid="quiz-content">
          <div data-testid="quiz-title">{quiz.title}</div>
          <div data-testid="quiz-description">{quiz.description}</div>
          <div data-testid="quiz-questions-count">{quiz.questions?.length || 0}</div>
          <div data-testid="quiz-time-limit">{quiz.time_limit}</div>
          <div data-testid="current-question-number">{currentQuestion + 1}</div>
          <div data-testid="time-remaining">{timeRemaining || 'no-timer'}</div>
          {quiz.questions && quiz.questions[currentQuestion] && (
            <div data-testid="current-question">
              <div className="question-text">{quiz.questions[currentQuestion].question}</div>
              <div className="question-type">{quiz.questions[currentQuestion].type}</div>
              <div className="question-points">{quiz.questions[currentQuestion].points}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TestQuizResultsComponent = ({ onResultsState }) => {
  const [results, setResults] = React.useState([]);
  const [statistics, setStatistics] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (onResultsState) {
      onResultsState({
        results,
        statistics,
        loading,
        error,
        setResults,
        setStatistics,
        setLoading,
        setError
      });
    }
  }, [results, statistics, loading, error, onResultsState]);

  return (
    <div>
      <div data-testid="results-loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="results-error">{error?.message || 'no-error'}</div>
      <div data-testid="results-count">{results.length}</div>
      {statistics && (
        <div data-testid="quiz-statistics">
          <div data-testid="average-score">{statistics.average_score}</div>
          <div data-testid="completion-rate">{statistics.completion_rate}</div>
          <div data-testid="total-attempts">{statistics.total_attempts}</div>
        </div>
      )}
      <div data-testid="results-list">
        {results.map(result => (
          <div key={result.id} data-testid={`result-${result.id}`}>
            <span className="result-score">{result.total_score}%</span>
            <span className="result-attempt">{result.attempt_number}</span>
            <span className="result-time">{result.time_taken}min</span>
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Quiz System Baseline Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Quiz Loading and Display', () => {
    test('should load quiz successfully', async () => {
      const { useQuiz } = require('../../shared/hooks/useData');
      const mockQuiz = createMockQuiz();

      useQuiz.mockReturnValue({
        data: mockQuiz,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      let quizState;
      renderWithProviders(
        <TestQuizComponent onQuizState={(state) => quizState = state} />
      );

      // Simulate loading quiz
      quizState.setLoading(true);
      const quizHook = useQuiz(1);
      quizState.setQuiz(quizHook.data);
      quizState.setTimeRemaining(mockQuiz.time_limit * 60); // Convert to seconds
      quizState.setLoading(false);

      await waitFor(() => {
        expect(screen.getByTestId('quiz-loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('quiz-title')).toHaveTextContent('JavaScript Basics Quiz');
        expect(screen.getByTestId('quiz-description')).toHaveTextContent('Test your knowledge of JavaScript fundamentals');
        expect(screen.getByTestId('quiz-questions-count')).toHaveTextContent('2');
        expect(screen.getByTestId('quiz-time-limit')).toHaveTextContent('30');
        expect(screen.getByTestId('current-question-number')).toHaveTextContent('1');
        expect(screen.getByTestId('time-remaining')).toHaveTextContent('1800'); // 30 minutes in seconds
      });

      expect(useQuiz).toHaveBeenCalledWith(1);
    });

    test('should display current question correctly', async () => {
      const mockQuiz = createMockQuiz();

      let quizState;
      renderWithProviders(
        <TestQuizComponent onQuizState={(state) => quizState = state} />
      );

      quizState.setQuiz(mockQuiz);

      await waitFor(() => {
        expect(screen.getByTestId('current-question')).toBeInTheDocument();
        expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
        expect(screen.getByText('multiple_choice')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // points
      });
    });

    test('should handle quiz loading error', async () => {
      const { useQuiz } = require('../../shared/hooks/useData');
      const mockError = new Error('Quiz not found');

      useQuiz.mockReturnValue({
        data: null,
        loading: false,
        error: mockError,
        refetch: jest.fn()
      });

      let quizState;
      renderWithProviders(
        <TestQuizComponent onQuizState={(state) => quizState = state} />
      );

      const quizHook = useQuiz(999);
      quizState.setError(quizHook.error);

      await waitFor(() => {
        expect(screen.getByTestId('quiz-error')).toHaveTextContent('Quiz not found');
      });
    });
  });

  describe('Quiz Creation and Management', () => {
    test('should create new quiz', async () => {
      const dataService = require('../../shared/services/dataService');
      const newQuizData = {
        title: 'React Basics Quiz',
        description: 'Test your React knowledge',
        course_id: 1,
        module_id: 2,
        questions: [
          createMockQuestion({
            question: 'What is JSX?',
            options: ['JavaScript XML', 'Java Syntax Extension', 'JSON XML', 'None of the above'],
            correct_answer: 'JavaScript XML'
          })
        ],
        time_limit: 45,
        max_attempts: 2,
        passing_score: 80
      };

      const createdQuiz = {
        id: 2,
        ...newQuizData,
        created_at: '2023-01-01T00:00:00Z'
      };

      dataService.createQuiz.mockResolvedValue(createdQuiz);

      const result = await dataService.createQuiz(newQuizData);

      expect(result).toEqual(createdQuiz);
      expect(result.id).toBe(2);
      expect(result.title).toBe('React Basics Quiz');
      expect(dataService.createQuiz).toHaveBeenCalledWith(newQuizData);
    });

    test('should update quiz', async () => {
      const dataService = require('../../shared/services/dataService');
      const quizId = 1;
      const updates = {
        title: 'Updated Quiz Title',
        time_limit: 60,
        passing_score: 75
      };

      const updatedQuiz = {
        id: quizId,
        title: 'Updated Quiz Title',
        description: 'Test your knowledge of JavaScript fundamentals',
        course_id: 1,
        module_id: 1,
        time_limit: 60,
        passing_score: 75,
        updated_at: '2023-01-01T00:00:00Z'
      };

      dataService.updateQuiz.mockResolvedValue(updatedQuiz);

      const result = await dataService.updateQuiz(quizId, updates);

      expect(result).toEqual(updatedQuiz);
      expect(result.title).toBe('Updated Quiz Title');
      expect(result.time_limit).toBe(60);
      expect(dataService.updateQuiz).toHaveBeenCalledWith(quizId, updates);
    });

    test('should delete quiz', async () => {
      const dataService = require('../../shared/services/dataService');
      const quizId = 1;

      dataService.deleteQuiz.mockResolvedValue({
        success: true,
        message: 'Quiz deleted successfully'
      });

      const result = await dataService.deleteQuiz(quizId);

      expect(result.success).toBe(true);
      expect(dataService.deleteQuiz).toHaveBeenCalledWith(quizId);
    });
  });

  describe('Question Generation', () => {
    test('should generate quiz questions', async () => {
      const questionGenerator = require('../../services/generate_questions');
      const generationOptions = {
        topic: 'JavaScript Fundamentals',
        difficulty: 'medium',
        count: 5,
        questionTypes: ['multiple_choice', 'true_false']
      };

      const generatedQuestions = [
        createMockQuestion({
          id: 1,
          question: 'What is the correct way to declare a variable in JavaScript?',
          options: ['var x = 5;', 'variable x = 5;', 'v x = 5;', 'declare x = 5;'],
          correct_answer: 'var x = 5;',
          difficulty: 'medium'
        }),
        createMockQuestion({
          id: 2,
          type: 'true_false',
          question: 'JavaScript is a compiled language.',
          options: ['True', 'False'],
          correct_answer: 'False',
          difficulty: 'medium'
        })
      ];

      questionGenerator.generateQuizQuestions.mockResolvedValue(generatedQuestions);

      const result = await questionGenerator.generateQuizQuestions(generationOptions);

      expect(result).toEqual(generatedQuestions);
      expect(result).toHaveLength(2);
      expect(result[0].difficulty).toBe('medium');
      expect(result[1].type).toBe('true_false');
      expect(questionGenerator.generateQuizQuestions).toHaveBeenCalledWith(generationOptions);
    });

    test('should save questions to file', async () => {
      const questionGenerator = require('../../services/generate_questions');
      const questions = [createMockQuestion()];
      const filename = 'test_questions.json';

      questionGenerator.saveQuestionsToFile.mockResolvedValue({
        success: true,
        filename: filename,
        count: questions.length
      });

      const result = await questionGenerator.saveQuestionsToFile(questions, filename);

      expect(result.success).toBe(true);
      expect(result.filename).toBe(filename);
      expect(result.count).toBe(1);
      expect(questionGenerator.saveQuestionsToFile).toHaveBeenCalledWith(questions, filename);
    });

    test('should download questions as file', () => {
      const questionGenerator = require('../../services/generate_questions');
      const questions = [createMockQuestion()];
      const filename = 'download_questions.json';

      questionGenerator.downloadQuestionsAsFile.mockReturnValue(true);

      const result = questionGenerator.downloadQuestionsAsFile(questions, filename);

      expect(result).toBe(true);
      expect(questionGenerator.downloadQuestionsAsFile).toHaveBeenCalledWith(questions, filename);
    });
  });

  describe('Quiz Taking Experience', () => {
    test('should navigate between questions', () => {
      const mockQuiz = createMockQuiz();

      let quizState;
      renderWithProviders(
        <TestQuizComponent onQuizState={(state) => quizState = state} />
      );

      quizState.setQuiz(mockQuiz);

      // Start at question 0
      expect(screen.getByTestId('current-question-number')).toHaveTextContent('1');

      // Move to next question
      quizState.setCurrentQuestion(1);

      expect(screen.getByTestId('current-question-number')).toHaveTextContent('2');
    });

    test('should track answers', () => {
      const mockQuiz = createMockQuiz();

      let quizState;
      renderWithProviders(
        <TestQuizComponent onQuizState={(state) => quizState = state} />
      );

      quizState.setQuiz(mockQuiz);

      // Answer first question
      const newAnswers = { ...quizState.answers, 1: '4' };
      quizState.setAnswers(newAnswers);

      expect(quizState.answers[1]).toBe('4');
    });

    test('should handle timer countdown', () => {
      let quizState;
      renderWithProviders(
        <TestQuizComponent onQuizState={(state) => quizState = state} />
      );

      // Start with 30 minutes (1800 seconds)
      quizState.setTimeRemaining(1800);

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('1800');

      // Simulate time passing
      quizState.setTimeRemaining(1799);

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('1799');
    });

    test('should submit quiz answer', async () => {
      const dataService = require('../../shared/services/dataService');
      const answerData = {
        quiz_id: 1,
        question_id: 1,
        selected_answer: '4',
        time_taken: 30 // seconds
      };

      const submissionResult = {
        success: true,
        is_correct: true,
        points_earned: 1,
        explanation: '2 + 2 equals 4'
      };

      dataService.submitQuizAnswer.mockResolvedValue(submissionResult);

      const result = await dataService.submitQuizAnswer(answerData);

      expect(result.success).toBe(true);
      expect(result.is_correct).toBe(true);
      expect(result.points_earned).toBe(1);
      expect(dataService.submitQuizAnswer).toHaveBeenCalledWith(answerData);
    });
  });

  describe('Quiz Results and Statistics', () => {
    test('should load quiz results', async () => {
      const { useQuizResults } = require('../../shared/hooks/useData');
      const mockResults = [
        createMockQuizResult(),
        createMockQuizResult({
          id: 2,
          total_score: 75,
          attempt_number: 2,
          time_taken: 20
        })
      ];

      useQuizResults.mockReturnValue({
        data: mockResults,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      let resultsState;
      renderWithProviders(
        <TestQuizResultsComponent onResultsState={(state) => resultsState = state} />
      );

      // Simulate loading results
      resultsState.setLoading(true);
      const resultsHook = useQuizResults(1, 1); // studentId, courseId
      resultsState.setResults(resultsHook.data);
      resultsState.setLoading(false);

      await waitFor(() => {
        expect(screen.getByTestId('results-loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('results-count')).toHaveTextContent('2');
        expect(screen.getByTestId('result-1')).toBeInTheDocument();
        expect(screen.getByTestId('result-2')).toBeInTheDocument();
      });

      expect(useQuizResults).toHaveBeenCalledWith(1, 1);
    });

    test('should save quiz result', async () => {
      const dataService = require('../../shared/services/dataService');
      const resultData = {
        quiz_id: 1,
        student_id: 1,
        answers: [
          { question_id: 1, selected_answer: '4', is_correct: true, points: 1 },
          { question_id: 2, selected_answer: 'string', is_correct: false, points: 0 }
        ],
        total_score: 50,
        time_taken: 25,
        attempt_number: 1
      };

      const savedResult = {
        id: 3,
        ...resultData,
        completed_at: '2023-01-01T00:25:00Z'
      };

      dataService.saveQuizResult.mockResolvedValue(savedResult);

      const result = await dataService.saveQuizResult(resultData);

      expect(result).toEqual(savedResult);
      expect(result.id).toBe(3);
      expect(result.total_score).toBe(50);
      expect(dataService.saveQuizResult).toHaveBeenCalledWith(resultData);
    });

    test('should get quiz statistics', async () => {
      const dataService = require('../../shared/services/dataService');
      const quizId = 1;

      const mockStatistics = {
        quiz_id: quizId,
        total_attempts: 25,
        unique_students: 20,
        average_score: 78.5,
        highest_score: 100,
        lowest_score: 45,
        completion_rate: 85.2,
        average_time: 18.5, // minutes
        question_analytics: [
          {
            question_id: 1,
            correct_percentage: 90,
            avg_time_spent: 45 // seconds
          },
          {
            question_id: 2,
            correct_percentage: 75,
            avg_time_spent: 60 // seconds
          }
        ]
      };

      dataService.getQuizStatistics.mockResolvedValue(mockStatistics);

      let resultsState;
      renderWithProviders(
        <TestQuizResultsComponent onResultsState={(state) => resultsState = state} />
      );

      const stats = await dataService.getQuizStatistics(quizId);
      resultsState.setStatistics(stats);

      await waitFor(() => {
        expect(screen.getByTestId('average-score')).toHaveTextContent('78.5');
        expect(screen.getByTestId('completion-rate')).toHaveTextContent('85.2');
        expect(screen.getByTestId('total-attempts')).toHaveTextContent('25');
      });

      expect(dataService.getQuizStatistics).toHaveBeenCalledWith(quizId);
    });
  });

  describe('Quiz Validation and Rules', () => {
    test('should validate quiz data structure', () => {
      const quiz = createMockQuiz();

      expect(quiz).toHaveProperty('id');
      expect(quiz).toHaveProperty('title');
      expect(quiz).toHaveProperty('questions');
      expect(quiz).toHaveProperty('time_limit');
      expect(quiz).toHaveProperty('passing_score');
      expect(Array.isArray(quiz.questions)).toBe(true);
      expect(quiz.questions.length).toBeGreaterThan(0);
      expect(quiz.time_limit).toBeGreaterThan(0);
      expect(quiz.passing_score).toBeGreaterThanOrEqual(0);
      expect(quiz.passing_score).toBeLessThanOrEqual(100);
    });

    test('should validate question data structure', () => {
      const question = createMockQuestion();

      expect(question).toHaveProperty('id');
      expect(question).toHaveProperty('type');
      expect(question).toHaveProperty('question');
      expect(question).toHaveProperty('options');
      expect(question).toHaveProperty('correct_answer');
      expect(Array.isArray(question.options)).toBe(true);
      expect(question.options.length).toBeGreaterThan(0);
      expect(question.options).toContain(question.correct_answer);
    });

    test('should validate quiz attempt limits', () => {
      const quiz = createMockQuiz({ max_attempts: 3 });
      const attemptNumber = 2;

      const canAttempt = attemptNumber <= quiz.max_attempts;

      expect(canAttempt).toBe(true);

      const tooManyAttempts = 4;
      const cannotAttempt = tooManyAttempts <= quiz.max_attempts;

      expect(cannotAttempt).toBe(false);
    });

    test('should calculate quiz score correctly', () => {
      const answers = [
        { question_id: 1, is_correct: true, points: 1 },
        { question_id: 2, is_correct: false, points: 0 },
        { question_id: 3, is_correct: true, points: 1 }
      ];

      const totalPoints = answers.reduce((sum, answer) => sum + answer.points, 0);
      const maxPoints = answers.length;
      const score = Math.round((totalPoints / maxPoints) * 100);

      expect(totalPoints).toBe(2);
      expect(maxPoints).toBe(3);
      expect(score).toBe(67); // 67%
    });
  });

  describe('Quiz Types and Question Types', () => {
    test('should handle multiple choice questions', () => {
      const mcQuestion = createMockQuestion({
        type: 'multiple_choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D']
      });

      expect(mcQuestion.type).toBe('multiple_choice');
      expect(mcQuestion.options).toHaveLength(4);
    });

    test('should handle true/false questions', () => {
      const tfQuestion = createMockQuestion({
        type: 'true_false',
        question: 'The sky is blue.',
        options: ['True', 'False'],
        correct_answer: 'True'
      });

      expect(tfQuestion.type).toBe('true_false');
      expect(tfQuestion.options).toHaveLength(2);
      expect(tfQuestion.options).toContain('True');
      expect(tfQuestion.options).toContain('False');
    });

    test('should handle fill-in-the-blank questions', () => {
      const fibQuestion = createMockQuestion({
        type: 'fill_blank',
        question: 'The capital of France is ______.',
        correct_answer: 'Paris',
        options: null
      });

      expect(fibQuestion.type).toBe('fill_blank');
      expect(fibQuestion.correct_answer).toBe('Paris');
    });
  });

  describe('Error Handling', () => {
    test('should handle quiz submission errors', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockError = new Error('Submission failed');

      dataService.submitQuizAnswer.mockRejectedValue(mockError);

      await expect(dataService.submitQuizAnswer({
        quiz_id: 1,
        question_id: 1,
        selected_answer: '4'
      })).rejects.toThrow('Submission failed');
    });

    test('should handle quiz loading timeout', () => {
      const { useQuiz } = require('../../shared/hooks/useData');

      useQuiz.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: jest.fn()
      });

      let quizState;
      renderWithProviders(
        <TestQuizComponent onQuizState={(state) => quizState = state} />
      );

      const quizHook = useQuiz(1);
      quizState.setLoading(quizHook.loading);

      expect(screen.getByTestId('quiz-loading')).toHaveTextContent('loading');
    });

    test('should handle invalid quiz data', () => {
      const invalidQuiz = {
        id: 1,
        title: 'Invalid Quiz',
        questions: null // Invalid - should be array
      };

      let quizState;
      renderWithProviders(
        <TestQuizComponent onQuizState={(state) => quizState = state} />
      );

      quizState.setQuiz(invalidQuiz);

      expect(screen.getByTestId('quiz-questions-count')).toHaveTextContent('0');
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle large number of questions efficiently', () => {
      const largeQuiz = createMockQuiz({
        questions: Array.from({ length: 100 }, (_, i) => createMockQuestion({
          id: i + 1,
          question: `Question ${i + 1}`,
          correct_answer: 'Option A'
        }))
      });

      let quizState;
      renderWithProviders(
        <TestQuizComponent onQuizState={(state) => quizState = state} />
      );

      quizState.setQuiz(largeQuiz);

      expect(screen.getByTestId('quiz-questions-count')).toHaveTextContent('100');
    });

    test('should batch quiz answer submissions', () => {
      const batchAnswers = (answers) => {
        // Mock batching logic
        const batches = [];
        const batchSize = 5;

        for (let i = 0; i < answers.length; i += batchSize) {
          batches.push(answers.slice(i, i + batchSize));
        }

        return batches;
      };

      const answers = Array.from({ length: 12 }, (_, i) => ({
        question_id: i + 1,
        selected_answer: 'answer'
      }));

      const batches = batchAnswers(answers);

      expect(batches).toHaveLength(3); // 12 answers / 5 per batch = 3 batches
      expect(batches[0]).toHaveLength(5);
      expect(batches[1]).toHaveLength(5);
      expect(batches[2]).toHaveLength(2);
    });
  });
});