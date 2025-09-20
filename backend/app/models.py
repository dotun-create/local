from datetime import datetime, timedelta, time
from app import db, bcrypt
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import event
from flask import current_app, request
import uuid
import os
import base64

# Association tables
course_tutors = db.Table('course_tutors',
    db.Column('course_id', db.String(50), db.ForeignKey('courses.id'), primary_key=True),
    db.Column('tutor_id', db.String(50), db.ForeignKey('users.id'), primary_key=True)
)

session_students = db.Table('session_students',
    db.Column('session_id', db.String(50), db.ForeignKey('sessions.id'), primary_key=True),
    db.Column('student_id', db.String(50), db.ForeignKey('users.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"user_{uuid.uuid4().hex[:8]}")
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    account_type = db.Column(db.String(20), nullable=False)  # student, guardian, tutor, admin
    roles = db.Column(db.JSON, default=lambda: [])  # Array of roles: ['student'], ['tutor'], ['student', 'tutor']
    is_active = db.Column(db.Boolean, default=True)
    status = db.Column(db.String(30), default='pending')  # pending, active, potential_student, potential_tutor, potential_drop, inactive
    last_login = db.Column(db.DateTime, nullable=True)  # Track last login for status transitions
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Profile data (JSON field for flexibility)
    profile = db.Column(db.JSON, default={})
    
    # Temporary password fields
    temp_password_hash = db.Column(db.String(255), nullable=True)
    temp_password_expires_at = db.Column(db.DateTime, nullable=True)
    force_password_change = db.Column(db.Boolean, default=False)
    temp_password_created_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    
    # Password reset fields
    reset_token = db.Column(db.String(64), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    enrollments = db.relationship('Enrollment', back_populates='student', foreign_keys='Enrollment.student_id')
    guardian_enrollments = db.relationship('Enrollment', back_populates='guardian', foreign_keys='Enrollment.guardian_id')
    taught_courses = db.relationship('Course', secondary=course_tutors, back_populates='tutors')
    tutored_sessions = db.relationship('Session', back_populates='tutor', foreign_keys='Session.tutor_id')
    enrolled_sessions = db.relationship('Session', secondary=session_students, back_populates='students')
    quiz_results = db.relationship('QuizResult', back_populates='student')
    notifications = db.relationship('Notification', back_populates='user', cascade='all, delete-orphan')
    earnings = db.relationship('TutorEarning', back_populates='tutor')
    
    @staticmethod
    def get_encryption_key():
        """Get or create encryption key for password storage"""
        key = os.environ.get('PASSWORD_ENCRYPTION_KEY')
        if not key:
            # For demo purposes, generate a key - in production this should be managed securely
            import secrets
            key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
            if current_app:
                current_app.logger.warning("Generated new encryption key - store securely in production!")
        return key
    
    def set_password(self, password, store_plaintext=False):
        """Enhanced password setting with optional plaintext storage"""
        # Always create bcrypt hash
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        
        # Check if we should store encrypted plaintext for admin viewing
        if store_plaintext:
            try:
                from cryptography.fernet import Fernet
                # Use a simple encryption for demo - in production use proper key management
                key = self.get_encryption_key()
                fernet = Fernet(base64.urlsafe_b64encode(key.encode()[:32].ljust(32)[:32]))
                encrypted_password = fernet.encrypt(password.encode())
                
                # Mark previous password as not current
                if hasattr(self, 'password_history'):
                    for vault_entry in self.password_history:
                        if vault_entry.is_current:
                            vault_entry.is_current = False
                
                # Store new password - defer if user not yet saved
                if self.id:
                    vault_entry = PasswordVault(
                        user_id=self.id,
                        password_plaintext_encrypted=base64.b64encode(encrypted_password).decode(),
                        password_hash=self.password_hash,
                        encryption_key_id='primary',
                        store_plaintext=True
                    )
                    db.session.add(vault_entry)
                else:
                    # Store for later when user is saved
                    self._pending_vault_entry = {
                        'password_plaintext_encrypted': base64.b64encode(encrypted_password).decode(),
                        'password_hash': self.password_hash,
                        'encryption_key_id': 'primary',
                        'store_plaintext': True
                    }
                
            except ImportError:
                # cryptography not installed, skip plaintext storage
                current_app.logger.warning("cryptography package not installed - cannot store plaintext passwords")
            except Exception as e:
                current_app.logger.error(f"Failed to store plaintext password: {str(e)}")
                
    def create_pending_vault_entry(self):
        """Create vault entry from pending data after user is saved"""
        if hasattr(self, '_pending_vault_entry') and self.id:
            vault_entry = PasswordVault(
                user_id=self.id,
                password_plaintext_encrypted=self._pending_vault_entry['password_plaintext_encrypted'],
                password_hash=self._pending_vault_entry['password_hash'],
                encryption_key_id=self._pending_vault_entry['encryption_key_id'],
                store_plaintext=self._pending_vault_entry['store_plaintext']
            )
            db.session.add(vault_entry)
            delattr(self, '_pending_vault_entry')
            return vault_entry
        return None
    
    def check_password(self, password):
        """Enhanced password check that handles both regular and temporary passwords"""
        # First check temporary password if it exists
        if self.temp_password_hash and self.check_temporary_password(password):
            return True
        
        # Then check regular password
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def set_temporary_password(self, temp_password, created_by_admin_id):
        """Set a temporary password that expires in 24 hours"""
        self.temp_password_hash = bcrypt.generate_password_hash(temp_password).decode('utf-8')
        self.temp_password_expires_at = datetime.utcnow() + timedelta(hours=24)
        self.force_password_change = True
        self.temp_password_created_by = created_by_admin_id
    
    def check_temporary_password(self, password):
        """Check if password matches temporary password and is not expired"""
        if not self.temp_password_hash or not self.temp_password_expires_at:
            return False
        
        if datetime.utcnow() > self.temp_password_expires_at:
            return False
            
        return bcrypt.check_password_hash(self.temp_password_hash, password)
    
    def clear_temporary_password(self):
        """Clear temporary password fields"""
        self.temp_password_hash = None
        self.temp_password_expires_at = None
        self.force_password_change = False
        self.temp_password_created_by = None
    
    def get_plaintext_password(self, admin_user_id, justification=""):
        """
        HIGHLY SENSITIVE: Get plaintext password for admin viewing
        REQUIRES: Secure session, audit logging, MFA verification
        """
        try:
            from cryptography.fernet import Fernet
            
            # Get current password from vault
            vault_entry = None
            for entry in self.password_history:
                if entry.is_current and entry.store_plaintext:
                    vault_entry = entry
                    break
            
            if not vault_entry or not vault_entry.password_plaintext_encrypted:
                raise ValueError("Plaintext password not available")
            
            # Log the access attempt
            audit_entry = PasswordViewAudit(
                admin_id=admin_user_id,
                target_user_id=self.id,
                view_type='current_password',
                justification=justification,
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None,
                admin_re_authenticated=True
            )
            db.session.add(audit_entry)
            db.session.commit()
            
            # Decrypt password
            key = self.get_encryption_key()
            fernet = Fernet(base64.urlsafe_b64encode(key.encode()[:32].ljust(32)[:32]))
            encrypted_data = base64.b64decode(vault_entry.password_plaintext_encrypted.encode())
            plaintext_password = fernet.decrypt(encrypted_data).decode()
            
            return plaintext_password
            
        except ImportError:
            raise ValueError("Cryptography package required for password decryption")
        except Exception as e:
            if current_app:
                current_app.logger.error(f"Password decryption failed: {str(e)}")
            raise ValueError("Password decryption failed")
    
    def update_last_login(self):
        """Update the last login timestamp and potentially update status"""
        self.last_login = datetime.utcnow()
        # If user was pending and just logged in, set to active
        if self.status == 'pending':
            self.status = 'active'
    
    def update_status_based_on_activity(self):
        """Update user status based on login activity according to business rules"""
        from datetime import timedelta
        
        now = datetime.utcnow()
        
        if self.account_type == 'student':
            if self.last_login is None:
                # Never logged in
                days_since_creation = (now - self.created_at).days
                if days_since_creation > 30:
                    self.status = 'potential_student'
                else:
                    self.status = 'pending'
            else:
                # Has logged in before
                days_since_login = (now - self.last_login).days
                if days_since_login >= 30:
                    self.status = 'potential_drop'
                else:
                    self.status = 'active'
        
        elif self.account_type == 'tutor':
            if self.last_login is None:
                # Never logged in
                days_since_creation = (now - self.created_at).days
                if days_since_creation > 30:
                    self.status = 'potential_tutor'
                else:
                    self.status = 'pending'
            else:
                # Has logged in before
                days_since_login = (now - self.last_login).days
                if days_since_login >= 30:
                    self.status = 'potential_drop'
                else:
                    self.status = 'active'
        
        elif self.account_type == 'guardian':
            if self.last_login is None:
                # Never logged in - set as inactive
                self.status = 'inactive'
            else:
                days_since_login = (now - self.last_login).days
                if days_since_login >= 21:  # 3 weeks
                    self.status = 'inactive'
                elif days_since_login <= 14:  # 2 weeks
                    self.status = 'active'
                # Between 14-21 days, keep current status
        
        elif self.account_type == 'admin':
            # Admins remain active
            self.status = 'active'

    def has_role(self, role):
        """Check if user has a specific role"""
        return role in (self.roles or [])

    def add_role(self, role):
        """Add a role to the user"""
        if not self.roles:
            self.roles = []
        if role not in self.roles:
            roles_copy = self.roles.copy()
            roles_copy.append(role)
            self.roles = roles_copy

    def remove_role(self, role):
        """Remove a role from the user"""
        if self.roles and role in self.roles:
            roles_copy = self.roles.copy()
            roles_copy.remove(role)
            self.roles = roles_copy

    def can_tutor_course(self, course_id):
        """Check if user can tutor a specific course"""
        if not self.has_role('tutor'):
            return False

        qualification = TutorQualification.query.filter_by(
            user_id=self.id,
            course_id=course_id,
            is_active=True
        ).first()
        return qualification is not None

    def get_qualified_courses(self):
        """Get list of courses user is qualified to tutor"""
        if not self.has_role('tutor'):
            return []

        qualifications = TutorQualification.query.filter_by(
            user_id=self.id,
            is_active=True
        ).all()
        return [q.course_id for q in qualifications]

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'email': self.email,
            'accountType': self.account_type,
            'roles': self.roles or [],
            'profile': self.profile,
            'status': self.status,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
        
        # Add commonly used profile fields at top level for convenience
        if self.profile:
            data['name'] = self.profile.get('name', 'N/A')
            data['phone'] = self.profile.get('phone', '')
            data['subjects'] = self.profile.get('subjects', [])
            data['academicCountry'] = self.profile.get('academic_country', '')
            data['grade'] = self.profile.get('grade_level', self.profile.get('grade', ''))
            data['guardian'] = self.profile.get('guardian', '')
            data['students'] = self.profile.get('students', [])
            data['rating'] = self.profile.get('rating', None)
            data['totalSessions'] = self.profile.get('totalSessions', 0)
            data['earnings'] = self.profile.get('earnings', 0)
            data['enrolledCourses'] = self.profile.get('enrolledCourses', [])
            data['totalCredits'] = self.profile.get('totalCredits', 0)
            data['usedCredits'] = self.profile.get('usedCredits', 0)
            data['tutorGradeLevel'] = self.profile.get('tutor_grade_level', '')
            data['gradeLevelsTaught'] = self.profile.get('grade_levels_taught', [])
            data['isVerified'] = self.profile.get('is_verified', False)
            data['verifiedBy'] = self.profile.get('verified_by', None)
            data['verifiedAt'] = self.profile.get('verified_at', None)
            data['verificationNotes'] = self.profile.get('verification_notes', '')
        else:
            # Default values if profile is None
            data['name'] = 'N/A'
            data['phone'] = ''
            data['subjects'] = []
            data['academicCountry'] = ''
            data['grade'] = ''
            data['guardian'] = ''
            data['students'] = []
            data['rating'] = None
            data['totalSessions'] = 0
            data['earnings'] = 0
            data['enrolledCourses'] = []
            data['totalCredits'] = 0
            data['usedCredits'] = 0
            data['tutorGradeLevel'] = ''
            data['gradeLevelsTaught'] = []
            data['isVerified'] = False
            data['verifiedBy'] = None
            data['verifiedAt'] = None
            data['verificationNotes'] = ''
            
        # Add status and last login
        data['status'] = self.status
        data['lastLogin'] = self.last_login.isoformat() if self.last_login else None
        
        if include_sensitive:
            data['isActive'] = self.is_active
        return data


# SQLAlchemy event listener to automatically assign primary role based on account_type
@event.listens_for(User, 'before_insert')
def add_primary_role_on_user_creation(mapper, connection, target):
    """
    Automatically add primary role to user's roles array based on their account_type.
    This ensures all users have their primary role in the roles array, enabling
    proper multi-role functionality when additional roles are later assigned.

    Example:
    - account_type: 'student' → roles: ['student']
    - account_type: 'tutor' → roles: ['tutor']
    - account_type: 'admin' → roles: ['admin']
    - account_type: 'guardian' → roles: ['guardian']
    """
    if target.account_type and (not target.roles or target.account_type not in target.roles):
        # Initialize roles array if None
        if target.roles is None:
            target.roles = []
        # Create a copy to avoid modifying the original list (SQLAlchemy best practice)
        roles_copy = list(target.roles)
        # Add primary role if not already present
        if target.account_type not in roles_copy:
            roles_copy.append(target.account_type)
            target.roles = roles_copy


class Course(db.Model):
    __tablename__ = 'courses'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"course_{uuid.uuid4().hex[:8]}")
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, default=0.0)
    currency = db.Column(db.String(3), default='GBP')
    duration = db.Column(db.String(50))
    level = db.Column(db.String(50))
    subject = db.Column(db.String(100))
    country = db.Column(db.String(100))
    grade_level = db.Column(db.String(50))
    status = db.Column(db.String(20), default='active')
    timezone = db.Column(db.String(50), default='UTC')  # Course timezone
    thumbnail = db.Column(db.String(500))
    syllabus = db.Column(db.JSON, default=[])
    prerequisites = db.Column(db.JSON, default=[])
    learning_outcomes = db.Column(db.JSON, default=[])
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    modules = db.relationship('Module', back_populates='course', cascade='all, delete-orphan')
    tutors = db.relationship('User', secondary=course_tutors, back_populates='taught_courses')
    enrollments = db.relationship('Enrollment', back_populates='course')
    sessions = db.relationship('Session', back_populates='course')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'price': self.price,
            'currency': self.currency,
            'duration': self.duration,
            'level': self.level,
            'subject': self.subject,
            'country': self.country,
            'gradeLevel': self.grade_level,
            'status': self.status,
            'timezone': self.timezone,
            'thumbnail': self.thumbnail,
            'syllabus': self.syllabus,
            'prerequisites': self.prerequisites,
            'learningOutcomes': self.learning_outcomes,
            'totalModules': len(self.modules),
            'enrolledStudents': len([e for e in self.enrollments if e.status == 'active']),
            'assignedTutors': [t.profile.get('name', t.email) for t in self.tutors],
            'tutors': [
                {
                    'id': t.id,
                    'name': t.profile.get('name', t.email),
                    'email': t.email,
                    'subjects': t.profile.get('subjects', []),
                    'rating': t.profile.get('rating'),
                    'totalSessions': t.profile.get('totalSessions', 0)
                } for t in self.tutors
            ],
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

class Module(db.Model):
    __tablename__ = 'modules'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"module_{uuid.uuid4().hex[:8]}")
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    order = db.Column(db.Integer, default=0)
    duration = db.Column(db.String(50))
    status = db.Column(db.String(20), default='active')
    start_date = db.Column(db.DateTime, nullable=True)
    end_date = db.Column(db.DateTime, nullable=True)
    timezone = db.Column(db.String(50), nullable=True)  # Module timezone inherited from course
    start_time = db.Column(db.Time, default=datetime.strptime('00:00:00', '%H:%M:%S').time())  # Default start time
    end_time = db.Column(db.Time, default=datetime.strptime('23:59:59', '%H:%M:%S').time())  # Default end time
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    course = db.relationship('Course', back_populates='modules')
    lessons = db.relationship('Lesson', back_populates='module', cascade='all, delete-orphan')
    quizzes = db.relationship('Quiz', back_populates='module', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'courseId': self.course_id,
            'title': self.title,
            'description': self.description,
            'order': self.order,
            'duration': self.duration,
            'totalLessons': len(self.lessons),
            'totalQuizzes': len(self.quizzes),
            'status': self.status,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'timezone': self.timezone,
            'startTime': self.start_time.strftime('%H:%M:%S') if self.start_time else None,
            'endTime': self.end_time.strftime('%H:%M:%S') if self.end_time else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

class Lesson(db.Model):
    __tablename__ = 'lessons'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"lesson_{uuid.uuid4().hex[:8]}")
    module_id = db.Column(db.String(50), db.ForeignKey('modules.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    order = db.Column(db.Integer, default=0)
    duration = db.Column(db.Integer)  # in minutes
    type = db.Column(db.String(50))  # video, text, interactive
    content = db.Column(db.JSON, default={})
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    module = db.relationship('Module', back_populates='lessons')
    quizzes = db.relationship('Quiz', back_populates='lesson')
    
    def to_dict(self):
        return {
            'id': self.id,
            'moduleId': self.module_id,
            'title': self.title,
            'description': self.description,
            'order': self.order,
            'duration': self.duration,
            'type': self.type,
            'content': self.content,
            'status': self.status,
            'totalQuizzes': len(self.quizzes),
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Quiz(db.Model):
    __tablename__ = 'quizzes'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"quiz_{uuid.uuid4().hex[:8]}")
    module_id = db.Column(db.String(50), db.ForeignKey('modules.id'))
    lesson_id = db.Column(db.String(50), db.ForeignKey('lessons.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    time_limit = db.Column(db.Integer)  # in minutes
    passing_score = db.Column(db.Integer, default=70)
    topics = db.Column(db.JSON, default=[])
    status = db.Column(db.String(20), default='active')
    valid_from = db.Column(db.DateTime, default=datetime.utcnow)  # When quiz becomes available
    valid_until = db.Column(db.DateTime)  # When quiz expires (null means no expiry)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    module = db.relationship('Module', back_populates='quizzes')
    lesson = db.relationship('Lesson', back_populates='quizzes')
    questions = db.relationship('Question', back_populates='quiz', cascade='all, delete-orphan')
    results = db.relationship('QuizResult', back_populates='quiz')
    
    def to_dict(self):
        from datetime import datetime
        now = datetime.utcnow()
        
        # Determine visibility status
        is_active = True
        validity_status = 'active'
        
        if self.valid_from and now < self.valid_from:
            validity_status = 'upcoming'
            is_active = False
        elif self.valid_until and now > self.valid_until:
            validity_status = 'expired'
            is_active = False
            
        return {
            'id': self.id,
            'moduleId': self.module_id,
            'lessonId': self.lesson_id,
            'title': self.title,
            'description': self.description,
            'totalQuestions': len(self.questions),
            'timeLimit': self.time_limit,
            'passingScore': self.passing_score,
            'topics': self.topics,
            'status': self.status,
            'validFrom': self.valid_from.isoformat() if self.valid_from else None,
            'validUntil': self.valid_until.isoformat() if self.valid_until else None,
            'validityStatus': validity_status,
            'isActive': is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"question_{uuid.uuid4().hex[:8]}")
    quiz_id = db.Column(db.String(50), db.ForeignKey('quizzes.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # multiple_choice, essay
    options = db.Column(db.JSON, default=[])
    correct_answer = db.Column(db.Text)
    explanation = db.Column(db.Text)
    points = db.Column(db.Integer, default=1)
    order = db.Column(db.Integer, default=0)
    
    # Relationships
    quiz = db.relationship('Quiz', back_populates='questions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'quizId': self.quiz_id,
            'question': self.question,
            'type': self.type,
            'options': self.options,
            'correctAnswer': self.correct_answer,
            'explanation': self.explanation,
            'points': self.points,
            'order': self.order
        }

class Session(db.Model):
    __tablename__ = 'sessions'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"session_{uuid.uuid4().hex[:8]}")
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'))
    module_id = db.Column(db.String(50), db.ForeignKey('modules.id'))
    lesson_id = db.Column(db.String(50), db.ForeignKey('lessons.id'))
    tutor_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    availability_id = db.Column(db.String(50), db.ForeignKey('availability.id'), nullable=True)  # Link to tutor availability
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    scheduled_date = db.Column(db.DateTime, nullable=False)
    timezone = db.Column(db.String(50), default='UTC')  # Session timezone
    created_timezone = db.Column(db.String(50), default='UTC')  # Creator's timezone when session was created
    browser_timezone = db.Column(db.String(50), default='UTC')  # Browser's detected timezone
    duration = db.Column(db.Integer, default=60)  # in minutes
    status = db.Column(db.String(20), default='scheduled')
    meeting_link = db.Column(db.String(500))
    meeting_id = db.Column(db.String(100))
    meeting_password = db.Column(db.String(50))
    meeting_start_url = db.Column(db.String(500))
    meeting_uuid = db.Column(db.String(100))
    topic = db.Column(db.String(200))
    max_students = db.Column(db.Integer, default=5)
    price = db.Column(db.Float, default=0.0)
    currency = db.Column(db.String(3), default='GBP')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # AI Feedback System Fields
    transcript_text = db.Column(db.Text)
    ai_tutor_feedback = db.Column(db.Text)
    session_rating = db.Column(db.Float)  # Extracted from AI feedback (0.0-5.0)
    participants_summary = db.Column(db.Text)
    transcript_language = db.Column(db.String(10), default='en')
    feedback_generated_at = db.Column(db.DateTime)
    zoom_meeting_duration = db.Column(db.Integer)  # Actual meeting duration from Zoom
    zoom_participants_count = db.Column(db.Integer)  # Number of participants who attended
    
    # Relationships
    course = db.relationship('Course', back_populates='sessions')
    module = db.relationship('Module')
    tutor = db.relationship('User', back_populates='tutored_sessions')
    students = db.relationship('User', secondary=session_students, back_populates='enrolled_sessions')
    availability = db.relationship('Availability', back_populates='sessions')

    # Capacity tracking methods
    def get_enrollment_count(self):
        """Get the current number of enrolled students"""
        return len(self.students)

    def get_available_spots(self):
        """Get the number of available spots remaining"""
        return max(0, self.max_students - self.get_enrollment_count())

    def is_full(self):
        """Check if the session is at capacity"""
        return self.get_enrollment_count() >= self.max_students

    def can_accept_enrollment(self):
        """Check if the session can accept new enrollments"""
        return not self.is_full() and self.status in ['scheduled']

    def get_capacity_status(self):
        """Get the capacity status: empty, partial, or full"""
        enrollment_count = self.get_enrollment_count()
        if enrollment_count == 0:
            return 'empty'
        elif enrollment_count >= self.max_students:
            return 'full'
        else:
            return 'partial'

    def is_student_enrolled(self, student_id):
        """Check if a specific student is enrolled in this session"""
        return any(student.id == student_id for student in self.students)

    def to_dict(self, user_timezone=None, current_student_id=None):
        # Import timezone utilities
        from app.timezone_utils import convert_datetime_to_user_timezone, validate_timezone

        # Format scheduled_date with timezone context
        scheduled_date_str = None
        display_timezone = 'UTC'

        if self.scheduled_date:
            try:
                import pytz

                # The stored datetime is always naive UTC
                utc_dt = pytz.UTC.localize(self.scheduled_date.replace(tzinfo=None))

                # Determine which timezone to use for display
                target_timezone = None
                if user_timezone and validate_timezone(user_timezone):
                    # Use user's requested timezone
                    target_timezone = user_timezone
                    display_timezone = user_timezone
                elif self.timezone and validate_timezone(self.timezone):
                    # Use session's timezone
                    target_timezone = self.timezone
                    display_timezone = self.timezone
                else:
                    # Fallback to UTC
                    target_timezone = 'UTC'
                    display_timezone = 'UTC'

                # Convert to target timezone
                if target_timezone and target_timezone != 'UTC':
                    converted_dt = convert_datetime_to_user_timezone(utc_dt, target_timezone)
                    scheduled_date_str = converted_dt.isoformat()
                else:
                    # Use UTC
                    scheduled_date_str = utc_dt.isoformat()

            except Exception as e:
                # Fallback: append UTC timezone manually
                scheduled_date_str = f"{self.scheduled_date.isoformat()}+00:00"
                display_timezone = 'UTC'
                
        return {
            'id': self.id,
            'courseId': self.course_id,
            'moduleId': self.module_id,
            'lessonId': self.lesson_id,
            'tutorId': self.tutor_id,
            'studentIds': [s.id for s in self.students],
            'title': self.title,
            'description': self.description,
            'scheduledDate': scheduled_date_str,
            'timezone': self.timezone,
            'displayTimezone': display_timezone,
            'createdTimezone': self.created_timezone,
            'browserTimezone': self.browser_timezone,
            'duration': self.duration,
            'status': self.status,
            'meetingLink': self.meeting_link,
            'meetingId': self.meeting_id,
            'meetingPassword': self.meeting_password,
            'meetingStartUrl': self.meeting_start_url,
            'meetingUuid': self.meeting_uuid,
            'topic': self.topic,
            'maxStudents': self.max_students,
            'price': self.price,
            'currency': self.currency,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            # AI Feedback System Fields
            'transcriptText': self.transcript_text,
            'aiTutorFeedback': self.ai_tutor_feedback,
            'sessionRating': self.session_rating,
            'participantsSummary': self.participants_summary,
            'transcriptLanguage': self.transcript_language,
            'feedbackGeneratedAt': self.feedback_generated_at.isoformat() if self.feedback_generated_at else None,
            'zoomMeetingDuration': self.zoom_meeting_duration,
            'zoomParticipantsCount': self.zoom_participants_count,
            # Capacity tracking fields
            'enrollmentCount': self.get_enrollment_count(),
            'availableSpots': self.get_available_spots(),
            'capacityStatus': self.get_capacity_status(),
            'isFull': self.is_full(),
            'canAcceptEnrollment': self.can_accept_enrollment(),
            'enrolledStudents': [
                {
                    'id': student.id,
                    'email': student.email,
                    'name': student.profile.get('name', student.email) if student.profile else student.email
                }
                for student in self.students
            ],
            # Current student enrollment status
            'isCurrentStudentEnrolled': self.is_student_enrolled(current_student_id) if current_student_id else False
        }

class Enrollment(db.Model):
    __tablename__ = 'enrollments'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"enrollment_{uuid.uuid4().hex[:8]}")
    student_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'), nullable=False)
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'))
    status = db.Column(db.String(20), default='pending')
    enrolled_date = db.Column(db.DateTime, default=datetime.utcnow)
    enrolled_timezone = db.Column(db.String(50), default='UTC')  # Timezone when enrollment occurred
    approved_date = db.Column(db.DateTime)
    approved_timezone = db.Column(db.String(50), default='UTC')  # Timezone when enrollment was approved
    progress = db.Column(db.Integer, default=0)
    credits_used = db.Column(db.Integer, default=0)
    completed_modules = db.Column(db.JSON, default=[])
    current_module = db.Column(db.String(50))
    
    # Relationships
    student = db.relationship('User', foreign_keys=[student_id], back_populates='enrollments')
    guardian = db.relationship('User', foreign_keys=[guardian_id], back_populates='guardian_enrollments')
    course = db.relationship('Course', back_populates='enrollments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'studentId': self.student_id,
            'courseId': self.course_id,
            'guardianId': self.guardian_id,
            'status': self.status,
            'enrolledDate': self.enrolled_date.isoformat() if self.enrolled_date else None,
            'enrolledTimezone': self.enrolled_timezone,
            'approvedDate': self.approved_date.isoformat() if self.approved_date else None,
            'approvedTimezone': self.approved_timezone,
            'progress': self.progress,
            'creditsUsed': self.credits_used,
            'completedModules': self.completed_modules,
            'currentModule': self.current_module
        }

class QuizResult(db.Model):
    __tablename__ = 'quiz_results'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"result_{uuid.uuid4().hex[:8]}")
    quiz_id = db.Column(db.String(50), db.ForeignKey('quizzes.id'), nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'))
    module_id = db.Column(db.String(50), db.ForeignKey('modules.id'))
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    correct_answers = db.Column(db.Integer, nullable=False)
    time_spent = db.Column(db.Integer)  # in minutes
    answers = db.Column(db.JSON, default=[])
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_timezone = db.Column(db.String(50), default='UTC')  # Timezone when quiz was completed
    status = db.Column(db.String(20), default='completed')
    
    # Relationships
    quiz = db.relationship('Quiz', back_populates='results')
    student = db.relationship('User', back_populates='quiz_results')
    
    def to_dict(self):
        return {
            'id': self.id,
            'quizId': self.quiz_id,
            'studentId': self.student_id,
            'courseId': self.course_id,
            'moduleId': self.module_id,
            'score': self.score,
            'totalQuestions': self.total_questions,
            'correctAnswers': self.correct_answers,
            'timeSpent': self.time_spent,
            'answers': self.answers,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'completedTimezone': self.completed_timezone,
            'status': self.status
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"notification_{uuid.uuid4().hex[:8]}")
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200))
    message = db.Column(db.Text, nullable=False)
    data = db.Column(db.JSON, default={})
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='notifications')
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'data': self.data,
            'read': self.read,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"invoice_{uuid.uuid4().hex[:8]}")
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('users.id'))
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'))
    payment_id = db.Column(db.String(50), db.ForeignKey('payments.id'))
    amount = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False, default=0.0)
    tax_amount = db.Column(db.Float, default=0.0)
    tax_rate = db.Column(db.Float, default=0.0)
    currency = db.Column(db.String(3), default='GBP')
    status = db.Column(db.String(20), default='pending')
    payment_method = db.Column(db.String(50))
    payment_date = db.Column(db.DateTime)
    due_date = db.Column(db.DateTime)
    items = db.Column(db.JSON, default=[])
    line_items = db.Column(db.JSON, default=[])
    pdf_path = db.Column(db.String(255))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    guardian = db.relationship('User', foreign_keys=[guardian_id])
    student = db.relationship('User', foreign_keys=[student_id])
    course = db.relationship('Course', foreign_keys=[course_id])
    payment = db.relationship('Payment', foreign_keys=[payment_id])
    
    def generate_invoice_number(self):
        from datetime import datetime
        date_str = datetime.now().strftime('%Y%m%d')
        count = db.session.query(Invoice).filter(
            Invoice.invoice_number.like(f'INV-{date_str}-%')
        ).count()
        return f'INV-{date_str}-{str(count + 1).zfill(4)}'
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoiceNumber': self.invoice_number,
            'guardianId': self.guardian_id,
            'studentId': self.student_id,
            'courseId': self.course_id,
            'paymentId': self.payment_id,
            'amount': self.amount,
            'subtotal': self.subtotal,
            'taxAmount': self.tax_amount,
            'taxRate': self.tax_rate,
            'currency': self.currency,
            'status': self.status,
            'paymentMethod': self.payment_method,
            'paymentDate': self.payment_date.isoformat() if self.payment_date else None,
            'dueDate': self.due_date.isoformat() if self.due_date else None,
            'items': self.items,
            'lineItems': self.line_items,
            'pdfPath': self.pdf_path,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'guardianName': self.guardian.profile.get('fullName', '') if self.guardian else '',
            'studentName': self.student.profile.get('fullName', '') if self.student else '',
            'courseTitle': self.course.title if self.course else ''
        }

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"payment_{uuid.uuid4().hex[:8]}")
    invoice_id = db.Column(db.String(50), db.ForeignKey('invoices.id'))
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'))
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='GBP')
    method = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='pending')
    transaction_id = db.Column(db.String(100))
    gateway_response = db.Column(db.JSON, default={})
    credits_earned = db.Column(db.Float, default=0.0)
    processed_at = db.Column(db.DateTime)
    
    # Relationship
    guardian = db.relationship('User', backref='payments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoiceId': self.invoice_id,
            'guardianId': self.guardian_id,
            'amount': self.amount,
            'currency': self.currency,
            'method': self.method,
            'status': self.status,
            'transactionId': self.transaction_id,
            'gatewayResponse': self.gateway_response,
            'creditsEarned': self.credits_earned,
            'processedAt': self.processed_at.isoformat() if self.processed_at else None
        }

