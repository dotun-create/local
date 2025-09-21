/**
 * Multi-role authentication hook - migrated to use centralized Zustand store
 * This provides backward compatibility with the old RoleProvider/useMultiRoleAuth pattern
 */

import React from 'react';
import { useStore } from '@shared/store';

// Compatibility hook that mimics the old useMultiRoleAuth API
export const useMultiRoleAuth = () => {
  const auth = useStore((state) => state.auth);

  return {
    // Auth data
    user: auth.user,
    loading: auth.loading || auth.roleLoading,
    isAuthenticated: auth.isAuthenticated,

    // Auth functions
    login: auth.actions.login,
    logout: auth.actions.logout,
    register: auth.actions.register,

    // Multi-role specific state
    activeRole: auth.activeRole,
    permissions: auth.permissions,

    // Multi-role functions
    switchRole: auth.actions.switchRole,
    hasRole: auth.actions.hasRole,
    hasPermission: auth.actions.hasPermission,
    canAccessDashboard: auth.actions.canAccessDashboard,
    getAvailableRoles: auth.actions.getAvailableRoles,
    isMultiRole: auth.actions.isMultiRole,
    canTutorCourse: auth.actions.canTutorCourse,
    loadPermissions: auth.actions.loadPermissions,

    // Computed properties
    canAccessAdmin: auth.canAccessAdmin,
    canAccessTutorDashboard: auth.canAccessTutorDashboard,
    canAccessStudentDashboard: auth.canAccessStudentDashboard,
    canAccessGuardianDashboard: auth.canAccessGuardianDashboard,
    isAdmin: auth.isAdmin,
    isTutor: auth.isTutor,
    isStudent: auth.isStudent,
    isGuardian: auth.isGuardian
  };
};

// Higher-order component for role-based access control
export const withRoleAccess = (WrappedComponent, requiredRoles = []) => {
  return function RoleProtectedComponent(props) {
    const { hasRole, user, loading } = useMultiRoleAuth();

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!user) {
      return <div>Please log in to access this page.</div>;
    }

    const hasAccess = requiredRoles.length === 0 || requiredRoles.some(role => hasRole(role));

    if (!hasAccess) {
      return (
        <div>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <p>Required roles: {requiredRoles.join(', ')}</p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

// Route protection hook
export const useRequireRole = (requiredRoles = []) => {
  const { hasRole, user, loading } = useMultiRoleAuth();

  const hasAccess = user && (
    requiredRoles.length === 0 ||
    requiredRoles.some(role => hasRole(role))
  );

  return {
    hasAccess,
    loading,
    user
  };
};

// Legacy RoleProvider component for backward compatibility
// This is now just a pass-through component since state is managed in Zustand
export const RoleProvider = ({ children }) => {
  return children;
};

export default useMultiRoleAuth;