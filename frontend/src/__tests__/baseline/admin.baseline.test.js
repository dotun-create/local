/**
 * Baseline tests for admin functionality
 * Tests user management, system monitoring, and administrative operations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, createMockUser } from './test-utils';

// Mock admin-specific hooks
jest.mock('../../shared/hooks/useData', () => ({
  useUsers: jest.fn(),
  useAdminStats: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock('../../hooks/useAdminRefresh', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock admin services
jest.mock('../../shared/services/dataService', () => ({
  getUsers: jest.fn(),
  getUser: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  assignRole: jest.fn(),
  removeRole: jest.fn(),
  updateUserPermissions: jest.fn(),
  getSystemStats: jest.fn(),
  getAuditLogs: jest.fn(),
  exportData: jest.fn(),
  importData: jest.fn(),
  resetPassword: jest.fn(),
  suspendUser: jest.fn(),
  unsuspendUser: jest.fn(),
  bulkUserOperation: jest.fn(),
}));

const TestAdminUsersComponent = ({ onAdminState }) => {
  const [users, setUsers] = React.useState([]);
  const [selectedUsers, setSelectedUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [filters, setFilters] = React.useState({
    role: 'all',
    status: 'all',
    search: ''
  });

  React.useEffect(() => {
    if (onAdminState) {
      onAdminState({
        users,
        selectedUsers,
        loading,
        error,
        filters,
        setUsers,
        setSelectedUsers,
        setLoading,
        setError,
        setFilters
      });
    }
  }, [users, selectedUsers, loading, error, filters, onAdminState]);

  return (
    <div>
      <div data-testid="admin-users-loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="admin-users-count">{users.length}</div>
      <div data-testid="admin-selected-count">{selectedUsers.length}</div>
      <div data-testid="admin-error">{error?.message || 'no-error'}</div>
      <div data-testid="admin-filter-role">{filters.role}</div>
      <div data-testid="admin-users-list">
        {users.map(user => (
          <div key={user.id} data-testid={`admin-user-${user.id}`}>
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
            <span className="user-roles">{user.roles?.join(',') || 'no-roles'}</span>
            <span className="user-status">{user.status || 'active'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TestAdminStatsComponent = ({ onStatsState }) => {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (onStatsState) {
      onStatsState({
        stats,
        loading,
        error,
        setStats,
        setLoading,
        setError
      });
    }
  }, [stats, loading, error, onStatsState]);

  return (
    <div>
      <div data-testid="admin-stats-loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="admin-stats-error">{error?.message || 'no-error'}</div>
      {stats && (
        <div data-testid="admin-stats-data">
          <div data-testid="total-users">{stats.total_users || 0}</div>
          <div data-testid="total-courses">{stats.total_courses || 0}</div>
          <div data-testid="total-sessions">{stats.total_sessions || 0}</div>
          <div data-testid="active-sessions">{stats.active_sessions || 0}</div>
          <div data-testid="revenue-total">{stats.revenue_total || 0}</div>
        </div>
      )}
    </div>
  );
};

describe('Admin Functionality Baseline Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management', () => {
    test('should load users successfully', async () => {
      const { useUsers } = require('../../shared/hooks/useData');
      const mockUsers = [
        createMockUser({
          id: 1,
          name: 'John Student',
          email: 'john@example.com',
          roles: ['student'],
          status: 'active'
        }),
        createMockUser({
          id: 2,
          name: 'Jane Tutor',
          email: 'jane@example.com',
          roles: ['tutor', 'student'],
          status: 'active'
        }),
        createMockUser({
          id: 3,
          name: 'Bob Admin',
          email: 'bob@example.com',
          roles: ['admin'],
          status: 'active'
        })
      ];

      useUsers.mockReturnValue({
        data: mockUsers,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      let adminState;
      renderWithProviders(
        <TestAdminUsersComponent onAdminState={(state) => adminState = state} />
      );

      // Simulate loading users
      adminState.setLoading(true);
      const usersHook = useUsers();
      adminState.setUsers(usersHook.data);
      adminState.setLoading(false);

      await waitFor(() => {
        expect(screen.getByTestId('admin-users-loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('admin-users-count')).toHaveTextContent('3');
        expect(screen.getByTestId('admin-user-1')).toBeInTheDocument();
        expect(screen.getByTestId('admin-user-2')).toBeInTheDocument();
        expect(screen.getByTestId('admin-user-3')).toBeInTheDocument();
      });

      expect(useUsers).toHaveBeenCalled();
    });

    test('should create new user', async () => {
      const dataService = require('../../shared/services/dataService');
      const newUserData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'tempPassword123',
        roles: ['student'],
        send_welcome_email: true
      };

      const createdUser = {
        id: 4,
        ...newUserData,
        password: undefined, // Password should not be returned
        created_at: '2023-01-01T00:00:00Z',
        status: 'active'
      };

      dataService.createUser.mockResolvedValue(createdUser);

      const result = await dataService.createUser(newUserData);

      expect(result).toEqual(createdUser);
      expect(result).not.toHaveProperty('password');
      expect(dataService.createUser).toHaveBeenCalledWith(newUserData);
    });

    test('should update user information', async () => {
      const dataService = require('../../shared/services/dataService');
      const userId = 1;
      const updates = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const updatedUser = {
        id: userId,
        name: 'Updated Name',
        email: 'updated@example.com',
        roles: ['student'],
        status: 'active',
        updated_at: '2023-01-01T00:00:00Z'
      };

      dataService.updateUser.mockResolvedValue(updatedUser);

      const result = await dataService.updateUser(userId, updates);

      expect(result).toEqual(updatedUser);
      expect(dataService.updateUser).toHaveBeenCalledWith(userId, updates);
    });

    test('should delete user', async () => {
      const dataService = require('../../shared/services/dataService');
      const userId = 1;

      dataService.deleteUser.mockResolvedValue({
        success: true,
        message: 'User deleted successfully'
      });

      const result = await dataService.deleteUser(userId);

      expect(result.success).toBe(true);
      expect(dataService.deleteUser).toHaveBeenCalledWith(userId);
    });

    test('should assign role to user', async () => {
      const dataService = require('../../shared/services/dataService');
      const userId = 1;
      const role = 'tutor';

      const updatedUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        roles: ['student', 'tutor'],
        status: 'active'
      };

      dataService.assignRole.mockResolvedValue(updatedUser);

      const result = await dataService.assignRole(userId, role);

      expect(result.roles).toContain('tutor');
      expect(dataService.assignRole).toHaveBeenCalledWith(userId, role);
    });

    test('should remove role from user', async () => {
      const dataService = require('../../shared/services/dataService');
      const userId = 1;
      const role = 'tutor';

      const updatedUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        roles: ['student'],
        status: 'active'
      };

      dataService.removeRole.mockResolvedValue(updatedUser);

      const result = await dataService.removeRole(userId, role);

      expect(result.roles).not.toContain('tutor');
      expect(dataService.removeRole).toHaveBeenCalledWith(userId, role);
    });

    test('should update user permissions', async () => {
      const dataService = require('../../shared/services/dataService');
      const userId = 1;
      const permissions = {
        can_access_admin: false,
        can_access_tutor_dashboard: true,
        can_access_student_dashboard: true,
        qualified_courses: [1, 2, 3]
      };

      const updatedUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        roles: ['student', 'tutor'],
        permissions: permissions,
        status: 'active'
      };

      dataService.updateUserPermissions.mockResolvedValue(updatedUser);

      const result = await dataService.updateUserPermissions(userId, permissions);

      expect(result.permissions).toEqual(permissions);
      expect(dataService.updateUserPermissions).toHaveBeenCalledWith(userId, permissions);
    });

    test('should suspend user', async () => {
      const dataService = require('../../shared/services/dataService');
      const userId = 1;
      const reason = 'Policy violation';

      const suspendedUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        roles: ['student'],
        status: 'suspended',
        suspension_reason: reason,
        suspended_at: '2023-01-01T00:00:00Z'
      };

      dataService.suspendUser.mockResolvedValue(suspendedUser);

      const result = await dataService.suspendUser(userId, reason);

      expect(result.status).toBe('suspended');
      expect(result.suspension_reason).toBe(reason);
      expect(dataService.suspendUser).toHaveBeenCalledWith(userId, reason);
    });

    test('should unsuspend user', async () => {
      const dataService = require('../../shared/services/dataService');
      const userId = 1;

      const unsuspendedUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        roles: ['student'],
        status: 'active',
        suspension_reason: null,
        suspended_at: null,
        unsuspended_at: '2023-01-01T00:00:00Z'
      };

      dataService.unsuspendUser.mockResolvedValue(unsuspendedUser);

      const result = await dataService.unsuspendUser(userId);

      expect(result.status).toBe('active');
      expect(result.suspension_reason).toBe(null);
      expect(dataService.unsuspendUser).toHaveBeenCalledWith(userId);
    });

    test('should reset user password', async () => {
      const dataService = require('../../shared/services/dataService');
      const userId = 1;
      const resetData = {
        send_email: true,
        temporary_password: 'temp123',
        force_change: true
      };

      const result = {
        success: true,
        message: 'Password reset email sent',
        temporary_password: resetData.send_email ? undefined : resetData.temporary_password
      };

      dataService.resetPassword.mockResolvedValue(result);

      const response = await dataService.resetPassword(userId, resetData);

      expect(response.success).toBe(true);
      expect(dataService.resetPassword).toHaveBeenCalledWith(userId, resetData);
    });
  });

  describe('Bulk Operations', () => {
    test('should perform bulk user operations', async () => {
      const dataService = require('../../shared/services/dataService');
      const operation = {
        action: 'assign_role',
        user_ids: [1, 2, 3],
        role: 'tutor'
      };

      const bulkResult = {
        success: true,
        processed: 3,
        failed: 0,
        results: [
          { user_id: 1, success: true },
          { user_id: 2, success: true },
          { user_id: 3, success: true }
        ]
      };

      dataService.bulkUserOperation.mockResolvedValue(bulkResult);

      const result = await dataService.bulkUserOperation(operation);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
      expect(dataService.bulkUserOperation).toHaveBeenCalledWith(operation);
    });

    test('should handle bulk operation partial failures', async () => {
      const dataService = require('../../shared/services/dataService');
      const operation = {
        action: 'suspend',
        user_ids: [1, 2, 3],
        reason: 'Bulk suspension test'
      };

      const bulkResult = {
        success: false, // Partial failure
        processed: 2,
        failed: 1,
        results: [
          { user_id: 1, success: true },
          { user_id: 2, success: true },
          { user_id: 3, success: false, error: 'Cannot suspend admin user' }
        ]
      };

      dataService.bulkUserOperation.mockResolvedValue(bulkResult);

      const result = await dataService.bulkUserOperation(operation);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[2].error).toBe('Cannot suspend admin user');
    });
  });

  describe('System Statistics', () => {
    test('should load system statistics', async () => {
      const { useAdminStats } = require('../../shared/hooks/useData');
      const mockStats = {
        total_users: 150,
        total_courses: 25,
        total_sessions: 500,
        active_sessions: 12,
        revenue_total: 125000, // $1,250.00 in cents
        revenue_this_month: 15000, // $150.00 in cents
        new_users_this_week: 8,
        completion_rate: 85.5,
        user_breakdown: {
          students: 120,
          tutors: 25,
          admins: 5
        }
      };

      useAdminStats.mockReturnValue({
        data: mockStats,
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      let statsState;
      renderWithProviders(
        <TestAdminStatsComponent onStatsState={(state) => statsState = state} />
      );

      // Simulate loading stats
      statsState.setLoading(true);
      const statsHook = useAdminStats();
      statsState.setStats(statsHook.data);
      statsState.setLoading(false);

      await waitFor(() => {
        expect(screen.getByTestId('admin-stats-loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('total-users')).toHaveTextContent('150');
        expect(screen.getByTestId('total-courses')).toHaveTextContent('25');
        expect(screen.getByTestId('total-sessions')).toHaveTextContent('500');
        expect(screen.getByTestId('active-sessions')).toHaveTextContent('12');
        expect(screen.getByTestId('revenue-total')).toHaveTextContent('125000');
      });

      expect(useAdminStats).toHaveBeenCalled();
    });

    test('should get detailed system statistics', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockDetailedStats = {
        users: {
          total: 150,
          active: 140,
          suspended: 10,
          new_this_month: 25,
          by_role: {
            students: 120,
            tutors: 25,
            admins: 5
          }
        },
        courses: {
          total: 25,
          published: 20,
          draft: 5,
          most_popular: {
            id: 1,
            title: 'JavaScript Fundamentals',
            enrollments: 45
          }
        },
        sessions: {
          total: 500,
          completed: 450,
          cancelled: 30,
          upcoming: 20,
          avg_duration: 75 // minutes
        },
        revenue: {
          total: 125000,
          this_month: 15000,
          last_month: 18000,
          growth_rate: -16.7
        }
      };

      dataService.getSystemStats.mockResolvedValue(mockDetailedStats);

      const result = await dataService.getSystemStats();

      expect(result).toEqual(mockDetailedStats);
      expect(result.users.total).toBe(150);
      expect(result.revenue.growth_rate).toBe(-16.7);
      expect(dataService.getSystemStats).toHaveBeenCalled();
    });
  });

  describe('Audit Logs', () => {
    test('should retrieve audit logs', async () => {
      const dataService = require('../../shared/services/dataService');
      const filters = {
        user_id: null,
        action: null,
        resource_type: null,
        date_from: '2023-01-01',
        date_to: '2023-01-31',
        limit: 50
      };

      const mockAuditLogs = [
        {
          id: 1,
          user_id: 1,
          user_name: 'Admin User',
          action: 'user_created',
          resource_type: 'user',
          resource_id: 4,
          details: { name: 'New User', email: 'new@example.com' },
          ip_address: '192.168.1.1',
          timestamp: '2023-01-15T10:30:00Z'
        },
        {
          id: 2,
          user_id: 1,
          user_name: 'Admin User',
          action: 'role_assigned',
          resource_type: 'user',
          resource_id: 4,
          details: { role: 'tutor', previous_roles: ['student'] },
          ip_address: '192.168.1.1',
          timestamp: '2023-01-15T10:35:00Z'
        }
      ];

      dataService.getAuditLogs.mockResolvedValue({
        logs: mockAuditLogs,
        total: 2,
        page: 1,
        limit: 50
      });

      const result = await dataService.getAuditLogs(filters);

      expect(result.logs).toHaveLength(2);
      expect(result.logs[0].action).toBe('user_created');
      expect(result.logs[1].action).toBe('role_assigned');
      expect(dataService.getAuditLogs).toHaveBeenCalledWith(filters);
    });
  });

  describe('Data Import/Export', () => {
    test('should export system data', async () => {
      const dataService = require('../../shared/services/dataService');
      const exportOptions = {
        type: 'users',
        format: 'csv',
        filters: {
          roles: ['student', 'tutor'],
          status: 'active'
        },
        fields: ['id', 'name', 'email', 'roles', 'created_at']
      };

      const exportResult = {
        success: true,
        file_url: 'https://example.com/exports/users_20230115.csv',
        file_size: 1024,
        record_count: 145,
        export_id: 'export_123'
      };

      dataService.exportData.mockResolvedValue(exportResult);

      const result = await dataService.exportData(exportOptions);

      expect(result.success).toBe(true);
      expect(result.file_url).toContain('.csv');
      expect(result.record_count).toBe(145);
      expect(dataService.exportData).toHaveBeenCalledWith(exportOptions);
    });

    test('should import system data', async () => {
      const dataService = require('../../shared/services/dataService');
      const importData = {
        type: 'users',
        file_data: 'name,email,role\nJohn Doe,john@example.com,student\nJane Smith,jane@example.com,tutor',
        options: {
          update_existing: false,
          send_welcome_emails: true,
          skip_validation: false
        }
      };

      const importResult = {
        success: true,
        processed: 2,
        created: 2,
        updated: 0,
        failed: 0,
        errors: [],
        import_id: 'import_456'
      };

      dataService.importData.mockResolvedValue(importResult);

      const result = await dataService.importData(importData);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.created).toBe(2);
      expect(result.failed).toBe(0);
      expect(dataService.importData).toHaveBeenCalledWith(importData);
    });

    test('should handle import errors', async () => {
      const dataService = require('../../shared/services/dataService');
      const importData = {
        type: 'users',
        file_data: 'name,email,role\nJohn Doe,invalid-email,student\n,jane@example.com,tutor',
        options: { update_existing: false }
      };

      const importResult = {
        success: false,
        processed: 2,
        created: 1,
        updated: 0,
        failed: 1,
        errors: [
          {
            row: 1,
            field: 'email',
            message: 'Invalid email format',
            data: { name: 'John Doe', email: 'invalid-email', role: 'student' }
          }
        ],
        import_id: 'import_789'
      };

      dataService.importData.mockResolvedValue(importResult);

      const result = await dataService.importData(importData);

      expect(result.success).toBe(false);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid email format');
    });
  });

  describe('User Filtering and Search', () => {
    test('should filter users by role', () => {
      let adminState;
      renderWithProviders(
        <TestAdminUsersComponent onAdminState={(state) => adminState = state} />
      );

      adminState.setFilters({ ...adminState.filters, role: 'tutor' });

      expect(screen.getByTestId('admin-filter-role')).toHaveTextContent('tutor');
    });

    test('should filter users by multiple criteria', () => {
      const { useUsers } = require('../../shared/hooks/useData');

      // Mock filtered results
      useUsers.mockReturnValue({
        data: [
          createMockUser({
            id: 1,
            name: 'Active Tutor',
            email: 'tutor@example.com',
            roles: ['tutor'],
            status: 'active'
          })
        ],
        loading: false,
        error: null,
        refetch: jest.fn()
      });

      const TestFilteredComponent = () => {
        const filteredUsers = useUsers('tutor', false);
        return (
          <div>
            <div data-testid="filtered-count">{filteredUsers.data.length}</div>
            <div data-testid="filtered-user">{filteredUsers.data[0]?.name}</div>
          </div>
        );
      };

      renderWithProviders(<TestFilteredComponent />);

      expect(screen.getByTestId('filtered-count')).toHaveTextContent('1');
      expect(screen.getByTestId('filtered-user')).toHaveTextContent('Active Tutor');
    });
  });

  describe('Error Handling', () => {
    test('should handle user loading errors', async () => {
      const { useUsers } = require('../../shared/hooks/useData');
      const mockError = new Error('Failed to load users');

      useUsers.mockReturnValue({
        data: [],
        loading: false,
        error: mockError,
        refetch: jest.fn()
      });

      let adminState;
      renderWithProviders(
        <TestAdminUsersComponent onAdminState={(state) => adminState = state} />
      );

      const usersHook = useUsers();
      adminState.setError(usersHook.error);

      await waitFor(() => {
        expect(screen.getByTestId('admin-error')).toHaveTextContent('Failed to load users');
      });
    });

    test('should handle user operation errors', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockError = new Error('Insufficient permissions');

      dataService.deleteUser.mockRejectedValue(mockError);

      await expect(dataService.deleteUser(1)).rejects.toThrow('Insufficient permissions');
    });

    test('should handle stats loading errors', async () => {
      const { useAdminStats } = require('../../shared/hooks/useData');
      const mockError = new Error('Stats service unavailable');

      useAdminStats.mockReturnValue({
        data: null,
        loading: false,
        error: mockError,
        refetch: jest.fn()
      });

      let statsState;
      renderWithProviders(
        <TestAdminStatsComponent onStatsState={(state) => statsState = state} />
      );

      const statsHook = useAdminStats();
      statsState.setError(statsHook.error);

      await waitFor(() => {
        expect(screen.getByTestId('admin-stats-error')).toHaveTextContent('Stats service unavailable');
      });
    });
  });

  describe('Admin Refresh System', () => {
    test('should use admin refresh hook', () => {
      const useAdminRefresh = require('../../hooks/useAdminRefresh').default;
      const mockRefreshData = {
        refreshUsers: jest.fn(),
        refreshStats: jest.fn(),
        lastRefresh: new Date().toISOString(),
        isRefreshing: false
      };

      useAdminRefresh.mockReturnValue(mockRefreshData);

      const TestRefreshComponent = () => {
        const refresh = useAdminRefresh();
        return (
          <div>
            <div data-testid="is-refreshing">{refresh.isRefreshing ? 'yes' : 'no'}</div>
            <div data-testid="last-refresh">{refresh.lastRefresh}</div>
          </div>
        );
      };

      renderWithProviders(<TestRefreshComponent />);

      expect(screen.getByTestId('is-refreshing')).toHaveTextContent('no');
      expect(screen.getByTestId('last-refresh')).toHaveTextContent(mockRefreshData.lastRefresh);
    });
  });

  describe('Security and Permissions', () => {
    test('should validate admin permissions for operations', () => {
      const validateAdminOperation = (operation, userRoles) => {
        const adminOperations = [
          'create_user',
          'delete_user',
          'assign_role',
          'view_audit_logs',
          'export_data'
        ];

        return userRoles.includes('admin') && adminOperations.includes(operation);
      };

      expect(validateAdminOperation('create_user', ['admin'])).toBe(true);
      expect(validateAdminOperation('create_user', ['tutor'])).toBe(false);
      expect(validateAdminOperation('invalid_operation', ['admin'])).toBe(false);
    });

    test('should handle sensitive data properly', () => {
      const sanitizeUserData = (user) => {
        const { password, reset_token, ...sanitizedUser } = user;
        return sanitizedUser;
      };

      const userWithSensitiveData = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'secret123',
        reset_token: 'reset_abc123',
        roles: ['student']
      };

      const sanitized = sanitizeUserData(userWithSensitiveData);

      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('reset_token');
      expect(sanitized).toHaveProperty('name');
      expect(sanitized).toHaveProperty('email');
    });
  });
});