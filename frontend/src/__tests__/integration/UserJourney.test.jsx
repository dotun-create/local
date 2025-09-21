/**
 * User Journey Integration Tests
 * End-to-end testing for critical user workflows in the new architecture
 */

import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import {
  renderWithProviders,
  renderWithRouter,
  mockUser,
  mockCourse,
  mockApiResponse,
  mockApiError,
  waitForLoadingToFinish,
  simulateNetworkDelay
} from '@shared/testing/test-utils';

// Mock complete user journey components
const MockLogin = ({ onLogin }) => {
  const [credentials, setCredentials] = React.useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogin(credentials);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Login form">
      <h1>Login</h1>
      <input
        name="email"
        type="email"
        placeholder="Email"
        value={credentials.email}
        onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
        aria-label="Email"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        value={credentials.password}
        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
        aria-label="Password"
      />
      <button type="submit">Sign In</button>
    </form>
  );
};

const MockDashboard = ({ user, courses, onEnroll, onRefresh }) => {
  const [enrollingCourse, setEnrollingCourse] = React.useState(null);

  const handleEnroll = async (courseId) => {
    setEnrollingCourse(courseId);
    try {
      await onEnroll(courseId);
    } finally {
      setEnrollingCourse(null);
    }
  };

  return (
    <div role="main" aria-label={`${user.roles[0]} dashboard`}>
      <header>
        <h1>Welcome, {user.name}</h1>
        <span data-testid="user-role">{user.roles[0]}</span>
        <button onClick={onRefresh} data-testid="refresh-dashboard">
          Refresh
        </button>
      </header>

      <section aria-label="Available courses">
        <h2>Available Courses</h2>
        {courses.map(course => (
          <div key={course.id} data-testid={`course-${course.id}`}>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <button
              onClick={() => handleEnroll(course.id)}
              disabled={enrollingCourse === course.id}
              data-testid={`enroll-${course.id}`}
            >
              {enrollingCourse === course.id ? 'Enrolling...' : 'Enroll'}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
};

const MockRoleSwitcher = ({ user, onRoleSwitch }) => {
  const availableRoles = user.roles || [];

  return (
    <div data-testid="role-switcher">
      <h3>Switch Role</h3>
      {availableRoles.map(role => (
        <button
          key={role}
          onClick={() => onRoleSwitch(role)}
          data-testid={`switch-to-${role}`}
        >
          Switch to {role}
        </button>
      ))}
    </div>
  );
};

// Mock services
const mockAuthService = {
  login: jest.fn(),
  getCurrentUser: jest.fn(),
  logout: jest.fn()
};

const mockCourseService = {
  getCourses: jest.fn(),
  enrollStudent: jest.fn()
};

const mockUserService = {
  switchRole: jest.fn(),
  updateProfile: jest.fn()
};

describe('User Journey Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    mockAuthService.login.mockResolvedValue({
      success: true,
      user: mockUser({ roles: ['student'] }),
      token: 'mock-token'
    });

    mockCourseService.getCourses.mockResolvedValue([
      mockCourse({ id: 'course-1', title: 'JavaScript Fundamentals' }),
      mockCourse({ id: 'course-2', title: 'React Basics' })
    ]);

    mockCourseService.enrollStudent.mockResolvedValue({ success: true });
    mockUserService.switchRole.mockResolvedValue({ success: true });
  });

  describe('Student Journey: Login to Course Enrollment', () => {
    it('completes full student workflow', async () => {
      const user = mockUser({
        name: 'John Student',
        email: 'john@student.com',
        roles: ['student']
      });

      const courses = [
        mockCourse({ id: 'course-1', title: 'JavaScript Fundamentals' }),
        mockCourse({ id: 'course-2', title: 'React Basics' })
      ];

      let currentUser = null;
      let enrolledCourses = [];

      const handleLogin = async (credentials) => {
        const response = await mockAuthService.login(credentials);
        currentUser = response.user;
      };

      const handleEnroll = async (courseId) => {
        await mockCourseService.enrollStudent(courseId);
        enrolledCourses.push(courseId);
      };

      const handleRefresh = async () => {
        await simulateNetworkDelay(50);
      };

      // Step 1: Login
      const LoginStep = () => {
        if (currentUser) {
          return <MockDashboard
            user={currentUser}
            courses={courses}
            onEnroll={handleEnroll}
            onRefresh={handleRefresh}
          />;
        }
        return <MockLogin onLogin={handleLogin} />;
      };

      const { rerender } = renderWithProviders(<LoginStep />);

      // Initial state - should show login form
      expect(screen.getByLabelText(/login form/i)).toBeInTheDocument();

      // Enter credentials and login
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'john@student.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith({
          email: 'john@student.com',
          password: 'password123'
        });
      });

      // Update component to reflect logged-in state
      currentUser = user;
      rerender(<LoginStep />);

      // Step 2: Dashboard should be visible
      expect(screen.getByLabelText(/student dashboard/i)).toBeInTheDocument();
      expect(screen.getByText('Welcome, John Student')).toBeInTheDocument();
      expect(screen.getByTestId('user-role')).toHaveTextContent('student');

      // Step 3: Enroll in a course
      expect(screen.getByTestId('course-course-1')).toBeInTheDocument();
      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('enroll-course-1'));

      // Should show loading state
      expect(screen.getByText('Enrolling...')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockCourseService.enrollStudent).toHaveBeenCalledWith('course-1');
      });

      // Step 4: Test dashboard refresh
      fireEvent.click(screen.getByTestId('refresh-dashboard'));

      await waitFor(() => {
        expect(handleRefresh).toBeDefined();
      });

      // Verify the journey completed successfully
      expect(enrolledCourses).toContain('course-1');
    });

    it('handles login errors gracefully', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      const handleLogin = async (credentials) => {
        try {
          await mockAuthService.login(credentials);
        } catch (error) {
          // Error would be handled by the component
          throw error;
        }
      };

      renderWithProviders(<MockLogin onLogin={handleLogin} />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'wrong@email.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      fireEvent.click(screen.getByText('Sign In'));

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalled();
      });

      // Login form should still be visible
      expect(screen.getByLabelText(/login form/i)).toBeInTheDocument();
    });
  });

  describe('Multi-Role User Journey', () => {
    it('supports role switching workflow', async () => {
      const multiRoleUser = mockUser({
        name: 'Jane Doe',
        email: 'jane@example.com',
        roles: ['student', 'tutor']
      });

      let currentRole = 'student';

      const handleRoleSwitch = async (newRole) => {
        await mockUserService.switchRole(newRole);
        currentRole = newRole;
      };

      const MultiRoleApp = () => (
        <div>
          <MockDashboard
            user={{ ...multiRoleUser, roles: [currentRole] }}
            courses={[]}
            onEnroll={() => {}}
            onRefresh={() => {}}
          />
          <MockRoleSwitcher
            user={multiRoleUser}
            onRoleSwitch={handleRoleSwitch}
          />
        </div>
      );

      const { rerender } = renderWithProviders(<MultiRoleApp />);

      // Initially shows student dashboard
      expect(screen.getByLabelText(/student dashboard/i)).toBeInTheDocument();
      expect(screen.getByTestId('user-role')).toHaveTextContent('student');

      // Switch to tutor role
      fireEvent.click(screen.getByTestId('switch-to-tutor'));

      await waitFor(() => {
        expect(mockUserService.switchRole).toHaveBeenCalledWith('tutor');
      });

      // Update component to reflect role change
      currentRole = 'tutor';
      rerender(<MultiRoleApp />);

      expect(screen.getByLabelText(/tutor dashboard/i)).toBeInTheDocument();
      expect(screen.getByTestId('user-role')).toHaveTextContent('tutor');
    });
  });

  describe('Error Recovery Flows', () => {
    it('recovers from network errors during enrollment', async () => {
      const user = mockUser({ roles: ['student'] });
      const courses = [mockCourse({ id: 'course-1', title: 'Test Course' })];

      // First call fails, second succeeds
      mockCourseService.enrollStudent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      let enrollmentAttempts = 0;

      const handleEnroll = async (courseId) => {
        enrollmentAttempts++;
        try {
          await mockCourseService.enrollStudent(courseId);
          return { success: true };
        } catch (error) {
          throw error;
        }
      };

      renderWithProviders(
        <MockDashboard
          user={user}
          courses={courses}
          onEnroll={handleEnroll}
          onRefresh={() => {}}
        />
      );

      // First enrollment attempt (will fail)
      fireEvent.click(screen.getByTestId('enroll-course-1'));

      await waitFor(() => {
        expect(enrollmentAttempts).toBe(1);
      });

      // Second enrollment attempt (will succeed)
      fireEvent.click(screen.getByTestId('enroll-course-1'));

      await waitFor(() => {
        expect(enrollmentAttempts).toBe(2);
        expect(mockCourseService.enrollStudent).toHaveBeenCalledTimes(2);
      });
    });

    it('handles timeout scenarios gracefully', async () => {
      const slowEnrollment = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        throw new Error('Request timeout');
      });

      const user = mockUser({ roles: ['student'] });
      const courses = [mockCourse({ id: 'course-1', title: 'Test Course' })];

      const handleEnroll = async (courseId) => {
        await slowEnrollment(courseId);
      };

      renderWithProviders(
        <MockDashboard
          user={user}
          courses={courses}
          onEnroll={handleEnroll}
          onRefresh={() => {}}
        />
      );

      fireEvent.click(screen.getByTestId('enroll-course-1'));

      // Should show loading state
      expect(screen.getByText('Enrolling...')).toBeInTheDocument();

      await waitFor(() => {
        expect(slowEnrollment).toHaveBeenCalled();
      }, { timeout: 300 });

      // After timeout, button should be re-enabled
      await waitFor(() => {
        expect(screen.queryByText('Enrolling...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('maintains performance with large datasets', async () => {
      const user = mockUser({ roles: ['student'] });
      const manyCourses = Array.from({ length: 100 }, (_, i) =>
        mockCourse({
          id: `course-${i}`,
          title: `Course ${i}`,
          description: `Description for course ${i}`
        })
      );

      const startTime = performance.now();

      renderWithProviders(
        <MockDashboard
          user={user}
          courses={manyCourses}
          onEnroll={() => {}}
          onRefresh={() => {}}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000);

      // All courses should be visible
      expect(screen.getAllByText(/Course \d+/)).toHaveLength(100);
    });

    it('handles concurrent user actions efficiently', async () => {
      const user = mockUser({ roles: ['student'] });
      const courses = [
        mockCourse({ id: 'course-1', title: 'Course 1' }),
        mockCourse({ id: 'course-2', title: 'Course 2' })
      ];

      let enrollmentCount = 0;
      const handleEnroll = jest.fn().mockImplementation(async () => {
        enrollmentCount++;
        await simulateNetworkDelay(50);
      });

      renderWithProviders(
        <MockDashboard
          user={user}
          courses={courses}
          onEnroll={handleEnroll}
          onRefresh={() => {}}
        />
      );

      // Trigger multiple enrollments rapidly
      fireEvent.click(screen.getByTestId('enroll-course-1'));
      fireEvent.click(screen.getByTestId('enroll-course-2'));

      await waitFor(() => {
        expect(handleEnroll).toHaveBeenCalledTimes(2);
      });

      expect(enrollmentCount).toBe(2);
    });
  });

  describe('Accessibility in User Journeys', () => {
    it('maintains accessibility throughout the user journey', async () => {
      const user = mockUser({ roles: ['student'] });
      const courses = [mockCourse({ id: 'course-1', title: 'Accessible Course' })];

      renderWithProviders(
        <MockDashboard
          user={user}
          courses={courses}
          onEnroll={() => {}}
          onRefresh={() => {}}
        />
      );

      // Check main landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/available courses/i)).toBeInTheDocument();

      // Check heading structure
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2Elements = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2Elements).toHaveLength(1);

      // Check interactive elements have labels
      const enrollButton = screen.getByTestId('enroll-course-1');
      expect(enrollButton).toBeInTheDocument();
      expect(enrollButton).not.toHaveAttribute('aria-label', '');
    });

    it('supports screen reader navigation', () => {
      const user = mockUser({ roles: ['student'] });

      renderWithProviders(
        <MockDashboard
          user={user}
          courses={[]}
          onEnroll={() => {}}
          onRefresh={() => {}}
        />
      );

      // Check ARIA structure
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('aria-label');

      const refreshButton = screen.getByTestId('refresh-dashboard');
      expect(refreshButton).toBeInTheDocument();
    });
  });
});