class StripeCustomer(db.Model):
    __tablename__ = 'stripe_customers'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"stripe_customer_{uuid.uuid4().hex[:8]}")
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False, unique=True)
    stripe_customer_id = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='stripe_customer')
    payment_methods = db.relationship('PaymentMethod', back_populates='stripe_customer', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'stripeCustomerId': self.stripe_customer_id,
            'email': self.email,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

class PaymentMethod(db.Model):
    __tablename__ = 'payment_methods'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"pm_{uuid.uuid4().hex[:8]}")
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    stripe_customer_id = db.Column(db.String(50), db.ForeignKey('stripe_customers.id'), nullable=True)
    stripe_payment_method_id = db.Column(db.String(100), nullable=True)  # For Stripe cards
    
    # Payment method details
    type = db.Column(db.String(20), nullable=False)  # 'card', 'bank', 'paypal'
    nickname = db.Column(db.String(100))
    is_default = db.Column(db.Boolean, default=False)
    
    # Card-specific fields (encrypted/hashed for security)
    card_type = db.Column(db.String(20))  # visa, mastercard, amex, etc.
    last4 = db.Column(db.String(4))
    exp_month = db.Column(db.Integer)
    exp_year = db.Column(db.Integer)
    
    # Bank-specific fields
    bank_name = db.Column(db.String(100))
    account_type = db.Column(db.String(20))  # checking, savings
    
    # PayPal-specific fields  
    paypal_email = db.Column(db.String(255))
    paypal_account_id = db.Column(db.String(100))
    
    # Status and metadata
    is_active = db.Column(db.Boolean, default=True)
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', backref='payment_methods')
    stripe_customer = db.relationship('StripeCustomer', back_populates='payment_methods')
    
    def to_dict(self):
        base_dict = {
            'id': self.id,
            'userId': self.user_id,
            'type': self.type,
            'nickname': self.nickname,
            'isDefault': self.is_default,
            'isActive': self.is_active,
            'verified': self.verified,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'lastUsedAt': self.last_used_at.isoformat() if self.last_used_at else None
        }
        
        # Add type-specific fields
        if self.type == 'card':
            base_dict.update({
                'cardType': self.card_type,
                'last4': self.last4,
                'expMonth': self.exp_month,
                'expYear': self.exp_year
            })
        elif self.type == 'bank':
            base_dict.update({
                'bankName': self.bank_name,
                'accountType': self.account_type,
                'last4': self.last4
            })
        elif self.type == 'paypal':
            base_dict.update({
                'email': self.paypal_email
            })
            
        return base_dict
    
    def update_last_used(self):
        """Update the last used timestamp"""
        self.last_used_at = datetime.utcnow()
    
    @classmethod
    def set_as_default(cls, user_id, payment_method_id):
        """Set a payment method as default and unset others"""
        # Unset all other payment methods for this user
        cls.query.filter_by(user_id=user_id).update({'is_default': False})
        
        # Set the specified payment method as default
        payment_method = cls.query.filter_by(id=payment_method_id, user_id=user_id).first()
        if payment_method:
            payment_method.is_default = True
            return payment_method
        return None

