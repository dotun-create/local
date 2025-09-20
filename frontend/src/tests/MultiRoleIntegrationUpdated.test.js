/**
 * Updated Frontend Integration Tests for Multi-Role System
 * Tests the updated implementation with real backend authentication
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { RoleProvider, useMultiRoleAuth } from '../hooks/useMultiRoleAuth';
import RoleSwitcher from '../components/common/RoleSwitcher';
import TroupeHeaderComponent from '../components/headerandfooter/TroupeHeaderComponent';

// Mock dataService
jest.mock('../services/dataService', () => ({
  __esModule: true,
  default: {
    switchRole: jest.fn(),
    getCurrentUser: jest.fn(),
    subscribe: jest.fn(() => jest.fn()), // Return unsubscribe function
  },
}));

// Mock useAuth hook
jest.mock('../hooks/useData', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    isAuthenticated: false
  })
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// Test wrapper component
const TestWrapper = ({ children, initialUser = null }) => {
  if (initialUser) {
    mockSessionStorage.getItem.mockReturnValue(JSON.stringify(initialUser));
  }

  return (
    <BrowserRouter>
      <RoleProvider>
        {children}
      </RoleProvider>
    </BrowserRouter>
  );
};

// Test component to access context
const TestContextConsumer = () => {
  const context = useMultiRoleAuth();
  return (
    <div data-testid="context-data">
      <span data-testid="user-email">{context.user?.email || 'No user'}</span>
      <span data-testid="active-role">{context.activeRole || 'No role'}</span>
      <span data-testid="is-multi-role">{context.isMultiRole().toString()}</span>
      <span data-testid="available-roles">{context.getAvailableRoles().join(',')}</span>
      <span data-testid="is-authenticated">{context.isAuthenticated.toString()}</span>
      <span data-testid="can-access-tutor-dashboard">{context.canAccessTutorDashboard.toString()}</span>
      <span data-testid="is-student">{context.isStudent.toString()}</span>
      <span data-testid="is-tutor">{context.isTutor.toString()}</span>
    </div>
  );
};

describe('Updated Multi-Role Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles real backend user with multiple roles', () => {
    const backendUser = {
      id: 'user_42a365db',
      email: 'student2@test.com',
      roles: ['student', 'tutor'],
      permissions: {
        can_access_student_dashboard: true,
        can_access_tutor_dashboard: true,
        qualified_courses: ['course_748a1e2a']
      },
      profile: { name: 'student2' }
    };

    render(
      <TestWrapper initialUser={backendUser}>
        <TestContextConsumer />
      </TestWrapper>
    );

    expect(screen.getByTestId('user-email')).toHaveTextContent('student2@test.com');
    expect(screen.getByTestId('is-multi-role')).toHaveTextContent('true');
    expect(screen.getByTestId('available-roles')).toHaveTextContent('student,tutor');
    expect(screen.getByTestId('can-access-tutor-dashboard')).toHaveTextContent('true');
    expect(screen.getByTestId('is-student')).toHaveTextContent('true');
    expect(screen.getByTestId('is-tutor')).toHaveTextContent('true');
  });

  test('handles single-role backend user', () => {
    const singleRoleUser = {
      id: 'user_123',
      email: 'regular@test.com',
      roles: ['student'],
      permissions: {
        can_access_student_dashboard: true,
        can_access_tutor_dashboard: false,
        qualified_courses: []
      },
      profile: { name: 'Regular Student' }
    };

    render(
      <TestWrapper initialUser={singleRoleUser}>
        <TestContextConsumer />
      </TestWrapper>
    );

    expect(screen.getByTestId('user-email')).toHaveTextContent('regular@test.com');
    expect(screen.getByTestId('is-multi-role')).toHaveTextContent('false');
    expect(screen.getByTestId('available-roles')).toHaveTextContent('student');
    expect(screen.getByTestId('can-access-tutor-dashboard')).toHaveTextContent('false');
    expect(screen.getByTestId('is-student')).toHaveTextContent('true');
    expect(screen.getByTestId('is-tutor')).toHaveTextContent('false');
  });

  test('uses real permissions from backend', () => {
    const userWithPermissions = {
      id: 'user_qualified',
      email: 'qualified@test.com',
      roles: ['student', 'tutor'],
      permissions: {
        can_access_admin: false,
        can_access_student_dashboard: true,
        can_access_tutor_dashboard: true,
        qualified_courses: ['course_748a1e2a', 'course_math']
      },
      profile: { name: 'Qualified User' }
    };

    const TestPermissionComponent = () => {
      const { hasPermission, canTutorCourse } = useMultiRoleAuth();

      return (
        <div>
          <span data-testid="can-access-admin">{hasPermission('can_access_admin').toString()}</span>
          <span data-testid="can-access-student">{hasPermission('can_access_student_dashboard').toString()}</span>
          <span data-testid="can-tutor-math">{canTutorCourse('course_math').toString()}</span>
          <span data-testid="can-tutor-other">{canTutorCourse('course_other').toString()}</span>
        </div>
      );
    };

    render(
      <TestWrapper initialUser={userWithPermissions}>
        <TestPermissionComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('can-access-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('can-access-student')).toHaveTextContent('true');
    expect(screen.getByTestId('can-tutor-math')).toHaveTextContent('true');
    expect(screen.getByTestId('can-tutor-other')).toHaveTextContent('false');
  });
});

describe('Updated Role Switcher Component', () => {
  test('renders for multi-role users', () => {
    const multiRoleUser = {
      id: 'user_42a365db',
      email: 'student2@test.com',
      roles: ['student', 'tutor'],
      permissions: {
        can_access_student_dashboard: true,
        can_access_tutor_dashboard: true,
        qualified_courses: ['course_748a1e2a']
      },
      profile: { name: 'student2' }
    };

    render(
      <TestWrapper initialUser={multiRoleUser}>
        <RoleSwitcher />
      </TestWrapper>
    );

    // Should render role switcher for multi-role user
    expect(screen.getByTestId('role-switcher')).toBeInTheDocument();
    expect(screen.getByText(/tutor/i)).toBeInTheDocument(); // Default priority role
  });

  test('does not render for single-role users', () => {
    const singleRoleUser = {
      id: 'user_123',
      email: 'regular@test.com',
      roles: ['student'],
      permissions: {
        can_access_student_dashboard: true,
        can_access_tutor_dashboard: false,
        qualified_courses: []
      },
      profile: { name: 'Regular Student' }
    };

    render(
      <TestWrapper initialUser={singleRoleUser}>
        <RoleSwitcher />
      </TestWrapper>
    );

    // Should not render for single-role user
    expect(screen.queryByTestId('role-switcher')).toBeNull();
  });

  test('calls real backend API when switching roles', async () => {
    const dataService = require('../services/dataService').default;
    dataService.switchRole.mockResolvedValue({
      success: true,
      user: { id: 'user_42a365db', activeRole: 'student' }
    });

    const multiRoleUser = {
      id: 'user_42a365db',
      email: 'student2@test.com',
      roles: ['student', 'tutor'],
      permissions: {
        can_access_student_dashboard: true,
        can_access_tutor_dashboard: true,
        qualified_courses: ['course_748a1e2a']
      },
      profile: { name: 'student2' }
    };

    render(
      <TestWrapper initialUser={multiRoleUser}>
        <RoleSwitcher />
      </TestWrapper>
    );

    // Find and click the switch button
    const switchButton = screen.getByTitle('Switch Role');
    fireEvent.click(switchButton);

    // Find and click a role option (should show dropdown)
    await waitFor(() => {
      const studentOption = screen.getByText(/Student/);
      fireEvent.click(studentOption);
    });

    // Verify the real API was called
    expect(dataService.switchRole).toHaveBeenCalledWith('student');
  });
});

describe('Header Integration', () => {
  test('TroupeHeaderComponent includes RoleSwitcher', () => {
    const multiRoleUser = {
      id: 'user_42a365db',
      email: 'student2@test.com',
      roles: ['student', 'tutor'],
      permissions: {
        can_access_student_dashboard: true,
        can_access_tutor_dashboard: true,
        qualified_courses: ['course_748a1e2a']
      },
      profile: { name: 'student2' }
    };

    const headerProps = {
      mainText: 'Test App',
      textPortion: 'Test',
      loginFunction: jest.fn(),
      imageLink: '/test-logo.png',
      headerMenuDictionary: {}
    };

    render(
      <TestWrapper initialUser={multiRoleUser}>
        <TroupeHeaderComponent {...headerProps} />
      </TestWrapper>
    );

    // Should include both auth controls and role switcher
    expect(screen.getByTestId('role-switcher')).toBeInTheDocument();
    expect(screen.getByText(/tutor/i)).toBeInTheDocument();
  });
});

describe('Real Backend Integration', () => {
  test('switches to dataService for role operations', async () => {
    const dataService = require('../services/dataService').default;

    // Mock successful role switch
    dataService.switchRole.mockResolvedValue({
      success: true,
      access_token: 'new-token',
      user: {
        id: 'user_42a365db',
        email: 'student2@test.com',
        activeRole: 'student'
      }
    });

    const TestRoleSwitchComponent = () => {
      const { switchRole } = useMultiRoleAuth();

      const handleSwitch = async () => {
        try {
          await switchRole('student');
        } catch (error) {
          console.error('Switch failed:', error);
        }
      };

      return (
        <button data-testid="test-switch" onClick={handleSwitch}>
          Switch to Student
        </button>
      );
    };

    const multiRoleUser = {
      id: 'user_42a365db',
      email: 'student2@test.com',
      roles: ['student', 'tutor'],
      permissions: {
        can_access_student_dashboard: true,
        can_access_tutor_dashboard: true,
        qualified_courses: ['course_748a1e2a']
      },
      profile: { name: 'student2' }
    };

    render(
      <TestWrapper initialUser={multiRoleUser}>
        <TestRoleSwitchComponent />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('test-switch'));

    await waitFor(() => {
      expect(dataService.switchRole).toHaveBeenCalledWith('student');
    });
  });

  test('handles role switch errors gracefully', async () => {
    const dataService = require('../services/dataService').default;

    // Mock failed role switch
    dataService.switchRole.mockRejectedValue(new Error('Network error'));

    const TestErrorComponent = () => {
      const { switchRole } = useMultiRoleAuth();
      const [error, setError] = React.useState(null);

      const handleSwitch = async () => {
        try {
          await switchRole('student');
        } catch (err) {
          setError(err.message);
        }
      };

      return (
        <div>
          <button data-testid="test-switch" onClick={handleSwitch}>
            Switch Role
          </button>
          {error && <span data-testid="error-message">{error}</span>}
        </div>
      );
    };

    const multiRoleUser = {
      id: 'user_42a365db',
      email: 'student2@test.com',
      roles: ['student', 'tutor'],
      profile: { name: 'student2' }
    };

    render(
      <TestWrapper initialUser={multiRoleUser}>
        <TestErrorComponent />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('test-switch'));

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Network error');
    });
  });
});

// Export test utilities
export { TestWrapper, TestContextConsumer };