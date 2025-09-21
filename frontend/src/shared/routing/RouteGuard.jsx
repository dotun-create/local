/**
 * Route Guard Component
 * Handles authentication and role-based access control
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { PageLoadingFallback } from '../utils/lazyLoader';

const RouteGuard = ({ children, route }) => {
  const location = useLocation();
  const isAuthenticated = useStore((state) => state.auth.isAuthenticated);
  const user = useStore((state) => state.auth.user);
  const isLoading = useStore((state) => state.auth.loading);

  // Show loading while authentication status is being determined
  if (isLoading) {
    return <PageLoadingFallback title="Checking authentication..." />;
  }

  // Check if route requires authentication
  if (route.requiresAuth && !isAuthenticated) {
    // Redirect to login with return URL
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role-based access
  if (route.roles && isAuthenticated) {
    const userRoles = user?.roles || [];
    const hasRequiredRole = route.roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      // Redirect to appropriate dashboard based on user role
      const redirectPath = getDefaultRouteForUser(userRoles);
      return (
        <Navigate
          to={redirectPath}
          replace
        />
      );
    }
  }

  // Check if authenticated user is trying to access auth pages
  if (isAuthenticated && isAuthRoute(route.path)) {
    // Redirect authenticated users away from login/signup pages
    const redirectPath = getDefaultRouteForUser(user?.roles || []);
    return (
      <Navigate
        to={redirectPath}
        replace
      />
    );
  }

  return children;
};

// Helper function to determine default route for user
const getDefaultRouteForUser = (userRoles) => {
  if (userRoles.includes('admin')) {
    return '/admin';
  }
  if (userRoles.includes('tutor')) {
    return '/tutor';
  }
  if (userRoles.includes('guardian')) {
    return '/guardian';
  }
  if (userRoles.includes('student')) {
    return '/dashboard';
  }
  return '/';
};

// Helper function to check if route is an auth route
const isAuthRoute = (path) => {
  const authPaths = ['/login', '/signup', '/reset-password'];
  return authPaths.includes(path);
};

export default RouteGuard;