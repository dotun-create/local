import myImage1 from '../resources/images/how1.png';
import myImage2 from '../resources/images/how2.png';
import myImage3 from '../resources/images/how3.png';
import myImage4 from '../resources/images/img4.webp';
import troupeLogo from '../resources/images/logo.jpeg';
import userAvatar from '../resources/images/user-avatar.png';
import learningIllustration from '../resources/images/learning-illustration.png';

// Social Media Icons
import facebookIcon from '../resources/images/facebook.svg';
import twitterIcon from '../resources/images/twitter.svg';
import instagramIcon from '../resources/images/instagram.svg';
import linkedinIcon from '../resources/images/linkedin.svg';
import youtubeIcon from '../resources/images/youtube.svg';

// Application Configuration
export const appConfig = {
  // Course Cards Configuration
  courseCards: [
    {
      image: "/images/courses/computer-science.jpg",
      courseTitle: "Complete React Development",
      courseDescription: "Learn React from the ground up with hands-on projects and real-world examples. Perfect for beginners and intermediate developers.",
      courseCost: "$99.99",
      buttonName: "Enroll Now",
    },
    {
      image: "/images/courses/computer-science.jpg",
      courseTitle: "Advanced JavaScript Mastery",
      courseDescription: "Master advanced JavaScript concepts including ES6+, async programming, and modern development patterns.",
      courseCost: "$79.99",
      buttonName: "View Details",
    },
    {
      image: "/images/courses/computer-science.jpg",
      courseTitle: "Node.js Backend Development",
      courseDescription: "Build scalable backend applications with Node.js, Express, and MongoDB. Includes authentication and API development.",
      courseCost: "$129.99",
      buttonName: "Start Learning",
    }
  ],

  // How It Works Container Configuration
  howItWorksContainer: {
    titleText: "How it Works",
    howItWorksCardsContent: [
      {
        image: myImage1,
        text: "Join as a learner or tutor."
      },
      {
        image: myImage2,
        text: "Attend Structured 1-on-1 sessions."
      },
      {
        image:myImage3,
        text: "Get AI powered  feedback to lead your own class"
      }
    ],
    actionButtonName: "Get Started Today",
  },

  // App Header Configuration
  appHeader: {
    title: "React Component Library Demo",
    subtitle: "Reusable components for displaying course and instructional information"
  },

  // Student Container Configuration
  studentContainer: {
    image: myImage4,
    texts: [
      "For Students",
      "who wants to get better at Maths and Science?",
      "Learn by Teaching. Book a session. (First one on us).",
      "Available subjects: GCSE and A level Maths.",
      "Join thousands of students who have improved their grades through our unique teaching method."
    ],
    phrase: "Book a session",
    link: "https://example.com/success-stories",
    imageSide: "left"
  },
  // tutor Container Configuration
  tutorContainer: {
    image: myImage4,
    texts: [
      "For Aspiring Tutors",
      "Know your stuff? Help other learn it too and get paid",
    ],
    phrase: "Know your stuff? Help other learn it too and get paid",
    link: "/signup?accountType=tutor",
    imageSide: "right"
  },

  // Header Menu Configuration
  headerMenu: {
    "Home": "/",
    "Activities Center": "/courses",
    "Our Focus": "/how-it-works",
    "Book a session": "/session-booking",
    "My Modules": "/modules",
    "FAQ": "/FAQ",
    "Payment":"/payemnts",
    "Contact": "/contact"
  },

  // Troupe Header Configuration
  troupeHeader: {
    mainText: "Troupe Academy",
    textPortion: "Learn by Teaching",
    imageLink: troupeLogo,
    headerMenuDictionary: {
      "Home": "/",
      "Activities Center": "/courses",
      "My Modules": "/modules",
      "Our Focus": "/how-it-works",
      "FAQ": "/FAQ",
      "Contact": "/contact"
    }
  },

  // Footer Configuration
  footer: {
    listOfText: [
      "Connect with us and stay updated with the latest learning opportunities",
      "Join our community of learners and educators worldwide",
      "Transform your future through personalized education"
    ],
    dictionaryOfSocialMediaLogosAndLinks: {
      [facebookIcon]: "https://facebook.com/troupeacademy",
      [twitterIcon]: "https://twitter.com/troupeacademy", 
      [instagramIcon]: "https://instagram.com/troupeacademy",
      [linkedinIcon]: "https://linkedin.com/company/troupeacademy",
      [youtubeIcon]: "https://youtube.com/troupeacademy"
    },
    copyRightText: "© 2024 Troupe Academy. All rights reserved.",
    anotherStatement: "Empowering minds through collaborative learning."
  },

  // Course Page Configuration
  coursePage: {
    heroText: [
      "Discover Your Learning Journey",
      "Explore our comprehensive courses designed to transform your skills",
      "Learn from industry experts with hands-on projects and real-world applications"
    ],
    courseDetailObject: {
      "Programming": [
        {
          image: "/images/courses/computer-science.jpg",
          courseTitle: "C++ Programming",
          courseDescription: "Learn C++ programming with object-oriented concepts and system programming.",
          courseCost: "$119.99",
          buttonName: "Enroll Now"
        },
        {
          image: "/images/courses/computer-science.jpg",
          courseTitle: "Go Programming",
          courseDescription: "Modern Go programming for building scalable and efficient applications.",
          courseCost: "$99.99",
          buttonName: "Start Now"
        },
        {
          image: "/images/courses/computer-science.jpg",
          courseTitle: "Rust Programming",
          courseDescription: "Systems programming with Rust: memory safety and high performance.",
          courseCost: "$139.99",
          buttonName: "Learn More"
        },
        {
          image: "/images/courses/computer-science.jpg",
          courseTitle: "Swift for iOS",
          courseDescription: "iOS app development with Swift programming language and Xcode.",
          courseCost: "$159.99",
          buttonName: "Enroll Now"
        }
      ],
      "Design": [
        {
          image: "/images/courses/art.jpg",
          courseTitle: "UI/UX Design Masterclass",
          courseDescription: "Complete guide to user interface and user experience design principles.",
          courseCost: "$199.99",
          buttonName: "Enroll Today"
        }
      ],
      "Business": [
        {
          image: "/images/courses/default.jpg",
          courseTitle: "Digital Marketing Strategy",
          courseDescription: "Master digital marketing with SEO, social media, and content strategies.",
          courseCost: "$179.99",
          buttonName: "Start Learning"
        },
        {
          image: "/images/courses/default.jpg",
          courseTitle: "Project Management Pro",
          courseDescription: "Professional project management methodologies and best practices.",
          courseCost: "$159.99",
          buttonName: "Enroll Now"
        },
        {
          image: "/images/courses/default.jpg",
          courseTitle: "Business Analytics",
          courseDescription: "Data-driven decision making and business intelligence fundamentals.",
          courseCost: "$189.99",
          buttonName: "View Details"
        },
        {
          image: "/images/courses/default.jpg",
          courseTitle: "Leadership Excellence",
          courseDescription: "Develop leadership skills and team management capabilities.",
          courseCost: "$149.99",
          buttonName: "Join Course"
        },
        {
          image: "/images/courses/default.jpg",
          courseTitle: "Startup Fundamentals",
          courseDescription: "Learn how to start and grow a successful business from scratch.",
          courseCost: "$199.99",
          buttonName: "Start Now"
        }
      ]
    }
  },

  // Section Configuration
  sections: {
    courseCardsTitle: "Featured Courses",
    // howItWorksTitle: "How It Works"
  },

  // Module Card Configuration
  moduleCard: {
    courseTitle: "Introduction to Web Development",
    headerTitle: "Course Title",
    userAvatar: userAvatar,
    hasNotification: true,
    visualImage: learningIllustration,
    progressValue: 40,
    actionButtonText: "Start/ Continue Module",
    onActionClick: () => {
      // console.log('Module action clicked');
      alert('Starting module...');
    },
    moduleData: {
      topic: "Module Topic",
      lessons: [
        {
          id: 1,
          name: "Lesson 1",
          link: "#/lesson/1",
          completed: true,
          duration: "45 min"
        },
        {
          id: 2,
          name: "Lesson 2",
          link: "#/lesson/2",
          completed: true,
          duration: "30 min"
        },
        {
          id: 3,
          name: "Lesson 3",
          link: "#/lesson/3",
          completed: false,
          duration: "60 min"
        },
        {
          id: 4,
          name: "Lesson 4",
          link: "#/lesson/4",
          completed: false,
          duration: "40 min"
        },
        {
          id: 5,
          name: "Lesson 5",
          link: "#/lesson/5",
          completed: false,
          duration: "55 min"
        }
      ]
    },
    tasksData: [
      {
        id: 1,
        name: "Complete Quiz 1",
        taskType: "Quiz",
        dueDate: "Jan 25, 2024",
        link: "#/quiz/1"
      },
      {
        id: 2,
        name: "Submit Assignment",
        taskType: "Assignment",
        dueDate: "Jan 28, 2024",
        link: "#/assignment/1"
      },
      {
        id: 3,
        name: "Project Proposal",
        taskType: "Project",
        dueDate: "Feb 1, 2024",
        link: "#/project/1"
      }
    ],
    sessionDetails: {
      id: 1,
      title: "Live Coding Session",
      date: "Jan 20, 2024",
      time: "10:00 AM",
      duration: "90 minutes",
      instructor: "Dr. Smith",
      sessionLink: "#/session/join",
      paymentStatus: "unpaid",
      paymentLink: "#/payment/session/1"
    }
  },

  // User Accounts Configuration
  userAccounts: {
    students: [
      {
        id: "student_001",
        email: "john.student@example.com",
        password: "student123",
        accountType: "student",
        profile: {
          name: "John Doe",
          studentId: "STU-2024-001",
          grade: "10th Grade",
          enrollmentDate: "January 15, 2024",
          avatar: "/images/user-avatar.png",
          level: "Intermediate",
          completedCourses: 3,
          ongoingCourses: 5,
          totalCredits: 45
        }
      },
      {
        id: "student_002",
        email: "emily.student@example.com",
        password: "student456",
        accountType: "student",
        profile: {
          name: "Emily Johnson",
          studentId: "STU-2024-002",
          grade: "9th Grade",
          enrollmentDate: "February 1, 2024",
          avatar: "/images/user-avatar.png",
          level: "Beginner",
          completedCourses: 1,
          ongoingCourses: 3,
          totalCredits: 25
        }
      },
      {
        id: "student_003",
        email: "michael.student@example.com",
        password: "student789",
        accountType: "student",
        profile: {
          name: "Michael Chen",
          studentId: "STU-2024-003",
          grade: "11th Grade",
          enrollmentDate: "January 20, 2024",
          avatar: "/images/user-avatar.png",
          level: "Advanced",
          completedCourses: 5,
          ongoingCourses: 4,
          totalCredits: 65
        }
      }
    ],
    guardians: [
      {
        id: "guardian_001",
        email: "sarah.guardian@example.com",
        password: "guardian123",
        accountType: "guardian",
        profile: {
          name: "Mrs. Sarah Johnson",
          guardianId: "GUARD-2024-001",
          phone: "+1 (555) 123-4567",
          address: "123 Main Street, New York, NY 10001",
          joinDate: "January 10, 2024",
          avatar: "/images/user-avatar.png",
          totalCredits: 500,
          usedCredits: 285,
          availableCredits: 215,
          students: ["student_002", "student_003"] // References to student IDs
        }
      },
      {
        id: "guardian_002",
        email: "robert.guardian@example.com",
        password: "guardian456",
        accountType: "guardian",
        profile: {
          name: "Mr. Robert Williams",
          guardianId: "GUARD-2024-002",
          phone: "+1 (555) 987-6543",
          address: "456 Oak Avenue, Los Angeles, CA 90210",
          joinDate: "December 15, 2023",
          avatar: "/images/user-avatar.png",
          totalCredits: 750,
          usedCredits: 420,
          availableCredits: 330,
          students: ["student_001"] // References to student IDs
        }
      },
      {
        id: "guardian_003",
        email: "maria.guardian@example.com",
        password: "guardian789",
        accountType: "guardian",
        profile: {
          name: "Ms. Maria Rodriguez",
          guardianId: "GUARD-2024-003",
          phone: "+1 (555) 456-7890",
          address: "789 Pine Street, Chicago, IL 60601",
          joinDate: "February 1, 2024",
          avatar: "/images/user-avatar.png",
          totalCredits: 300,
          usedCredits: 150,
          availableCredits: 150,
          students: [] // No students yet
        }
      }
    ],
    tutors: [
      {
        id: "tutor_001",
        email: "sarah.tutor@example.com",
        password: "tutor123",
        accountType: "tutor",
        profile: {
          name: "Dr. Sarah Wilson",
          tutorId: "TUT-2024-001",
          phone: "+1 (555) 111-2222",
          address: "789 Academic Way, Boston, MA 02101",
          joinDate: "January 5, 2024",
          avatar: "/images/user-avatar.png",
          subjects: ["Mathematics", "Physics"],
          qualifications: ["PhD in Mathematics", "MSc in Physics"],
          experience: "8 years",
          rating: 4.8,
          totalSessions: 156,
          totalEarnings: 2850.00,
          hourlyRate: 35.00,
          isVerified: true,
          bio: "Experienced mathematics and physics tutor with a passion for helping students excel in STEM subjects."
        }
      },
      {
        id: "tutor_002", 
        email: "james.tutor@example.com",
        password: "tutor456",
        accountType: "tutor",
        profile: {
          name: "Prof. James Anderson",
          tutorId: "TUT-2024-002",
          phone: "+1 (555) 333-4444",
          address: "123 University Lane, Cambridge, MA 02138",
          joinDate: "December 20, 2023",
          avatar: "/images/user-avatar.png",
          subjects: ["Chemistry", "Biology"],
          qualifications: ["PhD in Chemistry", "MSc in Biochemistry"],
          experience: "12 years",
          rating: 4.9,
          totalSessions: 203,
          totalEarnings: 4250.00,
          hourlyRate: 40.00,
          isVerified: true,
          bio: "Award-winning chemistry professor with extensive experience in online tutoring and curriculum development."
        }
      },
      {
        id: "tutor_003",
        email: "emily.tutor@example.com", 
        password: "tutor789",
        accountType: "tutor",
        profile: {
          name: "Ms. Emily Chen",
          tutorId: "TUT-2024-003",
          phone: "+1 (555) 555-6666",
          address: "456 Education Street, New York, NY 10025",
          joinDate: "February 10, 2024",
          avatar: "/images/user-avatar.png",
          subjects: ["Computer Science", "Mathematics"],
          qualifications: ["MSc in Computer Science", "BSc in Mathematics"],
          experience: "5 years",
          rating: 4.7,
          totalSessions: 89,
          totalEarnings: 1780.00,
          hourlyRate: 30.00,
          isVerified: true,
          bio: "Young and enthusiastic tutor specializing in programming and computational mathematics."
        }
      }
    ],
    admins: [
      {
        id: "admin_001",
        email: "admin@orms.com",
        password: "admin123",
        accountType: "admin",
        profile: {
          name: "Admin User",
          adminId: "ADM-2024-001",
          phone: "+1 (555) 000-0001",
          address: "ORMS Headquarters, London, UK",
          joinDate: "January 1, 2024",
          avatar: "/images/user-avatar.png",
          role: "Super Admin",
          permissions: ["all"],
          lastLogin: "2024-01-14 09:30 AM",
          isActive: true
        }
      }
    ]
  },

  // Quiz Questions Configuration with Topics
  quizQuestions: [
    // Getting Started Questions
    {
      id: 1,
      question: "What is the primary purpose of HTML in web development?",
      type: "multiple_choice",
      topics: ["getting-started", "html", "general"],
      options: [
        "To style web pages",
        "To structure web content",
        "To add interactivity",
        "To manage databases"
      ],
      correctAnswer: 1,
      explanation: "HTML (HyperText Markup Language) is primarily used to structure web content by defining elements like headings, paragraphs, and links."
    },
    {
      id: 2,
      question: "Which of the following is NOT a valid HTML5 element?",
      type: "multiple_choice",
      topics: ["getting-started", "html"],
      options: [
        "<article>",
        "<section>", 
        "<aside>",
        "<content>"
      ],
      correctAnswer: 3,
      explanation: "<content> is not a valid HTML5 element. The correct elements are <article>, <section>, and <aside>."
    },

    // Core Concepts Questions
    {
      id: 3,
      question: "What does CSS stand for?",
      type: "multiple_choice",
      topics: ["core-concepts", "css", "general"],
      options: [
        "Computer Style Sheets",
        "Cascading Style Sheets",
        "Creative Style Sheets", 
        "Colorful Style Sheets"
      ],
      correctAnswer: 1,
      explanation: "CSS stands for Cascading Style Sheets, which is used to style and layout web pages."
    },
    {
      id: 4,
      question: "Explain the difference between inline, internal, and external CSS.",
      type: "essay",
      topics: ["core-concepts", "css"],
      correctAnswer: "Sample answer should explain: Inline CSS uses the style attribute directly on HTML elements, Internal CSS uses <style> tags within the <head> section, and External CSS uses separate .css files linked to the HTML document. External CSS is preferred for maintainability and reusability.",
      explanation: "Understanding these three methods of applying CSS is fundamental to web development best practices."
    },
    {
      id: 5,
      question: "Which CSS property is used to change the background color?",
      type: "multiple_choice",
      topics: ["core-concepts", "css"],
      options: [
        "color",
        "background-color",
        "bg-color",
        "background"
      ],
      correctAnswer: 1,
      explanation: "The background-color property is specifically used to set the background color of an element."
    },

    // Practical Applications Questions
    {
      id: 6,
      question: "What is the purpose of JavaScript in web development?",
      type: "multiple_choice",
      topics: ["practical-applications", "javascript", "general"],
      options: [
        "To structure web content",
        "To style web pages",
        "To add interactivity and dynamic behavior",
        "To manage server databases"
      ],
      correctAnswer: 2,
      explanation: "JavaScript is primarily used to add interactivity and dynamic behavior to web pages."
    },
    {
      id: 7,
      question: "Describe how you would make a responsive web design.",
      type: "essay",
      topics: ["practical-applications", "responsive-design"],
      correctAnswer: "Sample answer should mention: Use flexible grid layouts, CSS media queries, flexible images (max-width: 100%), mobile-first approach, viewport meta tag, and testing across different screen sizes and devices.",
      explanation: "Responsive design ensures websites work well across all device types and screen sizes."
    },
    {
      id: 8,
      question: "Which of the following is a JavaScript framework?",
      type: "multiple_choice",
      topics: ["practical-applications", "javascript"],
      options: [
        "Bootstrap",
        "jQuery",
        "React",
        "All of the above"
      ],
      correctAnswer: 3,
      explanation: "All listed options are JavaScript frameworks or libraries: Bootstrap (CSS framework with JS components), jQuery (JavaScript library), and React (JavaScript framework)."
    },

    // Advanced Topics Questions
    {
      id: 9,
      question: "What is the purpose of semantic HTML?",
      type: "multiple_choice",
      topics: ["advanced-topics", "html", "accessibility"],
      options: [
        "To make websites load faster",
        "To improve SEO and accessibility",
        "To reduce file size",
        "To add animations"
      ],
      correctAnswer: 1,
      explanation: "Semantic HTML improves SEO and accessibility by providing meaningful structure that search engines and assistive technologies can understand."
    },
    {
      id: 10,
      question: "Explain the concept of the DOM in web development.",
      type: "essay",
      topics: ["advanced-topics", "javascript", "dom"],
      correctAnswer: "Sample answer should explain: DOM (Document Object Model) is a programming interface that represents HTML/XML documents as a tree structure. It allows JavaScript to interact with and manipulate web page content, structure, and styling dynamically. The DOM provides methods to add, remove, or modify elements and their attributes.",
      explanation: "Understanding the DOM is crucial for dynamic web development with JavaScript."
    },

    // Final Assessment Questions
    {
      id: 11,
      question: "Which HTTP status code indicates a successful request?",
      type: "multiple_choice",
      topics: ["final-assessment", "http", "web-protocols"],
      options: [
        "404",
        "500",
        "200",
        "301"
      ],
      correctAnswer: 2,
      explanation: "HTTP status code 200 indicates a successful request. 404 means not found, 500 indicates server error, and 301 is a permanent redirect."
    },
    {
      id: 12,
      question: "What is the difference between GET and POST HTTP methods?",
      type: "essay",
      topics: ["final-assessment", "http", "web-protocols"],
      correctAnswer: "Sample answer: GET is used to retrieve data from a server and is idempotent (safe to repeat). Data is sent in URL parameters, has length limitations, and can be cached. POST is used to send data to create/update resources, data is sent in the request body, has no size limitations, and is not cached by default.",
      explanation: "Understanding HTTP methods is essential for web API development and client-server communication."
    },
    {
      id: 13,
      question: "Which of the following is a best practice for web accessibility?",
      type: "multiple_choice",
      topics: ["final-assessment", "accessibility", "best-practices"],
      options: [
        "Using alt text for images",
        "Providing keyboard navigation",
        "Using sufficient color contrast",
        "All of the above"
      ],
      correctAnswer: 3,
      explanation: "All listed options are important web accessibility best practices that help make websites usable by people with disabilities."
    },

    // General Questions (fallback)
    {
      id: 14,
      question: "What does 'www' stand for in web addresses?",
      type: "multiple_choice",
      topics: ["general", "web-basics"],
      options: [
        "World Wide Web",
        "Worldwide Web",
        "Web World Wide",
        "Wide Web World"
      ],
      correctAnswer: 0,
      explanation: "'www' stands for World Wide Web, which is the system of interlinked hypertext documents accessed via the Internet."
    },
    {
      id: 15,
      question: "Describe what you understand by 'responsive web design' and its importance.",
      type: "essay",
      topics: ["general", "responsive-design"],
      correctAnswer: "Responsive web design is an approach to web design that makes web pages render well on a variety of devices and window or screen sizes. It's important because it ensures optimal user experience across desktops, tablets, and mobile devices, improves SEO rankings, and reduces maintenance costs by having one website instead of separate mobile versions.",
      explanation: "Responsive design is crucial in today's multi-device world where users access websites from various screen sizes."
    }
  ]
};