class CreditBalance(db.Model):
    __tablename__ = 'credit_balances'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"credit_{uuid.uuid4().hex[:8]}")
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    total_credits = db.Column(db.Float, default=0.0)
    used_credits = db.Column(db.Float, default=0.0)
    available_credits = db.Column(db.Float, default=0.0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    guardian = db.relationship('User', backref='credit_balance')
    
    def to_dict(self):
        return {
            'id': self.id,
            'guardianId': self.guardian_id,
            'totalCredits': self.total_credits,
            'usedCredits': self.used_credits,
            'availableCredits': self.available_credits,
            'lastUpdated': self.last_updated.isoformat() if self.last_updated else None
        }
    
    def add_credits(self, amount):
        """Add credits to the balance"""
        self.total_credits += amount
        self.available_credits += amount
        self.last_updated = datetime.utcnow()
    
    def use_credits(self, amount):
        """Use credits from the balance"""
        if self.available_credits >= amount:
            self.used_credits += amount
            self.available_credits -= amount
            self.last_updated = datetime.utcnow()
            return True
        return False
    
    def allocate_credits_to_student(self, amount):
        """Allocate credits to a student (reduces available credits)"""
        if self.available_credits >= amount:
            self.available_credits -= amount
            self.last_updated = datetime.utcnow()
            return True
        return False
    
    def get_allocated_credits(self):
        """Calculate total credits allocated to students"""
        from app.models import StudentCreditAllocation
        total_allocated = db.session.query(
            db.func.sum(StudentCreditAllocation.allocated_credits)
        ).filter_by(guardian_id=self.guardian_id).scalar() or 0.0
        return total_allocated
    
    def recalculate_available_credits(self):
        """Recalculate available credits based on total - allocated"""
        allocated = self.get_allocated_credits()
        self.available_credits = self.total_credits - allocated - self.used_credits
        self.last_updated = datetime.utcnow()
        return self.available_credits

class PricingPlan(db.Model):
    __tablename__ = 'pricing_plans'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"plan_{uuid.uuid4().hex[:8]}")
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='GBP')
    period = db.Column(db.String(50), nullable=False)  # lesson, week, month, session package
    credit_rate = db.Column(db.Float, nullable=False, default=1.0)  # pence per credit (1.0 = 1 pound per credit)
    features = db.Column(db.JSON, default=[])  # List of features
    is_popular = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'currency': self.currency,
            'period': self.period,
            'creditRate': self.credit_rate,
            'features': self.features,
            'isPopular': self.is_popular,
            'isActive': self.is_active,
            'displayOrder': self.display_order,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def calculate_credits(self, amount_paid):
        """Calculate credits based on this plan's credit rate"""
        import math
        credits = amount_paid / self.credit_rate
        return math.ceil(credits)

