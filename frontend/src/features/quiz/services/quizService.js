import { apiClient } from '@shared/services/apiClient';

class QuizService {
  // Quiz management
  async getQuizzes(params = {}) {
    const response = await apiClient.get('/quizzes', { params });
    return response.data;
  }

  async getQuiz(quizId) {
    const response = await apiClient.get(`/quizzes/${quizId}`);
    return response.data;
  }

  async createQuiz(quizData) {
    const response = await apiClient.post('/quizzes', quizData);
    return response.data;
  }

  async updateQuiz(quizId, updates) {
    const response = await apiClient.patch(`/quizzes/${quizId}`, updates);
    return response.data;
  }

  async deleteQuiz(quizId) {
    const response = await apiClient.delete(`/quizzes/${quizId}`);
    return response.data;
  }

  async duplicateQuiz(quizId) {
    const response = await apiClient.post(`/quizzes/${quizId}/duplicate`);
    return response.data;
  }

  // Quiz attempts and submissions
  async startQuizAttempt(quizId) {
    const response = await apiClient.post(`/quizzes/${quizId}/start`);
    return response.data;
  }

  async saveQuizProgress(attemptId, progressData) {
    const response = await apiClient.patch(`/quiz-attempts/${attemptId}/progress`, progressData);
    return response.data;
  }

  async submitQuizAttempt(attemptId, submissionData) {
    const response = await apiClient.post(`/quiz-attempts/${attemptId}/submit`, submissionData);
    return response.data;
  }

  async getQuizAttempt(attemptId) {
    const response = await apiClient.get(`/quiz-attempts/${attemptId}`);
    return response.data;
  }

  async getQuizAttempts(quizId, userId = null) {
    const params = userId ? { userId } : {};
    const response = await apiClient.get(`/quizzes/${quizId}/attempts`, { params });
    return response.data;
  }

  // Quiz results and grading
  async getQuizResults(attemptId) {
    const response = await apiClient.get(`/quiz-attempts/${attemptId}/results`);
    return response.data;
  }

  async gradeQuizAttempt(attemptId, gradingData) {
    const response = await apiClient.post(`/quiz-attempts/${attemptId}/grade`, gradingData);
    return response.data;
  }

  async updateQuestionGrade(attemptId, questionId, gradeData) {
    const response = await apiClient.patch(
      `/quiz-attempts/${attemptId}/questions/${questionId}/grade`,
      gradeData
    );
    return response.data;
  }

  // Question management
  async getQuestions(quizId) {
    const response = await apiClient.get(`/quizzes/${quizId}/questions`);
    return response.data;
  }

  async createQuestion(quizId, questionData) {
    const response = await apiClient.post(`/quizzes/${quizId}/questions`, questionData);
    return response.data;
  }

  async updateQuestion(questionId, updates) {
    const response = await apiClient.patch(`/questions/${questionId}`, updates);
    return response.data;
  }

  async deleteQuestion(questionId) {
    const response = await apiClient.delete(`/questions/${questionId}`);
    return response.data;
  }

  async reorderQuestions(quizId, questionOrder) {
    const response = await apiClient.patch(`/quizzes/${quizId}/questions/reorder`, {
      questionOrder
    });
    return response.data;
  }

  // Question banks and templates
  async getQuestionBank(params = {}) {
    const response = await apiClient.get('/question-bank', { params });
    return response.data;
  }

  async addToQuestionBank(questionData) {
    const response = await apiClient.post('/question-bank', questionData);
    return response.data;
  }

  async importQuestionsFromBank(quizId, questionIds) {
    const response = await apiClient.post(`/quizzes/${quizId}/import-questions`, {
      questionIds
    });
    return response.data;
  }

  async getQuizTemplates() {
    const response = await apiClient.get('/quiz-templates');
    return response.data;
  }

  async createQuizFromTemplate(templateId, quizData) {
    const response = await apiClient.post(`/quiz-templates/${templateId}/create-quiz`, quizData);
    return response.data;
  }

  // Analytics and reporting
  async getQuizAnalytics(quizId) {
    const response = await apiClient.get(`/quizzes/${quizId}/analytics`);
    return response.data;
  }

  async getQuestionAnalytics(questionId) {
    const response = await apiClient.get(`/questions/${questionId}/analytics`);
    return response.data;
  }

