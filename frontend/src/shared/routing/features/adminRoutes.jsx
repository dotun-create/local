/**
 * Admin Feature Routes
 * Routes for administrative functions and management
 */

import { createLazyComponent, PageLoadingFallback } from '../../utils/lazyLoader';

// Create lazy-loaded admin components
const createAdminComponent = (importFunction, pageName) => {
  return createLazyComponent(importFunction, {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackComponent: () => <PageLoadingFallback title={`Loading ${pageName}...`} />,
    preload: false
  });
};

export const AdminComponents = {
  AdminPage: createAdminComponent(
    () => import('../../../components/pages/AdminPage'),
    'Admin Portal'
  ),
  AdminCreation: createAdminComponent(
    () => import('../../../components/pages/AdminCreation'),
    'Admin Creation'
  ),
  UserManagementPage: createAdminComponent(
    () => import('../../../components/admin/UserManagementPage'),
    'User Management'
  ),
  CourseManagementPage: createAdminComponent(
    () => import('../../../components/admin/CourseManagementPage'),
    'Course Management'
  ),
  SystemAnalyticsPage: createAdminComponent(
    () => import('../../../components/admin/SystemAnalyticsPage'),
    'System Analytics'
  ),
  ContentModerationPage: createAdminComponent(
    () => import('../../../components/admin/ContentModerationPage'),
    'Content Moderation'
  ),
  SystemSettingsPage: createAdminComponent(
    () => import('../../../components/admin/SystemSettingsPage'),
    'System Settings'
  ),
  AuditLogsPage: createAdminComponent(
    () => import('../../../components/admin/AuditLogsPage'),
    'Audit Logs'
  ),
  ReportsPage: createAdminComponent(
    () => import('../../../components/admin/ReportsPage'),
    'Reports'
  ),
  BackupManagementPage: createAdminComponent(
    () => import('../../../components/admin/BackupManagementPage'),
    'Backup Management'
  )
};

export const adminRoutes = [
  {
    path: '/admin',
    element: AdminComponents.AdminPage,
    title: 'Admin Portal',
    description: 'Administrative dashboard and controls',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin/create',
    element: AdminComponents.AdminCreation,
    title: 'Create Admin',
    description: 'Create new admin accounts',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin/users',
    element: AdminComponents.UserManagementPage,
    title: 'User Management',
    description: 'Manage user accounts and permissions',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin/courses',
    element: AdminComponents.CourseManagementPage,
    title: 'Course Management',
    description: 'Manage courses and curriculum',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin/analytics',
    element: AdminComponents.SystemAnalyticsPage,
    title: 'System Analytics',
    description: 'Platform usage and performance analytics',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin/moderation',
    element: AdminComponents.ContentModerationPage,
    title: 'Content Moderation',
    description: 'Review and moderate platform content',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin/settings',
    element: AdminComponents.SystemSettingsPage,
    title: 'System Settings',
    description: 'Configure system-wide settings',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin/audit-logs',
    element: AdminComponents.AuditLogsPage,
    title: 'Audit Logs',
    description: 'View system audit logs and security events',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin/reports',
    element: AdminComponents.ReportsPage,
    title: 'Reports',
    description: 'Generate and view system reports',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/admin/backup',
    element: AdminComponents.BackupManagementPage,
    title: 'Backup Management',
    description: 'Manage system backups and data recovery',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  // Legacy route
  {
    path: '/admincreation',
    element: AdminComponents.AdminCreation,
    title: 'Admin Creation',
    description: 'Create new admin accounts',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin'],
    isLegacy: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  }
];

export default adminRoutes;