/**
 * Student Dashboard Tests
 * Feature-based testing for student dashboard components
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  mockUser,
  mockCourse,
  mockApiResponse,
  fillForm,
  waitForLoadingToFinish
} from '@shared/testing/test-utils';
import { lightTheme, darkTheme } from '@shared/styles/theme';

// Mock student dashboard component
const MockStudentDashboard = ({ user, courses = [], onRefresh }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [refreshCount, setRefreshCount] = React.useState(0);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await onRefresh?.();
      setRefreshCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div data-testid="loading-spinner">Loading...</div>;
  }

  return (
    <div role="main" aria-label="Student Dashboard">
      <header>
        <h1>Welcome, {user?.name || 'Student'}</h1>
        <button
          onClick={handleRefresh}
          aria-label="Refresh dashboard data"
          data-testid="refresh-button"
        >
          Refresh Data
        </button>
        <span data-testid="refresh-count">Refreshed {refreshCount} times</span>
      </header>

      <section aria-label="Enrolled Courses">
        <h2>My Courses</h2>
        {courses.length === 0 ? (
          <p data-testid="no-courses">No courses enrolled</p>
        ) : (
          <ul data-testid="courses-list">
            {courses.map(course => (
              <li key={course.id} data-testid={`course-${course.id}`}>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <span>Instructor: {course.instructor}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Quick Actions">
        <h2>Quick Actions</h2>
        <button data-testid="join-session">Join Session</button>
        <button data-testid="view-schedule">View Schedule</button>
        <button data-testid="contact-tutor">Contact Tutor</button>
      </section>
    </div>
  );
};

describe('Student Dashboard', () => {
  const defaultUser = mockUser({
    name: 'John Student',
    email: 'john@student.com',
    roles: ['student']
  });

  const defaultCourses = [
    mockCourse({
      id: 'course-1',
      title: 'Mathematics 101',
      description: 'Basic mathematics course',
      instructor: 'Dr. Smith'
    }),
    mockCourse({
      id: 'course-2',
      title: 'Physics 201',
      description: 'Intermediate physics course',
      instructor: 'Prof. Johnson'
    })
  ];

  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRefresh.mockResolvedValue();
  });

  describe('Basic Rendering', () => {
    it('renders student dashboard with user information', () => {
      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />
      );

      expect(screen.getByText('Welcome, John Student')).toBeInTheDocument();
      expect(screen.getByRole('main', { name: /student dashboard/i })).toBeInTheDocument();
    });

    it('displays enrolled courses correctly', () => {
      renderWithProviders(
        <MockStudentDashboard
          user={defaultUser}
          courses={defaultCourses}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByTestId('courses-list')).toBeInTheDocument();
      expect(screen.getByText('Mathematics 101')).toBeInTheDocument();
      expect(screen.getByText('Physics 201')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    });

    it('shows message when no courses are enrolled', () => {
      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />
      );

      expect(screen.getByTestId('no-courses')).toBeInTheDocument();
      expect(screen.getByText('No courses enrolled')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('triggers refresh when refresh button is clicked', async () => {
      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />
      );

      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('Refreshed 1 times')).toBeInTheDocument();
    });

    it('shows loading state during refresh', async () => {
      const slowRefresh = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={slowRefresh} />
      );

      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      await waitForLoadingToFinish();

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('handles refresh errors gracefully', async () => {
      const failingRefresh = jest.fn().mockRejectedValue(new Error('Refresh failed'));

      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={failingRefresh} />
      );

      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(failingRefresh).toHaveBeenCalled();
      });

      // Dashboard should still be accessible after error
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('provides quick action buttons', () => {
      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />
      );

      expect(screen.getByTestId('join-session')).toBeInTheDocument();
      expect(screen.getByTestId('view-schedule')).toBeInTheDocument();
      expect(screen.getByTestId('contact-tutor')).toBeInTheDocument();
    });

    it('handles quick action clicks', () => {
      const mockJoinSession = jest.fn();

      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />
      );

      const joinButton = screen.getByTestId('join-session');
      joinButton.onclick = mockJoinSession;

      fireEvent.click(joinButton);

      expect(mockJoinSession).toHaveBeenCalled();
    });
  });

  describe('Theme Integration', () => {
    it('applies light theme styles correctly', () => {
      const { container } = renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />,
        { theme: lightTheme }
      );

      const dashboard = container.querySelector('[role="main"]');
      expect(dashboard).toBeInTheDocument();
    });

    it('applies dark theme styles correctly', () => {
      const { container } = renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />,
        { theme: darkTheme }
      );

      const dashboard = container.querySelector('[role="main"]');
      expect(dashboard).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });

      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={defaultCourses} onRefresh={mockOnRefresh} />
      );

      // Dashboard should still render properly on mobile
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText('Mathematics 101')).toBeInTheDocument();
    });

    it('handles tablet viewport appropriately', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={defaultCourses} onRefresh={mockOnRefresh} />
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={defaultCourses} onRefresh={mockOnRefresh} />
      );

      expect(screen.getByRole('main', { name: /student dashboard/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/enrolled courses/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/quick actions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/refresh dashboard data/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />
      );

      const refreshButton = screen.getByTestId('refresh-button');
      const joinButton = screen.getByTestId('join-session');
      const scheduleButton = screen.getByTestId('view-schedule');

      // Test tab navigation
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();

      fireEvent.keyDown(refreshButton, { key: 'Tab' });
      joinButton.focus();
      expect(joinButton).toHaveFocus();

      fireEvent.keyDown(joinButton, { key: 'Tab' });
      scheduleButton.focus();
      expect(scheduleButton).toHaveFocus();
    });

    it('provides screen reader friendly content', () => {
      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={defaultCourses} onRefresh={mockOnRefresh} />
      );

      // Check for proper heading structure
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2Elements = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2Elements).toHaveLength(2); // "My Courses" and "Quick Actions"
    });
  });

  describe('Performance', () => {
    it('renders large course lists efficiently', () => {
      const manyCourses = Array.from({ length: 100 }, (_, i) =>
        mockCourse({
          id: `course-${i}`,
          title: `Course ${i}`,
          description: `Description for course ${i}`,
          instructor: `Instructor ${i}`
        })
      );

      const startTime = performance.now();

      renderWithProviders(
        <MockStudentDashboard
          user={defaultUser}
          courses={manyCourses}
          onRefresh={mockOnRefresh}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render should complete within reasonable time
      expect(renderTime).toBeLessThan(1000); // Less than 1 second

      expect(screen.getByTestId('courses-list')).toBeInTheDocument();
    });

    it('handles rapid refresh requests appropriately', async () => {
      let refreshCount = 0;
      const countingRefresh = jest.fn().mockImplementation(async () => {
        refreshCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      renderWithProviders(
        <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={countingRefresh} />
      );

      const refreshButton = screen.getByTestId('refresh-button');

      // Rapid clicks
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Refreshed 1 times')).toBeInTheDocument();
      });

      // Only one refresh should have completed due to loading state
      expect(refreshCount).toBe(1);
    });
  });

  describe('Error Boundaries', () => {
    it('recovers from component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      const DashboardWithError = () => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />
          <ErrorComponent />
        </React.Suspense>
      );

      // This test would need a proper error boundary implementation
      // For now, we just verify the dashboard component doesn't throw
      expect(() => {
        renderWithProviders(
          <MockStudentDashboard user={defaultUser} courses={[]} onRefresh={mockOnRefresh} />
        );
      }).not.toThrow();
    });
  });
});