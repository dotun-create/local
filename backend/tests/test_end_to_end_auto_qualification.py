"""
End-to-End Auto-Qualification Tests
Tests the complete auto-qualification flow from quiz submission to tutor qualification
"""

import unittest
import sys
import os
import json

# Add the parent directory to the Python path so we can import the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Course, CourseSettings, TutorQualification, Quiz, QuizResult, Question, Module
from app.services.auto_qualification_service import AutoQualificationService
from datetime import datetime


class EndToEndAutoQualificationTests(unittest.TestCase):
    """Test the complete auto-qualification flow end-to-end"""

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
        """Create comprehensive test data"""
        # Create admin user
        self.admin_user = User(
            id='admin_e2e',
            email='admin_e2e@test.com',
            password_hash='hashed_password',
            account_type='admin',
            is_active=True,
            status='active'
        )
        db.session.add(self.admin_user)

        # Create student user
        self.student_user = User(
            id='student_e2e',
            email='student_e2e@test.com',
            password_hash='hashed_password',
            account_type='student',
            is_active=True,
            status='active',
            profile={'name': 'E2E Test Student'},
            roles=['student']
        )
        db.session.add(self.student_user)

        # Create course
        self.course = Course(
            id='course_e2e',
            title='End-to-End Test Course',
            description='Test course for E2E auto-qualification',
            status='active'
        )
        db.session.add(self.course)

        # Create module
        self.module = Module(
            id='module_e2e',
            course_id=self.course.id,
            title='E2E Test Module',
            description='Test module for E2E testing',
            order=1,
            status='active'
        )
        db.session.add(self.module)

        # Create quiz
        self.quiz = Quiz(
            id='quiz_e2e',
            title='E2E Test Quiz',
            description='Test quiz for E2E testing',
            module_id=self.module.id,
            status='active'
        )
        db.session.add(self.quiz)

        # Create question
        self.question = Question(
            id='question_e2e',
            quiz_id=self.quiz.id,
            question='What is the correct answer?',
            type='multiple_choice',
            correct_answer='A',
            options={'A': 'Correct answer', 'B': 'Wrong answer'},
            points=10
        )
        db.session.add(self.question)

        db.session.commit()

    def test_complete_auto_qualification_flow_enabled(self):
        """Test the complete flow when auto-qualification is enabled"""
        print("\n=== Testing Complete Auto-Qualification Flow (ENABLED) ===")

        # Step 1: Configure course settings to enable auto-qualification
        print("1. Configuring course settings to enable auto-qualification...")
        course_settings = CourseSettings.get_or_create_for_course(self.course.id, self.admin_user.id)
        course_settings.auto_qualify = True
        course_settings.min_score_to_tutor = 80.0
        course_settings.auto_approve_tutors = True
        db.session.commit()

        print(f"   Course settings: auto_qualify={course_settings.auto_qualify}, min_score={course_settings.min_score_to_tutor}")

        # Step 2: Verify student does not have tutor role initially
        print("2. Verifying student initial state...")
        self.assertNotIn('tutor', self.student_user.roles or [])
        print(f"   Student roles: {self.student_user.roles}")

        # Step 3: Create quiz result with high score
        print("3. Creating quiz result with high score (95%)...")
        quiz_result = QuizResult(
            id='result_e2e_high',
            quiz_id=self.quiz.id,
            student_id=self.student_user.id,
            course_id=self.course.id,
            module_id=self.module.id,
            score=95,
            total_questions=1,
            correct_answers=1,
            answers=[{'question_id': self.question.id, 'answer': 'A', 'correct': True}],
            status='completed'
        )
        db.session.add(quiz_result)
        db.session.commit()
        print(f"   Quiz result created: score={quiz_result.score}%")

        # Step 4: Test auto-qualification service
        print("4. Running auto-qualification check...")
        service = AutoQualificationService()
        result = service.check_and_qualify_student(
            self.student_user.id,
            self.course.id,
            quiz_result
        )

        print(f"   Auto-qualification result: {result}")

        # Step 5: Verify qualification was successful
        print("5. Verifying qualification results...")
        self.assertTrue(result['qualified'], "Student should be qualified")
        self.assertEqual(result['qualification_type'], 'automatic')
        self.assertEqual(result['qualifying_score'], 95)
        self.assertIn('qualification_id', result)
        print(f"   ✓ Student qualified with ID: {result['qualification_id']}")

        # Step 6: Verify database records
        print("6. Verifying database records...")

        # Check TutorQualification record
        qualification = TutorQualification.query.filter_by(
            user_id=self.student_user.id,
            course_id=self.course.id,
            is_active=True
        ).first()

        self.assertIsNotNone(qualification, "TutorQualification record should exist")
        self.assertEqual(qualification.qualification_type, 'automatic')
        self.assertEqual(qualification.qualifying_score, 95.0)
        self.assertTrue(qualification.is_active)
        print(f"   ✓ TutorQualification record: {qualification.to_dict()}")

        # Check user roles were updated
        updated_student = User.query.get(self.student_user.id)
        self.assertIn('tutor', updated_student.roles or [])
        print(f"   ✓ Student roles updated: {updated_student.roles}")

        print("=== Complete Auto-Qualification Flow Test PASSED ===\n")

    def test_complete_auto_qualification_flow_disabled(self):
        """Test the complete flow when auto-qualification is disabled"""
        print("\n=== Testing Complete Auto-Qualification Flow (DISABLED) ===")

        # Step 1: Configure course settings to disable auto-qualification
        print("1. Configuring course settings to disable auto-qualification...")
        course_settings = CourseSettings.get_or_create_for_course(self.course.id, self.admin_user.id)
        course_settings.auto_qualify = False
        course_settings.min_score_to_tutor = 80.0
        db.session.commit()

        print(f"   Course settings: auto_qualify={course_settings.auto_qualify}, min_score={course_settings.min_score_to_tutor}")

        # Step 2: Create quiz result with high score
        print("2. Creating quiz result with high score (95%)...")
        quiz_result = QuizResult(
            id='result_e2e_disabled',
            quiz_id=self.quiz.id,
            student_id=self.student_user.id,
            course_id=self.course.id,
            module_id=self.module.id,
            score=95,
            total_questions=1,
            correct_answers=1,
            answers=[{'question_id': self.question.id, 'answer': 'A', 'correct': True}],
            status='completed'
        )
        db.session.add(quiz_result)
        db.session.commit()
        print(f"   Quiz result created: score={quiz_result.score}%")

        # Step 3: Test auto-qualification service
        print("3. Running auto-qualification check...")
        service = AutoQualificationService()
        result = service.check_and_qualify_student(
            self.student_user.id,
            self.course.id,
            quiz_result
        )

        print(f"   Auto-qualification result: {result}")

        # Step 4: Verify qualification was NOT successful
        print("4. Verifying qualification was disabled...")
        self.assertFalse(result['qualified'], "Student should NOT be qualified when disabled")
        self.assertTrue(result['course_setting_disabled'], "Should indicate course setting disabled")
        print(f"   ✓ Auto-qualification properly disabled")

        # Step 5: Verify no database records were created
        print("5. Verifying no qualification records were created...")

        qualification = TutorQualification.query.filter_by(
            user_id=self.student_user.id,
            course_id=self.course.id,
            is_active=True
        ).first()

        self.assertIsNone(qualification, "No TutorQualification record should exist")
        print(f"   ✓ No qualification records created")

        # Check user roles were NOT updated
        updated_student = User.query.get(self.student_user.id)
        self.assertNotIn('tutor', updated_student.roles or [])
        print(f"   ✓ Student roles unchanged: {updated_student.roles}")

        print("=== Complete Auto-Qualification Flow (Disabled) Test PASSED ===\n")

    def test_auto_qualification_low_score(self):
        """Test auto-qualification with score below threshold"""
        print("\n=== Testing Auto-Qualification with Low Score ===")

        # Step 1: Configure course settings
        print("1. Configuring course settings...")
        course_settings = CourseSettings.get_or_create_for_course(self.course.id, self.admin_user.id)
        course_settings.auto_qualify = True
        course_settings.min_score_to_tutor = 85.0  # Set high threshold
        db.session.commit()

        print(f"   Course settings: auto_qualify={course_settings.auto_qualify}, min_score={course_settings.min_score_to_tutor}")

        # Step 2: Create quiz result with low score
        print("2. Creating quiz result with low score (70%)...")
        quiz_result = QuizResult(
            id='result_e2e_low',
            quiz_id=self.quiz.id,
            student_id=self.student_user.id,
            course_id=self.course.id,
            module_id=self.module.id,
            score=70,  # Below threshold
            total_questions=1,
            correct_answers=0,
            answers=[{'question_id': self.question.id, 'answer': 'B', 'correct': False}],
            status='completed'
        )
        db.session.add(quiz_result)
        db.session.commit()
        print(f"   Quiz result created: score={quiz_result.score}%")

        # Step 3: Test auto-qualification service
        print("3. Running auto-qualification check...")
        service = AutoQualificationService()
        result = service.check_and_qualify_student(
            self.student_user.id,
            self.course.id,
            quiz_result
        )

        print(f"   Auto-qualification result: {result}")

        # Step 4: Verify qualification was NOT successful due to low score
        print("4. Verifying qualification was rejected due to low score...")
        self.assertFalse(result['qualified'], "Student should NOT be qualified with low score")
        self.assertTrue(result['score_too_low'], "Should indicate score too low")
        self.assertEqual(result['actual_score'], 70)
        self.assertEqual(result['required_score'], 85.0)
        print(f"   ✓ Auto-qualification properly rejected for low score")

        print("=== Auto-Qualification Low Score Test PASSED ===\n")

    def test_auto_qualification_already_qualified(self):
        """Test auto-qualification when student is already qualified"""
        print("\n=== Testing Auto-Qualification for Already Qualified Student ===")

        # Step 1: Configure course settings
        print("1. Configuring course settings...")
        course_settings = CourseSettings.get_or_create_for_course(self.course.id, self.admin_user.id)
        course_settings.auto_qualify = True
        course_settings.min_score_to_tutor = 80.0
        db.session.commit()

        # Step 2: Create existing qualification
        print("2. Creating existing manual qualification...")
        existing_qualification = TutorQualification(
            id='existing_qual_e2e',
            user_id=self.student_user.id,
            course_id=self.course.id,
            qualification_type='manual',
            qualifying_score=90.0,
            is_active=True,
            approved_by=self.admin_user.id,
            qualified_at=datetime.utcnow()
        )
        db.session.add(existing_qualification)
        db.session.commit()
        print(f"   Existing qualification created: {existing_qualification.to_dict()}")

        # Step 3: Create new quiz result
        print("3. Creating new quiz result with high score...")
        quiz_result = QuizResult(
            id='result_e2e_existing',
            quiz_id=self.quiz.id,
            student_id=self.student_user.id,
            course_id=self.course.id,
            module_id=self.module.id,
            score=95,
            total_questions=1,
            correct_answers=1,
            status='completed'
        )
        db.session.add(quiz_result)
        db.session.commit()

        # Step 4: Test auto-qualification service
        print("4. Running auto-qualification check...")
        service = AutoQualificationService()
        result = service.check_and_qualify_student(
            self.student_user.id,
            self.course.id,
            quiz_result
        )

        print(f"   Auto-qualification result: {result}")

        # Step 5: Verify qualification was NOT created (already exists)
        print("5. Verifying no new qualification was created...")
        self.assertFalse(result['qualified'], "Should not create new qualification")
        self.assertTrue(result['already_qualified'], "Should indicate already qualified")
        self.assertEqual(result['existing_qualification_id'], existing_qualification.id)
        print(f"   ✓ Properly detected existing qualification")

        print("=== Already Qualified Student Test PASSED ===\n")

    def test_feature_flag_disabled(self):
        """Test auto-qualification when feature flag is disabled"""
        print("\n=== Testing Auto-Qualification Feature Flag Disabled ===")

        # Step 1: Disable feature flag
        print("1. Disabling auto-qualification feature flag...")
        import os
        original_flag = os.environ.get('AUTO_QUALIFICATION_ENABLED', 'true')
        os.environ['AUTO_QUALIFICATION_ENABLED'] = 'false'

        # Step 2: Configure course settings (should be ignored)
        print("2. Configuring course settings (should be ignored)...")
        course_settings = CourseSettings.get_or_create_for_course(self.course.id, self.admin_user.id)
        course_settings.auto_qualify = True
        course_settings.min_score_to_tutor = 80.0
        db.session.commit()

        # Step 3: Create quiz result
        print("3. Creating quiz result with high score...")
        quiz_result = QuizResult(
            id='result_e2e_flag',
            quiz_id=self.quiz.id,
            student_id=self.student_user.id,
            course_id=self.course.id,
            module_id=self.module.id,
            score=95,
            total_questions=1,
            correct_answers=1,
            status='completed'
        )
        db.session.add(quiz_result)
        db.session.commit()

        # Step 4: Test auto-qualification service
        print("4. Running auto-qualification check...")
        service = AutoQualificationService()
        result = service.check_and_qualify_student(
            self.student_user.id,
            self.course.id,
            quiz_result
        )

        print(f"   Auto-qualification result: {result}")

        # Step 5: Verify qualification was disabled by feature flag
        print("5. Verifying qualification was disabled by feature flag...")
        self.assertFalse(result['qualified'], "Should not qualify when feature disabled")
        self.assertTrue(result['feature_disabled'], "Should indicate feature disabled")
        print(f"   ✓ Feature flag properly disabled auto-qualification")

        # Restore original flag
        os.environ['AUTO_QUALIFICATION_ENABLED'] = original_flag

        print("=== Feature Flag Disabled Test PASSED ===\n")

    def test_qualification_statistics(self):
        """Test auto-qualification statistics functionality"""
        print("\n=== Testing Auto-Qualification Statistics ===")

        # Step 1: Set up auto-qualification
        print("1. Setting up auto-qualification...")
        course_settings = CourseSettings.get_or_create_for_course(self.course.id, self.admin_user.id)
        course_settings.auto_qualify = True
        course_settings.min_score_to_tutor = 80.0
        db.session.commit()

        # Step 2: Create successful auto-qualification
        print("2. Creating successful auto-qualification...")
        quiz_result = QuizResult(
            id='result_e2e_stats',
            quiz_id=self.quiz.id,
            student_id=self.student_user.id,
            course_id=self.course.id,
            module_id=self.module.id,
            score=95,
            total_questions=1,
            correct_answers=1,
            status='completed'
        )
        db.session.add(quiz_result)
        db.session.commit()

        service = AutoQualificationService()
        result = service.check_and_qualify_student(
            self.student_user.id,
            self.course.id,
            quiz_result
        )
        self.assertTrue(result['qualified'])

        # Step 3: Test statistics
        print("3. Testing qualification statistics...")
        stats = service.get_qualification_statistics()
        print(f"   Statistics: {stats}")

        self.assertIn('total_automatic_qualifications', stats)
        self.assertIn('recent_qualifications_7_days', stats)
        self.assertIn('qualifications_by_course', stats)
        self.assertIn('feature_enabled', stats)

        self.assertEqual(stats['total_automatic_qualifications'], 1)
        self.assertEqual(stats['recent_qualifications_7_days'], 1)
        self.assertTrue(stats['feature_enabled'])
        print(f"   ✓ Statistics working correctly")

        # Step 4: Test course-specific statistics
        print("4. Testing course-specific statistics...")
        course_stats = service.get_qualification_statistics(self.course.id)
        print(f"   Course statistics: {course_stats}")

        self.assertEqual(course_stats['total_automatic_qualifications'], 1)
        print(f"   ✓ Course-specific statistics working correctly")

        print("=== Auto-Qualification Statistics Test PASSED ===\n")


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)