class TutorEarning(db.Model):
    __tablename__ = 'tutor_earnings'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"earning_{uuid.uuid4().hex[:8]}")
    tutor_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.String(50), db.ForeignKey('sessions.id'))
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='GBP')
    status = db.Column(db.String(20), default='pending')
    earned_date = db.Column(db.DateTime, default=datetime.utcnow)
    payout_date = db.Column(db.DateTime)
    commission = db.Column(db.Float, default=0.15)
    
    # Relationships
    tutor = db.relationship('User', back_populates='earnings')
    
    def to_dict(self):
        return {
            'id': self.id,
            'tutorId': self.tutor_id,
            'sessionId': self.session_id,
            'amount': self.amount,
            'currency': self.currency,
            'status': self.status,
            'earnedDate': self.earned_date.isoformat() if self.earned_date else None,
            'payoutDate': self.payout_date.isoformat() if self.payout_date else None,
            'commission': self.commission
        }

class Availability(db.Model):
    __tablename__ = 'availability'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"availability_{uuid.uuid4().hex[:8]}")
    tutor_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0-6 (Monday-Sunday)
    start_time = db.Column(db.String(5), nullable=False)  # HH:MM format
    end_time = db.Column(db.String(5), nullable=False)
    available = db.Column(db.Boolean, default=True)
    time_zone = db.Column(db.String(50), default='UTC')
    created_timezone = db.Column(db.String(50), default='UTC')  # Creator's timezone when availability was created
    browser_timezone = db.Column(db.String(50), default='UTC')  # Browser's detected timezone
    original_timezone = db.Column(db.String(50), nullable=True)  # User's original timezone for reference
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'), nullable=True)  # Optional course assignment
    
    # Recurring availability fields
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_type = db.Column(db.String(20), default='weekly')  # 'weekly', 'monthly', 'custom'
    recurrence_days = db.Column(db.JSON, default=list)  # For weekly: [1,2,3,4,5] (Mon-Fri)
    recurrence_start_date = db.Column(db.DateTime, nullable=True)  # When the recurrence pattern should start
    recurrence_end_date = db.Column(db.DateTime, nullable=True)
    parent_availability_id = db.Column(db.String(50), db.ForeignKey('availability.id'), nullable=True)
    exception_dates = db.Column(db.JSON, default=list)  # Dates to skip in ISO format
    specific_date = db.Column(db.Date, nullable=True)  # For specific date instances
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Timezone tracking fields (for debugging and migration)
    timezone_storage_format = db.Column(db.String(10), default='local')  # 'utc' or 'local'
    data_migrated_at = db.Column(db.DateTime)  # When timezone data was last migrated
    migration_version = db.Column(db.String(20))  # Track migration version

    # Relationships
    sessions = db.relationship('Session', back_populates='availability')
    child_availabilities = db.relationship('Availability', 
                                         backref=db.backref('parent_availability', remote_side=[id]),
                                         foreign_keys='Availability.parent_availability_id')
    
    def to_dict(self, user_timezone=None):
        from timezone_utils import convert_datetime_to_user_timezone, convert_to_utc, convert_from_utc, validate_timezone

        # Convert Python weekday format (0=Monday) to JavaScript format (0=Sunday)
        # Python: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
        # JavaScript: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        js_day_of_week = (self.day_of_week + 1) % 7 if self.day_of_week is not None else None

        # Determine timezone for display
        display_timezone = user_timezone if user_timezone and validate_timezone(user_timezone) else self.time_zone

        # Convert times to user's timezone if different from stored timezone
        display_start_time = self.start_time
        display_end_time = self.end_time

        # FIXED: Times are stored as UTC but labeled with user timezone
        # We need to convert from UTC to the user's requested timezone
        if user_timezone and validate_timezone(user_timezone):
            # Use specific_date if available, otherwise use a reference date for conversion
            date_str = self.specific_date.isoformat() if self.specific_date else "2025-09-19"  # Reference date for virtual instances

            try:
                # Treat stored times as UTC and convert to user timezone
                display_start_time = convert_from_utc(self.start_time, user_timezone, date_str)
                display_end_time = convert_from_utc(self.end_time, user_timezone, date_str)
            except Exception as e:
                print(f"Error converting availability times: {e}")
                # Fallback: try manual conversion if timezone utilities fail
                try:
                    from datetime import datetime
                    import pytz

                    # Parse as UTC and convert
                    utc_start = datetime.strptime(f"{date_str} {self.start_time}", "%Y-%m-%d %H:%M")
                    utc_end = datetime.strptime(f"{date_str} {self.end_time}", "%Y-%m-%d %H:%M")

                    utc_start = pytz.UTC.localize(utc_start)
                    utc_end = pytz.UTC.localize(utc_end)

                    user_tz = pytz.timezone(user_timezone)
                    local_start = utc_start.astimezone(user_tz)
                    local_end = utc_end.astimezone(user_tz)

                    display_start_time = local_start.strftime("%H:%M")
                    display_end_time = local_end.strftime("%H:%M")
                except Exception as e2:
                    print(f"Manual timezone conversion also failed: {e2}")
                    display_start_time = self.start_time
                    display_end_time = self.end_time

        # Convert datetime fields to user timezone
        display_created_at = self.created_at
        display_updated_at = self.updated_at
        display_recurrence_end_date = self.recurrence_end_date

        if user_timezone and validate_timezone(user_timezone):
            try:
                if self.created_at:
                    display_created_at = convert_datetime_to_user_timezone(self.created_at, user_timezone)
                if self.updated_at:
                    display_updated_at = convert_datetime_to_user_timezone(self.updated_at, user_timezone)
                if self.recurrence_end_date:
                    display_recurrence_end_date = convert_datetime_to_user_timezone(self.recurrence_end_date, user_timezone)
            except Exception as e:
                print(f"Error converting availability datetime fields: {e}")

        return {
            'id': self.id,
            'tutorId': self.tutor_id,
            'dayOfWeek': js_day_of_week,
            'startTime': display_start_time,
            'endTime': display_end_time,
            'available': self.available,
            'timeZone': self.time_zone,
            'displayTimezone': display_timezone,
            'createdTimezone': self.created_timezone,
            'browserTimezone': self.browser_timezone,
            'courseId': self.course_id,
            'isRecurring': self.is_recurring,
            'recurrenceType': self.recurrence_type,
            'recurrenceDays': self.recurrence_days or [],
            'recurrenceEndDate': display_recurrence_end_date.isoformat() if display_recurrence_end_date else None,
            'parentAvailabilityId': self.parent_availability_id,
            'exceptionDates': self.exception_dates or [],
            'specificDate': f"{self.specific_date.isoformat()}T12:00:00" if self.specific_date else None,
            'createdAt': display_created_at.isoformat() if display_created_at else None,
            'updatedAt': display_updated_at.isoformat() if display_updated_at else None
        }
    
    def has_sessions(self):
        """Check if this availability slot has any sessions booked"""
        return len(self.sessions) > 0
    
    def is_editable(self):
        """
        Check if this availability slot can be edited
        
        A slot is editable if it has no conflicting sessions.
        Past, completed, cancelled, or no-show sessions do not prevent editing.
        """
        # Import here to avoid circular imports
        from app.services.recurring_availability_service import RecurringAvailabilityService
        
        conflict_info = RecurringAvailabilityService.check_slot_conflicts(self.id)
        return not conflict_info.get('has_conflicts', False)
    
    def is_future_date(self):
        """Check if the availability is for a future date"""
        if self.specific_date:
            return self.specific_date >= datetime.utcnow().date()
        return True  # Non-specific dates are considered future


