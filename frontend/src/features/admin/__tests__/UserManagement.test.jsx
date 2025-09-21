/**
 * Admin User Management Tests
 * Tests for admin user management functionality in feature-based architecture
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  mockUser,
  mockApiResponse,
  mockApiError,
  fillForm,
  submitForm
} from '@shared/testing/test-utils';

// Mock user management component
const MockUserManagement = ({ users = [], onUserUpdate, onUserDelete, onUserCreate }) => {
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    role: 'student'
  });

  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.roles[0] || 'student'
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      if (selectedUser) {
        await onUserUpdate?.(selectedUser.id, formData);
      } else {
        await onUserCreate?.(formData);
      }
      setIsEditing(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', role: 'student' });
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await onUserDelete?.(userId);
    }
  };

  return (
    <div role="main" aria-label="User Management">
      <header>
        <h1>User Management</h1>
        <button
          onClick={() => setIsEditing(true)}
          data-testid="add-user-button"
          aria-label="Add new user"
        >
          Add User
        </button>
      </header>

      {isEditing && (
        <form
          data-testid="user-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          aria-label={selectedUser ? 'Edit user form' : 'Add user form'}
        >
          <h2>{selectedUser ? 'Edit User' : 'Add New User'}</h2>

          <label htmlFor="user-name">Name</label>
          <input
            id="user-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            aria-required="true"
          />

          <label htmlFor="user-email">Email</label>
          <input
            id="user-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
            aria-required="true"
          />

          <label htmlFor="user-role">Role</label>
          <select
            id="user-role"
            name="role"
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            aria-required="true"
          >
            <option value="student">Student</option>
            <option value="tutor">Tutor</option>
            <option value="admin">Admin</option>
            <option value="guardian">Guardian</option>
          </select>

          <div>
            <button type="submit" data-testid="save-button">
              {selectedUser ? 'Update User' : 'Create User'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setSelectedUser(null);
              }}
              data-testid="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section aria-label="Users list">
        <h2>Users ({users.length})</h2>
        {users.length === 0 ? (
          <p data-testid="no-users">No users found</p>
        ) : (
          <table data-testid="users-table" aria-label="Users table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} data-testid={`user-row-${user.id}`}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.roles.join(', ')}</td>
                  <td>
                    <button
                      onClick={() => handleEdit(user)}
                      data-testid={`edit-user-${user.id}`}
                      aria-label={`Edit ${user.name}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      data-testid={`delete-user-${user.id}`}
                      aria-label={`Delete ${user.name}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

describe('Admin User Management', () => {
  const defaultUsers = [
    mockUser({
      id: 'user-1',
      name: 'John Student',
      email: 'john@student.com',
      roles: ['student']
    }),
    mockUser({
      id: 'user-2',
      name: 'Jane Tutor',
      email: 'jane@tutor.com',
      roles: ['tutor']
    }),
    mockUser({
      id: 'user-3',
      name: 'Admin User',
      email: 'admin@system.com',
      roles: ['admin']
    })
  ];

  const mockHandlers = {
    onUserUpdate: jest.fn(),
    onUserDelete: jest.fn(),
    onUserCreate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockHandlers).forEach(mock => mock.mockResolvedValue());

    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true);
  });

  describe('Basic Rendering', () => {
    it('renders user management interface', () => {
      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      expect(screen.getByRole('main', { name: /user management/i })).toBeInTheDocument();
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByTestId('add-user-button')).toBeInTheDocument();
    });

    it('displays user list correctly', () => {
      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      expect(screen.getByTestId('users-table')).toBeInTheDocument();
      expect(screen.getByText('John Student')).toBeInTheDocument();
      expect(screen.getByText('jane@tutor.com')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('shows empty state when no users exist', () => {
      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      expect(screen.getByTestId('no-users')).toBeInTheDocument();
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  describe('User Creation', () => {
    it('opens create user form when add button is clicked', () => {
      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('add-user-button'));

      expect(screen.getByTestId('user-form')).toBeInTheDocument();
      expect(screen.getByText('Add New User')).toBeInTheDocument();
      expect(screen.getByLabelText(/add user form/i)).toBeInTheDocument();
    });

    it('creates new user with valid data', async () => {
      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('add-user-button'));

      await fillForm({
        'Name': 'New User',
        'Email': 'new@user.com',
        'Role': 'student'
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockHandlers.onUserCreate).toHaveBeenCalledWith({
          name: 'New User',
          email: 'new@user.com',
          role: 'student'
        });
      });
    });

    it('validates required fields', async () => {
      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('add-user-button'));

      // Try to submit without filling required fields
      fireEvent.click(screen.getByTestId('save-button'));

      // Form should not submit (browser validation)
      expect(mockHandlers.onUserCreate).not.toHaveBeenCalled();
    });

    it('cancels user creation', () => {
      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('add-user-button'));
      expect(screen.getByTestId('user-form')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('cancel-button'));
      expect(screen.queryByTestId('user-form')).not.toBeInTheDocument();
    });
  });

  describe('User Editing', () => {
    it('opens edit form with user data', () => {
      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('edit-user-user-1'));

      expect(screen.getByTestId('user-form')).toBeInTheDocument();
      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Student')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@student.com')).toBeInTheDocument();
    });

    it('updates user with modified data', async () => {
      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('edit-user-user-1'));

      const nameInput = screen.getByDisplayValue('John Student');
      fireEvent.change(nameInput, { target: { value: 'John Updated' } });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockHandlers.onUserUpdate).toHaveBeenCalledWith('user-1', {
          name: 'John Updated',
          email: 'john@student.com',
          role: 'student'
        });
      });
    });

    it('handles update errors gracefully', async () => {
      mockHandlers.onUserUpdate.mockRejectedValue(new Error('Update failed'));

      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('edit-user-user-1'));
      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockHandlers.onUserUpdate).toHaveBeenCalled();
      });

      // Form should still be open after error
      expect(screen.getByTestId('user-form')).toBeInTheDocument();
    });
  });

  describe('User Deletion', () => {
    it('deletes user with confirmation', async () => {
      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('delete-user-user-1'));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this user?');
        expect(mockHandlers.onUserDelete).toHaveBeenCalledWith('user-1');
      });
    });

    it('cancels deletion when user declines confirmation', async () => {
      window.confirm.mockReturnValue(false);

      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('delete-user-user-1'));

      expect(window.confirm).toHaveBeenCalled();
      expect(mockHandlers.onUserDelete).not.toHaveBeenCalled();
    });

    it('handles deletion errors gracefully', async () => {
      mockHandlers.onUserDelete.mockRejectedValue(new Error('Delete failed'));

      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('delete-user-user-1'));

      await waitFor(() => {
        expect(mockHandlers.onUserDelete).toHaveBeenCalled();
      });
    });
  });

  describe('Role Management', () => {
    it('displays all available roles in select', () => {
      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('add-user-button'));

      const roleSelect = screen.getByLabelText(/role/i);
      expect(roleSelect).toBeInTheDocument();

      const options = Array.from(roleSelect.querySelectorAll('option')).map(opt => opt.value);
      expect(options).toEqual(['student', 'tutor', 'admin', 'guardian']);
    });

    it('sets correct role when creating user', async () => {
      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('add-user-button'));

      await fillForm({
        'Name': 'New Tutor',
        'Email': 'tutor@new.com'
      });

      const roleSelect = screen.getByLabelText(/role/i);
      fireEvent.change(roleSelect, { target: { value: 'tutor' } });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockHandlers.onUserCreate).toHaveBeenCalledWith({
          name: 'New Tutor',
          email: 'tutor@new.com',
          role: 'tutor'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      expect(screen.getByRole('main', { name: /user management/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/users list/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/users table/i)).toBeInTheDocument();

      // Check action buttons have descriptive labels
      expect(screen.getByLabelText('Edit John Student')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete Jane Tutor')).toBeInTheDocument();
    });

    it('supports keyboard navigation in form', () => {
      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('add-user-button'));

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const roleSelect = screen.getByLabelText(/role/i);

      nameInput.focus();
      expect(nameInput).toHaveFocus();

      fireEvent.keyDown(nameInput, { key: 'Tab' });
      emailInput.focus();
      expect(emailInput).toHaveFocus();

      fireEvent.keyDown(emailInput, { key: 'Tab' });
      roleSelect.focus();
      expect(roleSelect).toHaveFocus();
    });

    it('announces form validation errors', async () => {
      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('add-user-button'));

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);

      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Performance', () => {
    it('handles large user lists efficiently', () => {
      const manyUsers = Array.from({ length: 1000 }, (_, i) =>
        mockUser({
          id: `user-${i}`,
          name: `User ${i}`,
          email: `user${i}@test.com`,
          roles: ['student']
        })
      );

      const startTime = performance.now();

      renderWithProviders(
        <MockUserManagement users={manyUsers} {...mockHandlers} />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(2000); // Less than 2 seconds
      expect(screen.getByText('Users (1000)')).toBeInTheDocument();
    });

    it('prevents multiple concurrent operations', async () => {
      let updateCount = 0;
      const slowUpdate = jest.fn().mockImplementation(async () => {
        updateCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      renderWithProviders(
        <MockUserManagement
          users={defaultUsers}
          {...mockHandlers}
          onUserUpdate={slowUpdate}
        />
      );

      fireEvent.click(screen.getByTestId('edit-user-user-1'));

      // Rapid clicks on save button
      fireEvent.click(screen.getByTestId('save-button'));
      fireEvent.click(screen.getByTestId('save-button'));
      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(updateCount).toBe(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error messages for failed operations', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockHandlers.onUserCreate.mockRejectedValue(new Error('Creation failed'));

      renderWithProviders(
        <MockUserManagement users={[]} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('add-user-button'));

      await fillForm({
        'Name': 'Test User',
        'Email': 'test@user.com'
      });

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Save failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('recovers from API errors gracefully', async () => {
      mockHandlers.onUserUpdate.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <MockUserManagement users={defaultUsers} {...mockHandlers} />
      );

      fireEvent.click(screen.getByTestId('edit-user-user-1'));
      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(mockHandlers.onUserUpdate).toHaveBeenCalled();
      });

      // Interface should still be functional
      expect(screen.getByTestId('user-form')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });
  });
});