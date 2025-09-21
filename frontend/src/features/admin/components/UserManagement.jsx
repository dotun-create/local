import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Input, Select, Modal, Table, LoadingSpinner } from '@shared/components/ui';
import { useStore } from '@shared/store';
import { adminService } from '../services/adminService';
import './UserManagement.css';

const UserManagement = ({
  pageSize = 20,
  showBulkActions = true,
  className = ''
}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [modals, setModals] = useState({
    createUser: false,
    editUser: false,
    deleteUser: false,
    bulkAction: false
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [roles, setRoles] = useState([]);

  const { notifications } = useStore((state) => state);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [filters, pagination.page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pageSize,
        search: filters.search || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      const response = await adminService.getUsers(params);
      setUsers(response.users || []);
      setPagination({
        page: response.page || 1,
        totalPages: response.totalPages || 1,
        total: response.total || 0
      });
    } catch (err) {
      setError('Failed to load users');
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const rolesData = await adminService.getRoles();
      setRoles(rolesData);
    } catch (err) {
      console.error('Load roles error:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleUserSelect = (userId, checked) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleUserAction = async (action, userId, data = {}) => {
    try {
      switch (action) {
        case 'suspend':
          await adminService.suspendUser(userId, data.reason);
          break;
        case 'activate':
          await adminService.activateUser(userId);
          break;
        case 'resetPassword':
          await adminService.resetUserPassword(userId);
          break;
        case 'updateRole':
          await adminService.assignRole(userId, data.roleId);
          break;
        case 'delete':
          await adminService.deleteUser(userId);
          break;
        default:
          break;
      }

      loadUsers();
      notifications.actions.addNotification({
        type: 'success',
        title: 'Action Completed',
        message: `User ${action} completed successfully`
      });
    } catch (err) {
      notifications.actions.addNotification({
        type: 'error',
        title: 'Action Failed',
        message: `Failed to ${action} user`
      });
    }
  };

  const handleBulkAction = async (action, data = {}) => {
    if (selectedUsers.size === 0) return;

    try {
      const userIds = Array.from(selectedUsers);

      switch (action) {
        case 'suspend':
          await Promise.all(userIds.map(id => adminService.suspendUser(id, data.reason)));
          break;
        case 'activate':
          await Promise.all(userIds.map(id => adminService.activateUser(id)));
          break;
        case 'updateRole':
          await adminService.bulkUpdateUsers(userIds, { role: data.roleId });
          break;
        case 'delete':
          await Promise.all(userIds.map(id => adminService.deleteUser(id)));
          break;
        default:
          break;
      }

      setSelectedUsers(new Set());
      loadUsers();
      setModals(prev => ({ ...prev, bulkAction: false }));

      notifications.actions.addNotification({
        type: 'success',
        title: 'Bulk Action Completed',
        message: `${action} completed for ${userIds.length} users`
      });
    } catch (err) {
      notifications.actions.addNotification({
        type: 'error',
        title: 'Bulk Action Failed',
        message: `Failed to ${action} selected users`
      });
    }
  };

  const renderFilters = () => (
    <Card className="user-filters">
      <div className="filters-content">
        <div className="filter-group">
          <Input
            placeholder="Search users..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            icon="🔍"
          />
        </div>

        <div className="filter-group">
          <Select
            value={filters.role}
            onChange={(value) => handleFilterChange('role', value)}
            placeholder="All Roles"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role.id} value={role.name}>
                {adminService.formatUserRole(role.name)}
              </option>
            ))}
          </Select>
        </div>

        <div className="filter-group">
          <Select
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            placeholder="All Statuses"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </Select>
        </div>

        <div className="filter-group">
          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(value) => {
              const [sortBy, sortOrder] = value.split('-');
              handleFilterChange('sortBy', sortBy);
              handleFilterChange('sortOrder', sortOrder);
            }}
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="lastLogin-desc">Last Login</option>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={() => setModals(prev => ({ ...prev, createUser: true }))}
        >
          ➕ Add User
        </Button>
      </div>
    </Card>
  );

  const renderBulkActions = () => {
    if (!showBulkActions || selectedUsers.size === 0) return null;

    return (
      <Card className="bulk-actions">
        <div className="bulk-actions-content">
          <span className="selection-count">
            {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
          </span>
          <div className="bulk-buttons">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModals(prev => ({ ...prev, bulkAction: true }))}
            >
              Bulk Actions
            </Button>
            <Button
              variant="text"
              size="sm"
              onClick={() => setSelectedUsers(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const renderUserTable = () => {
    const columns = [
      {
        key: 'select',
        header: (
          <input
            type="checkbox"
            checked={selectedUsers.size === users.length && users.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        ),
        render: (user) => (
          <input
            type="checkbox"
            checked={selectedUsers.has(user.id)}
            onChange={(e) => handleUserSelect(user.id, e.target.checked)}
          />
        )
      },
      {
        key: 'user',
        header: 'User',
        render: (user) => (
          <div className="user-cell">
            <div className="user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user.name?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
        )
      },
      {
        key: 'role',
        header: 'Role',
        render: (user) => (
          <Badge variant="secondary">
            {adminService.formatUserRole(user.role)}
          </Badge>
        )
      },
      {
        key: 'status',
        header: 'Status',
        render: (user) => (
          <Badge
            variant={user.status === 'active' ? 'success' :
                   user.status === 'suspended' ? 'danger' : 'warning'}
          >
            {adminService.getStatusIcon(user.status)} {user.status}
          </Badge>
        )
      },
      {
        key: 'lastLogin',
        header: 'Last Login',
        render: (user) => (
          <span className="last-login">
            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
          </span>
        )
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (user) => (
          <div className="user-actions">
            <Button
              variant="text"
              size="sm"
              onClick={() => {
                setSelectedUser(user);
                setModals(prev => ({ ...prev, editUser: true }));
              }}
            >
              Edit
            </Button>
            {user.status === 'active' ? (
              <Button
                variant="text"
                size="sm"
                onClick={() => handleUserAction('suspend', user.id, { reason: 'Manual suspension' })}
              >
                Suspend
              </Button>
            ) : (
              <Button
                variant="text"
                size="sm"
                onClick={() => handleUserAction('activate', user.id)}
              >
                Activate
              </Button>
            )}
          </div>
        )
      }
    ];

    return (
      <Card className="users-table">
        <Table
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No users found"
        />

        {pagination.totalPages > 1 && (
          <div className="table-pagination">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>

            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="user-management loading">
        <LoadingSpinner size="large" />
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className={`user-management ${className}`}>
      <div className="management-header">
        <h1>User Management</h1>
        <p>Manage user accounts, roles, and permissions</p>
      </div>

      {error && (
        <div className="management-error">
          <p>{error}</p>
          <Button variant="text" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {renderFilters()}
      {renderBulkActions()}
      {renderUserTable()}

      {/* Add modals for create, edit, delete, bulk actions */}
    </div>
  );
};

export default UserManagement;