class AvailabilityException(db.Model):
    """
    Model to track exceptions to recurring availability patterns.
    Used to handle deletions, modifications, and cancellations of specific instances.
    """
    __tablename__ = 'availability_exceptions'

    id = db.Column(db.String(50), primary_key=True, default=lambda: f"exception_{uuid.uuid4().hex[:8]}")
    parent_availability_id = db.Column(db.String(50), db.ForeignKey('availability.id', ondelete='CASCADE'), nullable=False)
    exception_date = db.Column(db.Date, nullable=False)
    exception_type = db.Column(db.String(20), nullable=False)  # 'deleted', 'modified', 'cancelled'
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.String(50), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    updated_at = db.Column(db.DateTime, nullable=True)

    # For modified exceptions, store the new values
    modified_start_time = db.Column(db.String(5), nullable=True)  # HH:MM format
    modified_end_time = db.Column(db.String(5), nullable=True)
    modified_timezone = db.Column(db.String(50), nullable=True)

    # Relationships
    parent_availability = db.relationship('Availability', backref='exceptions')
    creator = db.relationship('User', foreign_keys=[created_by])

    __table_args__ = (
        db.UniqueConstraint('parent_availability_id', 'exception_date', name='unique_exception_per_date'),
    )

    def to_dict(self):
        """Convert exception to dictionary for API responses"""
        return {
            'id': self.id,
            'parentAvailabilityId': self.parent_availability_id,
            'exceptionDate': self.exception_date.isoformat() if self.exception_date else None,
            'exceptionType': self.exception_type,
            'reason': self.reason,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'createdBy': self.created_by,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'modifiedStartTime': self.modified_start_time,
            'modifiedEndTime': self.modified_end_time,
            'modifiedTimezone': self.modified_timezone
        }

    @staticmethod
    def create_deletion_exception(parent_availability_id, exception_date, created_by=None, reason=None):
        """Create a deletion exception for a specific date"""
        exception = AvailabilityException(
            parent_availability_id=parent_availability_id,
            exception_date=exception_date,
            exception_type='deleted',
            reason=reason or 'Availability deleted by user',
            created_by=created_by
        )
        return exception

    @staticmethod
    def create_modification_exception(parent_availability_id, exception_date,
                                    new_start_time, new_end_time, new_timezone=None,
                                    created_by=None, reason=None):
        """Create a modification exception for a specific date"""
        exception = AvailabilityException(
            parent_availability_id=parent_availability_id,
            exception_date=exception_date,
            exception_type='modified',
            reason=reason or 'Availability modified by user',
            created_by=created_by,
            modified_start_time=new_start_time,
            modified_end_time=new_end_time,
            modified_timezone=new_timezone
        )
        return exception


