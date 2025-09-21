/**
 * Course Feature Routes
 * Routes related to course management, learning, and content
 */

import { createLazyComponent, PageLoadingFallback } from '../../utils/lazyLoader';

// Create lazy-loaded course components
const createCourseComponent = (importFunction, pageName) => {
  return createLazyComponent(importFunction, {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackComponent: () => <PageLoadingFallback title={`Loading ${pageName}...`} />,
    preload: false
  });
};

export const CourseComponents = {
  CoursePage: createCourseComponent(
    () => import('../../../components/courses/CoursePage'),
    'Courses'
  ),
  CourseDetailPage: createCourseComponent(
    () => import('../../../components/courses/CourseDetailPage'),
    'Course Details'
  ),
  CourseWorkspace: createCourseComponent(
    () => import('../../../components/courses/CourseWorkspace'),
    'Course Workspace'
  ),
  StudentCourseDetailPage: createCourseComponent(
    () => import('../../../components/courses/StudentCourseDetailPage'),
    'Student Course Details'
  ),
  CourseAnalyticsPage: createCourseComponent(
    () => import('../../../components/courses/CourseAnalyticsPage'),
    'Course Analytics'
  ),
  CourseSettingsPage: createCourseComponent(
    () => import('../../../components/courses/CourseSettingsPage'),
    'Course Settings'
  )
};

export const courseRoutes = [
  {
    path: '/courses',
    element: CourseComponents.CoursePage,
    title: 'Courses',
    description: 'Explore our comprehensive course catalog',
    isPublic: true,
    preload: true,
    meta: {
      keywords: 'courses, online learning, education, classes',
      robots: 'index,follow'
    }
  },
  {
    path: '/courses/:courseId',
    element: CourseComponents.CourseWorkspace,
    title: 'Course Workspace',
    description: 'Interactive course learning environment',
    isPublic: false,
    requiresAuth: true,
    roles: ['student', 'tutor', 'admin']
  },
  {
    path: '/courses/:courseId/details',
    element: CourseComponents.CourseDetailPage,
    title: 'Course Details',
    description: 'Detailed course information and curriculum',
    isPublic: true
  },
  {
    path: '/courses/:courseId/student-view',
    element: CourseComponents.StudentCourseDetailPage,
    title: 'Student Course View',
    description: 'Student-specific course information and progress',
    isPublic: false,
    requiresAuth: true,
    roles: ['student', 'guardian']
  },
  {
    path: '/courses/:courseId/analytics',
    element: CourseComponents.CourseAnalyticsPage,
    title: 'Course Analytics',
    description: 'Course performance and analytics dashboard',
    isPublic: false,
    requiresAuth: true,
    roles: ['tutor', 'admin']
  },
  {
    path: '/courses/:courseId/settings',
    element: CourseComponents.CourseSettingsPage,
    title: 'Course Settings',
    description: 'Manage course configuration and settings',
    isPublic: false,
    requiresAuth: true,
    roles: ['tutor', 'admin']
  },
  // Legacy route redirects
  {
    path: '/course-detail',
    element: CourseComponents.CourseWorkspace,
    title: 'Course Details',
    description: 'Detailed course information',
    isPublic: true,
    isLegacy: true
  },
  {
    path: '/student-course-detail/:courseId',
    element: CourseComponents.StudentCourseDetailPage,
    title: 'Student Course Details',
    description: 'Student-specific course information',
    isPublic: false,
    requiresAuth: true,
    roles: ['student'],
    isLegacy: true
  }
];

export default courseRoutes;