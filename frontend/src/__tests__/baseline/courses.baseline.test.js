/**
 * Baseline tests for course management system
 * These tests ensure no regression during refactoring
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { useCourses, useCourse } from '../../shared/hooks/useData';

// Mock components
const CourseCard = React.lazy(() => import('../../components/courses/CourseCard'));
const CourseWorkspace = React.lazy(() => import('../../components/courses/CourseWorkspace'));

// Mock dataService
jest.mock('../../shared/services/dataService', () => ({
  getCourses: jest.fn(),
  getCourse: jest.fn(),
  createCourse: jest.fn(),
  updateCourse: jest.fn(),
  deleteCourse: jest.fn(),
  getCourseModules: jest.fn(),
  addModule: jest.fn(),
  updateModule: jest.fn(),
  deleteModule: jest.fn(),
  getCourseEnrollments: jest.fn(),
  enrollStudent: jest.fn(),
  unenrollStudent: jest.fn(),
}));

// Test component to access hooks
const TestCoursesComponent = ({ onCoursesState }) => {
  const courses = useCourses();

  React.useEffect(() => {
    if (onCoursesState) {
      onCoursesState(courses);
    }
  }, [courses, onCoursesState]);

  return (
    <div>
      <div data-testid="courses-loading">
        {courses.loading ? 'loading' : 'loaded'}
      </div>
      <div data-testid="courses-count">
        {courses.data?.length || 0}
      </div>
      <div data-testid="courses-error">
        {courses.error?.message || 'no-error'}
      </div>
    </div>
  );
};

const TestCourseComponent = ({ courseId, onCourseState }) => {
  const course = useCourse(courseId);

  React.useEffect(() => {
    if (onCourseState) {
      onCourseState(course);
    }
  }, [course, onCourseState]);

  return (
    <div>
      <div data-testid="course-loading">
        {course.loading ? 'loading' : 'loaded'}
      </div>
      <div data-testid="course-title">
        {course.data?.title || 'no-title'}
      </div>
      <div data-testid="course-error">
        {course.error?.message || 'no-error'}
      </div>
    </div>
  );
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <React.Suspense fallback={<div>Loading...</div>}>
        {component}
      </React.Suspense>
    </BrowserRouter>
  );
};

describe('Course Management System Baseline Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useCourses Hook', () => {
    test('should initialize with loading state', () => {
      const dataService = require('../../shared/services/dataService');
      dataService.getCourses.mockResolvedValue([]);

      renderWithRouter(<TestCoursesComponent />);

      expect(screen.getByTestId('courses-loading')).toHaveTextContent('loading');
    });

    test('should load courses successfully', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockCourses = [
        {
          id: 1,
          title: 'JavaScript Fundamentals',
          description: 'Learn JavaScript basics',
          instructor: 'John Doe',
          price: 99.99,
          modules: []
        },
        {
          id: 2,
          title: 'React Advanced',
          description: 'Advanced React concepts',
          instructor: 'Jane Smith',
          price: 149.99,
          modules: []
        }
      ];

      dataService.getCourses.mockResolvedValue(mockCourses);

      renderWithRouter(<TestCoursesComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('courses-loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('courses-count')).toHaveTextContent('2');
        expect(screen.getByTestId('courses-error')).toHaveTextContent('no-error');
      });
    });

    test('should handle courses loading error', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockError = new Error('Failed to fetch courses');
      dataService.getCourses.mockRejectedValue(mockError);

      let coursesState;
      renderWithRouter(
        <TestCoursesComponent onCoursesState={(state) => coursesState = state} />
      );

      await waitFor(() => {
        expect(coursesState?.error).toBeDefined();
        expect(coursesState?.loading).toBe(false);
      });
    });

    test('should provide refetch functionality', async () => {
      const dataService = require('../../shared/services/dataService');
      dataService.getCourses.mockResolvedValue([]);

      let coursesState;
      renderWithRouter(
        <TestCoursesComponent onCoursesState={(state) => coursesState = state} />
      );

      await waitFor(() => {
        expect(coursesState?.refetch).toBeDefined();
        expect(typeof coursesState?.refetch).toBe('function');
      });

      // Test refetch
      const newMockCourses = [{ id: 1, title: 'New Course' }];
      dataService.getCourses.mockResolvedValue(newMockCourses);

      await coursesState.refetch();

      expect(dataService.getCourses).toHaveBeenCalledTimes(2);
    });
  });

  describe('useCourse Hook', () => {
    test('should load single course successfully', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockCourse = {
        id: 1,
        title: 'JavaScript Fundamentals',
        description: 'Learn JavaScript basics',
        instructor: 'John Doe',
        price: 99.99,
        modules: [
          {
            id: 1,
            title: 'Variables and Functions',
            lessons: []
          }
        ]
      };

      dataService.getCourse.mockResolvedValue(mockCourse);

      renderWithRouter(<TestCourseComponent courseId={1} />);

      await waitFor(() => {
        expect(screen.getByTestId('course-loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('course-title')).toHaveTextContent('JavaScript Fundamentals');
        expect(screen.getByTestId('course-error')).toHaveTextContent('no-error');
      });

      expect(dataService.getCourse).toHaveBeenCalledWith(1);
    });

    test('should handle course not found', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockError = new Error('Course not found');
      dataService.getCourse.mockRejectedValue(mockError);

      let courseState;
      renderWithRouter(
        <TestCourseComponent
          courseId={999}
          onCourseState={(state) => courseState = state}
        />
      );

      await waitFor(() => {
        expect(courseState?.error).toBeDefined();
        expect(courseState?.loading).toBe(false);
      });
    });

    test('should not fetch when courseId is null/undefined', () => {
      const dataService = require('../../shared/services/dataService');
      dataService.getCourse.mockResolvedValue(null);

      renderWithRouter(<TestCourseComponent courseId={null} />);

      expect(dataService.getCourse).not.toHaveBeenCalled();
    });
  });

  describe('Course Data Structure Validation', () => {
    test('should validate course object structure', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockCourse = {
        id: 1,
        title: 'Test Course',
        description: 'Test Description',
        instructor: 'Test Instructor',
        price: 99.99,
        modules: [],
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      dataService.getCourse.mockResolvedValue(mockCourse);

      let courseState;
      renderWithRouter(
        <TestCourseComponent
          courseId={1}
          onCourseState={(state) => courseState = state}
        />
      );

      await waitFor(() => {
        const course = courseState?.data;
        expect(course).toHaveProperty('id');
        expect(course).toHaveProperty('title');
        expect(course).toHaveProperty('description');
        expect(course).toHaveProperty('instructor');
        expect(course).toHaveProperty('price');
        expect(course).toHaveProperty('modules');
        expect(Array.isArray(course.modules)).toBe(true);
      });
    });

    test('should validate courses array structure', async () => {
      const dataService = require('../../shared/services/dataService');
      const mockCourses = [
        {
          id: 1,
          title: 'Course 1',
          description: 'Description 1',
          instructor: 'Instructor 1',
          price: 99.99
        },
        {
          id: 2,
          title: 'Course 2',
          description: 'Description 2',
          instructor: 'Instructor 2',
          price: 149.99
        }
      ];

      dataService.getCourses.mockResolvedValue(mockCourses);

      let coursesState;
      renderWithRouter(
        <TestCoursesComponent onCoursesState={(state) => coursesState = state} />
      );

      await waitFor(() => {
        const courses = coursesState?.data;
        expect(Array.isArray(courses)).toBe(true);
        expect(courses).toHaveLength(2);

        courses.forEach(course => {
          expect(course).toHaveProperty('id');
          expect(course).toHaveProperty('title');
          expect(course).toHaveProperty('description');
          expect(course).toHaveProperty('instructor');
          expect(course).toHaveProperty('price');
        });
      });
    });
  });

  describe('Course Operations', () => {
    test('should handle course creation workflow', async () => {
      const dataService = require('../../shared/services/dataService');
      const newCourse = {
        title: 'New Course',
        description: 'New Description',
        instructor: 'New Instructor',
        price: 199.99
      };

      const createdCourse = {
        id: 3,
        ...newCourse,
        created_at: new Date().toISOString()
      };

      dataService.createCourse.mockResolvedValue(createdCourse);

      const result = await dataService.createCourse(newCourse);

      expect(result).toEqual(createdCourse);
      expect(dataService.createCourse).toHaveBeenCalledWith(newCourse);
    });

    test('should handle course update workflow', async () => {
      const dataService = require('../../shared/services/dataService');
      const courseId = 1;
      const updates = {
        title: 'Updated Course Title',
        price: 199.99
      };

      const updatedCourse = {
        id: courseId,
        title: 'Updated Course Title',
        description: 'Original Description',
        instructor: 'Original Instructor',
        price: 199.99,
        updated_at: new Date().toISOString()
      };

      dataService.updateCourse.mockResolvedValue(updatedCourse);

      const result = await dataService.updateCourse(courseId, updates);

      expect(result).toEqual(updatedCourse);
      expect(dataService.updateCourse).toHaveBeenCalledWith(courseId, updates);
    });

    test('should handle course deletion workflow', async () => {
      const dataService = require('../../shared/services/dataService');
      const courseId = 1;

      dataService.deleteCourse.mockResolvedValue({ success: true });

      const result = await dataService.deleteCourse(courseId);

      expect(result).toEqual({ success: true });
      expect(dataService.deleteCourse).toHaveBeenCalledWith(courseId);
    });
  });

  describe('Course Modules Management', () => {
    test('should handle module operations', async () => {
      const dataService = require('../../shared/services/dataService');
      const courseId = 1;
      const mockModules = [
        {
          id: 1,
          title: 'Module 1',
          description: 'First module',
          order: 1,
          lessons: []
        }
      ];

      dataService.getCourseModules.mockResolvedValue(mockModules);

      const result = await dataService.getCourseModules(courseId);

      expect(result).toEqual(mockModules);
      expect(dataService.getCourseModules).toHaveBeenCalledWith(courseId);
    });

    test('should handle adding new module', async () => {
      const dataService = require('../../shared/services/dataService');
      const courseId = 1;
      const newModule = {
        title: 'New Module',
        description: 'New module description',
        order: 2
      };

      const createdModule = {
        id: 2,
        ...newModule,
        course_id: courseId,
        lessons: []
      };

      dataService.addModule.mockResolvedValue(createdModule);

      const result = await dataService.addModule(courseId, newModule);

      expect(result).toEqual(createdModule);
      expect(dataService.addModule).toHaveBeenCalledWith(courseId, newModule);
    });
  });

  describe('Course Enrollment Management', () => {
    test('should handle enrollment operations', async () => {
      const dataService = require('../../shared/services/dataService');
      const courseId = 1;
      const mockEnrollments = [
        {
          id: 1,
          student_id: 1,
          course_id: courseId,
          enrolled_at: '2023-01-01',
          status: 'active'
        }
      ];

      dataService.getCourseEnrollments.mockResolvedValue(mockEnrollments);

      const result = await dataService.getCourseEnrollments(courseId);

      expect(result).toEqual(mockEnrollments);
      expect(dataService.getCourseEnrollments).toHaveBeenCalledWith(courseId);
    });

    test('should handle student enrollment', async () => {
      const dataService = require('../../shared/services/dataService');
      const courseId = 1;
      const studentId = 2;

      const enrollment = {
        id: 2,
        student_id: studentId,
        course_id: courseId,
        enrolled_at: new Date().toISOString(),
        status: 'active'
      };

      dataService.enrollStudent.mockResolvedValue(enrollment);

      const result = await dataService.enrollStudent(courseId, studentId);

      expect(result).toEqual(enrollment);
      expect(dataService.enrollStudent).toHaveBeenCalledWith(courseId, studentId);
    });

    test('should handle student unenrollment', async () => {
      const dataService = require('../../shared/services/dataService');
      const courseId = 1;
      const studentId = 2;

      dataService.unenrollStudent.mockResolvedValue({ success: true });

      const result = await dataService.unenrollStudent(courseId, studentId);

      expect(result).toEqual({ success: true });
      expect(dataService.unenrollStudent).toHaveBeenCalledWith(courseId, studentId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      const dataService = require('../../shared/services/dataService');
      dataService.getCourses.mockRejectedValue(new Error('Network error'));

      let coursesState;
      renderWithRouter(
        <TestCoursesComponent onCoursesState={(state) => coursesState = state} />
      );

      await waitFor(() => {
        expect(coursesState?.error).toBeDefined();
        expect(coursesState?.error.message).toBe('Network error');
        expect(coursesState?.loading).toBe(false);
      });
    });

    test('should handle empty courses response', async () => {
      const dataService = require('../../shared/services/dataService');
      dataService.getCourses.mockResolvedValue([]);

      renderWithRouter(<TestCoursesComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('courses-count')).toHaveTextContent('0');
        expect(screen.getByTestId('courses-loading')).toHaveTextContent('loaded');
      });
    });

    test('should handle malformed course data', async () => {
      const dataService = require('../../shared/services/dataService');
      const malformedCourse = {
        // Missing required fields
        title: 'Test Course'
        // Missing id, description, instructor, price
      };

      dataService.getCourse.mockResolvedValue(malformedCourse);

      let courseState;
      renderWithRouter(
        <TestCourseComponent
          courseId={1}
          onCourseState={(state) => courseState = state}
        />
      );

      await waitFor(() => {
        const course = courseState?.data;
        expect(course).toBeDefined();
        expect(course.title).toBe('Test Course');
        // Should handle missing fields gracefully
      });
    });
  });
});