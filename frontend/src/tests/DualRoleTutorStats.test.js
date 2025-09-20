/**
 * Comprehensive Test Suite for Dual-Role Tutor Stats Overview Feature
 * Tests the tutor stats display when dual-role users switch to tutor mode
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import StudentDashboard from '../components/dashboard/StudentDashboard';
import { RoleProvider } from '../hooks/useMultiRoleAuth';
import API from '../services/api';

// Mock the API module
jest.mock('../services/api', () => ({
  sessions: {
    getUpcomingSessions: jest.fn(),
    getSessionHistory: jest.fn(),
  },
  analytics: {
    getEarnings: jest.fn(),
    getDashboardStats: jest.fn(),
  },
  users: {
    getProfile: jest.fn(),
  },
  courses: {
    getCourses: jest.fn(),
    enrollStudent: jest.fn(),
  },
  enrollments: {
    getEnrollments: jest.fn(),
  },
  studentTasks: {
    getUpcomingTasks: jest.fn(),
  },
  auth: {
    changePassword: jest.fn(),
  },
}));

// Mock hooks
jest.mock('../hooks/useData', () => ({
  useAnalytics: () => ({
    data: {
      totalCredits: 100,
      completedCourses: 2,
      ongoingCourses: 1
    }
  }),
  useSessions: () => ({ upcomingSessions: [] }),
  useEnrollments: () => ({
    enrollments: [
      {
        id: 'enrollment-1',
        course: {
          id: 'course-1',
          title: 'Test Course',
          thumbnail: '/test.jpg'
        },
        progress: 50,
        status: 'active'
      }
    ],
    loading: false,
    error: null
  }),
  useAuth: () => ({ logout: jest.fn() }),
}));

jest.mock('../hooks/useAdminRefresh', () => ({
  useStudentPageRefresh: () => ({ triggerRefresh: jest.fn(), isRefreshing: false }),
}));

// Mock useMultiRoleAuth hook to control role switching
const mockUseMultiRoleAuth = {
  user: null,
  activeRole: 'student',
  isMultiRole: jest.fn(() => true),
  canAccessTutorDashboard: jest.fn(() => true),
  isStudent: jest.fn(() => true),
  isTutor: jest.fn(() => true),
  switchRole: jest.fn(),
  hasRole: jest.fn(),
  hasPermission: jest.fn(),
  canAccessDashboard: jest.fn(() => true),
  getAvailableRoles: jest.fn(() => ['student', 'tutor']),
  isAuthenticated: true
};

jest.mock('../hooks/useMultiRoleAuth', () => ({
  useMultiRoleAuth: () => mockUseMultiRoleAuth,
  RoleProvider: ({ children }) => <div data-testid="role-provider">{children}</div>
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

// Mock data
const mockTutorStatsData = {
  upcomingSessions: [
    {
      id: 'session-1',
      topic: 'Math Tutorial',
      course: 'Advanced Mathematics',
      date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      instructor: 'Test Tutor',
      duration: '1 hour'
    },
    {
      id: 'session-2',
      topic: 'Physics Session',
      course: 'Physics 101',
      date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      instructor: 'Test Tutor',
      duration: '45 minutes'
    }
  ],
  earnings: {
    totalEarnings: 1250.75,
    pendingPayouts: 450.25,
    thisMonth: 890.50,
    lastMonth: 750.00,
    hourlyRate: 25,
    currency: 'GBP'
  },
  dashboardStats: {
    totalSessions: 45,
    completedSessions: 42,
    upcomingCount: 3,
    rating: 4.8
  },
  sessionHistory: [
    {
      id: 'hist-1',
      topic: 'Previous Math Session',
      course: 'Advanced Mathematics',
      date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      status: 'completed'
    },
    {
      id: 'hist-2',
      topic: 'Previous Physics Session',
      course: 'Physics 101',
      date: new Date(Date.now() - 172800000).toISOString(), // Two days ago
      status: 'completed'
    }
  ]
};

const mockDualRoleUser = {
  id: 'user-123',
  email: 'dualrole@test.com',
  roles: ['student', 'tutor'],
  profile: {
    name: 'Test Dual Role User'
  },
  rating: 4.8,
  grade: 'Year 12'
};

describe('Dual-Role Tutor Stats Overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock state
    mockUseMultiRoleAuth.user = mockDualRoleUser;
    mockUseMultiRoleAuth.activeRole = 'student';

    // Setup default API mock responses
    API.sessions.getUpcomingSessions.mockResolvedValue(mockTutorStatsData.upcomingSessions);
    API.sessions.getSessionHistory.mockResolvedValue(mockTutorStatsData.sessionHistory);
    API.analytics.getEarnings.mockResolvedValue(mockTutorStatsData.earnings);
    API.analytics.getDashboardStats.mockResolvedValue(mockTutorStatsData.dashboardStats);
    API.users.getProfile.mockResolvedValue({ credits: 100 });
    API.courses.getCourses.mockResolvedValue({ courses: [] });
    API.enrollments.getEnrollments.mockResolvedValue({ enrollments: [] });
    API.studentTasks.getUpcomingTasks.mockResolvedValue({ tasks: [] });
  });

  describe('Role-Based Overview Display', () => {
    test('displays student overview when in student mode', async () => {
      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/completed courses/i)).toBeInTheDocument();
        expect(screen.getByText(/ongoing courses/i)).toBeInTheDocument();
        expect(screen.getByText(/total credits/i)).toBeInTheDocument();
        expect(screen.getByText(/current level/i)).toBeInTheDocument();
      });

      // Should not show tutor stats in student mode
      expect(screen.queryByText(/total earnings/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/utilization/i)).not.toBeInTheDocument();
    });

    test('displays tutor stats overview when switching to tutor mode', async () => {
      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Switch to tutor mode by clicking the role switcher
      const roleSwitcher = screen.getByRole('button', { name: /student/i });
      fireEvent.click(roleSwitcher);

      // Wait for tutor stats to load
      await waitFor(() => {
        expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
        expect(screen.getByText(/£1250.75/i)).toBeInTheDocument();
      });

      // Verify student overview is no longer displayed
      expect(screen.queryByText(/completed courses/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/ongoing courses/i)).not.toBeInTheDocument();
    });
  });

  describe('Tutor Stats Data Loading', () => {
    test('loads tutor stats data correctly when switching to tutor mode', async () => {
      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Switch to tutor mode
      await waitFor(() => {
        const roleSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(roleSwitcher);
      });

      // Verify API calls were made
      await waitFor(() => {
        expect(API.sessions.getUpcomingSessions).toHaveBeenCalledWith('user-123', 'tutor');
        expect(API.analytics.getEarnings).toHaveBeenCalledWith('user-123');
        expect(API.analytics.getDashboardStats).toHaveBeenCalledWith('tutor', 'user-123');
        expect(API.sessions.getSessionHistory).toHaveBeenCalledWith('user-123', 'tutor');
      });
    });

    test('handles API failures gracefully', async () => {
      // Mock API failures
      API.sessions.getUpcomingSessions.mockRejectedValue(new Error('Sessions API failed'));
      API.analytics.getEarnings.mockRejectedValue(new Error('Earnings API failed'));
      API.analytics.getDashboardStats.mockRejectedValue(new Error('Stats API failed'));
      API.sessions.getSessionHistory.mockRejectedValue(new Error('History API failed'));

      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Switch to tutor mode
      await waitFor(() => {
        const roleSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(roleSwitcher);
      });

      // Should display fallback values without crashing
      await waitFor(() => {
        expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
        expect(screen.getByText(/£0.00/i)).toBeInTheDocument(); // Fallback earnings
      });
    });

    test('shows loading state while fetching tutor stats', async () => {
      // Mock delayed API response
      API.sessions.getUpcomingSessions.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockTutorStatsData.upcomingSessions), 100))
      );

      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Switch to tutor mode
      await waitFor(() => {
        const roleSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(roleSwitcher);
      });

      // Should show loading message
      expect(screen.getByText(/loading tutor stats/i)).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading tutor stats/i)).not.toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Tutor Stats Display Components', () => {
    beforeEach(async () => {
      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Switch to tutor mode and wait for stats to load
      await waitFor(() => {
        const roleSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(roleSwitcher);
      });

      await waitFor(() => {
        expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
      });
    });

    test('displays dashboard stats correctly', () => {
      expect(screen.getByText('⭐ 4.8/5.0')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total sessions (history length)
      expect(screen.getByText('2 upcoming')).toBeInTheDocument(); // Upcoming sessions
      expect(screen.getByText('85%')).toBeInTheDocument(); // Completion rate
    });

    test('displays earnings overview correctly', () => {
      expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
      expect(screen.getByText('£1250.75')).toBeInTheDocument();
      expect(screen.getByText('£890.50')).toBeInTheDocument(); // This month
      expect(screen.getByText('£450.25')).toBeInTheDocument(); // Pending
      expect(screen.getByText('£25/hr')).toBeInTheDocument(); // Hourly rate
    });

    test('displays availability stats correctly', () => {
      expect(screen.getByText(/total slots/i)).toBeInTheDocument();
      expect(screen.getByText(/utilization/i)).toBeInTheDocument();
      expect(screen.getByText(/this week/i)).toBeInTheDocument();
      expect(screen.getByText(/peak time/i)).toBeInTheDocument();

      // Check for specific stats values
      expect(screen.getByText('0')).toBeInTheDocument(); // Total slots (fallback)
      expect(screen.getByText('0%')).toBeInTheDocument(); // Utilization rate
      expect(screen.getByText('0h')).toBeInTheDocument(); // Weekly hours
      expect(screen.getByText(/afternoon/i)).toBeInTheDocument(); // Peak period
    });

    test('displays insights panel when data is available', () => {
      expect(screen.getByText(/teaching insights/i)).toBeInTheDocument();
      expect(screen.getByText(/course variety/i)).toBeInTheDocument();
      expect(screen.getByText(/most active day/i)).toBeInTheDocument();
      expect(screen.getByText(/popular hour/i)).toBeInTheDocument();
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument();

      // Check insight values
      expect(screen.getByText('3 different courses')).toBeInTheDocument();
      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('14:00')).toBeInTheDocument();
      expect(screen.getByText('2 completed')).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering Logic', () => {
    test('only loads tutor stats when user is in tutor mode', async () => {
      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Initially in student mode - should not call tutor APIs
      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      expect(API.sessions.getUpcomingSessions).not.toHaveBeenCalled();
      expect(API.analytics.getEarnings).not.toHaveBeenCalled();

      // Switch to tutor mode
      const roleSwitcher = screen.getByRole('button', { name: /student/i });
      fireEvent.click(roleSwitcher);

      // Now should call tutor APIs
      await waitFor(() => {
        expect(API.sessions.getUpcomingSessions).toHaveBeenCalled();
        expect(API.analytics.getEarnings).toHaveBeenCalled();
      });
    });

    test('reloads tutor stats when switching back to tutor mode', async () => {
      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Switch to tutor mode
      await waitFor(() => {
        const roleSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(roleSwitcher);
      });

      await waitFor(() => {
        expect(API.sessions.getUpcomingSessions).toHaveBeenCalledTimes(1);
      });

      // Switch back to student mode
      const tutorRoleSwitcher = screen.getByRole('button', { name: /tutor/i });
      fireEvent.click(tutorRoleSwitcher);

      // Switch to tutor mode again
      await waitFor(() => {
        const studentRoleSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(studentRoleSwitcher);
      });

      // Should reload tutor stats
      await waitFor(() => {
        expect(API.sessions.getUpcomingSessions).toHaveBeenCalledTimes(2);
      });
    });

    test('displays correct header text in tutor mode', async () => {
      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Switch to tutor mode
      await waitFor(() => {
        const roleSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(roleSwitcher);
      });

      // Should show tutor mode indicator in header
      await waitFor(() => {
        expect(screen.getByText(/\(tutor mode\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Integration with Existing Dashboard Features', () => {
    test('preserves other dashboard functionality in tutor mode', async () => {
      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Switch to tutor mode
      await waitFor(() => {
        const roleSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(roleSwitcher);
      });

      await waitFor(() => {
        expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
      });

      // Check that navigation and other features still work
      expect(screen.getByText(/timeslots/i)).toBeInTheDocument();
      expect(screen.getByText(/sessions/i)).toBeInTheDocument();
      expect(screen.getByText(/qualifications/i)).toBeInTheDocument();
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    test('shows correct navigation items for tutor mode', async () => {
      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Initially in student mode
      await waitFor(() => {
        expect(screen.getByText(/courses/i)).toBeInTheDocument();
        expect(screen.getByText(/tasks/i)).toBeInTheDocument();
        expect(screen.getByText(/zoom sessions/i)).toBeInTheDocument();
      });

      // Switch to tutor mode
      const roleSwitcher = screen.getByRole('button', { name: /student/i });
      fireEvent.click(roleSwitcher);

      // Should show tutor navigation items
      await waitFor(() => {
        expect(screen.getByText(/timeslots/i)).toBeInTheDocument();
        expect(screen.getByText(/qualifications/i)).toBeInTheDocument();
        // Student nav items should not be visible
        expect(screen.queryByText(/courses/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/tasks/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles empty tutor stats gracefully', async () => {
      // Mock empty responses
      API.sessions.getUpcomingSessions.mockResolvedValue([]);
      API.sessions.getSessionHistory.mockResolvedValue([]);
      API.analytics.getEarnings.mockResolvedValue({
        totalEarnings: 0,
        pendingPayouts: 0,
        thisMonth: 0,
        lastMonth: 0,
        hourlyRate: 21,
        currency: 'GBP'
      });
      API.analytics.getDashboardStats.mockResolvedValue({});

      render(
        <TestWrapper initialUser={mockDualRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      // Switch to tutor mode
      await waitFor(() => {
        const roleSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(roleSwitcher);
      });

      // Should display zero values without crashing
      await waitFor(() => {
        expect(screen.getByText('£0.00')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument(); // Total sessions
      });
    });

    test('handles non-dual-role users correctly', async () => {
      const singleRoleUser = {
        id: 'user-456',
        email: 'student@test.com',
        roles: ['student'],
        profile: { name: 'Single Role Student' },
        grade: 'Year 10'
      };

      render(
        <TestWrapper initialUser={singleRoleUser}>
          <StudentDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      });

      // Should not attempt to load tutor stats for single-role users
      expect(API.sessions.getUpcomingSessions).not.toHaveBeenCalled();
      expect(API.analytics.getEarnings).not.toHaveBeenCalled();

      // Should display student overview
      expect(screen.getByText(/completed courses/i)).toBeInTheDocument();
      expect(screen.queryByText(/total earnings/i)).not.toBeInTheDocument();
    });
  });
});

// Performance tests
describe('Tutor Stats Performance', () => {
  test('tutor stats loading does not significantly impact render time', async () => {
    const startTime = performance.now();

    render(
      <TestWrapper initialUser={mockDualRoleUser}>
        <StudentDashboard />
      </TestWrapper>
    );

    // Switch to tutor mode
    await waitFor(() => {
      const roleSwitcher = screen.getByRole('button', { name: /student/i });
      fireEvent.click(roleSwitcher);
    });

    await waitFor(() => {
      expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should complete within reasonable time (adjust threshold as needed)
    expect(renderTime).toBeLessThan(1000); // 1 second
  });

  test('multiple role switches perform efficiently', async () => {
    render(
      <TestWrapper initialUser={mockDualRoleUser}>
        <StudentDashboard />
      </TestWrapper>
    );

    const startTime = performance.now();

    // Perform multiple role switches
    for (let i = 0; i < 5; i++) {
      // Switch to tutor
      await waitFor(() => {
        const studentSwitcher = screen.getByRole('button', { name: /student/i });
        fireEvent.click(studentSwitcher);
      });

      await waitFor(() => {
        expect(screen.getByText(/tutor mode/i)).toBeInTheDocument();
      });

      // Switch back to student
      await waitFor(() => {
        const tutorSwitcher = screen.getByRole('button', { name: /tutor/i });
        fireEvent.click(tutorSwitcher);
      });

      await waitFor(() => {
        expect(screen.queryByText(/tutor mode/i)).not.toBeInTheDocument();
      });
    }

    const endTime = performance.now();
    const switchTime = endTime - startTime;

    // Multiple switches should complete in reasonable time
    expect(switchTime).toBeLessThan(2000); // 2 seconds for 5 switches
  });
});