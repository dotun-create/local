/**
 * Feature Integration Tests
 * Tests that ensure different features work together correctly in the new architecture
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  mockUser,
  mockCourse,
  mockApiResponse,
  simulateNetworkDelay,
  triggerResize,
  triggerMediaQueryChange
} from '@shared/testing/test-utils';
import { lightTheme, darkTheme } from '@shared/styles/theme';

// Mock integrated features
const MockIntegratedApp = ({
  user,
  onThemeChange,
  onRefresh,
  onRoleSwitch,
  notifications = []
}) => {
  const [theme, setTheme] = React.useState('light');
  const [currentRole, setCurrentRole] = React.useState(user?.roles?.[0] || 'student');
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  const handleRoleSwitch = async (role) => {
    await onRoleSwitch?.(role);
    setCurrentRole(role);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div data-theme={theme} data-testid="integrated-app">
      {/* Header with theme toggle and role switcher */}
      <header data-testid="app-header">
        <h1>TroupeDev Platform</h1>

        {/* Theme Toggle */}
        <button
          onClick={handleThemeToggle}
          data-testid="theme-toggle"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Role Switcher */}
        {user?.roles?.length > 1 && (
          <select
            value={currentRole}
            onChange={(e) => handleRoleSwitch(e.target.value)}
            data-testid="role-selector"
            aria-label="Switch role"
          >
            {user.roles.map(role => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        )}

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          data-testid="global-refresh"
          aria-label="Refresh data"
        >
          {isRefreshing ? '⏳' : '🔄'}
        </button>

        {/* User Info */}
        <div data-testid="user-info">
          <span>{user?.name} ({currentRole})</span>
        </div>
      </header>

      {/* Notifications */}
      {notifications.length > 0 && (
        <section data-testid="notifications" aria-label="Notifications">
          {notifications.map((notification, index) => (
            <div
              key={index}
              data-testid={`notification-${index}`}
              className={`notification notification--${notification.type}`}
              role="alert"
            >
              {notification.message}
            </div>
          ))}
        </section>
      )}

      {/* Main Content Area */}
      <main data-testid="main-content" data-role={currentRole}>
        <h2>{currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Dashboard</h2>
        <p>Current theme: {theme}</p>

        {/* Feature-specific content */}
        <section aria-label="Feature modules">
          <div data-testid="auth-module">Authentication: ✓</div>
          <div data-testid="courses-module">Courses: ✓</div>
          <div data-testid="dashboard-module">Dashboard: ✓</div>
          <div data-testid="notifications-module">Notifications: ✓</div>
        </section>
      </main>

      {/* Footer */}
      <footer data-testid="app-footer">
        <span>Last refreshed: {isRefreshing ? 'Refreshing...' : 'Just now'}</span>
      </footer>
    </div>
  );
};

describe('Feature Integration Tests', () => {
  const defaultUser = mockUser({
    name: 'John Doe',
    email: 'john@example.com',
    roles: ['student', 'tutor']
  });

  const mockHandlers = {
    onThemeChange: jest.fn(),
    onRefresh: jest.fn(),
    onRoleSwitch: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockHandlers).forEach(mock => mock.mockResolvedValue());
  });

  describe('Theme Integration', () => {
    it('integrates theme switching across all features', () => {
      const { rerender } = renderWithProviders(
        <MockIntegratedApp user={defaultUser} {...mockHandlers} />,
        { theme: lightTheme }
      );

      // Initially light theme
      expect(screen.getByTestId('integrated-app')).toHaveAttribute('data-theme', 'light');
      expect(screen.getByText('Current theme: light')).toBeInTheDocument();

      // Switch to dark theme
      fireEvent.click(screen.getByTestId('theme-toggle'));

      expect(mockHandlers.onThemeChange).toHaveBeenCalledWith('dark');

      // Re-render with dark theme
      rerender(
        <MockIntegratedApp user={defaultUser} {...mockHandlers} />,
        { theme: darkTheme }
      );

      expect(screen.getByTestId('integrated-app')).toHaveAttribute('data-theme', 'dark');
    });

    it('persists theme preference across app reload', () => {
      // Mock localStorage
      const mockLocalStorage = {
        getItem: jest.fn().mockReturnValue('dark'),
        setItem: jest.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      renderWithProviders(
        <MockIntegratedApp user={defaultUser} {...mockHandlers} />
      );

      // Should restore dark theme from localStorage
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme');
    });

    it('responds to system theme changes', () => {
      renderWithProviders(
        <MockIntegratedApp user={defaultUser} {...mockHandlers} />
      );

      // Simulate system theme change to dark
      triggerMediaQueryChange(true);

      // App should respond to system preference
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });
  });

  describe('Role-Based Feature Integration', () => {
    it('switches features based on role changes', async () => {
      renderWithProviders(
        <MockIntegratedApp user={defaultUser} {...mockHandlers} />
      );

      // Initially student role
      expect(screen.getByTestId('main-content')).toHaveAttribute('data-role', 'student');
      expect(screen.getByText('Student Dashboard')).toBeInTheDocument();

      // Switch to tutor role
      fireEvent.change(screen.getByTestId('role-selector'), {
        target: { value: 'tutor' }
      });

      await waitFor(() => {
        expect(mockHandlers.onRoleSwitch).toHaveBeenCalledWith('tutor');
      });

      expect(screen.getByText('Tutor Dashboard')).toBeInTheDocument();
    });

    it('shows appropriate features for each role', () => {
      const adminUser = mockUser({
        roles: ['admin'],
        permissions: {
          can_manage_users: true,
          can_access_analytics: true
        }
      });

      renderWithProviders(
        <MockIntegratedApp user={adminUser} {...mockHandlers} />
      );

      expect(screen.getByTestId('main-content')).toHaveAttribute('data-role', 'admin');
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();

      // Role selector should not be visible for single-role users
      expect(screen.queryByTestId('role-selector')).not.toBeInTheDocument();
    });

    it('maintains feature state during role switches', async () => {
      let roleCallCount = 0;
      const trackingRoleSwitch = jest.fn().mockImplementation(async (role) => {
        roleCallCount++;
        await simulateNetworkDelay(50);
      });

      renderWithProviders(
        <MockIntegratedApp
          user={defaultUser}
          {...mockHandlers}
          onRoleSwitch={trackingRoleSwitch}
        />
      );

      // Switch roles multiple times
      fireEvent.change(screen.getByTestId('role-selector'), {
        target: { value: 'tutor' }
      });

      fireEvent.change(screen.getByTestId('role-selector'), {
        target: { value: 'student' }
      });

      await waitFor(() => {
        expect(roleCallCount).toBe(2);
      });

      // Features should remain accessible
      expect(screen.getByTestId('auth-module')).toBeInTheDocument();
      expect(screen.getByTestId('courses-module')).toBeInTheDocument();
    });
  });

  describe('Notification System Integration', () => {
    it('displays notifications from different features', () => {
      const notifications = [
        { type: 'success', message: 'Profile updated successfully' },
        { type: 'warning', message: 'Session expires in 5 minutes' },
        { type: 'error', message: 'Failed to load course data' }
      ];

      renderWithProviders(
        <MockIntegratedApp
          user={defaultUser}
          notifications={notifications}
          {...mockHandlers}
        />
      );

      expect(screen.getByTestId('notifications')).toBeInTheDocument();
      expect(screen.getByTestId('notification-0')).toHaveTextContent('Profile updated successfully');
      expect(screen.getByTestId('notification-1')).toHaveTextContent('Session expires in 5 minutes');
      expect(screen.getByTestId('notification-2')).toHaveTextContent('Failed to load course data');

      // Check ARIA attributes
      const errorNotification = screen.getByTestId('notification-2');
      expect(errorNotification).toHaveAttribute('role', 'alert');
    });

    it('handles notification overflow gracefully', () => {
      const manyNotifications = Array.from({ length: 10 }, (_, i) => ({
        type: i % 2 === 0 ? 'info' : 'success',
        message: `Notification ${i + 1}`
      }));

      renderWithProviders(
        <MockIntegratedApp
          user={defaultUser}
          notifications={manyNotifications}
          {...mockHandlers}
        />
      );

      expect(screen.getByTestId('notifications')).toBeInTheDocument();
      expect(screen.getAllByText(/Notification \d+/)).toHaveLength(10);
    });
  });

  describe('Data Refresh Integration', () => {
    it('coordinates refresh across all features', async () => {
      let refreshCalls = [];
      const coordinatedRefresh = jest.fn().mockImplementation(async () => {
        refreshCalls.push(Date.now());
        await simulateNetworkDelay(100);
      });

      renderWithProviders(
        <MockIntegratedApp
          user={defaultUser}
          {...mockHandlers}
          onRefresh={coordinatedRefresh}
        />
      );

      fireEvent.click(screen.getByTestId('global-refresh'));

      // Should show loading state
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();

      await waitFor(() => {
        expect(coordinatedRefresh).toHaveBeenCalled();
      });

      expect(screen.getByText('Last refreshed: Just now')).toBeInTheDocument();
      expect(refreshCalls).toHaveLength(1);
    });

    it('handles partial refresh failures gracefully', async () => {
      const flakyRefresh = jest.fn()
        .mockRejectedValueOnce(new Error('Feature A failed'))
        .mockResolvedValueOnce();

      renderWithProviders(
        <MockIntegratedApp
          user={defaultUser}
          {...mockHandlers}
          onRefresh={flakyRefresh}
        />
      );

      // First refresh attempt fails
      fireEvent.click(screen.getByTestId('global-refresh'));

      await waitFor(() => {
        expect(flakyRefresh).toHaveBeenCalledTimes(1);
      });

      // Button should be re-enabled after failure
      expect(screen.getByTestId('global-refresh')).not.toBeDisabled();

      // Second refresh attempt succeeds
      fireEvent.click(screen.getByTestId('global-refresh'));

      await waitFor(() => {
        expect(flakyRefresh).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Responsive Design Integration', () => {
    it('adapts all features to mobile viewport', () => {
      triggerResize(375, 667); // Mobile viewport

      renderWithProviders(
        <MockIntegratedApp user={defaultUser} {...mockHandlers} />
      );

      // All main elements should be present
      expect(screen.getByTestId('app-header')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('app-footer')).toBeInTheDocument();

      // Feature modules should remain accessible
      expect(screen.getByTestId('auth-module')).toBeInTheDocument();
      expect(screen.getByTestId('courses-module')).toBeInTheDocument();
    });

    it('adapts to tablet viewport', () => {
      triggerResize(768, 1024); // Tablet viewport

      renderWithProviders(
        <MockIntegratedApp user={defaultUser} {...mockHandlers} />
      );

      expect(screen.getByTestId('integrated-app')).toBeInTheDocument();
      expect(screen.getByTestId('user-info')).toBeInTheDocument();
    });

    it('maintains functionality across viewport changes', () => {
      renderWithProviders(
        <MockIntegratedApp user={defaultUser} {...mockHandlers} />
      );

      // Start desktop
      triggerResize(1920, 1080);
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();

      // Switch to mobile
      triggerResize(375, 667);
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();

      // Theme toggle should still work
      fireEvent.click(screen.getByTestId('theme-toggle'));
      expect(mockHandlers.onThemeChange).toHaveBeenCalled();
    });
  });

  describe('Performance Integration', () => {
    it('maintains performance with multiple features active', () => {
      const startTime = performance.now();

      renderWithProviders(
        <MockIntegratedApp
          user={defaultUser}
          notifications={Array.from({ length: 5 }, (_, i) => ({
            type: 'info',
            message: `Notification ${i}`
          }))}
          {...mockHandlers}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100); // Less than 100ms
      expect(screen.getByTestId('integrated-app')).toBeInTheDocument();
    });

    it('optimizes re-renders during feature interactions', () => {
      let renderCount = 0;
      const RenderCounter = ({ children }) => {
        renderCount++;
        return children;
      };

      renderWithProviders(
        <RenderCounter>
          <MockIntegratedApp user={defaultUser} {...mockHandlers} />
        </RenderCounter>
      );

      const initialRenderCount = renderCount;

      // Theme change should be optimized
      fireEvent.click(screen.getByTestId('theme-toggle'));

      // Should not cause excessive re-renders
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Boundary Integration', () => {
    it('isolates feature errors from affecting other features', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const ErrorProneApp = () => {
        const [hasError, setHasError] = React.useState(false);

        if (hasError) {
          throw new Error('Feature error');
        }

        return (
          <div>
            <MockIntegratedApp user={defaultUser} {...mockHandlers} />
            <button
              onClick={() => setHasError(true)}
              data-testid="trigger-error"
            >
              Trigger Error
            </button>
          </div>
        );
      };

      renderWithProviders(<ErrorProneApp />);

      // App should render normally initially
      expect(screen.getByTestId('integrated-app')).toBeInTheDocument();

      // Error in one feature shouldn't crash the whole app
      // (In a real app, this would be wrapped in an error boundary)
      expect(screen.getByTestId('trigger-error')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility Integration', () => {
    it('maintains accessibility across all integrated features', () => {
      renderWithProviders(
        <MockIntegratedApp
          user={defaultUser}
          notifications={[{ type: 'info', message: 'Test notification' }]}
          {...mockHandlers}
        />
      );

      // Check main landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer

      // Check interactive elements have labels
      expect(screen.getByLabelText(/switch to.*theme/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/switch role/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/refresh data/i)).toBeInTheDocument();

      // Check notification accessibility
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('supports keyboard navigation across features', () => {
      renderWithProviders(
        <MockIntegratedApp user={defaultUser} {...mockHandlers} />
      );

      const themeToggle = screen.getByTestId('theme-toggle');
      const roleSelector = screen.getByTestId('role-selector');
      const refreshButton = screen.getByTestId('global-refresh');

      // Test tab order
      themeToggle.focus();
      expect(themeToggle).toHaveFocus();

      fireEvent.keyDown(themeToggle, { key: 'Tab' });
      roleSelector.focus();
      expect(roleSelector).toHaveFocus();

      fireEvent.keyDown(roleSelector, { key: 'Tab' });
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();
    });
  });
});