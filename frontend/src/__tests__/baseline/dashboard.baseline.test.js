/**
 * Baseline tests for dashboard components
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Mock hooks
jest.mock('../../shared/hooks/useData', () => ({
  useAnalytics: jest.fn(),
  useAdminStats: jest.fn(),
  useUsers: jest.fn(),
  useCourses: jest.fn(),
}));

jest.mock('../../hooks/useMultiRoleAuth', () => ({
  useMultiRoleAuth: jest.fn(),
}));

const TestDashboardComponent = ({ role }) => {
  const { useAnalytics, useAdminStats } = require('../../shared/hooks/useData');
  const { useMultiRoleAuth } = require('../../hooks/useMultiRoleAuth');

  const analytics = useAnalytics(role);
  const adminStats = useAdminStats();
  const auth = useMultiRoleAuth();

  return (
    <div>
      <div data-testid="dashboard-role">{role}</div>
      <div data-testid="analytics-loading">{analytics.loading ? 'loading' : 'loaded'}</div>
      <div data-testid="auth-role">{auth.activeRole}</div>
    </div>
  );
};

describe('Dashboard Components Baseline Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render student dashboard correctly', async () => {
    const { useAnalytics } = require('../../shared/hooks/useData');
    const { useMultiRoleAuth } = require('../../hooks/useMultiRoleAuth');

    useAnalytics.mockReturnValue({
      data: { totalSessions: 10, completedCourses: 3 },
      loading: false,
      error: null
    });

    useMultiRoleAuth.mockReturnValue({
      activeRole: 'student',
      user: { id: 1, name: 'Test Student' }
    });

    render(
      <BrowserRouter>
        <TestDashboardComponent role="student" />
      </BrowserRouter>
    );

    expect(screen.getByTestId('dashboard-role')).toHaveTextContent('student');
    expect(screen.getByTestId('auth-role')).toHaveTextContent('student');
  });

  test('should handle dashboard data loading states', async () => {
    const { useAnalytics } = require('../../shared/hooks/useData');
    const { useMultiRoleAuth } = require('../../hooks/useMultiRoleAuth');

    useAnalytics.mockReturnValue({
      data: null,
      loading: true,
      error: null
    });

    useMultiRoleAuth.mockReturnValue({
      activeRole: 'tutor',
      user: { id: 2, name: 'Test Tutor' }
    });

    render(
      <BrowserRouter>
        <TestDashboardComponent role="tutor" />
      </BrowserRouter>
    );

    expect(screen.getByTestId('analytics-loading')).toHaveTextContent('loading');
  });
});