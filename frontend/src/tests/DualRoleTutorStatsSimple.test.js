/**
 * Simplified Test Suite for Dual-Role Tutor Stats Overview Feature
 * Tests the core functionality of tutor stats display in dual-role context
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import StudentDashboard from '../components/dashboard/StudentDashboard';
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
  },
  enrollments: {
    getEnrollments: jest.fn(),
  },
  studentTasks: {
    getUpcomingTasks: jest.fn(),
  },
}));

// Mock all hooks with proper data
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

// Mock useMultiRoleAuth with tutor mode active
jest.mock('../hooks/useMultiRoleAuth', () => ({
  useMultiRoleAuth: () => ({
    user: {
      id: 'user-123',
      email: 'tutor@test.com',
      roles: ['student', 'tutor'],
      profile: { name: 'Test Tutor' },
      rating: 4.8
    },
    activeRole: 'tutor', // Start in tutor mode for testing
    isMultiRole: () => true,
    canAccessTutorDashboard: () => true,
    isStudent: () => false,
    isTutor: () => true,
    isAuthenticated: true
  }),
  RoleProvider: ({ children }) => <div>{children}</div>
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(() => JSON.stringify({
    id: 'user-123',
    email: 'tutor@test.com',
    roles: ['student', 'tutor'],
    profile: { name: 'Test Tutor' },
    rating: 4.8,
    grade: 'Year 12'
  })),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// Test wrapper
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// Mock tutor data
const mockTutorData = {
  upcomingSessions: [
    {
      id: 'session-1',
      topic: 'Math Tutorial',
      course: 'Advanced Mathematics',
      date: new Date(Date.now() + 86400000).toISOString(),
    }
  ],
  earnings: {
    totalEarnings: 1250.75,
    pendingPayouts: 450.25,
    thisMonth: 890.50,
    hourlyRate: 25,
    currency: 'GBP'
  },
  sessionHistory: [
    {
      id: 'hist-1',
      topic: 'Previous Session',
      status: 'completed'
    }
  ]
};

describe('Tutor Stats in Dual-Role Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup API mocks
    API.sessions.getUpcomingSessions.mockResolvedValue(mockTutorData.upcomingSessions);
    API.sessions.getSessionHistory.mockResolvedValue(mockTutorData.sessionHistory);
    API.analytics.getEarnings.mockResolvedValue(mockTutorData.earnings);
    API.analytics.getDashboardStats.mockResolvedValue({});
    API.users.getProfile.mockResolvedValue({ credits: 100 });
    API.courses.getCourses.mockResolvedValue({ courses: [] });
    API.enrollments.getEnrollments.mockResolvedValue({ enrollments: [] });
    API.studentTasks.getUpcomingTasks.mockResolvedValue({ tasks: [] });
  });

  test('renders tutor overview when in tutor mode', async () => {
    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    // Wait for component to load and show tutor stats
    await waitFor(() => {
      expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify tutor-specific content is displayed
    expect(screen.getByText('£1250.75')).toBeInTheDocument(); // Total earnings
    expect(screen.getByText('£890.50')).toBeInTheDocument(); // This month
    expect(screen.getByText('£450.25')).toBeInTheDocument(); // Pending
    expect(screen.getByText('£25/hr')).toBeInTheDocument(); // Hourly rate
  });

  test('loads tutor stats data via API', async () => {
    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify API calls were made for tutor data
    expect(API.sessions.getUpcomingSessions).toHaveBeenCalledWith('user-123', 'tutor');
    expect(API.analytics.getEarnings).toHaveBeenCalledWith('user-123');
    expect(API.analytics.getDashboardStats).toHaveBeenCalledWith('tutor', 'user-123');
    expect(API.sessions.getSessionHistory).toHaveBeenCalledWith('user-123', 'tutor');
  });

  test('displays availability stats section', async () => {
    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/total slots/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText(/utilization/i)).toBeInTheDocument();
    expect(screen.getByText(/this week/i)).toBeInTheDocument();
    expect(screen.getByText(/peak time/i)).toBeInTheDocument();
  });

  test('displays teaching insights panel', async () => {
    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/teaching insights/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText(/course variety/i)).toBeInTheDocument();
    expect(screen.getByText(/most active day/i)).toBeInTheDocument();
    expect(screen.getByText(/popular hour/i)).toBeInTheDocument();
    expect(screen.getByText(/total sessions/i)).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    // Mock API failures
    API.sessions.getUpcomingSessions.mockRejectedValue(new Error('API Error'));
    API.analytics.getEarnings.mockRejectedValue(new Error('API Error'));
    API.analytics.getDashboardStats.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    // Should still render the component without crashing
    await waitFor(() => {
      expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should show fallback values
    expect(screen.getByText('£0.00')).toBeInTheDocument(); // Fallback total earnings
  });

  test('shows correct header in tutor mode', async () => {
    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/\(tutor mode\)/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

describe('Tutor Stats Implementation Details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    API.sessions.getUpcomingSessions.mockResolvedValue(mockTutorData.upcomingSessions);
    API.sessions.getSessionHistory.mockResolvedValue(mockTutorData.sessionHistory);
    API.analytics.getEarnings.mockResolvedValue(mockTutorData.earnings);
    API.analytics.getDashboardStats.mockResolvedValue({});
    API.users.getProfile.mockResolvedValue({ credits: 100 });
    API.courses.getCourses.mockResolvedValue({ courses: [] });
    API.enrollments.getEnrollments.mockResolvedValue({ enrollments: [] });
    API.studentTasks.getUpcomingTasks.mockResolvedValue({ tasks: [] });
  });

  test('loadTutorStats function executes correctly', async () => {
    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    // Wait for the loadTutorStats function to be called
    await waitFor(() => {
      expect(API.sessions.getUpcomingSessions).toHaveBeenCalled();
    }, { timeout: 5000 });

    // Verify all tutor-related API calls are made
    expect(API.sessions.getUpcomingSessions).toHaveBeenCalledWith('user-123', 'tutor');
    expect(API.analytics.getEarnings).toHaveBeenCalledWith('user-123');
    expect(API.analytics.getDashboardStats).toHaveBeenCalledWith('tutor', 'user-123');
    expect(API.sessions.getSessionHistory).toHaveBeenCalledWith('user-123', 'tutor');
  });

  test('conditional rendering logic works correctly', async () => {
    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    // Should show tutor overview, not student overview
    await waitFor(() => {
      expect(screen.getByText(/total earnings/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should NOT show student-specific content
    expect(screen.queryByText(/completed courses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ongoing courses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/total credits/i)).not.toBeInTheDocument();
  });

  test('tutor navigation items are displayed', async () => {
    render(
      <TestWrapper>
        <StudentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should show tutor navigation
    expect(screen.getByText(/timeslots/i)).toBeInTheDocument();
    expect(screen.getByText(/qualifications/i)).toBeInTheDocument();

    // Should NOT show student navigation
    expect(screen.queryByText(/courses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tasks/i)).not.toBeInTheDocument();
  });
});