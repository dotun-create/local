"""
Backward Compatibility Tests for Auto-Qualification Feature
Ensures that all existing functionality continues to work after adding auto_qualify field
"""

import unittest
import sys
import os

# Add the parent directory to the Python path so we can import the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Course, CourseSettings, TutorQualification, Quiz, QuizResult, Question
from app.services.auto_qualification_service import AutoQualificationService
import json
from datetime import datetime


class BackwardCompatibilityTests(unittest.TestCase):
    """Test that all existing functionality continues to work"""

    def setUp(self):
        """Set up test fixtures before each test method"""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

        with self.app.app_context():
            db.create_all()
            self.create_test_data()

        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        """Clean up after each test"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def create_test_data(self):
        """Create test data that existed before auto-qualification feature"""
        # Create admin user
        self.admin_user = User(
            id='admin_test',
            email='admin@test.com',
            password_hash='hashed_password',
            account_type='admin',
            is_active=True,
            status='active'
        )
        db.session.add(self.admin_user)

        # Create student user
        self.student_user = User(
            id='student_test',
            email='student@test.com',
            password_hash='hashed_password',
            account_type='student',
            is_active=True,
            status='active',
            profile={'name': 'Test Student'}
        )
        db.session.add(self.student_user)

        # Create course
        self.course = Course(
            id='course_test',
            title='Test Course',
            description='Test course description',
            status='active'
        )
        db.session.add(self.course)

        # Create course settings WITHOUT auto_qualify field initially
        # This simulates existing data before migration
        self.course_settings = CourseSettings(
            id='settings_test',
            course_id=self.course.id,
            min_score_to_tutor=85.0,
            auto_approve_tutors=True,
            manual_approval_required=False,
            allow_student_tutors=True,
            max_attempts_before_tutor_eligible=1,
            created_by=self.admin_user.id
        )
        # Note: auto_qualify should be set to True by default even if not explicitly set
        db.session.add(self.course_settings)

        db.session.commit()

    def test_existing_course_settings_model_unchanged(self):
        """Test that existing CourseSettings model behavior is unchanged"""
        # Test that we can query existing settings
        settings = CourseSettings.query.filter_by(course_id=self.course.id).first()
        self.assertIsNotNone(settings)
        self.assertEqual(settings.course_id, self.course.id)
        self.assertEqual(settings.min_score_to_tutor, 85.0)
        self.assertTrue(settings.auto_approve_tutors)
        self.assertFalse(settings.manual_approval_required)

    def test_course_settings_to_dict_includes_new_field(self):
        """Test that to_dict() method includes autoQualify field"""
        settings = CourseSettings.query.filter_by(course_id=self.course.id).first()
        settings_dict = settings.to_dict()

        # All existing fields should be present
        self.assertIn('id', settings_dict)
        self.assertIn('courseId', settings_dict)
        self.assertIn('minScoreToTutor', settings_dict)
        self.assertIn('autoApproveTutors', settings_dict)
        self.assertIn('manualApprovalRequired', settings_dict)

        # New field should be present with default value
        self.assertIn('autoQualify', settings_dict)
        self.assertTrue(settings_dict['autoQualify'])  # Should default to True

    def test_get_or_create_for_course_still_works(self):
        """Test that CourseSettings.get_or_create_for_course method still works"""
        # Delete existing settings
        CourseSettings.query.filter_by(course_id=self.course.id).delete()
        db.session.commit()

        # Create new settings using existing method
        new_settings = CourseSettings.get_or_create_for_course(self.course.id, self.admin_user.id)

        self.assertIsNotNone(new_settings)
        self.assertEqual(new_settings.course_id, self.course.id)
        self.assertEqual(new_settings.created_by, self.admin_user.id)
        # Should have default auto_qualify value
        self.assertTrue(new_settings.auto_qualify)

    def test_existing_tutor_qualifications_unchanged(self):
        """Test that existing tutor qualification system still works"""
        # Create a manual tutor qualification (existing functionality)
        qualification = TutorQualification(
            id='qual_test',
            user_id=self.student_user.id,
            course_id=self.course.id,
            qualification_type='manual',
            qualifying_score=95.0,
            is_active=True,
            approved_by=self.admin_user.id,
            qualified_at=datetime.utcnow()
        )
        db.session.add(qualification)
        db.session.commit()

        # Verify it works as before
        qual = TutorQualification.query.filter_by(user_id=self.student_user.id).first()
        self.assertIsNotNone(qual)
        self.assertEqual(qual.qualification_type, 'manual')
        self.assertEqual(qual.qualifying_score, 95.0)

    def test_user_role_system_unchanged(self):
        """Test that user role system continues to work"""
        # Test existing role functionality
        self.assertEqual(self.admin_user.account_type, 'admin')
        self.assertEqual(self.student_user.account_type, 'student')

        # Add tutor role to student (existing functionality)
        self.student_user.roles = ['tutor']
        db.session.commit()

        # Verify role was added
        updated_user = User.query.get(self.student_user.id)
        self.assertIn('tutor', updated_user.roles)

    def test_course_model_unchanged(self):
        """Test that Course model behavior is unchanged"""
        course = Course.query.get(self.course.id)
        self.assertIsNotNone(course)
        self.assertEqual(course.title, 'Test Course')
        self.assertEqual(course.status, 'active')

        # Test to_dict method still works
        course_dict = course.to_dict()
        self.assertIn('id', course_dict)
        self.assertIn('title', course_dict)
        self.assertIn('status', course_dict)

    def test_database_relationships_intact(self):
        """Test that all database relationships still work"""
        # Test CourseSettings -> Course relationship
        settings = CourseSettings.query.filter_by(course_id=self.course.id).first()
        self.assertEqual(settings.course.id, self.course.id)
        self.assertEqual(settings.course.title, 'Test Course')

        # Test CourseSettings -> User relationship (created_by)
        self.assertEqual(settings.created_by_user.id, self.admin_user.id)

    def test_migration_safe_defaults(self):
        """Test that migration set safe defaults for existing records"""
        settings = CourseSettings.query.filter_by(course_id=self.course.id).first()

        # auto_qualify should be True by default (safe for existing functionality)
        self.assertTrue(settings.auto_qualify)

        # All other existing fields should be unchanged
        self.assertEqual(settings.min_score_to_tutor, 85.0)
        self.assertTrue(settings.auto_approve_tutors)
        self.assertFalse(settings.manual_approval_required)

    def test_existing_queries_still_work(self):
        """Test that existing database queries continue to work"""
        # Test common queries that existed before

        # Query by course_id
        settings = CourseSettings.query.filter_by(course_id=self.course.id).first()
        self.assertIsNotNone(settings)

        # Query with joins
        course_with_settings = db.session.query(Course).join(CourseSettings).filter(
            Course.id == self.course.id
        ).first()
        self.assertIsNotNone(course_with_settings)

        # Query users by account type
        admin_users = User.query.filter_by(account_type='admin').all()
        self.assertTrue(len(admin_users) >= 1)

        student_users = User.query.filter_by(account_type='student').all()
        self.assertTrue(len(student_users) >= 1)


class APIBackwardCompatibilityTests(unittest.TestCase):
    """Test that all existing API endpoints continue to work"""

    def setUp(self):
        """Set up test fixtures"""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

        with self.app.app_context():
            db.create_all()
            self.create_test_data()

        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        """Clean up after each test"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def create_test_data(self):
        """Create test data"""
        # Create admin user
        self.admin_user = User(
            id='admin_api_test',
            email='admin_api@test.com',
            password_hash='hashed_password',
            account_type='admin',
            is_active=True,
            status='active'
        )
        db.session.add(self.admin_user)

        # Create course
        self.course = Course(
            id='course_api_test',
            title='API Test Course',
            description='Test course for API compatibility',
            status='active'
        )
        db.session.add(self.course)

        db.session.commit()

    def get_admin_token(self):
        """Helper to get admin JWT token"""
        from flask_jwt_extended import create_access_token
        with self.app.app_context():
            return create_access_token(identity=self.admin_user.id)

    def test_course_settings_api_without_auto_qualify(self):
        """Test that course settings API works when auto_qualify is not provided"""
        token = self.get_admin_token()

        # Test PUT request without auto_qualify field (existing behavior)
        response = self.client.put(
            f'/api/admin/courses/{self.course.id}/settings',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'minScoreToTutor': 80.0,
                'autoApproveTutors': False
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])

        # Verify settings were updated
        settings = CourseSettings.query.filter_by(course_id=self.course.id).first()
        self.assertEqual(settings.min_score_to_tutor, 80.0)
        self.assertFalse(settings.auto_approve_tutors)
        # auto_qualify should remain at default (True)
        self.assertTrue(settings.auto_qualify)

    def test_course_settings_api_with_auto_qualify(self):
        """Test that course settings API works when auto_qualify is provided"""
        token = self.get_admin_token()

        # Test PUT request with auto_qualify field (new behavior)
        response = self.client.put(
            f'/api/admin/courses/{self.course.id}/settings',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'minScoreToTutor': 90.0,
                'auto_qualify': False,
                'autoApproveTutors': True
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])

        # Verify settings were updated including auto_qualify
        settings = CourseSettings.query.filter_by(course_id=self.course.id).first()
        self.assertEqual(settings.min_score_to_tutor, 90.0)
        self.assertTrue(settings.auto_approve_tutors)
        self.assertFalse(settings.auto_qualify)  # Should be updated to False

    def test_get_course_settings_includes_auto_qualify(self):
        """Test that GET course settings includes auto_qualify in response"""
        token = self.get_admin_token()

        response = self.client.get(
            f'/api/admin/courses/{self.course.id}/settings',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Should include all existing fields
        self.assertIn('minScoreToTutor', data)
        self.assertIn('autoApproveTutors', data)
        self.assertIn('manualApprovalRequired', data)

        # Should include new field
        self.assertIn('autoQualify', data)
        self.assertTrue(data['autoQualify'])  # Should default to True


if __name__ == '__main__':
    unittest.main()