/**
 * Route Configuration with Feature-Based Organization
 * Centralized route definitions using feature-based lazy loading
 */

import {
  featureRoutes,
  routesByFeature,
  routesByAccess,
  routesByStatus,
  routeGroups,
  getRouteByPath,
  getRoutesByRole,
  getPublicRoutes,
  getProtectedRoutes,
  getPreloadableRoutes,
  getDevelopmentRoutes,
  getLegacyRoutes,
  getRouteStatistics,
  validateRoutes
} from './features';

// Export the main routes array (feature-based)
export const routes = featureRoutes;

// Re-export all feature-based utilities
export {
  routesByFeature,
  routesByAccess,
  routesByStatus,
  routeGroups,
  getRouteByPath,
  getRoutesByRole,
  getPublicRoutes,
  getProtectedRoutes,
  getPreloadableRoutes,
  getDevelopmentRoutes,
  getLegacyRoutes,
  getRouteStatistics,
  validateRoutes
};

// Legacy aliases for backward compatibility
export const getPrivateRoutes = getProtectedRoutes;

export default routes;