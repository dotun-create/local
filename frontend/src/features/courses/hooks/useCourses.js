import { useState, useEffect, useCallback } from 'react';
import { courseService } from '../services/courseService';

export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all courses
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const coursesData = await courseService.getAllCourses();
      setCourses(coursesData);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get course by ID
  const getCourseById = useCallback(async (courseId) => {
    try {
      const course = await courseService.getCourseById(courseId);
      return course;
    } catch (err) {
      console.error('Failed to fetch course:', err);
      throw err;
    }
  }, []);

  // Search courses
  const searchCourses = useCallback(async (query, filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const results = await courseService.searchCourses(query, filters);
      setCourses(results);
      return results;
    } catch (err) {
      console.error('Failed to search courses:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create course
  const createCourse = useCallback(async (courseData) => {
    try {
      const newCourse = await courseService.createCourse(courseData);
      setCourses(prev => [...prev, newCourse]);
      return newCourse;
    } catch (err) {
      console.error('Failed to create course:', err);
      throw err;
    }
  }, []);

  // Update course
  const updateCourse = useCallback(async (courseId, updates) => {
    try {
      const updatedCourse = await courseService.updateCourse(courseId, updates);
      setCourses(prev =>
        prev.map(course =>
          course.id === courseId ? updatedCourse : course
        )
      );
      return updatedCourse;
    } catch (err) {
      console.error('Failed to update course:', err);
      throw err;
    }
  }, []);

  // Delete course
  const deleteCourse = useCallback(async (courseId) => {
    try {
      await courseService.deleteCourse(courseId);
      setCourses(prev => prev.filter(course => course.id !== courseId));
    } catch (err) {
      console.error('Failed to delete course:', err);
      throw err;
    }
  }, []);

  // Enroll in course
  const enrollInCourse = useCallback(async (courseId) => {
    try {
      const enrollment = await courseService.enrollInCourse(courseId);
      // Optionally refresh courses to get updated enrollment data
      await fetchCourses();
      return enrollment;
    } catch (err) {
      console.error('Failed to enroll in course:', err);
      throw err;
    }
  }, [fetchCourses]);

  // Unenroll from course
  const unenrollFromCourse = useCallback(async (courseId) => {
    try {
      await courseService.unenrollFromCourse(courseId);
      // Optionally refresh courses to get updated enrollment data
      await fetchCourses();
    } catch (err) {
      console.error('Failed to unenroll from course:', err);
      throw err;
    }
  }, [fetchCourses]);

  // Initial load
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return {
    courses,
    loading,
    error,
    fetchCourses,
    refetch: fetchCourses,
    getCourseById,
    searchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollInCourse,
    unenrollFromCourse
  };
};

export const useCourse = (courseId) => {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      const courseData = await courseService.getCourseById(courseId);
      setCourse(courseData);
    } catch (err) {
      console.error('Failed to fetch course:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // Update course
  const updateCourse = useCallback(async (updates) => {
    try {
      const updatedCourse = await courseService.updateCourse(courseId, updates);
      setCourse(updatedCourse);
      return updatedCourse;
    } catch (err) {
      console.error('Failed to update course:', err);
      throw err;
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  return {
    course,
    loading,
    error,
    refetch: fetchCourse,
    updateCourse
  };
};

export const useCourseEnrollment = (courseId) => {
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEnrollment = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      const enrollmentData = await courseService.getEnrollment(courseId);
      setEnrollment(enrollmentData);
    } catch (err) {
      // If not enrolled, this is expected
      if (err.status === 404) {
        setEnrollment(null);
        setError(null);
      } else {
        console.error('Failed to fetch enrollment:', err);
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const enroll = useCallback(async () => {
    try {
      setLoading(true);
      const enrollmentData = await courseService.enrollInCourse(courseId);
      setEnrollment(enrollmentData);
      return enrollmentData;
    } catch (err) {
      console.error('Failed to enroll:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const unenroll = useCallback(async () => {
    try {
      setLoading(true);
      await courseService.unenrollFromCourse(courseId);
      setEnrollment(null);
    } catch (err) {
      console.error('Failed to unenroll:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchEnrollment();
  }, [fetchEnrollment]);

  return {
    enrollment,
    isEnrolled: !!enrollment,
    loading,
    error,
    enroll,
    unenroll,
    refetch: fetchEnrollment
  };
};