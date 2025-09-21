/**
 * Feature Routes Index
 * Centralized export of all feature-based routes
 */

import authRoutes from './authRoutes';
import courseRoutes from './courseRoutes';
import dashboardRoutes from './dashboardRoutes';
import learningRoutes from './learningRoutes';
import publicRoutes from './publicRoutes';
import adminRoutes from './adminRoutes';
import paymentRoutes from './paymentRoutes';
import miscRoutes from './miscRoutes';

// Combine all feature routes
export const featureRoutes = [
  ...publicRoutes,
  ...authRoutes,
  ...courseRoutes,
  ...learningRoutes,
  ...dashboardRoutes,
  ...paymentRoutes,
  ...adminRoutes,
  ...miscRoutes
];

// Route collections by feature
export const routesByFeature = {
  public: publicRoutes,
  auth: authRoutes,
  courses: courseRoutes,
  learning: learningRoutes,
  dashboards: dashboardRoutes,
  payments: paymentRoutes,
  admin: adminRoutes,
  misc: miscRoutes
};

// Route collections by access level
export const routesByAccess = {
  public: featureRoutes.filter(route => route.isPublic),
  protected: featureRoutes.filter(route => route.requiresAuth),
  admin: featureRoutes.filter(route => route.roles?.includes('admin')),
  tutor: featureRoutes.filter(route => route.roles?.includes('tutor')),
  student: featureRoutes.filter(route => route.roles?.includes('student')),
  guardian: featureRoutes.filter(route => route.roles?.includes('guardian'))
};

// Route collections by status
export const routesByStatus = {
  active: featureRoutes.filter(route => !route.isLegacy && !route.isDevelopment),
  legacy: featureRoutes.filter(route => route.isLegacy),
  development: featureRoutes.filter(route => route.isDevelopment),
  preloadable: featureRoutes.filter(route => route.preload)
};

// Utility functions
export const getRouteByPath = (path) => {
  return featureRoutes.find(route => {
    if (route.path.includes(':')) {
      // Handle dynamic routes
      const pathPattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pathPattern}$`);
      return regex.test(path);
    }
    return route.path === path;
  });
};

export const getRoutesByRole = (role) => {
  return featureRoutes.filter(route =>
    !route.roles || route.roles.includes(role)
  );
};

export const getPublicRoutes = () => routesByAccess.public;
export const getProtectedRoutes = () => routesByAccess.protected;
export const getPreloadableRoutes = () => routesByStatus.preloadable;
export const getDevelopmentRoutes = () => routesByStatus.development;
export const getLegacyRoutes = () => routesByStatus.legacy;

// Route groups for progressive loading
export const routeGroups = {
  critical: routesByStatus.preloadable,
  auth: routesByFeature.auth,
  dashboard: routesByFeature.dashboards,
  courses: routesByFeature.courses,
  learning: routesByFeature.learning,
  admin: routesByFeature.admin,
  public: routesByFeature.public,
  payments: routesByFeature.payments
};

// Route statistics
export const getRouteStatistics = () => {
  const stats = {
    total: featureRoutes.length,
    public: routesByAccess.public.length,
    protected: routesByAccess.protected.length,
    admin: routesByAccess.admin.length,
    legacy: routesByStatus.legacy.length,
    development: routesByStatus.development.length,
    preloadable: routesByStatus.preloadable.length,
    byFeature: Object.entries(routesByFeature).reduce((acc, [feature, routes]) => {
      acc[feature] = routes.length;
      return acc;
    }, {}),
    byRole: Object.entries(routesByAccess).reduce((acc, [role, routes]) => {
      acc[role] = routes.length;
      return acc;
    }, {})
  };

  return stats;
};

// Route validation
export const validateRoutes = () => {
  const issues = [];
  const paths = new Set();

  featureRoutes.forEach((route, index) => {
    // Check for duplicate paths
    if (paths.has(route.path)) {
      issues.push(`Duplicate path found: ${route.path}`);
    } else {
      paths.add(route.path);
    }

    // Check required fields
    if (!route.title) {
      issues.push(`Route ${route.path} missing title`);
    }
    if (!route.element) {
      issues.push(`Route ${route.path} missing element`);
    }
    if (route.requiresAuth && !route.roles && route.path !== '/login' && route.path !== '/signup') {
      issues.push(`Protected route ${route.path} should specify roles`);
    }

    // Check meta information
    if (route.isPublic && !route.meta?.robots) {
      issues.push(`Public route ${route.path} missing robots meta tag`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    totalRoutes: featureRoutes.length
  };
};

export default featureRoutes;