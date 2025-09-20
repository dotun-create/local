/**
 * Frontend Integration Tests for Multi-Role System
 * Tests React components, context, and user workflows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import { RoleProvider, useMultiRoleAuth } from '../hooks/useMultiRoleAuth';
import RoleSwitcher from '../components/common/RoleSwitcher';
import RoleDemo from '../components/common/RoleDemo';
import ProtectedRoute from '../components/common/ProtectedRoute';
import MultiRoleManagement from '../components/admin/MultiRoleManagement';

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
  // Mock initial user data
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
    </div>
  );
};

describe('Multi-Role Authentication Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('provides default context for unauthenticated user', () => {
    mockSessionStorage.getItem.mockReturnValue(null);

    render(
      <TestWrapper>
        <TestContextConsumer />
      </TestWrapper>
    );

    expect(screen.getByTestId('user-email')).toHaveTextContent('demo@multirole.com');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('is-multi-role')).toHaveTextContent('true');
    expect(screen.getByTestId('available-roles')).toHaveTextContent('student,tutor');
  });

  test('handles single-role user conversion to multi-role', () => {
    const singleRoleUser = {
      id: 'user-1',
      email: 'student@test.com',
      roles: ['student'],
      profile: { name: 'Test Student' }
    };

    render(
      <TestWrapper initialUser={singleRoleUser}>
        <TestContextConsumer />
      </TestWrapper>
    );

    expect(screen.getByTestId('user-email')).toHaveTextContent('student@test.com');
    expect(screen.getByTestId('is-multi-role')).toHaveTextContent('true');
    expect(screen.getByTestId('available-roles')).toHaveTextContent('student,tutor');
  });

  test('preserves existing multi-role user', () => {
    const multiRoleUser = {
      id: 'user-1',
      email: 'multirole@test.com',
      roles: ['student', 'tutor', 'admin'],
      profile: { name: 'Multi Role User' }
    };

    render(
      <TestWrapper initialUser={multiRoleUser}>
        <TestContextConsumer />
      </TestWrapper>
    );

    expect(screen.getByTestId('user-email')).toHaveTextContent('multirole@test.com');
    expect(screen.getByTestId('is-multi-role')).toHaveTextContent('true');
    expect(screen.getByTestId('available-roles')).toHaveTextContent('student,tutor,admin');
  });
});

describe('Role Switcher Component', () => {
  test('does not render for single-role users', () => {
    const singleRoleUser = {
      id: 'user-1',
      email: 'student@test.com',
      roles: ['student'],
      profile: { name: 'Test Student' }
    };

    // Override the multi-role conversion for this test
    const OriginalProvider = RoleProvider;
    jest.doMock('../hooks/useMultiRoleAuth', () => ({
      ...jest.requireActual('../hooks/useMultiRoleAuth'),
      RoleProvider: ({ children }) => {
        const mockContext = {
          user: singleRoleUser,
          activeRole: 'student',
          isMultiRole: () => false,
          getAvailableRoles: () => ['student'],
          isAuthenticated: true
        };
        return (
          <div data-testid="mock-role-provider">
            {React.cloneElement(children, { mockContext })}
          </div>
        );
      }
    }));

    render(
      <TestWrapper initialUser={singleRoleUser}>
        <RoleSwitcher />
      </TestWrapper>
    );

    // Should not render anything for single-role user
    expect(screen.queryByTestId('role-switcher')).not.toBeInTheDocument();
  });

  test('renders role switcher for multi-role users', () => {
    const multiRoleUser = {
      id: 'user-1',
      email: 'multirole@test.com',
      roles: ['student', 'tutor'],
      profile: { name: 'Multi Role User' }
    };

    render(
      <TestWrapper initialUser={multiRoleUser}>
        <RoleSwitcher />
      </TestWrapper>
    );

    // Should show current role
    expect(screen.getByText(/student/i)).toBeInTheDocument();
  });
});

describe('Role Demo Component', () => {
  test('shows demo user information when no user in session', () => {
    mockSessionStorage.getItem.mockReturnValue(null);

    render(
      <TestWrapper>
        <RoleDemo />
      </TestWrapper>
    );

    // Since RoleProvider creates a demo user when no user exists,
    // we should expect the demo user information to be displayed
    expect(screen.getByText(/multi-role authentication demo/i)).toBeInTheDocument();
    expect(screen.getByText(/demo multi-role user/i)).toBeInTheDocument();
  });

  test('displays user information for authenticated users', () => {
    const testUser = {
      id: 'user-1',
      email: 'test@example.com',
      roles: ['student', 'tutor'],
      profile: { name: 'Test User' }
    };

    render(
      <TestWrapper initialUser={testUser}>
        <RoleDemo />
      </TestWrapper>
    );

    expect(screen.getByText(/multi-role authentication demo/i)).toBeInTheDocument();
    expect(screen.getByText(/test user/i)).toBeInTheDocument();
    expect(screen.getAllByText(/student, tutor/i)[0]).toBeInTheDocument();
  });
});

describe('Protected Route Component', () => {
  const TestProtectedComponent = () => <div data-testid="protected-content">Protected Content</div>;

  test('allows access for users with required roles', async () => {
    const authorizedUser = {
      id: 'user-1',
      email: 'admin@test.com',
      roles: ['admin'],
      profile: { name: 'Admin User' }
    };

    render(
      <TestWrapper initialUser={authorizedUser}>
        <ProtectedRoute requiredRoles={['admin']}>
          <TestProtectedComponent />
        </ProtectedRoute>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  test('denies access for users without required roles', () => {
    const unauthorizedUser = {
      id: 'user-1',
      email: 'student@test.com',
      roles: ['student'],
      profile: { name: 'Student User' }
    };

    render(
      <TestWrapper initialUser={unauthorizedUser}>
        <ProtectedRoute requiredRoles={['admin']}>
          <TestProtectedComponent />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/required roles: admin/i)).toBeInTheDocument();
  });

  test('allows access for logged-in users when allowedIfLoggedIn is true', () => {
    const anyUser = {
      id: 'user-1',
      email: 'user@test.com',
      roles: ['student'],
      profile: { name: 'Any User' }
    };

    render(
      <TestWrapper initialUser={anyUser}>
        <ProtectedRoute allowedIfLoggedIn={true}>
          <TestProtectedComponent />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});

describe('Multi-Role Management Component', () => {
  test('denies access for non-admin users', () => {
    const studentUser = {
      id: 'user-1',
      email: 'student@test.com',
      roles: ['student'],
      profile: { name: 'Student User' }
    };

    render(
      <TestWrapper initialUser={studentUser}>
        <MultiRoleManagement />
      </TestWrapper>
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/admin privileges required/i)).toBeInTheDocument();
  });

  test('renders management interface for admin users', async () => {
    const adminUser = {
      id: 'admin-1',
      email: 'admin@test.com',
      roles: ['admin'],
      profile: { name: 'Admin User' }
    };

    render(
      <TestWrapper initialUser={adminUser}>
        <MultiRoleManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/multi-role system management/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/course thresholds/i)).toBeInTheDocument();
    expect(screen.getByText(/tutor management/i)).toBeInTheDocument();
    expect(screen.getAllByText(/bulk import/i)[0]).toBeInTheDocument();
  });

  test('switches between management tabs', async () => {
    const adminUser = {
      id: 'admin-1',
      email: 'admin@test.com',
      roles: ['admin'],
      profile: { name: 'Admin User' }
    };

    render(
      <TestWrapper initialUser={adminUser}>
        <MultiRoleManagement />
      </TestWrapper>
    );

    // Wait for component to load and default tab to be visible
    await waitFor(() => {
      expect(screen.getAllByText(/course qualification thresholds/i)[0]).toBeInTheDocument();
    });

    // Click tutor management tab
    fireEvent.click(screen.getByText(/tutor management/i));
    await waitFor(() => {
      expect(screen.getByText(/tutor qualifications management/i)).toBeInTheDocument();
    });

    // Click bulk import tab
    fireEvent.click(screen.getAllByText(/bulk import/i)[1]); // Click the tab button, not the description
    await waitFor(() => {
      expect(screen.getByText(/bulk import student-tutors/i)).toBeInTheDocument();
    });
  });
});

describe('Role Context Integration', () => {
  test('permission checking works correctly', () => {
    const TestPermissionComponent = () => {
      const { hasPermission, canAccessDashboard } = useMultiRoleAuth();

      return (
        <div>
          <span data-testid="can-access-admin">{hasPermission('can_access_admin').toString()}</span>
          <span data-testid="can-access-student-dashboard">{canAccessDashboard('student').toString()}</span>
          <span data-testid="can-access-tutor-dashboard">{canAccessDashboard('tutor').toString()}</span>
        </div>
      );
    };

    const userWithPermissions = {
      id: 'user-1',
      email: 'multirole@test.com',
      roles: ['student', 'tutor'],
      profile: { name: 'Multi Role User' }
    };

    render(
      <TestWrapper initialUser={userWithPermissions}>
        <TestPermissionComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('can-access-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('can-access-student-dashboard')).toHaveTextContent('true');
    expect(screen.getByTestId('can-access-tutor-dashboard')).toHaveTextContent('true');
  });

  test('role switching updates context correctly', async () => {
    const TestRoleSwitchComponent = () => {
      const { activeRole, switchRole, getAvailableRoles } = useMultiRoleAuth();

      return (
        <div>
          <span data-testid="current-role">{activeRole}</span>
          <button
            data-testid="switch-to-student"
            onClick={() => switchRole('student')}
          >
            Switch to Student
          </button>
          <span data-testid="available-roles">{getAvailableRoles().join(',')}</span>
        </div>
      );
    };

    const multiRoleUser = {
      id: 'user-1',
      email: 'multirole@test.com',
      roles: ['student', 'tutor'],
      profile: { name: 'Multi Role User' }
    };

    render(
      <TestWrapper initialUser={multiRoleUser}>
        <TestRoleSwitchComponent />
      </TestWrapper>
    );

    // Wait for initial state to load (tutor has higher priority than student)
    await waitFor(() => {
      expect(screen.getByTestId('current-role')).toHaveTextContent('tutor');
    });
    expect(screen.getByTestId('available-roles')).toHaveTextContent('student,tutor');

    // Click switch role button
    fireEvent.click(screen.getByTestId('switch-to-student'));

    // Should successfully switch roles
    await waitFor(() => {
      expect(screen.getByTestId('current-role')).toHaveTextContent('student');
    });
  });
});

// Performance tests
describe('Multi-Role Performance Tests', () => {
  test('context initialization is fast', () => {
    const startTime = performance.now();

    const testUser = {
      id: 'user-1',
      email: 'test@example.com',
      roles: ['student', 'tutor', 'admin'],
      profile: { name: 'Test User' }
    };

    render(
      <TestWrapper initialUser={testUser}>
        <TestContextConsumer />
      </TestWrapper>
    );

    const endTime = performance.now();
    const initTime = endTime - startTime;

    // Context should initialize in less than 50ms
    expect(initTime).toBeLessThan(50);
  });

  test('permission checking is efficient', () => {
    const TestPerformanceComponent = () => {
      const { hasPermission, hasRole } = useMultiRoleAuth();

      const startTime = performance.now();

      // Perform multiple permission checks
      for (let i = 0; i < 1000; i++) {
        hasPermission('can_access_admin');
        hasRole('student');
        hasRole('tutor');
      }

      const endTime = performance.now();
      const checkTime = endTime - startTime;

      return <span data-testid="check-time">{checkTime}</span>;
    };

    const testUser = {
      id: 'user-1',
      email: 'test@example.com',
      roles: ['student', 'tutor'],
      profile: { name: 'Test User' }
    };

    render(
      <TestWrapper initialUser={testUser}>
        <TestPerformanceComponent />
      </TestWrapper>
    );

    const checkTime = parseFloat(screen.getByTestId('check-time').textContent);

    // 1000 permission checks should complete in less than 10ms
    expect(checkTime).toBeLessThan(10);
  });
});

// Export test utilities for other test files
export { TestWrapper, TestContextConsumer };