class GuardianInvitation(db.Model):
    __tablename__ = 'guardian_invitations'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"invite_{uuid.uuid4().hex[:8]}")
    student_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    guardian_email = db.Column(db.String(120), nullable=False, index=True)
    invitation_token = db.Column(db.String(100), unique=True, nullable=False, index=True)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, expired
    invited_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    accepted_at = db.Column(db.DateTime)
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'))  # Set when invitation is accepted
    
    # Relationships
    student = db.relationship('User', foreign_keys=[student_id])
    guardian = db.relationship('User', foreign_keys=[guardian_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'studentId': self.student_id,
            'guardianEmail': self.guardian_email,
            'invitationToken': self.invitation_token,
            'status': self.status,
            'invitedAt': self.invited_at.isoformat() if self.invited_at else None,
            'expiresAt': self.expires_at.isoformat() if self.expires_at else None,
            'acceptedAt': self.accepted_at.isoformat() if self.accepted_at else None,
            'guardianId': self.guardian_id
        }
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def mark_accepted(self, guardian_id):
        self.status = 'accepted'
        self.guardian_id = guardian_id
        self.accepted_at = datetime.utcnow()
    
    def mark_expired(self):
        self.status = 'expired'

class AIPrompt(db.Model):
    __tablename__ = 'ai_prompts'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"prompt_{uuid.uuid4().hex[:8]}")
    prompt_name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    prompt_content = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.String(50), db.ForeignKey('users.id'))
    updated_by = db.Column(db.String(50), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    updater = db.relationship('User', foreign_keys=[updated_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'promptName': self.prompt_name,
            'promptContent': self.prompt_content,
            'createdBy': self.created_by,
            'updatedBy': self.updated_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

class SystemConfig(db.Model):
    __tablename__ = 'system_config'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"config_{uuid.uuid4().hex[:8]}")
    config_key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    config_value = db.Column(db.Text, nullable=False)
    updated_by = db.Column(db.String(50), db.ForeignKey('users.id'))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    updater = db.relationship('User')
    
    def to_dict(self):
        return {
            'id': self.id,
            'configKey': self.config_key,
            'configValue': self.config_value,
            'updatedBy': self.updated_by,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

class StudentSessionFeedback(db.Model):
    __tablename__ = 'student_session_feedback'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"feedback_{uuid.uuid4().hex[:8]}")
    session_id = db.Column(db.String(50), db.ForeignKey('sessions.id'), nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    ai_guardian_feedback = db.Column(db.Text, nullable=False)
    student_performance_summary = db.Column(db.Text)
    areas_of_improvement = db.Column(db.Text)
    strengths_highlighted = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    session = db.relationship('Session')
    student = db.relationship('User', foreign_keys=[student_id])
    guardian = db.relationship('User', foreign_keys=[guardian_id])
    
    # Indexes for performance
    __table_args__ = (
        db.Index('idx_guardian_feedback', 'guardian_id', 'created_at'),
        db.Index('idx_student_feedback', 'student_id', 'created_at'),
        db.Index('idx_session_feedback', 'session_id'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'sessionId': self.session_id,
            'studentId': self.student_id,
            'guardianId': self.guardian_id,
            'aiGuardianFeedback': self.ai_guardian_feedback,
            'studentPerformanceSummary': self.student_performance_summary,
            'areasOfImprovement': self.areas_of_improvement,
            'strengthsHighlighted': self.strengths_highlighted,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class AdminAction(db.Model):
    __tablename__ = 'admin_actions'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"action_{uuid.uuid4().hex[:8]}")
    admin_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)
    target_user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    details = db.Column(db.JSON, default={})
    ip_address = db.Column(db.String(45))  # IPv6 compatible
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    admin = db.relationship('User', foreign_keys=[admin_id])
    target_user = db.relationship('User', foreign_keys=[target_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'adminId': self.admin_id,
            'actionType': self.action_type,
            'targetUserId': self.target_user_id,
            'details': self.details,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"token_{uuid.uuid4().hex[:8]}")
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    token_hash = db.Column(db.String(255), nullable=False)
    initiated_by_admin = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    ip_address = db.Column(db.String(45))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id])
    admin = db.relationship('User', foreign_keys=[initiated_by_admin])
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def is_used(self):
        return self.used_at is not None

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'initiatedByAdmin': self.initiated_by_admin,
            'expiresAt': self.expires_at.isoformat() if self.expires_at else None,
            'usedAt': self.used_at.isoformat() if self.used_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class AdminSecureSession(db.Model):
    __tablename__ = 'admin_secure_sessions'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"session_{uuid.uuid4().hex[:8]}")
    admin_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    session_token = db.Column(db.String(255), nullable=False, unique=True)
    operations_allowed = db.Column(db.JSON, default=['view_passwords'])
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    last_activity_at = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    mfa_verified = db.Column(db.Boolean, default=False)
    is_revoked = db.Column(db.Boolean, default=False)
    
    admin = db.relationship('User', backref='secure_sessions')
    
    def is_valid(self):
        return (
            not self.is_revoked and 
            datetime.utcnow() < self.expires_at
        )
    
    def update_activity(self):
        self.last_activity_at = datetime.utcnow()

    def to_dict(self):
        return {
            'id': self.id,
            'adminId': self.admin_id,
            'sessionToken': self.session_token,
            'operationsAllowed': self.operations_allowed,
            'expiresAt': self.expires_at.isoformat() if self.expires_at else None,
            'isRevoked': self.is_revoked,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class PasswordViewAudit(db.Model):
    __tablename__ = 'password_view_audit'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"audit_{uuid.uuid4().hex[:8]}")
    admin_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    target_user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    view_type = db.Column(db.String(20), nullable=False)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    session_token = db.Column(db.String(255))
    justification = db.Column(db.Text)
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow)
    mfa_verified = db.Column(db.Boolean, default=False)
    admin_re_authenticated = db.Column(db.Boolean, default=False)
    browser_fingerprint = db.Column(db.String(255))
    
    admin = db.relationship('User', foreign_keys=[admin_id])
    target_user = db.relationship('User', foreign_keys=[target_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'adminId': self.admin_id,
            'targetUserId': self.target_user_id,
            'viewType': self.view_type,
            'justification': self.justification,
            'viewedAt': self.viewed_at.isoformat() if self.viewed_at else None,
            'ipAddress': self.ip_address,
            'mfaVerified': self.mfa_verified,
            'adminReAuthenticated': self.admin_re_authenticated
        }

class PasswordVault(db.Model):
    __tablename__ = 'user_password_vault'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"vault_{uuid.uuid4().hex[:8]}")
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    password_plaintext_encrypted = db.Column(db.Text, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    encryption_key_id = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_current = db.Column(db.Boolean, default=True)
    store_plaintext = db.Column(db.Boolean, default=False)
    
    user = db.relationship('User', backref='password_history')

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'encryptionKeyId': self.encryption_key_id,
            'isCurrent': self.is_current,
            'storePlaintext': self.store_plaintext,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class AdminSecurityConfig(db.Model):
    __tablename__ = 'admin_security_config'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"config_{uuid.uuid4().hex[:8]}")
    config_key = db.Column(db.String(100), unique=True, nullable=False)
    config_value = db.Column(db.JSON, nullable=False)
    created_by = db.Column(db.String(50), db.ForeignKey('users.id'))
    updated_by = db.Column(db.String(50), db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'configKey': self.config_key,
            'configValue': self.config_value,
            'createdBy': self.created_by,
            'updatedBy': self.updated_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

class StudentCreditAllocation(db.Model):
    __tablename__ = 'student_credit_allocations'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"allocation_{uuid.uuid4().hex[:8]}")
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    allocated_credits = db.Column(db.Float, default=0.0)
    used_credits = db.Column(db.Float, default=0.0)
    remaining_credits = db.Column(db.Float, default=0.0)
    allocation_reason = db.Column(db.String(200), default='General allocation')
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    guardian = db.relationship('User', foreign_keys=[guardian_id], backref='allocated_credits')
    student = db.relationship('User', foreign_keys=[student_id], backref='credit_allocations')
    
    def to_dict(self):
        return {
            'id': self.id,
            'guardianId': self.guardian_id,
            'studentId': self.student_id,
            'allocatedCredits': self.allocated_credits,
            'usedCredits': self.used_credits,
            'remainingCredits': self.remaining_credits,
            'allocationReason': self.allocation_reason,
            'lastUpdated': self.last_updated.isoformat() if self.last_updated else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
    
    def allocate_credits(self, amount, reason=None):
        """Allocate credits to this student"""
        self.allocated_credits += amount
        self.remaining_credits += amount
        if reason:
            self.allocation_reason = reason
        self.last_updated = datetime.utcnow()
    
    def use_credits(self, amount):
        """Use credits from this allocation"""
        if self.remaining_credits >= amount:
            self.used_credits += amount
            self.remaining_credits -= amount
            self.last_updated = datetime.utcnow()
            return True
        return False
    
    def transfer_credits(self, amount, to_allocation):
        """Transfer credits to another student allocation"""
        if self.remaining_credits >= amount:
            self.remaining_credits -= amount
            self.allocated_credits -= amount
            to_allocation.allocated_credits += amount
            to_allocation.remaining_credits += amount
            self.last_updated = datetime.utcnow()
            to_allocation.last_updated = datetime.utcnow()
            return True
        return False

class CreditTransaction(db.Model):
    __tablename__ = 'credit_transactions'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"transaction_{uuid.uuid4().hex[:8]}")
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    student_id = db.Column(db.String(50), db.ForeignKey('users.id'))
    allocation_id = db.Column(db.String(50), db.ForeignKey('student_credit_allocations.id'))
    transaction_type = db.Column(db.String(50), nullable=False)  # 'allocation', 'usage', 'transfer', 'purchase'
    credits = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(500))
    related_session_id = db.Column(db.String(50), db.ForeignKey('sessions.id'))
    related_enrollment_id = db.Column(db.String(50), db.ForeignKey('enrollments.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    guardian = db.relationship('User', foreign_keys=[guardian_id], backref='credit_transactions')
    student = db.relationship('User', foreign_keys=[student_id], backref='student_credit_transactions')
    allocation = db.relationship('StudentCreditAllocation', backref='transactions')
    session = db.relationship('Session', backref='credit_transactions')
    enrollment = db.relationship('Enrollment', backref='credit_transactions')
    
    def to_dict(self):
        return {
            'id': self.id,
            'guardianId': self.guardian_id,
            'studentId': self.student_id,
            'allocationId': self.allocation_id,
            'transactionType': self.transaction_type,
            'credits': self.credits,
            'description': self.description,
            'relatedSessionId': self.related_session_id,
            'relatedEnrollmentId': self.related_enrollment_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class CourseChat(db.Model):
    __tablename__ = 'course_chats'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"chat_{uuid.uuid4().hex[:8]}")
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)  # Chat name/title
    created_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    participants_count = db.Column(db.Integer, default=0)
    
    # Relationships
    course = db.relationship('Course', backref='chats')
    creator = db.relationship('User', foreign_keys=[created_by])
    participants = db.relationship('ChatParticipant', back_populates='chat', cascade='all, delete-orphan')
    messages = db.relationship('ChatMessage', back_populates='chat', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'courseId': self.course_id,
            'name': self.name,
            'createdBy': self.created_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'lastMessageAt': self.last_message_at.isoformat() if self.last_message_at else None,
            'isActive': self.is_active,
            'participantsCount': self.participants_count,
            'courseName': self.course.title if self.course else None
        }

class ChatParticipant(db.Model):
    __tablename__ = 'chat_participants'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"participant_{uuid.uuid4().hex[:8]}")
    chat_id = db.Column(db.String(50), db.ForeignKey('course_chats.id'), nullable=False)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'student', 'tutor', 'admin'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_read_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    can_send_messages = db.Column(db.Boolean, default=True)
    
    # Relationships
    chat = db.relationship('CourseChat', back_populates='participants')
    user = db.relationship('User', backref='chat_participations')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('chat_id', 'user_id', name='unique_chat_participant'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'chatId': self.chat_id,
            'userId': self.user_id,
            'role': self.role,
            'joinedAt': self.joined_at.isoformat() if self.joined_at else None,
            'lastReadAt': self.last_read_at.isoformat() if self.last_read_at else None,
            'isActive': self.is_active,
            'canSendMessages': self.can_send_messages,
            'userName': self.user.profile.get('name', self.user.email) if self.user else None,
            'userEmail': self.user.email if self.user else None
        }

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"message_{uuid.uuid4().hex[:8]}")
    chat_id = db.Column(db.String(50), db.ForeignKey('course_chats.id'), nullable=False)
    sender_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    message_text = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text')  # 'text', 'file', 'system'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    edited_at = db.Column(db.DateTime, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    reply_to_message_id = db.Column(db.String(50), db.ForeignKey('chat_messages.id'), nullable=True)
    
    # File attachment fields
    file_name = db.Column(db.String(255), nullable=True)
    file_path = db.Column(db.String(500), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    file_type = db.Column(db.String(100), nullable=True)
    
    # Relationships
    chat = db.relationship('CourseChat', back_populates='messages')
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    reply_to = db.relationship('ChatMessage', remote_side=[id], backref='replies')
    read_status = db.relationship('MessageReadStatus', back_populates='message', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'chatId': self.chat_id,
            'senderId': self.sender_id,
            'messageText': self.message_text,
            'messageType': self.message_type,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'editedAt': self.edited_at.isoformat() if self.edited_at else None,
            'isDeleted': self.is_deleted,
            'replyToMessageId': self.reply_to_message_id,
            'fileName': self.file_name,
            'filePath': self.file_path,
            'fileSize': self.file_size,
            'fileType': self.file_type,
            'senderName': self.sender.profile.get('name', self.sender.email) if self.sender else None,
            'senderEmail': self.sender.email if self.sender else None
        }

class MessageReadStatus(db.Model):
    __tablename__ = 'message_read_status'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"read_{uuid.uuid4().hex[:8]}")
    message_id = db.Column(db.String(50), db.ForeignKey('chat_messages.id'), nullable=False)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    read_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    message = db.relationship('ChatMessage', back_populates='read_status')
    user = db.relationship('User', backref='message_reads')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('message_id', 'user_id', name='unique_message_read'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'messageId': self.message_id,
            'userId': self.user_id,
            'readAt': self.read_at.isoformat() if self.read_at else None
        }

