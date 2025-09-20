/**
 * Course Image Helper
 * Maps course subjects to appropriate thumbnail images
 */

export const getCourseThumbnail = (subject) => {
  const subjectMap = {
    // Mathematics & Math-related
    'mathematics': '/images/courses/mathematics.jpg',
    'math': '/images/courses/mathematics.jpg',
    'algebra': '/images/courses/mathematics.jpg',
    'calculus': '/images/courses/mathematics.jpg',
    'geometry': '/images/courses/mathematics.jpg',
    'trigonometry': '/images/courses/mathematics.jpg',
    
    // General Science
    'science': '/images/courses/science.jpg',
    'general science': '/images/courses/science.jpg',
    
    // Physics
    'physics': '/images/courses/physics.jpg',
    
    // Chemistry
    'chemistry': '/images/courses/chemistry.jpg',
    
    // Biology & Life Sciences
    'biology': '/images/courses/biology.jpg',
    'life science': '/images/courses/biology.jpg',
    'life sciences': '/images/courses/biology.jpg',
    'botany': '/images/courses/biology.jpg',
    'zoology': '/images/courses/biology.jpg',
    
    // Computer Science & Programming
    'computer science': '/images/courses/computer-science.jpg',
    'programming': '/images/courses/computer-science.jpg',
    'coding': '/images/courses/computer-science.jpg',
    'software engineering': '/images/courses/computer-science.jpg',
    'web development': '/images/courses/computer-science.jpg',
    'javascript': '/images/courses/computer-science.jpg',
    'python': '/images/courses/computer-science.jpg',
    'java': '/images/courses/computer-science.jpg',
    'c++': '/images/courses/computer-science.jpg',
    'html': '/images/courses/computer-science.jpg',
    'css': '/images/courses/computer-science.jpg',
    
    // English & Language Arts
    'english': '/images/courses/english.jpg',
    'literature': '/images/courses/english.jpg',
    'language arts': '/images/courses/english.jpg',
    'writing': '/images/courses/english.jpg',
    'reading': '/images/courses/english.jpg',
    'grammar': '/images/courses/english.jpg',
    
    // History & Social Studies
    'history': '/images/courses/history.jpg',
    'social studies': '/images/courses/history.jpg',
    'world history': '/images/courses/history.jpg',
    'american history': '/images/courses/history.jpg',
    'european history': '/images/courses/history.jpg',
    'ancient history': '/images/courses/history.jpg',
    
    // Geography & Earth Sciences
    'geography': '/images/courses/geography.jpg',
    'earth science': '/images/courses/geography.jpg',
    'earth sciences': '/images/courses/geography.jpg',
    'geology': '/images/courses/geography.jpg',
    'environmental science': '/images/courses/geography.jpg',
    
    // Arts & Creative
    'art': '/images/courses/art.jpg',
    'visual arts': '/images/courses/art.jpg',
    'drawing': '/images/courses/art.jpg',
    'painting': '/images/courses/art.jpg',
    'design': '/images/courses/art.jpg',
    'graphic design': '/images/courses/art.jpg',
    
    // Music & Audio
    'music': '/images/courses/music.jpg',
    'audio': '/images/courses/music.jpg',
    'sound': '/images/courses/music.jpg',
    'piano': '/images/courses/music.jpg',
    'guitar': '/images/courses/music.jpg',
    'singing': '/images/courses/music.jpg',
    
    // Economics & Business
    'economics': '/images/courses/economics.jpg',
    'business': '/images/courses/economics.jpg',
    'finance': '/images/courses/economics.jpg',
    'accounting': '/images/courses/economics.jpg',
    'marketing': '/images/courses/economics.jpg',
    
    // Languages
    'languages': '/images/courses/languages.jpg',
    'spanish': '/images/courses/languages.jpg',
    'french': '/images/courses/languages.jpg',
    'german': '/images/courses/languages.jpg',
    'chinese': '/images/courses/languages.jpg',
    'japanese': '/images/courses/languages.jpg',
    'language learning': '/images/courses/languages.jpg',
  };
  
  // Normalize the subject string (lowercase and trim)
  const normalizedSubject = subject ? subject.toLowerCase().trim() : '';
  
  // Return the mapped image or default
  return subjectMap[normalizedSubject] || '/images/courses/default.jpg';
};

/**
 * Get course thumbnail for database course objects
 * Handles both old format (courseTitle, courseDescription) and new format (title, description, subject)
 */
export const getCourseImage = (course) => {
  // Try to get subject from course object
  let subject = course.subject;
  
  // If no subject, try to infer from title
  if (!subject) {
    const title = course.title || course.courseTitle || '';
    subject = title;
  }
  
  // Check if course already has an image/thumbnail
  if (course.image && course.image !== '/images/coursecard.jpeg') {
    return course.image;
  }
  
  if (course.thumbnail && course.thumbnail !== '/images/coursecard.jpeg') {
    return course.thumbnail;
  }
  
  // Use subject-based mapping
  return getCourseThumbnail(subject);
};