  async exportQuizResults(quizId, format = 'csv') {
    const response = await apiClient.get(`/quizzes/${quizId}/export`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  // Quiz settings and configuration
  async updateQuizSettings(quizId, settings) {
    const response = await apiClient.patch(`/quizzes/${quizId}/settings`, settings);
    return response.data;
  }

  async getQuizSettings(quizId) {
    const response = await apiClient.get(`/quizzes/${quizId}/settings`);
    return response.data;
  }

  // Proctoring and security
  async enableProctoring(quizId, proctoringSettings) {
    const response = await apiClient.post(`/quizzes/${quizId}/proctoring`, proctoringSettings);
    return response.data;
  }

  async recordProctoringEvent(attemptId, eventData) {
    const response = await apiClient.post(`/quiz-attempts/${attemptId}/proctoring-events`, eventData);
    return response.data;
  }

  async getProctoringEvents(attemptId) {
    const response = await apiClient.get(`/quiz-attempts/${attemptId}/proctoring-events`);
    return response.data;
  }

  // Utility methods
  calculateQuizScore(questions, answers) {
    let totalScore = 0;
    let maxScore = 0;
    let correctAnswers = 0;

    const questionResults = questions.map(question => {
      maxScore += question.points || 1;
      const userAnswer = answers[question.id];

      let isCorrect = false;
      let score = 0;

      if (question.type === 'multiple-choice' || question.type === 'single-choice') {
        isCorrect = userAnswer === question.correctAnswer;
        if (isCorrect) {
          score = question.points || 1;
          correctAnswers++;
        }
      } else if (question.type === 'multiple-select') {
        const correctAnswers = question.correctAnswers || [];
        const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];

        const correctSet = new Set(correctAnswers);
        const userSet = new Set(userAnswers);

        if (correctSet.size === userSet.size &&
            [...correctSet].every(answer => userSet.has(answer))) {
          isCorrect = true;
          score = question.points || 1;
          correctAnswers++;
        }
      } else if (question.type === 'true-false') {
        isCorrect = userAnswer === question.correctAnswer;
        if (isCorrect) {
          score = question.points || 1;
          correctAnswers++;
        }
      }
      // Essay and short-answer questions need manual grading

      totalScore += score;

      return {
        questionId: question.id,
        question: question.text,
        type: question.type,
        userAnswer,
        correctAnswer: question.correctAnswer || question.correctAnswers,
        isCorrect,
        points: question.points || 1,
        score,
        explanation: question.explanation
      };
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return {
      totalScore,
      maxScore,
      percentage,
      correctAnswers,
      totalQuestions: questions.length,
      questionResults
    };
  }

  validateQuizData(quizData) {
    const errors = [];

    if (!quizData.title?.trim()) {
      errors.push('Quiz title is required');
    }

    if (!quizData.questions || quizData.questions.length === 0) {
      errors.push('Quiz must have at least one question');
    }

    if (quizData.timeLimit && (isNaN(quizData.timeLimit) || quizData.timeLimit <= 0)) {
      errors.push('Time limit must be a positive number');
    }

    if (quizData.passingScore && (isNaN(quizData.passingScore) ||
        quizData.passingScore < 0 || quizData.passingScore > 100)) {
      errors.push('Passing score must be between 0 and 100');
    }

    quizData.questions?.forEach((question, index) => {
      if (!question.text?.trim()) {
        errors.push(`Question ${index + 1}: Question text is required`);
      }

      if (!question.type) {
        errors.push(`Question ${index + 1}: Question type is required`);
      }

      if ((question.type === 'multiple-choice' || question.type === 'single-choice') &&
          (!question.options || question.options.length < 2)) {
        errors.push(`Question ${index + 1}: Multiple choice questions need at least 2 options`);
      }

      if (question.type === 'multiple-choice' && !question.correctAnswer) {
        errors.push(`Question ${index + 1}: Correct answer is required`);
      }

      if (question.type === 'multiple-select' &&
          (!question.correctAnswers || question.correctAnswers.length === 0)) {
        errors.push(`Question ${index + 1}: At least one correct answer is required`);
      }
    });

    return errors;
  }

  formatQuizTime(seconds) {
    if (!seconds || seconds <= 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getQuestionTypeIcon(type) {
    const icons = {
      'multiple-choice': '◉',
      'multiple-select': '☑',
      'true-false': '✓/✗',
      'short-answer': '✏',
      'essay': '📝',
      'fill-blank': '___',
      'matching': '↔',
      'ordering': '↕'
    };
    return icons[type] || '❓';
  }

  getDifficultyColor(difficulty) {
    const colors = {
      easy: 'var(--color-success)',
      medium: 'var(--color-warning)',
      hard: 'var(--color-danger)'
    };
    return colors[difficulty?.toLowerCase()] || 'var(--color-text-secondary)';
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  generateQuizCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }
}

export const quizService = new QuizService();
export default quizService;