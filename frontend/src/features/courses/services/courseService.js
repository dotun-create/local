import { apiClient } from '@shared/services/apiClient';
import { API_ENDPOINTS } from '@shared/constants/api';

class CourseService {
  // Get all courses
  async getAllCourses(params = {}) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COURSES.LIST, { params });
      return response.data.courses || response.data;
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw this.handleError(error);
    }
  }

  // Get course by ID
  async getCourseById(courseId) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COURSES.BY_ID(courseId));
      return response.data.course || response.data;
    } catch (error) {
      console.error('Failed to fetch course:', error);
      throw this.handleError(error);
    }
  }

  // Search courses
  async searchCourses(query, filters = {}) {
    try {
      const params = {
        q: query,
        ...filters
      };
      const response = await apiClient.get(API_ENDPOINTS.COURSES.SEARCH, { params });
      return response.data.courses || response.data;
    } catch (error) {
      console.error('Failed to search courses:', error);
      throw this.handleError(error);
    }
  }

  // Create new course
  async createCourse(courseData) {
    try {
      const formData = new FormData();

      // Add course data
      Object.keys(courseData).forEach(key => {
        if (key === 'thumbnail' && courseData[key] instanceof File) {
          formData.append('thumbnail', courseData[key]);
        } else if (key === 'learningOutcomes' && Array.isArray(courseData[key])) {
          formData.append(key, JSON.stringify(courseData[key]));
        } else if (courseData[key] !== null && courseData[key] !== undefined) {
          formData.append(key, courseData[key]);
        }
      });

      const response = await apiClient.post(API_ENDPOINTS.COURSES.CREATE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.course || response.data;
    } catch (error) {
      console.error('Failed to create course:', error);
      throw this.handleError(error);
    }
  }

  // Update course
  async updateCourse(courseId, updates) {
    try {
      const formData = new FormData();

      Object.keys(updates).forEach(key => {
        if (key === 'thumbnail' && updates[key] instanceof File) {
          formData.append('thumbnail', updates[key]);
        } else if (key === 'learningOutcomes' && Array.isArray(updates[key])) {
          formData.append(key, JSON.stringify(updates[key]));
        } else if (updates[key] !== null && updates[key] !== undefined) {
          formData.append(key, updates[key]);
        }
      });

      const response = await apiClient.put(
        API_ENDPOINTS.COURSES.UPDATE(courseId),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.course || response.data;
    } catch (error) {
      console.error('Failed to update course:', error);
      throw this.handleError(error);
    }
  }

  // Delete course
  async deleteCourse(courseId) {
    try {
      await apiClient.delete(API_ENDPOINTS.COURSES.DELETE(courseId));
    } catch (error) {
      console.error('Failed to delete course:', error);
      throw this.handleError(error);
    }
  }

  // Enroll in course
  async enrollInCourse(courseId) {
    try {
      const response = await apiClient.post(API_ENDPOINTS.COURSES.ENROLL(courseId));
      return response.data.enrollment || response.data;
    } catch (error) {
      console.error('Failed to enroll in course:', error);
      throw this.handleError(error);
    }
  }

  // Unenroll from course
  async unenrollFromCourse(courseId) {
    try {
      await apiClient.delete(API_ENDPOINTS.COURSES.UNENROLL(courseId));
    } catch (error) {
      console.error('Failed to unenroll from course:', error);
      throw this.handleError(error);
    }
  }

  // Get user enrollment for a course
  async getEnrollment(courseId) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COURSES.ENROLLMENT(courseId));
      return response.data.enrollment || response.data;
    } catch (error) {
      console.error('Failed to get enrollment:', error);
      throw this.handleError(error);
    }
  }

  // Get user's enrolled courses
  async getEnrolledCourses() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COURSES.ENROLLED);
      return response.data.courses || response.data;
    } catch (error) {
      console.error('Failed to get enrolled courses:', error);
      throw this.handleError(error);
    }
  }

  // Get courses taught by user
  async getTeachingCourses() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COURSES.TEACHING);
      return response.data.courses || response.data;
    } catch (error) {
      console.error('Failed to get teaching courses:', error);
      throw this.handleError(error);
    }
  }

  // Get course modules
  async getCourseModules(courseId) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COURSES.MODULES(courseId));
      return response.data.modules || response.data;
    } catch (error) {
      console.error('Failed to get course modules:', error);
      throw this.handleError(error);
    }
  }

  // Get course progress for enrolled user
  async getCourseProgress(courseId) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COURSES.PROGRESS(courseId));
      return response.data.progress || response.data;
    } catch (error) {
      console.error('Failed to get course progress:', error);
      throw this.handleError(error);
    }
  }

  // Update course progress
  async updateCourseProgress(courseId, moduleId, progressData) {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.COURSES.UPDATE_PROGRESS(courseId, moduleId),
        progressData
      );
      return response.data.progress || response.data;
    } catch (error) {
      console.error('Failed to update course progress:', error);
      throw this.handleError(error);
    }
  }

  // Get course statistics (for instructors)
  async getCourseStats(courseId) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COURSES.STATS(courseId));
      return response.data.stats || response.data;
    } catch (error) {
      console.error('Failed to get course stats:', error);
      throw this.handleError(error);
    }
  }

  // Get course students (for instructors)
  async getCourseStudents(courseId) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.COURSES.STUDENTS(courseId));
      return response.data.students || response.data;
    } catch (error) {
      console.error('Failed to get course students:', error);
      throw this.handleError(error);
    }
  }

  // Publish/unpublish course
  async toggleCourseStatus(courseId, status) {
    try {
      const response = await apiClient.put(API_ENDPOINTS.COURSES.STATUS(courseId), {
        status
      });
      return response.data.course || response.data;
    } catch (error) {
      console.error('Failed to update course status:', error);
      throw this.handleError(error);
    }
  }

  // Handle API errors
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          return new Error(data.message || 'Invalid request data');
        case 401:
          return new Error(data.message || 'Authentication required');
        case 403:
          return new Error(data.message || 'Access denied');
        case 404:
          return new Error(data.message || 'Course not found');
        case 409:
          return new Error(data.message || 'Course already exists');
        case 422:
          return new Error(data.message || 'Validation failed');
        case 429:
          return new Error(data.message || 'Too many requests');
        case 500:
          return new Error('Server error. Please try again later.');
        default:
          return new Error(data.message || 'An unexpected error occurred');
      }
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

// Export singleton instance
export const courseService = new CourseService();
export default courseService;