/**
 * Baseline tests for authentication system
 * These tests ensure no regression during refactoring
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { RoleProvider, useMultiRoleAuth } from '../../hooks/useMultiRoleAuth';
import { useAuth } from '../../shared/hooks/useData';

// Mock dataService
jest.mock('../../shared/services/dataService', () => ({
  getCurrentUser: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  switchRole: jest.fn(),
  subscribe: jest.fn(() => () => {}),
}));

// Test component to access hooks
const TestAuthComponent = ({ onAuthState }) => {
  const auth = useAuth();
  const multiRoleAuth = useMultiRoleAuth();

  React.useEffect(() => {
    if (onAuthState) {
      onAuthState({ auth, multiRoleAuth });
    }
  }, [auth, multiRoleAuth, onAuthState]);

  return (
    <div>
      <div data-testid="user-status">
        {auth.user ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="loading-status">
        {auth.loading ? 'loading' : 'loaded'}
      </div>
      <div data-testid="active-role">
        {multiRoleAuth.activeRole || 'no-role'}
      </div>
      <div data-testid="available-roles">
        {multiRoleAuth.getAvailableRoles().join(',')}
      </div>
      <div data-testid="permissions">
        Admin: {multiRoleAuth.canAccessAdmin ? 'yes' : 'no'}
        Tutor: {multiRoleAuth.canAccessTutorDashboard ? 'yes' : 'no'}
        Student: {multiRoleAuth.canAccessStudentDashboard ? 'yes' : 'no'}
      </div>
    </div>
  );
};

const renderWithProviders = (component, options = {}) => {
  return render(
    <BrowserRouter>
      <RoleProvider>
        {component}
      </RoleProvider>
    </BrowserRouter>,
    options
  );
};

describe('Authentication System Baseline Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAuth Hook', () => {
    test('should initialize with loading state', () => {
      const dataService = require('../../shared/services/dataService');
      dataService.getCurrentUser.mockResolvedValue(null);

      renderWithProviders(<TestAuthComponent />);

      expect(screen.getByTestId('loading-status')).toHaveTextContent('loading');
    });

    test('should handle successful authentication', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        roles: ['student'],
        permissions: {
          can_access_student_dashboard: true
        }
      };

      dataService.getCurrentUser.mockResolvedValue(mockUser);

      renderWithProviders(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('loading-status')).toHaveTextContent('loaded');
      });
    });

    test('should handle login functionality', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockCredentials = { email: 'test@example.com', password: 'password' };
      const mockResponse = { success: true, user: { id: 1, roles: ['student'] } };

      dataService.login.mockResolvedValue(mockResponse);
      dataService.getCurrentUser.mockResolvedValue(null);

      let authState;
      renderWithProviders(
        <TestAuthComponent onAuthState={(state) => authState = state} />
      );

      await waitFor(() => {
        expect(authState).toBeDefined();
      });

      const result = await authState.auth.login(mockCredentials);
      expect(result).toEqual(mockResponse);
      expect(dataService.login).toHaveBeenCalledWith(mockCredentials);
    });
  });

  describe('useMultiRoleAuth Hook', () => {
    test('should handle multi-role user setup', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockUser = {
        id: 1,
        name: 'Multi Role User',
        roles: ['student', 'tutor', 'admin'],
        permissions: {
          can_access_admin: true,
          can_access_tutor_dashboard: true,
          can_access_student_dashboard: true,
          qualified_courses: [1, 2, 3]
        }
      };

      dataService.getCurrentUser.mockResolvedValue(mockUser);

      renderWithProviders(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('active-role')).toHaveTextContent('student');
        expect(screen.getByTestId('available-roles')).toHaveTextContent('student,tutor,admin');
        expect(screen.getByTestId('permissions')).toHaveTextContent('Admin: yes');
        expect(screen.getByTestId('permissions')).toHaveTextContent('Tutor: yes');
        expect(screen.getByTestId('permissions')).toHaveTextContent('Student: yes');
      });
    });

    test('should handle role switching', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockUser = {
        id: 1,
        roles: ['student', 'tutor'],
        permissions: {
          can_access_tutor_dashboard: true,
          can_access_student_dashboard: true
        }
      };

      dataService.getCurrentUser.mockResolvedValue(mockUser);
      dataService.switchRole.mockResolvedValue({ success: true });

      let authState;
      renderWithProviders(
        <TestAuthComponent onAuthState={(state) => authState = state} />
      );

      await waitFor(() => {
        expect(authState?.multiRoleAuth.activeRole).toBe('student');
      });

      await authState.multiRoleAuth.switchRole('tutor');

      expect(dataService.switchRole).toHaveBeenCalledWith('tutor');
    });

    test('should handle single role user', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockUser = {
        id: 1,
        roles: ['student'],
        permissions: {
          can_access_student_dashboard: true
        }
      };

      dataService.getCurrentUser.mockResolvedValue(mockUser);

      let authState;
      renderWithProviders(
        <TestAuthComponent onAuthState={(state) => authState = state} />
      );

      await waitFor(() => {
        expect(authState?.multiRoleAuth.isMultiRole()).toBe(false);
        expect(authState?.multiRoleAuth.getAvailableRoles()).toEqual(['student']);
      });
    });

    test('should validate role permissions correctly', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockUser = {
        id: 1,
        roles: ['tutor'],
        permissions: {
          can_access_tutor_dashboard: true,
          qualified_courses: [1, 2]
        }
      };

      dataService.getCurrentUser.mockResolvedValue(mockUser);

      let authState;
      renderWithProviders(
        <TestAuthComponent onAuthState={(state) => authState = state} />
      );

      await waitFor(() => {
        expect(authState?.multiRoleAuth.hasRole('tutor')).toBe(true);
        expect(authState?.multiRoleAuth.hasRole('admin')).toBe(false);
        expect(authState?.multiRoleAuth.canTutorCourse(1)).toBe(true);
        expect(authState?.multiRoleAuth.canTutorCourse(5)).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors gracefully', async () => {
      const dataService = require('../../shared/services/dataService');
      dataService.getCurrentUser.mockRejectedValue(new Error('Auth failed'));

      renderWithProviders(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('user-status')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('loading-status')).toHaveTextContent('loaded');
      });
    });

    test('should handle role switching errors', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockUser = {
        id: 1,
        roles: ['student', 'tutor'],
        permissions: {}
      };

      dataService.getCurrentUser.mockResolvedValue(mockUser);
      dataService.switchRole.mockRejectedValue(new Error('Switch failed'));

      let authState;
      renderWithProviders(
        <TestAuthComponent onAuthState={(state) => authState = state} />
      );

      await waitFor(() => {
        expect(authState).toBeDefined();
      });

      await expect(authState.multiRoleAuth.switchRole('admin')).rejects.toThrow('User does not have role: admin');
    });
  });

  describe('Context Integration', () => {
    test('should throw error when useMultiRoleAuth used outside provider', () => {
      const TestComponent = () => {
        useMultiRoleAuth();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useMultiRoleAuth must be used within a RoleProvider'
      );

      consoleSpy.mockRestore();
    });

    test('should provide all required auth methods and properties', async () => {
      const dataService = require('../../shared/services/dataService');
      dataService.getCurrentUser.mockResolvedValue({
        id: 1,
        roles: ['student'],
        permissions: {}
      });

      let authState;
      renderWithProviders(
        <TestAuthComponent onAuthState={(state) => authState = state} />
      );

      await waitFor(() => {
        expect(authState?.multiRoleAuth).toHaveProperty('user');
        expect(authState?.multiRoleAuth).toHaveProperty('activeRole');
        expect(authState?.multiRoleAuth).toHaveProperty('permissions');
        expect(authState?.multiRoleAuth).toHaveProperty('login');
        expect(authState?.multiRoleAuth).toHaveProperty('logout');
        expect(authState?.multiRoleAuth).toHaveProperty('switchRole');
        expect(authState?.multiRoleAuth).toHaveProperty('hasRole');
        expect(authState?.multiRoleAuth).toHaveProperty('hasPermission');
        expect(authState?.multiRoleAuth).toHaveProperty('canAccessDashboard');
        expect(authState?.multiRoleAuth).toHaveProperty('isMultiRole');
      });
    });
  });
});