class SystemSettings(db.Model):
    __tablename__ = 'system_settings'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: f"setting_{uuid.uuid4().hex[:8]}")
    setting_key = db.Column(db.String(100), unique=True, nullable=False)
    setting_value = db.Column(db.Text, nullable=False)
    setting_type = db.Column(db.String(20), default='string')  # string, int, float, boolean, json
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.String(50), db.ForeignKey('users.id'))
    
    # Relationship
    updated_by_user = db.relationship('User', backref='updated_settings')
    
    def get_typed_value(self):
        """Convert setting_value to appropriate Python type based on setting_type"""
        if self.setting_type == 'int':
            return int(self.setting_value)
        elif self.setting_type == 'float':
            return float(self.setting_value)
        elif self.setting_type == 'boolean':
            return self.setting_value.lower() in ('true', '1', 'yes')
        elif self.setting_type == 'json':
            import json
            return json.loads(self.setting_value)
        return self.setting_value
    
    def set_typed_value(self, value):
        """Set setting_value from Python value, automatically determining type"""
        if isinstance(value, bool):
            self.setting_type = 'boolean'
            self.setting_value = str(value).lower()
        elif isinstance(value, int):
            self.setting_type = 'int'
            self.setting_value = str(value)
        elif isinstance(value, float):
            self.setting_type = 'float'
            self.setting_value = str(value)
        elif isinstance(value, (dict, list)):
            self.setting_type = 'json'
            import json
            self.setting_value = json.dumps(value)
        else:
            self.setting_type = 'string'
            self.setting_value = str(value)
    
    @classmethod
    def get_setting(cls, key, default=None):
        """Get a setting value by key"""
        setting = cls.query.filter_by(setting_key=key).first()
        return setting.get_typed_value() if setting else default
    
    @classmethod
    def set_setting(cls, key, value, description=None, updated_by=None):
        """Set a setting value by key"""
        setting = cls.query.filter_by(setting_key=key).first()
        if setting:
            setting.set_typed_value(value)
            setting.updated_at = datetime.utcnow()
            if updated_by:
                setting.updated_by = updated_by
        else:
            setting = cls(setting_key=key, description=description, updated_by=updated_by)
            setting.set_typed_value(value)
            db.session.add(setting)
        db.session.commit()
        return setting
    
    def to_dict(self):
        return {
            'id': self.id,
            'settingKey': self.setting_key,
            'settingValue': self.get_typed_value(),
            'settingType': self.setting_type,
            'description': self.description,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'updatedBy': self.updated_by
        }


