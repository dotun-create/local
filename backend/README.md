# ORMS Backend API

A Flask-based REST API backend for the Online Resources Management System (ORMS) that replicates and extends the functionality of the JSON Server.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Support for students, guardians, tutors, and administrators
- **Course Management**: Complete CRUD operations for courses, modules, and lessons
- **Session Management**: Schedule and manage learning sessions with enrollment
- **Quiz System**: Create quizzes, manage questions, and track results
- **Payment Processing**: Invoice generation and payment tracking
- **Analytics**: Comprehensive analytics for performance tracking
- **Notifications**: System-wide notification management

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- SQLite (default) or PostgreSQL/MySQL (production)

### Setup

1. **Clone the repository and navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration values.

5. **Initialize the database**:
   ```bash
   flask init-db
   ```

## Running the Application

### Development
```bash
python app.py
```
The API will be available at `http://localhost:5000`

### Production
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/{id}` - Get specific user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user (admin)
- `GET /api/users/stats` - Get user statistics (admin)

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/{id}` - Get specific course
- `POST /api/courses` - Create course (admin)
- `PUT /api/courses/{id}` - Update course (admin)
- `DELETE /api/courses/{id}` - Delete course (admin)
- `POST /api/courses/{id}/enroll` - Enroll in course
- `POST /api/courses/{id}/tutors` - Assign tutor (admin)

### Modules & Lessons
- `GET /api/courses/{courseId}/modules` - Get course modules
- `GET /api/modules/{id}` - Get specific module
- `POST /api/courses/{courseId}/modules` - Create module (admin)
- `PUT /api/modules/{id}` - Update module (admin)
- `DELETE /api/modules/{id}` - Delete module (admin)
- `GET /api/modules/{moduleId}/lessons` - Get module lessons
- `POST /api/modules/{moduleId}/lessons` - Create lesson (admin)

### Sessions
- `GET /api/sessions` - Get sessions (filtered by role)
- `GET /api/sessions/{id}` - Get specific session
- `POST /api/sessions` - Create session (admin/tutor)
- `PUT /api/sessions/{id}` - Update session
- `DELETE /api/sessions/{id}` - Delete session
- `POST /api/sessions/{id}/enroll` - Enroll in session
- `POST /api/sessions/{id}/unenroll` - Unenroll from session

### Quizzes
- `GET /api/modules/{moduleId}/quizzes` - Get module quizzes
- `GET /api/quizzes/{id}` - Get quiz with questions
- `POST /api/modules/{moduleId}/quizzes` - Create quiz (admin)
- `POST /api/quizzes/{id}/questions` - Add question (admin)
- `POST /api/quizzes/{id}/submit` - Submit quiz answers
- `GET /api/quiz-results` - Get quiz results (filtered by role)

### Enrollments
- `GET /api/enrollments` - Get enrollments (filtered by role)
- `GET /api/enrollments/{id}` - Get specific enrollment
- `POST /api/enrollments/{id}/approve` - Approve enrollment
- `POST /api/enrollments/{id}/reject` - Reject enrollment
- `PUT /api/enrollments/{id}/progress` - Update progress

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Create notification (admin)
- `PUT /api/notifications/{id}/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `POST /api/notifications/broadcast` - Broadcast notification (admin)

### Payments
- `GET /api/invoices` - Get invoices (filtered by role)
- `POST /api/invoices` - Create invoice (admin)
- `POST /api/invoices/{id}/pay` - Process payment
- `GET /api/tutor-earnings` - Get tutor earnings
- `POST /api/tutor-earnings/{id}/payout` - Process payout (admin)

### Analytics
- `GET /api/analytics/overview` - System overview (admin)
- `GET /api/analytics/student-performance` - Student performance
- `GET /api/analytics/tutor-earnings` - Tutor earnings analytics
- `GET /api/analytics/course-performance` - Course performance (admin)

## Database Schema

The API uses SQLAlchemy ORM with the following main models:
- **User**: Students, guardians, tutors, and administrators
- **Course**: Course information with modules and tutors
- **Module**: Course modules containing lessons and quizzes
- **Lesson**: Individual learning content
- **Quiz/Question**: Assessment system
- **Session**: Live learning sessions
- **Enrollment**: Student course enrollments
- **QuizResult**: Quiz attempt records
- **Notification**: System notifications
- **Invoice/Payment**: Billing and payment tracking
- **TutorEarning**: Tutor compensation tracking

## Authentication & Authorization

The API uses JWT tokens for authentication with role-based access control:
- **Students**: Access their own data, take quizzes, view courses
- **Guardians**: Manage their students, approve enrollments, view progress
- **Tutors**: Manage their sessions, view student results, track earnings
- **Administrators**: Full system access and management

## Configuration

Key configuration options in `.env`:
- `SECRET_KEY`: Flask secret key
- `JWT_SECRET_KEY`: JWT token secret
- `DATABASE_URL`: Database connection string
- `CORS_ORIGINS`: Allowed frontend origins
- `UPLOAD_FOLDER`: File upload directory

## Development

### Database Migrations
```bash
flask db init        # Initialize migrations
flask db migrate     # Create migration
flask db upgrade     # Apply migrations
```

### Testing
```bash
pytest                # Run all tests
pytest tests/test_auth.py  # Run specific test file
```

### Code Style
The project follows PEP 8 style guidelines. Use `black` and `flake8` for formatting:
```bash
black .               # Format code
flake8 .              # Check style
```

## Production Deployment

1. **Set environment variables**:
   - `FLASK_ENV=production`
   - `DATABASE_URL=postgresql://...` (for PostgreSQL)
   - Update other security settings

2. **Use a production WSGI server**:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

3. **Set up reverse proxy** (nginx recommended)

4. **Configure SSL/TLS** for HTTPS

## API Documentation

The API follows RESTful conventions with JSON responses. All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

Success responses vary by endpoint but typically include:
```json
{
  "data": {},
  "message": "Success message (optional)"
}
```

## Support

For issues and questions, please refer to the project documentation or create an issue in the project repository.