import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMultiRoleAuth } from '../../hooks/useMultiRoleAuth';
import './ProtectedRoute.css';

const ProtectedRoute = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  allowedIfLoggedIn = false,
  redirectTo = '/login'
}) => {
  const {
    user,
    isAuthenticated,
    loading,
    hasRole,
    hasPermission,
    activeRole
  } = useMultiRoleAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedIfLoggedIn && isAuthenticated) {
    return children;
  }

  const hasRequiredRole = requiredRoles.length === 0 ||
    requiredRoles.some(role => hasRole(role));

  const hasRequiredPermission = requiredPermissions.length === 0 ||
    requiredPermissions.some(permission => hasPermission(permission));

  if (!hasRequiredRole || !hasRequiredPermission) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          {requiredRoles.length > 0 && (
            <p>Required roles: {requiredRoles.join(', ')}</p>
          )}
          {requiredPermissions.length > 0 && (
            <p>Required permissions: {requiredPermissions.join(', ')}</p>
          )}
          <p>Current role: {activeRole}</p>
          <button onClick={() => window.history.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;