class UserCourseProgress(db.Model):
    """Track student progress and completion for courses"""
    __tablename__ = 'user_course_progress'

    id = db.Column(db.String(50), primary_key=True, default=lambda: f"progress_{uuid.uuid4().hex[:8]}")
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'), nullable=False)

    # Progress tracking
    status = db.Column(db.String(20), default='enrolled')  # enrolled, in_progress, completed, dropped
    completion_percentage = db.Column(db.Float, default=0.0)  # 0.0 to 100.0
    final_score = db.Column(db.Float, nullable=True)  # Final score after completion
    completion_date = db.Column(db.DateTime, nullable=True)

    # Timestamps
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='course_progress')
    course = db.relationship('Course', backref='student_progress')

    # Unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'course_id', name='unique_user_course_progress'),)

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'courseId': self.course_id,
            'status': self.status,
            'completionPercentage': self.completion_percentage,
            'finalScore': self.final_score,
            'completionDate': self.completion_date.isoformat() if self.completion_date else None,
            'enrolledAt': self.enrolled_at.isoformat() if self.enrolled_at else None,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class TutorQualification(db.Model):
    """Track tutor qualifications for specific courses"""
    __tablename__ = 'tutor_qualifications'

    id = db.Column(db.String(50), primary_key=True, default=lambda: f"qual_{uuid.uuid4().hex[:8]}")
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'), nullable=False)

    # Qualification details
    qualification_type = db.Column(db.String(20), default='completion')  # completion, manual, imported
    qualifying_score = db.Column(db.Float, nullable=True)  # Score that qualified them
    is_active = db.Column(db.Boolean, default=True)

    # Admin controls
    approved_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    revoked_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    revoke_reason = db.Column(db.Text, nullable=True)

    # Timestamps
    qualified_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='tutor_qualifications')
    course = db.relationship('Course', backref='qualified_tutors')
    approved_by_user = db.relationship('User', foreign_keys=[approved_by])
    revoked_by_user = db.relationship('User', foreign_keys=[revoked_by])

    # Unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'course_id', name='unique_user_course_qualification'),)

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'courseId': self.course_id,
            'qualificationType': self.qualification_type,
            'qualifyingScore': self.qualifying_score,
            'isActive': self.is_active,
            'approvedBy': self.approved_by,
            'revokedBy': self.revoked_by,
            'revokedAt': self.revoked_at.isoformat() if self.revoked_at else None,
            'revokeReason': self.revoke_reason,
            'qualifiedAt': self.qualified_at.isoformat() if self.qualified_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class CourseSettings(db.Model):
    """Course-specific settings including tutor qualification thresholds"""
    __tablename__ = 'course_settings'

    id = db.Column(db.String(50), primary_key=True, default=lambda: f"setting_{uuid.uuid4().hex[:8]}")
    course_id = db.Column(db.String(50), db.ForeignKey('courses.id'), nullable=False)

    # Tutor qualification settings
    min_score_to_tutor = db.Column(db.Float, default=85.0)  # Minimum score required to become tutor
    auto_qualify = db.Column(db.Boolean, default=True, nullable=False)  # Enable automatic qualification
    auto_approve_tutors = db.Column(db.Boolean, default=True)  # Auto-approve qualified tutors
    manual_approval_required = db.Column(db.Boolean, default=False)  # Require admin approval

    # Course behavior settings
    allow_student_tutors = db.Column(db.Boolean, default=True)  # Allow students to become tutors
    max_attempts_before_tutor_eligible = db.Column(db.Integer, default=1)  # Max completion attempts

    # Admin controls
    created_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    updated_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    course = db.relationship('Course', backref='settings')
    created_by_user = db.relationship('User', foreign_keys=[created_by])
    updated_by_user = db.relationship('User', foreign_keys=[updated_by])

    @classmethod
    def get_or_create_for_course(cls, course_id, admin_user_id=None):
        """Get existing settings or create default settings for a course"""
        settings = cls.query.filter_by(course_id=course_id).first()
        if not settings:
            settings = cls(
                course_id=course_id,
                created_by=admin_user_id,
                updated_by=admin_user_id
            )
            db.session.add(settings)
            db.session.commit()
        return settings

    def to_dict(self):
        return {
            'id': self.id,
            'courseId': self.course_id,
            'minScoreToTutor': self.min_score_to_tutor,
            'autoQualify': self.auto_qualify,
            'autoApproveTutors': self.auto_approve_tutors,
            'manualApprovalRequired': self.manual_approval_required,
            'allowStudentTutors': self.allow_student_tutors,
            'maxAttemptsBeforeTutorEligible': self.max_attempts_before_tutor_eligible,
            'createdBy': self.created_by,
            'updatedBy': self.updated_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class BulkImportJob(db.Model):
    """Track bulk import jobs for tutor qualifications"""
    __tablename__ = 'bulk_import_jobs'

    id = db.Column(db.String(50), primary_key=True, default=lambda: f"import_{uuid.uuid4().hex[:8]}")

    # Job details
    job_status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed, cancelled
    file_name = db.Column(db.String(255), nullable=True)
    import_type = db.Column(db.String(20), default='csv_text')  # csv_text, csv_file

    # Job statistics
    total_records = db.Column(db.Integer, default=0)
    successful_records = db.Column(db.Integer, default=0)
    failed_records = db.Column(db.Integer, default=0)
    skipped_records = db.Column(db.Integer, default=0)

    # Job data
    errors = db.Column(db.JSON, default=lambda: [])
    results = db.Column(db.JSON, default=lambda: {})
    options = db.Column(db.JSON, default=lambda: {})  # dry_run, skip_existing, auto_qualify, etc.

    # User tracking
    imported_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    imported_by_user = db.relationship('User', foreign_keys=[imported_by])

    def to_dict(self):
        return {
            'id': self.id,
            'jobStatus': self.job_status,
            'fileName': self.file_name,
            'importType': self.import_type,
            'totalRecords': self.total_records,
            'successfulRecords': self.successful_records,
            'failedRecords': self.failed_records,
            'skippedRecords': self.skipped_records,
            'errors': self.errors,
            'results': self.results,
            'options': self.options,
            'importedBy': self.imported_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None
        }


class GuardianStudentRequest(db.Model):
    """Track student requests to be linked to guardians"""
    __tablename__ = 'guardian_student_requests'

    id = db.Column(db.String(50), primary_key=True, default=lambda: f"request_{uuid.uuid4().hex[:8]}")
    student_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False, index=True)
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)  # pending, approved, rejected

    # Request details
    request_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    request_timezone = db.Column(db.String(50), default='UTC')
    processed_date = db.Column(db.DateTime, nullable=True)
    processed_timezone = db.Column(db.String(50), default='UTC')
    processed_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)

    # Messages and notes
    student_message = db.Column(db.Text, nullable=True)  # Message from student when requesting
    guardian_response = db.Column(db.Text, nullable=True)  # Response from guardian
    rejection_reason = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = db.relationship('User', foreign_keys=[student_id], backref='guardian_requests_sent')
    guardian = db.relationship('User', foreign_keys=[guardian_id], backref='guardian_requests_received')
    processed_by_user = db.relationship('User', foreign_keys=[processed_by])

    def to_dict(self):
        return {
            'id': self.id,
            'studentId': self.student_id,
            'guardianId': self.guardian_id,
            'status': self.status,
            'requestDate': self.request_date.isoformat() if self.request_date else None,
            'requestTimezone': self.request_timezone,
            'processedDate': self.processed_date.isoformat() if self.processed_date else None,
            'processedTimezone': self.processed_timezone,
            'processedBy': self.processed_by,
            'studentMessage': self.student_message,
            'guardianResponse': self.guardian_response,
            'rejectionReason': self.rejection_reason,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            # Include related data if needed
            'student': {
                'id': self.student.id,
                'email': self.student.email,
                'profile': self.student.profile
            } if self.student else None,
            'guardian': {
                'id': self.guardian.id,
                'email': self.guardian.email,
                'profile': self.guardian.profile
            } if self.guardian else None
        }

    def approve(self, guardian_user, response_message=None):
        """Approve the request and create active guardian-student link"""
        self.status = 'approved'
        self.processed_date = datetime.utcnow()
        self.processed_by = guardian_user.id
        self.guardian_response = response_message

        # Create active guardian-student link
        link = GuardianStudentLink(
            student_id=self.student_id,
            guardian_id=self.guardian_id,
            linked_by=guardian_user.id
        )
        db.session.add(link)

        # SYNC WITH LEGACY SYSTEM: Update guardian's profile to include student
        student = User.query.get(self.student_id)
        if student and guardian_user.profile:
            # Initialize students array if it doesn't exist
            if 'students' not in guardian_user.profile:
                guardian_user.profile['students'] = []

            # Check if student is already in the profile (avoid duplicates)
            existing_student_ids = [s.get('id') for s in guardian_user.profile['students']]
            if self.student_id not in existing_student_ids:
                # Add student to guardian's profile
                student_info = {
                    'id': self.student_id,
                    'name': student.profile.get('name', student.email) if student.profile else student.email,
                    'email': student.email,
                    'grade': student.profile.get('grade', '') if student.profile else '',
                    'linked_at': datetime.utcnow().isoformat()
                }
                guardian_user.profile['students'].append(student_info)

                # Mark the profile as modified for SQLAlchemy to detect JSON changes
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(guardian_user, 'profile')

        return link

    def reject(self, guardian_user, rejection_reason, response_message=None):
        """Reject the request"""
        self.status = 'rejected'
        self.processed_date = datetime.utcnow()
        self.processed_by = guardian_user.id
        self.rejection_reason = rejection_reason
        self.guardian_response = response_message


class GuardianStudentLink(db.Model):
    """Track active guardian-student relationships"""
    __tablename__ = 'guardian_student_links'

    id = db.Column(db.String(50), primary_key=True, default=lambda: f"link_{uuid.uuid4().hex[:8]}")
    student_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False, index=True)
    guardian_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(20), default='active', nullable=False, index=True)  # active, inactive

    # Link details
    linked_date = db.Column(db.DateTime, default=datetime.utcnow)
    linked_timezone = db.Column(db.String(50), default='UTC')
    linked_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)

    # Unlink details (when relationship ends)
    unlinked_date = db.Column(db.DateTime, nullable=True)
    unlinked_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    unlink_reason = db.Column(db.Text, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = db.relationship('User', foreign_keys=[student_id], backref='guardian_links_as_student')
    guardian = db.relationship('User', foreign_keys=[guardian_id], backref='guardian_links_as_guardian')
    linked_by_user = db.relationship('User', foreign_keys=[linked_by])
    unlinked_by_user = db.relationship('User', foreign_keys=[unlinked_by])

    def to_dict(self):
        return {
            'id': self.id,
            'studentId': self.student_id,
            'guardianId': self.guardian_id,
            'status': self.status,
            'linkedDate': self.linked_date.isoformat() if self.linked_date else None,
            'linkedTimezone': self.linked_timezone,
            'linkedBy': self.linked_by,
            'unlinkedDate': self.unlinked_date.isoformat() if self.unlinked_date else None,
            'unlinkedBy': self.unlinked_by,
            'unlinkReason': self.unlink_reason,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            # Include related data
            'student': {
                'id': self.student.id,
                'email': self.student.email,
                'profile': self.student.profile
            } if self.student else None,
            'guardian': {
                'id': self.guardian.id,
                'email': self.guardian.email,
                'profile': self.guardian.profile
            } if self.guardian else None
        }

    def deactivate(self, user, reason=None):
        """Deactivate the guardian-student link"""
        self.status = 'inactive'
        self.unlinked_date = datetime.utcnow()
        self.unlinked_by = user.id
        self.unlink_reason = reason

    @staticmethod
    def get_active_link(student_id, guardian_id):
        """Get active link between student and guardian"""
        return GuardianStudentLink.query.filter_by(
            student_id=student_id,
            guardian_id=guardian_id,
            status='active'
        ).first()

    @staticmethod
    def get_guardian_students(guardian_id):
        """Get all active students for a guardian"""
        return GuardianStudentLink.query.filter_by(
            guardian_id=guardian_id,
            status='active'
        ).all()

    @staticmethod
    def get_student_guardians(student_id):
        """Get all active guardians for a student"""
        return GuardianStudentLink.query.filter_by(
            student_id=student_id,
            status='active'
        ).all()