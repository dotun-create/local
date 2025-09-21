/**
 * Miscellaneous Feature Routes
 * Routes for development, testing, and utility pages
 */

import { createLazyComponent, PageLoadingFallback } from '../../utils/lazyLoader';

// Create lazy-loaded misc components
const createMiscComponent = (importFunction, pageName) => {
  return createLazyComponent(importFunction, {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackComponent: () => <PageLoadingFallback title={`Loading ${pageName}...`} />,
    preload: false
  });
};

export const MiscComponents = {
  RoleDemo: createMiscComponent(
    () => import('../../../components/common/RoleDemo'),
    'Role Demo'
  ),
  ComponentLibrary: createMiscComponent(
    () => import('../../../components/dev/ComponentLibrary'),
    'Component Library'
  ),
  StyleGuide: createMiscComponent(
    () => import('../../../components/dev/StyleGuide'),
    'Style Guide'
  ),
  APITestPage: createMiscComponent(
    () => import('../../../components/dev/APITestPage'),
    'API Test'
  ),
  ThemeTestPage: createMiscComponent(
    () => import('../../../components/dev/ThemeTestPage'),
    'Theme Test'
  ),
  PerformanceTestPage: createMiscComponent(
    () => import('../../../components/dev/PerformanceTestPage'),
    'Performance Test'
  ),
  AccessibilityTestPage: createMiscComponent(
    () => import('../../../components/dev/AccessibilityTestPage'),
    'Accessibility Test'
  ),
  ErrorTestPage: createMiscComponent(
    () => import('../../../components/dev/ErrorTestPage'),
    'Error Test'
  ),
  NetworkTestPage: createMiscComponent(
    () => import('../../../components/dev/NetworkTestPage'),
    'Network Test'
  ),
  MaintenancePage: createMiscComponent(
    () => import('../../../components/misc/MaintenancePage'),
    'Maintenance'
  ),
  ComingSoonPage: createMiscComponent(
    () => import('../../../components/misc/ComingSoonPage'),
    'Coming Soon'
  )
};

export const miscRoutes = [
  // Development and Testing Routes
  {
    path: '/role-demo',
    element: MiscComponents.RoleDemo,
    title: 'Role Demo',
    description: 'Demonstration of role-based features and access control',
    isPublic: true,
    isDevelopment: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/dev/components',
    element: MiscComponents.ComponentLibrary,
    title: 'Component Library',
    description: 'Browse all available UI components',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin', 'developer'],
    isDevelopment: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/dev/style-guide',
    element: MiscComponents.StyleGuide,
    title: 'Style Guide',
    description: 'Design system style guide and documentation',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin', 'developer'],
    isDevelopment: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/dev/api-test',
    element: MiscComponents.APITestPage,
    title: 'API Test',
    description: 'Test API endpoints and responses',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin', 'developer'],
    isDevelopment: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/dev/theme-test',
    element: MiscComponents.ThemeTestPage,
    title: 'Theme Test',
    description: 'Test theme switching and styling',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin', 'developer'],
    isDevelopment: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/dev/performance-test',
    element: MiscComponents.PerformanceTestPage,
    title: 'Performance Test',
    description: 'Test application performance and optimization',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin', 'developer'],
    isDevelopment: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/dev/accessibility-test',
    element: MiscComponents.AccessibilityTestPage,
    title: 'Accessibility Test',
    description: 'Test accessibility features and compliance',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin', 'developer'],
    isDevelopment: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/dev/error-test',
    element: MiscComponents.ErrorTestPage,
    title: 'Error Test',
    description: 'Test error handling and boundary components',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin', 'developer'],
    isDevelopment: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/dev/network-test',
    element: MiscComponents.NetworkTestPage,
    title: 'Network Test',
    description: 'Test network connectivity and offline behavior',
    isPublic: false,
    requiresAuth: true,
    roles: ['admin', 'developer'],
    isDevelopment: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },

  // Utility Pages
  {
    path: '/maintenance',
    element: MiscComponents.MaintenancePage,
    title: 'Maintenance',
    description: 'Site is currently under maintenance',
    isPublic: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  },
  {
    path: '/coming-soon',
    element: MiscComponents.ComingSoonPage,
    title: 'Coming Soon',
    description: 'This feature is coming soon',
    isPublic: true,
    meta: {
      robots: 'noindex,nofollow'
    }
  }
];

export default miscRoutes;