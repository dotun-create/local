import { formatCurrency } from '@shared/utils/currency';

// Course image utilities
export const getCourseImage = (course) => {
  if (course?.thumbnail) return course.thumbnail;
  if (course?.image) return course.image;

  // Generate a placeholder based on course subject
  const subject = course?.subject?.toLowerCase() || 'general';
  const placeholderMap = {
    'math': '/images/placeholders/math-course.jpg',
    'science': '/images/placeholders/science-course.jpg',
    'english': '/images/placeholders/english-course.jpg',
    'history': '/images/placeholders/history-course.jpg',
    'computer science': '/images/placeholders/cs-course.jpg',
    'programming': '/images/placeholders/programming-course.jpg',
    'art': '/images/placeholders/art-course.jpg',
    'music': '/images/placeholders/music-course.jpg'
  };

  return placeholderMap[subject] || '/images/placeholders/default-course.jpg';
};

// Course pricing utilities
export const formatCoursePrice = (course) => {
  if (!course) return 'N/A';

  const price = course.price || course.courseCost;

  if (price === null || price === undefined) return 'Contact for pricing';
  if (price === 0) return 'Free';

  return formatCurrency(price);
};

// Course level utilities
export const getCourseLevelColor = (level) => {
  switch (level?.toLowerCase()) {
    case 'beginner':
      return '#10B981'; // green
    case 'intermediate':
      return '#F59E0B'; // amber
    case 'advanced':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
};

export const getCourseLevelBadgeVariant = (level) => {
  switch (level?.toLowerCase()) {
    case 'beginner':
      return 'success';
    case 'intermediate':
      return 'warning';
    case 'advanced':
      return 'danger';
    default:
      return 'secondary';
  }
};

// Course status utilities
export const getCourseStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'published':
      return '#10B981'; // green
    case 'draft':
      return '#F59E0B'; // amber
    case 'archived':
    case 'inactive':
      return '#6B7280'; // gray
    case 'full':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
};

export const getCourseStatusBadgeVariant = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'published':
      return 'success';
    case 'draft':
      return 'warning';
    case 'archived':
    case 'inactive':
      return 'secondary';
    case 'full':
      return 'danger';
    default:
      return 'secondary';
  }
};

// Course capacity utilities
export const getCourseCapacityStatus = (enrolled, max) => {
  if (!max || max <= 0) return 'unlimited';

  const percentage = (enrolled / max) * 100;

  if (percentage >= 100) return 'full';
  if (percentage >= 90) return 'almost-full';
  if (percentage >= 75) return 'filling-up';

  return 'available';
};

export const getCourseCapacityColor = (enrolled, max) => {
  const status = getCourseCapacityStatus(enrolled, max);

  switch (status) {
    case 'full':
      return '#EF4444'; // red
    case 'almost-full':
      return '#F59E0B'; // amber
    case 'filling-up':
      return '#F59E0B'; // amber
    case 'available':
      return '#10B981'; // green
    default:
      return '#6B7280'; // gray
  }
};

// Course duration utilities
export const formatCourseDuration = (duration) => {
  if (!duration) return 'Self-paced';

  // Handle different duration formats
  if (typeof duration === 'number') {
    // Assume it's in hours
    if (duration < 1) return `${Math.round(duration * 60)} minutes`;
    if (duration < 24) return `${duration} hour${duration !== 1 ? 's' : ''}`;
    const days = Math.round(duration / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  return duration;
};

// Course progress utilities
export const calculateCourseProgress = (modules = []) => {
  if (!modules || modules.length === 0) return 0;

  const completedModules = modules.filter(module => module.completed || module.status === 'completed');
  return Math.round((completedModules.length / modules.length) * 100);
};

export const getProgressColor = (progress) => {
  if (progress >= 100) return '#10B981'; // green
  if (progress >= 75) return '#84CC16'; // lime
  if (progress >= 50) return '#F59E0B'; // amber
  if (progress >= 25) return '#EF4444'; // red
  return '#6B7280'; // gray
};

// Course search and filtering utilities
export const filterCourses = (courses, filters) => {
  if (!courses || !Array.isArray(courses)) return [];

  return courses.filter(course => {
    // Search query filter
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const searchFields = [
        course.title,
        course.description,
        course.subject,
        course.instructor?.name
      ].filter(Boolean);

      const matches = searchFields.some(field =>
        field.toLowerCase().includes(query)
      );

      if (!matches) return false;
    }

    // Subject filter
    if (filters.subject && filters.subject !== 'all') {
      if (course.subject !== filters.subject) return false;
    }

    // Level filter
    if (filters.level && filters.level !== 'all') {
      if (course.level !== filters.level) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (course.status !== filters.status) return false;
    }

    // Price filter
    if (filters.priceRange) {
      const price = course.price || 0;
      const [min, max] = filters.priceRange;
      if (price < min || price > max) return false;
    }

    // Duration filter
    if (filters.duration) {
      // Implementation depends on duration format
      // This is a placeholder
    }

    return true;
  });
};

// Course sorting utilities
export const sortCourses = (courses, sortBy, sortOrder = 'asc') => {
  if (!courses || !Array.isArray(courses)) return [];

  const sorted = [...courses].sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'title':
        aValue = (a.title || '').toLowerCase();
        bValue = (b.title || '').toLowerCase();
        break;
      case 'price':
        aValue = a.price || 0;
        bValue = b.price || 0;
        break;
      case 'level':
        const levelOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
        aValue = levelOrder[a.level?.toLowerCase()] || 0;
        bValue = levelOrder[b.level?.toLowerCase()] || 0;
        break;
      case 'enrolledCount':
        aValue = a.enrolledCount || a.enrolledStudents || 0;
        bValue = b.enrolledCount || b.enrolledStudents || 0;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt || a.created_at || 0);
        bValue = new Date(b.createdAt || b.created_at || 0);
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt || a.updated_at || 0);
        bValue = new Date(b.updatedAt || b.updated_at || 0);
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

// Course organization utilities
export const organizeCoursesBySubject = (courses) => {
  if (!courses || !Array.isArray(courses)) return {};

  return courses.reduce((acc, course) => {
    const subject = course.subject || 'General';
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(course);
    return acc;
  }, {});
};

export const organizeCoursesByLevel = (courses) => {
  if (!courses || !Array.isArray(courses)) return {};

  return courses.reduce((acc, course) => {
    const level = course.level || 'All Levels';
    if (!acc[level]) {
      acc[level] = [];
    }
    acc[level].push(course);
    return acc;
  }, {});
};

// Course validation utilities
export const validateCourseData = (courseData) => {
  const errors = {};

  if (!courseData.title?.trim()) {
    errors.title = 'Course title is required';
  }

  if (!courseData.description?.trim()) {
    errors.description = 'Course description is required';
  }

  if (!courseData.subject?.trim()) {
    errors.subject = 'Course subject is required';
  }

  if (courseData.price !== undefined && courseData.price < 0) {
    errors.price = 'Price cannot be negative';
  }

  if (courseData.maxCapacity !== undefined && courseData.maxCapacity < 1) {
    errors.maxCapacity = 'Capacity must be at least 1';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Course URL utilities
export const generateCourseSlug = (title) => {
  return title
    ?.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim('-'); // Remove leading/trailing hyphens
};

export const getCourseUrl = (course) => {
  const slug = course.slug || generateCourseSlug(course.title);
  return `/courses/${course.id}${slug ? `/${slug}` : ''}`;
};