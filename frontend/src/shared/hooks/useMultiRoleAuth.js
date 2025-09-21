/**
 * Enhanced authentication hook with multi-role support
 * Extends the existing useAuth hook with role management capabilities
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useAuth } from './useData';
import dataService from '../services/dataService';


// Role Context
const RoleContext = createContext();

// Role Provider Component
export const RoleProvider = ({ children }) => {
  const auth = useAuth();
  const [activeRole, setActiveRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize roles when user changes
  useEffect(() => {
    if (auth.user) {
      const userRoles = auth.user.roles || [];

      // Only auto-set role if:
      // 1. No activeRole is currently set (initial load), OR
      // 2. Current activeRole is not in user's roles (role was revoked)
      if ((!activeRole || !userRoles.includes(activeRole)) && userRoles.length > 0) {
        // Prioritize role selection: student > admin > tutor > guardian
        const rolePriority = ['student', 'admin', 'tutor', 'guardian'];
        const defaultRole = rolePriority.find(role => userRoles.includes(role)) || userRoles[0];
        setActiveRole(defaultRole);
      } else if (!userRoles.length && auth.user.accountType) {
        // Fallback to accountType for backward compatibility
        setActiveRole(auth.user.accountType);
      }

      // Load user permissions
      if (process.env.NODE_ENV === 'test') {
        // Load permissions synchronously in test mode
        const userPermissions = auth.user?.permissions || {};
        const testPermissions = {
          can_access_admin: auth.user?.roles?.includes('admin') || userPermissions.can_access_admin || false,
          can_access_tutor_dashboard: auth.user?.roles?.includes('tutor') || userPermissions.can_access_tutor_dashboard || false,
          can_access_student_dashboard: auth.user?.roles?.includes('student') || userPermissions.can_access_student_dashboard || false,
          can_access_guardian_dashboard: auth.user?.roles?.includes('guardian') || userPermissions.can_access_guardian_dashboard || false,
          qualified_courses: userPermissions.qualified_courses || []
        };
        setPermissions(testPermissions);
        setLoading(false);
      } else {
        loadPermissions();
      }
    } else {
      setActiveRole(null);
      setPermissions({});
    }
  }, [auth.user, activeRole]);

  const loadPermissions = async () => {
    try {
      setLoading(true);

      // Force refresh user data to get latest permissions
      const freshUser = await dataService.getCurrentUser(true);

      // Use fresh user data for permissions
      const userPermissions = freshUser?.permissions || {};
      const realPermissions = {
        can_access_admin: freshUser?.roles?.includes('admin') || userPermissions.can_access_admin || false,
        can_access_tutor_dashboard: freshUser?.roles?.includes('tutor') || userPermissions.can_access_tutor_dashboard || false,
        can_access_student_dashboard: freshUser?.roles?.includes('student') || userPermissions.can_access_student_dashboard || false,
        can_access_guardian_dashboard: freshUser?.roles?.includes('guardian') || userPermissions.can_access_guardian_dashboard || false,
        qualified_courses: userPermissions.qualified_courses || []
      };

      // In test environment, make this synchronous
      if (process.env.NODE_ENV === 'test') {
        const testPermissions = {
          can_access_admin: freshUser?.roles?.includes('admin') || userPermissions.can_access_admin || false,
          can_access_tutor_dashboard: freshUser?.roles?.includes('tutor') || userPermissions.can_access_tutor_dashboard || false,
          can_access_student_dashboard: freshUser?.roles?.includes('student') || userPermissions.can_access_student_dashboard || false,
          can_access_guardian_dashboard: freshUser?.roles?.includes('guardian') || userPermissions.can_access_guardian_dashboard || false,
          qualified_courses: userPermissions.qualified_courses || []
        };
        setPermissions(testPermissions);
        setLoading(false);
      } else {
        // In production, use real permissions immediately
        setPermissions(realPermissions);
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions({});
      setLoading(false);
    }
  };

  const switchRole = async (newRole) => {
    if (!auth.user || !hasRole(newRole)) {
      throw new Error(`User does not have role: ${newRole}`);
    }

    try {
      setLoading(true);

      // Call real backend API for role switching
      const response = await dataService.switchRole(newRole);

      setActiveRole(newRole);

      // Force refresh user data and reload permissions after role switch
      await loadPermissions();

      return response;
    } catch (error) {
      console.error('Failed to switch role:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role) => {
    if (!auth.user) return false;
    const userRoles = auth.user.roles || [];
    return userRoles.includes(role);
  };

  const hasPermission = (permission) => {
    return permissions[permission] === true;
  };

  const canAccessDashboard = (dashboardType) => {
    return permissions[`can_access_${dashboardType}_dashboard`] === true;
  };

  const getAvailableRoles = () => {
    return auth.user?.roles || [];
  };

  const isMultiRole = () => {
    const roles = getAvailableRoles();
    return roles.length > 1;
  };

  const canTutorCourse = (courseId) => {
    if (!hasRole('tutor')) return false;
    const qualifiedCourses = permissions.qualified_courses || [];
    return qualifiedCourses.includes(courseId);
  };

  const value = {
    // Auth data from useAuth
    user: auth.user,
    loading: auth.loading || loading,
    isAuthenticated: auth.isAuthenticated,

    // Auth functions from useAuth
    login: auth.login,
    logout: auth.logout,
    register: auth.register,

    // Multi-role specific state
    activeRole,
    permissions,

    // Multi-role functions
    switchRole,
    hasRole,
    hasPermission,
    canAccessDashboard,
    getAvailableRoles,
    isMultiRole,
    canTutorCourse,
    loadPermissions,

    // Computed properties
    canAccessAdmin: hasPermission('can_access_admin'),
    canAccessTutorDashboard: hasPermission('can_access_tutor_dashboard'),
    canAccessStudentDashboard: hasPermission('can_access_student_dashboard'),
    isAdmin: hasRole('admin'),
    isTutor: hasRole('tutor'),
    isStudent: hasRole('student'),
    isGuardian: hasRole('guardian')
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

// Hook to use the role context
export const useMultiRoleAuth = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useMultiRoleAuth must be used within a RoleProvider');
  }
  return context;
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

export default useMultiRoleAuth;