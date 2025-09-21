/**
 * Dashboard Feature Routes
 * Routes for user dashboards and role-specific interfaces
 */

import { createLazyComponent, PageLoadingFallback } from '../../utils/lazyLoader';

// Create lazy-loaded dashboard components
const createDashboardComponent = (importFunction, pageName) => {
  return createLazyComponent(importFunction, {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackComponent: () => <PageLoadingFallback title={`Loading ${pageName}...`} />,
    preload: false
  });
};

export const DashboardComponents = {
  StudentDashboard: createDashboardComponent(
    () => import('../../../components/dashboard/StudentDashboard'),
    'Student Dashboard'
  ),
  GuardianDashboard: createDashboardComponent(
    () => import('../../../components/guardian/GuardianDashboard'),
    'Guardian Dashboard'
  ),
  TutorDashboard: createDashboardComponent(
    () => import('../../../components/tutor/TutorDashboard'),
    'Tutor Dashboard'
  ),
  AdminDashboard: createDashboardComponent(
    () => import('../../../components/admin/AdminDashboard'),
    'Admin Dashboard'
  ),
  ProfilePage: createDashboardComponent(
    () => import('../../../components/profile/ProfilePage'),
    'Profile'
  ),
  SettingsPage: createDashboardComponent(
    () => import('../../../components/settings/SettingsPage'),
    'Settings'
  ),
  NotificationsPage: createDashboardComponent(
    () => import('../../../components/notifications/NotificationsPage'),
    'Notifications'
  )
};

export const dashboardRoutes = [
  {
    path: '/dashboard',
    element: DashboardComponents.StudentDashboard,
    title: 'Student Dashboard',
    description: 'Your learning dashboard and progress overview',
    isPublic: false,
    requiresAuth: true,
    roles: ['student'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/guardian',
    element: DashboardComponents.GuardianDashboard,
    title: 'Guardian Dashboard',
    description: 'Guardian oversight and student progress monitoring',
    isPublic: false,
    requiresAuth: true,
    roles: ['guardian'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/tutor',
    element: DashboardComponents.TutorDashboard,
    title: 'Tutor Dashboard',
    description: 'Tutor management portal and teaching tools',
    isPublic: false,
    requiresAuth: true,
    roles: ['tutor'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin',
    element: DashboardComponents.AdminDashboard,
    title: 'Admin Dashboard',
    description: 'Administrative controls and system management',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/profile',
    element: DashboardComponents.ProfilePage,
    title: 'Profile',
    description: 'Manage your profile information and preferences',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/settings',
    element: DashboardComponents.SettingsPage,
    title: 'Settings',
    description: 'Account settings and preferences',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/notifications',
    element: DashboardComponents.NotificationsPage,
    title: 'Notifications',
    description: 'Manage your notifications and alerts',
    isPublic: false,
    requiresAuth: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  }
];

export default dashboardRoutes;