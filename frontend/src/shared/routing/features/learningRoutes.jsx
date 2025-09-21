/**
 * Learning Feature Routes
 * Routes for learning content, quizzes, modules, and assessments
 */

import { createLazyComponent, PageLoadingFallback } from '../../utils/lazyLoader';

// Create lazy-loaded learning components
const createLearningComponent = (importFunction, pageName) => {
  return createLazyComponent(importFunction, {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackComponent: () => <PageLoadingFallback title={`Loading ${pageName}...`} />,
    preload: false
  });
};

export const LearningComponents = {
  ModulePage: createLearningComponent(
    () => import('../../../components/module/ModulePage'),
    'Module'
  ),
  ModuleDetailPage: createLearningComponent(
    () => import('../../../components/module/ModuleDetailPage'),
    'Module Details'
  ),
  LessonPage: createLearningComponent(
    () => import('../../../components/lesson/LessonPage'),
    'Lesson'
  ),
  QuizPage: createLearningComponent(
    () => import('../../../components/quiz/QuizPage'),
    'Quiz'
  ),
  Quiz: createLearningComponent(
    () => import('../../../components/quiz/Quiz'),
    'Quiz'
  ),
  AssessmentPage: createLearningComponent(
    () => import('../../../components/assessment/AssessmentPage'),
    'Assessment'
  ),
  AssignmentPage: createLearningComponent(
    () => import('../../../components/assignment/AssignmentPage'),
    'Assignment'
  ),
  ProgressPage: createLearningComponent(
    () => import('../../../components/progress/ProgressPage'),
    'Progress'
  ),
  CertificatePage: createLearningComponent(
    () => import('../../../components/certificate/CertificatePage'),
    'Certificate'
  )
};

export const learningRoutes = [
  {
    path: '/modules',
    element: LearningComponents.ModulePage,
    title: 'Learning Modules',
    description: 'Browse and access learning modules',
    isPublic: false,
    requiresAuth: true,
    roles: ['student', 'tutor', 'admin']
  },
  {
    path: '/modules/:moduleId',
    element: LearningComponents.ModuleDetailPage,
    title: 'Module Details',
    description: 'Detailed module content and lessons',
    isPublic: false,
    requiresAuth: true,
    roles: ['student', 'tutor', 'admin']
  },
  {
    path: '/modules/:moduleId/lessons/:lessonId',
    element: LearningComponents.LessonPage,
    title: 'Lesson',
    description: 'Interactive lesson content',
    isPublic: false,
    requiresAuth: true,
    roles: ['student', 'tutor', 'admin']
  },
  {
    path: '/courses/:courseId/modules/:moduleId/quizzes/:quizId',
    element: LearningComponents.QuizPage,
    title: 'Course Quiz',
    description: 'Take course quiz and test your knowledge',
    isPublic: false,
    requiresAuth: true,
    roles: ['student']
  },
  {
    path: '/quiz/:quizId?',
    element: LearningComponents.Quiz,
    title: 'Quiz',
    description: 'Take a quiz',
    isPublic: false,
    requiresAuth: true,
    roles: ['student']
  },
  {
    path: '/quiz',
    element: LearningComponents.QuizPage,
    title: 'Quiz Overview',
    description: 'Quiz information and results',
    isPublic: false,
    requiresAuth: true,
    roles: ['student', 'tutor']
  },
  {
    path: '/assessments',
    element: LearningComponents.AssessmentPage,
    title: 'Assessments',
    description: 'View and take assessments',
    isPublic: false,
    requiresAuth: true,
    roles: ['student']
  },
  {
    path: '/assessments/:assessmentId',
    element: LearningComponents.AssessmentPage,
    title: 'Assessment',
    description: 'Take assessment',
    isPublic: false,
    requiresAuth: true,
    roles: ['student']
  },
  {
    path: '/assignments',
    element: LearningComponents.AssignmentPage,
    title: 'Assignments',
    description: 'View and submit assignments',
    isPublic: false,
    requiresAuth: true,
    roles: ['student']
  },
  {
    path: '/assignments/:assignmentId',
    element: LearningComponents.AssignmentPage,
    title: 'Assignment',
    description: 'Complete assignment',
    isPublic: false,
    requiresAuth: true,
    roles: ['student']
  },
  {
    path: '/progress',
    element: LearningComponents.ProgressPage,
    title: 'Learning Progress',
    description: 'Track your learning progress and achievements',
    isPublic: false,
    requiresAuth: true,
    roles: ['student', 'guardian']
  },
  {
    path: '/certificates',
    element: LearningComponents.CertificatePage,
    title: 'Certificates',
    description: 'View and download your certificates',
    isPublic: false,
    requiresAuth: true,
    roles: ['student']
  },
  {
    path: '/certificates/:certificateId',
    element: LearningComponents.CertificatePage,
    title: 'Certificate',
    description: 'View certificate details',
    isPublic: false,
    requiresAuth: true,
    roles: ['student']
  }
];

export default learningRoutes;