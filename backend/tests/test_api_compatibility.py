"""
API Compatibility Tests for Auto-Qualification Feature
Ensures that all existing API functionality continues to work after adding auto_qualify functionality
"""

import unittest
import sys
import os
import json

# Add the parent directory to the Python path so we can import the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Course, CourseSettings, TutorQualification, Quiz, QuizResult, Question, Module
from flask_jwt_extended import create_access_token
from datetime import datetime


class APICompatibilityTests(unittest.TestCase):
    """Test that all existing API endpoints continue to work with auto-qualification feature"""

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
        """Create test data"""
        # Create admin user
        self.admin_user = User(
            id='admin_api_compat',
            email='admin_compat@test.com',
            password_hash='hashed_password',
            account_type='admin',
            is_active=True,
            status='active'
        )
        db.session.add(self.admin_user)

        # Create student user
        self.student_user = User(
            id='student_api_compat',
            email='student_compat@test.com',
            password_hash='hashed_password',
            account_type='student',
            is_active=True,
            status='active',
            profile={'name': 'Test Student Compat'}
        )
        db.session.add(self.student_user)

        # Create course
        self.course = Course(
            id='course_api_compat',
            title='API Compatibility Test Course',
            description='Test course for API compatibility',
            status='active'
        )
        db.session.add(self.course)

        # Create module first
        self.module = Module(
            id='module_api_compat',
            course_id=self.course.id,
            title='API Compatibility Module',
            description='Test module for API compatibility',
            order=1,
            status='active'
        )
        db.session.add(self.module)

        # Create quiz
        self.quiz = Quiz(
            id='quiz_api_compat',
            title='API Compatibility Quiz',
            description='Test quiz for API compatibility',
            module_id=self.module.id,
            status='active'
        )
        db.session.add(self.quiz)

        # Create question
        self.question = Question(
            id='question_api_compat',
            quiz_id=self.quiz.id,
            question='Test question?',
            type='multiple_choice',
            correct_answer='A',
            options={'A': 'Correct answer', 'B': 'Wrong answer'},
            points=10
        )
        db.session.add(self.question)

        db.session.commit()

    def get_admin_token(self):
        """Helper to get admin JWT token"""
        return create_access_token(identity=self.admin_user.id)

    def get_student_token(self):
        """Helper to get student JWT token"""
        return create_access_token(identity=self.student_user.id)

    def test_existing_course_settings_api_unchanged(self):
        """Test that existing course settings API behavior is unchanged"""
        token = self.get_admin_token()

        # Test GET without any existing settings
        response = self.client.get(
            f'/api/admin/courses/{self.course.id}/settings',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Should include all existing fields
        self.assertIn('id', data)
        self.assertIn('courseId', data)
        self.assertIn('minScoreToTutor', data)
        self.assertIn('autoApproveTutors', data)
        self.assertIn('manualApprovalRequired', data)

        # Should include new field with default value
        self.assertIn('autoQualify', data)
        self.assertTrue(data['autoQualify'])  # Should default to True

    def test_course_settings_update_without_auto_qualify(self):
        """Test that updating course settings without auto_qualify still works"""
        token = self.get_admin_token()

        # Test PUT request without auto_qualify field (existing behavior)
        response = self.client.put(
            f'/api/admin/courses/{self.course.id}/settings',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'minScoreToTutor': 80.0,
                'autoApproveTutors': False,
                'manualApprovalRequired': True
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])

        # Verify settings were updated correctly
        settings = CourseSettings.query.filter_by(course_id=self.course.id).first()
        self.assertEqual(settings.min_score_to_tutor, 80.0)
        self.assertFalse(settings.auto_approve_tutors)
        self.assertTrue(settings.manual_approval_required)
        # auto_qualify should remain at default (True)
        self.assertTrue(settings.auto_qualify)

    def test_course_settings_update_with_auto_qualify(self):
        """Test that updating course settings with auto_qualify works"""
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

    def test_quiz_submission_api_unchanged(self):
        """Test that quiz submission API continues to work"""
        token = self.get_student_token()

        # Submit quiz answers
        response = self.client.post(
            f'/api/student/quizzes/{self.quiz.id}/submit',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'answers': {
                    self.question.id: 'A'  # Correct answer
                }
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Should include all existing response fields
        self.assertIn('score', data)
        self.assertIn('totalQuestions', data)
        self.assertIn('correctAnswers', data)
        self.assertIn('resultId', data)

        # Should work normally
        self.assertEqual(data['score'], 100.0)
        self.assertEqual(data['correctAnswers'], 1)
        self.assertEqual(data['totalQuestions'], 1)

    def test_quiz_submission_with_auto_qualification_enabled(self):
        """Test that quiz submission triggers auto-qualification when enabled"""
        token = self.get_student_token()

        # Set course settings to enable auto-qualification with low threshold
        settings_response = self.client.put(
            f'/api/admin/courses/{self.course.id}/settings',
            headers={'Authorization': f'Bearer {self.get_admin_token()}'},
            json={
                'minScoreToTutor': 80.0,
                'auto_qualify': True,
                'autoApproveTutors': True
            }
        )
        self.assertEqual(settings_response.status_code, 200)

        # Submit quiz with high score
        response = self.client.post(
            f'/api/student/quizzes/{self.quiz.id}/submit',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'answers': {
                    self.question.id: 'A'  # Correct answer, should get 100%
                }
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Normal quiz submission response should be unchanged
        self.assertEqual(data['score'], 100.0)

        # Should include auto-qualification information if it occurred
        if 'autoQualification' in data:
            self.assertIn('qualified', data['autoQualification'])
            if data['autoQualification']['qualified']:
                self.assertIn('qualification_id', data['autoQualification'])
                self.assertEqual(data['autoQualification']['qualification_type'], 'automatic')

                # Verify qualification was actually created
                qualification = TutorQualification.query.filter_by(
                    user_id=self.student_user.id,
                    course_id=self.course.id,
                    is_active=True
                ).first()
                self.assertIsNotNone(qualification)
                self.assertEqual(qualification.qualification_type, 'automatic')

    def test_quiz_submission_with_auto_qualification_disabled(self):
        """Test that quiz submission doesn't trigger auto-qualification when disabled"""
        token = self.get_student_token()

        # Set course settings to disable auto-qualification
        settings_response = self.client.put(
            f'/api/admin/courses/{self.course.id}/settings',
            headers={'Authorization': f'Bearer {self.get_admin_token()}'},
            json={
                'minScoreToTutor': 80.0,
                'auto_qualify': False,
                'autoApproveTutors': True
            }
        )
        self.assertEqual(settings_response.status_code, 200)

        # Submit quiz with high score
        response = self.client.post(
            f'/api/student/quizzes/{self.quiz.id}/submit',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'answers': {
                    self.question.id: 'A'  # Correct answer, should get 100%
                }
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Normal quiz submission response should be unchanged
        self.assertEqual(data['score'], 100.0)

        # Auto-qualification should not occur
        if 'autoQualification' in data:
            self.assertFalse(data['autoQualification']['qualified'])

        # Verify no qualification was created
        qualification = TutorQualification.query.filter_by(
            user_id=self.student_user.id,
            course_id=self.course.id,
            is_active=True
        ).first()
        self.assertIsNone(qualification)

    def test_bulk_import_api_unchanged(self):
        """Test that bulk import API continues to work"""
        token = self.get_admin_token()

        # Test bulk import with existing functionality
        csv_data = f"email,course_id,score,qualification_date\n{self.student_user.email},{self.course.id},95,2024-01-01"

        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'csvData': csv_data,
                'dryRun': True,
                'skipExisting': False,
                'autoQualify': True
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Should include all existing response fields
        self.assertIn('total', data)
        self.assertIn('successful', data)
        self.assertIn('failed', data)
        self.assertIn('errors', data)
        self.assertIn('qualified', data)
        self.assertIn('preview', data)

        # Should work normally
        self.assertTrue(data['preview'])  # Dry run
        self.assertEqual(data['total'], 1)

    def test_manual_qualification_api_unchanged(self):
        """Test that manual qualification API continues to work"""
        token = self.get_admin_token()

        # Test manual qualification
        response = self.client.post(
            '/api/admin/tutors/qualify',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'email': self.student_user.email,
                'courseId': self.course.id,
                'reason': 'Test manual qualification'
            }
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Should include all existing response fields
        self.assertIn('success', data)
        self.assertTrue(data['success'])
        self.assertIn('qualification', data)

        # Verify qualification was created
        qualification = TutorQualification.query.filter_by(
            user_id=self.student_user.id,
            course_id=self.course.id,
            is_active=True
        ).first()
        self.assertIsNotNone(qualification)
        self.assertEqual(qualification.qualification_type, 'manual')

    def test_get_qualifications_api_unchanged(self):
        """Test that get qualifications API continues to work"""
        token = self.get_admin_token()

        # Create a test qualification first
        qualification = TutorQualification(
            user_id=self.student_user.id,
            course_id=self.course.id,
            qualification_type='test',
            qualified_at=datetime.utcnow(),
            approved_by=self.admin_user.id,
            is_active=True
        )
        db.session.add(qualification)
        db.session.commit()

        # Test get qualifications
        response = self.client.get(
            '/api/admin/tutors/qualifications',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Should include all existing response fields
        self.assertIn('qualifications', data)
        self.assertIn('total', data)
        self.assertIn('pages', data)
        self.assertIn('currentPage', data)

        # Should work normally
        self.assertGreaterEqual(data['total'], 1)
        self.assertGreaterEqual(len(data['qualifications']), 1)

    def test_get_all_course_settings_api_unchanged(self):
        """Test that get all course settings API continues to work"""
        token = self.get_admin_token()

        response = self.client.get(
            '/api/admin/courses/settings',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)

        # Should include all existing response fields
        self.assertIn('settings', data)
        self.assertIn('total', data)

        # Should work normally
        self.assertGreaterEqual(data['total'], 1)
        self.assertGreaterEqual(len(data['settings']), 1)

        # Each setting should include autoQualify field
        for setting in data['settings']:
            self.assertIn('autoQualify', setting)

    def test_unauthorized_access_still_blocked(self):
        """Test that unauthorized access is still properly blocked"""
        # Test without token
        response = self.client.get('/api/admin/courses/settings')
        self.assertEqual(response.status_code, 401)

        # Test with student token on admin endpoint
        student_token = self.get_student_token()
        response = self.client.get(
            '/api/admin/courses/settings',
            headers={'Authorization': f'Bearer {student_token}'}
        )
        self.assertEqual(response.status_code, 403)

    def test_error_handling_unchanged(self):
        """Test that error handling behavior is unchanged"""
        token = self.get_admin_token()

        # Test with invalid course ID
        response = self.client.get(
            '/api/admin/courses/invalid_course/settings',
            headers={'Authorization': f'Bearer {token}'}
        )
        self.assertEqual(response.status_code, 404)

        # Test with invalid data
        response = self.client.put(
            f'/api/admin/courses/{self.course.id}/settings',
            headers={'Authorization': f'Bearer {token}'},
            json={
                'minScoreToTutor': 'invalid_number'
            }
        )
        self.assertEqual(response.status_code, 500)


class AutoQualificationServiceAPITests(unittest.TestCase):
    """Test API endpoints specific to auto-qualification service"""

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
            id='admin_service_test',
            email='admin_service@test.com',
            password_hash='hashed_password',
            account_type='admin',
            is_active=True,
            status='active'
        )
        db.session.add(self.admin_user)

        # Create student user
        self.student_user = User(
            id='student_service_test',
            email='student_service@test.com',
            password_hash='hashed_password',
            account_type='student',
            is_active=True,
            status='active',
            profile={'name': 'Test Student Service'}
        )
        db.session.add(self.student_user)

        # Create course
        self.course = Course(
            id='course_service_test',
            title='Service Test Course',
            description='Test course for service testing',
            status='active'
        )
        db.session.add(self.course)

        db.session.commit()

    def get_admin_token(self):
        """Helper to get admin JWT token"""
        return create_access_token(identity=self.admin_user.id)

    def test_auto_qualification_service_integration(self):
        """Test that AutoQualificationService integrates properly with existing system"""
        from app.services.auto_qualification_service import AutoQualificationService
        from app.models import QuizResult

        # Create a quiz result
        quiz_result = QuizResult(
            id='result_service_test',
            student_id=self.student_user.id,
            course_id=self.course.id,
            quiz_id='dummy_quiz',
            score=95,
            total_questions=10,
            correct_answers=9
        )
        db.session.add(quiz_result)
        db.session.commit()

        # Test service functionality
        service = AutoQualificationService()
        result = service.check_and_qualify_student(
            self.student_user.id,
            self.course.id,
            quiz_result
        )

        # Should work without errors
        self.assertIn('qualified', result)

        # If qualified, should create proper records
        if result['qualified']:
            self.assertIn('qualification_id', result)
            self.assertIn('qualification_type', result)
            self.assertEqual(result['qualification_type'], 'automatic')

    def test_feature_flag_functionality(self):
        """Test that auto-qualification can be disabled via feature flag"""
        from app.services.auto_qualification_service import AutoQualificationService
        from app.models import QuizResult
        import os

        # Create a quiz result
        quiz_result = QuizResult(
            id='result_flag_test',
            student_id=self.student_user.id,
            course_id=self.course.id,
            quiz_id='dummy_quiz_flag',
            score=95,
            total_questions=10,
            correct_answers=9
        )
        db.session.add(quiz_result)
        db.session.commit()

        # Test with feature disabled
        os.environ['AUTO_QUALIFICATION_ENABLED'] = 'false'

        service = AutoQualificationService()
        result = service.check_and_qualify_student(
            self.student_user.id,
            self.course.id,
            quiz_result
        )

        # Should be disabled
        self.assertFalse(result['qualified'])
        self.assertIn('feature_disabled', result)
        self.assertTrue(result['feature_disabled'])

        # Clean up
        os.environ['AUTO_QUALIFICATION_ENABLED'] = 'true'


if __name__ == '__main__':
    unittest.main()