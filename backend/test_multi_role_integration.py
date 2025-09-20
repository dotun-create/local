"""
Comprehensive Integration Tests for Multi-Role System
Tests the complete workflow from course completion to tutor qualification
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import unittest
from datetime import datetime, timedelta
from app import create_app, db
from app.models import User, Course, UserCourseProgress, TutorQualification, CourseSettings
from app.services.course_completion_service import CourseCompletionService
from app.utils.auth_utils import check_qualification_threshold
import json

class MultiRoleIntegrationTestCase(unittest.TestCase):
    """Integration tests for the complete multi-role system workflow"""

    def setUp(self):
        """Set up test environment"""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()

        db.create_all()

        # Create test course
        self.test_course = Course(
            id='test-course-1',
            title='Advanced Mathematics',
            description='Test course for qualification',
            level='advanced'
        )
        db.session.add(self.test_course)

        # Create course settings
        self.course_settings = CourseSettings(
            course_id='test-course-1',
            min_score_to_tutor=85.0,
            auto_approve_tutors=True,
            allow_student_tutors=True
        )
        db.session.add(self.course_settings)

        # Create test users
        self.student_user = User(
            id='student-1',
            email='student@test.com',
            password_hash='hashed_password',
            account_type='student',
            roles=['student'],
            profile={'name': 'Test Student'}
        )

        self.admin_user = User(
            id='admin-1',
            email='admin@test.com',
            password_hash='hashed_password',
            account_type='admin',
            roles=['admin'],
            profile={'name': 'Test Admin'}
        )

        db.session.add(self.student_user)
        db.session.add(self.admin_user)
        db.session.commit()

    def tearDown(self):
        """Clean up test environment"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_complete_workflow_automatic_qualification(self):
        """Test complete workflow: course completion -> automatic tutor qualification"""

        # Step 1: Student completes course with high score
        result = CourseCompletionService.record_course_completion(
            user_id='student-1',
            course_id='test-course-1',
            final_score=92.0
        )

        # Verify completion was recorded
        self.assertTrue(result['success'])
        self.assertEqual(result['final_score'], 92.0)
        self.assertTrue(result['became_tutor'])
        self.assertIn('qualified to tutor', result['message'])

        # Step 2: Verify user progress was created
        progress = UserCourseProgress.query.filter_by(
            user_id='student-1',
            course_id='test-course-1'
        ).first()

        self.assertIsNotNone(progress)
        self.assertEqual(progress.status, 'completed')
        self.assertEqual(progress.completion_percentage, 100.0)
        self.assertEqual(progress.final_score, 92.0)
        self.assertIsNotNone(progress.completion_date)

        # Step 3: Verify tutor qualification was created
        qualification = TutorQualification.query.filter_by(
            user_id='student-1',
            course_id='test-course-1'
        ).first()

        self.assertIsNotNone(qualification)
        self.assertEqual(qualification.qualification_type, 'completion')
        self.assertEqual(qualification.qualifying_score, 92.0)
        self.assertTrue(qualification.is_active)
        self.assertIsNotNone(qualification.qualified_at)

        # Step 4: Verify user role was updated
        updated_user = User.query.get('student-1')
        self.assertIn('tutor', updated_user.roles)
        self.assertIn('student', updated_user.roles)  # Should keep student role
        self.assertTrue(updated_user.has_role('tutor'))

    def test_workflow_insufficient_score(self):
        """Test workflow when student doesn't meet qualification threshold"""

        # Student completes course with low score
        result = CourseCompletionService.record_course_completion(
            user_id='student-1',
            course_id='test-course-1',
            final_score=75.0
        )

        # Verify completion was recorded but no tutor qualification
        self.assertTrue(result['success'])
        self.assertEqual(result['final_score'], 75.0)
        self.assertFalse(result['became_tutor'])
        self.assertIn('Score of 85.0% required', result['message'])

        # Verify no tutor qualification was created
        qualification = TutorQualification.query.filter_by(
            user_id='student-1',
            course_id='test-course-1'
        ).first()

        self.assertIsNone(qualification)

        # Verify user role was not updated
        updated_user = User.query.get('student-1')
        self.assertNotIn('tutor', updated_user.roles)
        self.assertFalse(updated_user.has_role('tutor'))

    def test_manual_qualification_workflow(self):
        """Test manual tutor qualification by admin"""

        # Admin manually qualifies student as tutor
        result = CourseCompletionService.manually_qualify_tutor(
            admin_user_id='admin-1',
            student_user_id='student-1',
            course_id='test-course-1',
            reason='Exceptional performance in practical assignments'
        )

        # Verify manual qualification succeeded
        self.assertTrue(result['success'])
        self.assertIn('Successfully qualified', result['message'])

        # Verify tutor qualification was created
        qualification = TutorQualification.query.filter_by(
            user_id='student-1',
            course_id='test-course-1'
        ).first()

        self.assertIsNotNone(qualification)
        self.assertEqual(qualification.qualification_type, 'manual')
        self.assertEqual(qualification.approved_by, 'admin-1')
        self.assertTrue(qualification.is_active)

        # Verify user role was updated
        updated_user = User.query.get('student-1')
        self.assertIn('tutor', updated_user.roles)
        self.assertTrue(updated_user.has_role('tutor'))

    def test_qualification_revocation_workflow(self):
        """Test tutor qualification revocation"""

        # First, create a qualification
        qualification = TutorQualification(
            user_id='student-1',
            course_id='test-course-1',
            qualification_type='completion',
            qualifying_score=90.0,
            is_active=True
        )
        db.session.add(qualification)

        # Update user role
        self.student_user.add_role('tutor')
        db.session.commit()

        # Admin revokes qualification
        result = CourseCompletionService.revoke_tutor_qualification(
            admin_user_id='admin-1',
            tutor_user_id='student-1',
            course_id='test-course-1',
            reason='Performance issues reported by students'
        )

        # Verify revocation succeeded
        self.assertTrue(result['success'])
        self.assertIn('Successfully revoked', result['message'])

        # Verify qualification was deactivated
        updated_qualification = TutorQualification.query.get(qualification.id)
        self.assertFalse(updated_qualification.is_active)
        self.assertEqual(updated_qualification.revoked_by, 'admin-1')
        self.assertIsNotNone(updated_qualification.revoked_at)
        self.assertEqual(updated_qualification.revoke_reason, 'Performance issues reported by students')

        # Verify user role was removed (since no other qualifications)
        updated_user = User.query.get('student-1')
        self.assertNotIn('tutor', updated_user.roles)

    def test_multiple_course_qualifications(self):
        """Test user qualified for multiple courses"""

        # Create second course
        course2 = Course(
            id='test-course-2',
            title='Computer Science',
            description='Second test course'
        )
        db.session.add(course2)

        settings2 = CourseSettings(
            course_id='test-course-2',
            min_score_to_tutor=80.0,
            auto_approve_tutors=True,
            allow_student_tutors=True
        )
        db.session.add(settings2)
        db.session.commit()

        # Complete both courses with qualifying scores
        result1 = CourseCompletionService.record_course_completion(
            user_id='student-1',
            course_id='test-course-1',
            final_score=90.0
        )

        result2 = CourseCompletionService.record_course_completion(
            user_id='student-1',
            course_id='test-course-2',
            final_score=85.0
        )

        # Verify both qualifications succeeded
        self.assertTrue(result1['success'] and result1['became_tutor'])
        self.assertTrue(result2['success'])  # Second course doesn't make user "become" tutor again

        # Verify user has qualifications for both courses
        qualifications = TutorQualification.query.filter_by(
            user_id='student-1',
            is_active=True
        ).all()

        self.assertEqual(len(qualifications), 2)
        course_ids = [q.course_id for q in qualifications]
        self.assertIn('test-course-1', course_ids)
        self.assertIn('test-course-2', course_ids)

        # Test revoking one qualification shouldn't remove tutor role
        CourseCompletionService.revoke_tutor_qualification(
            admin_user_id='admin-1',
            tutor_user_id='student-1',
            course_id='test-course-1',
            reason='Test revocation'
        )

        # User should still be a tutor due to second qualification
        updated_user = User.query.get('student-1')
        self.assertIn('tutor', updated_user.roles)

    def test_course_settings_update_workflow(self):
        """Test updating course qualification settings"""

        # Update course threshold
        original_threshold = self.course_settings.min_score_to_tutor
        new_threshold = 95.0

        self.course_settings.min_score_to_tutor = new_threshold
        db.session.commit()

        # Test completion with score that would qualify under old threshold but not new
        result = CourseCompletionService.record_course_completion(
            user_id='student-1',
            course_id='test-course-1',
            final_score=90.0
        )

        # Should not qualify under new threshold
        self.assertTrue(result['success'])
        self.assertFalse(result['became_tutor'])
        self.assertIn('Score of 95.0% required', result['message'])

    def test_auto_qualify_disabled_workflow(self):
        """Test when automatic qualification is disabled"""

        # Disable auto qualification
        self.course_settings.auto_approve_tutors = False
        db.session.commit()

        # Complete course with high score
        result = CourseCompletionService.record_course_completion(
            user_id='student-1',
            course_id='test-course-1',
            final_score=95.0
        )

        # Should record completion but not qualify as tutor
        self.assertTrue(result['success'])
        self.assertFalse(result['became_tutor'])

        # Verify qualification was created but is inactive
        qualification = TutorQualification.query.filter_by(
            user_id='student-1',
            course_id='test-course-1'
        ).first()

        self.assertIsNotNone(qualification)
        self.assertFalse(qualification.is_active)

    def test_progress_update_workflow(self):
        """Test updating course progress incrementally"""

        # Update progress incrementally
        progress_updates = [0.0, 25.0, 50.0, 75.0, 100.0]

        for percentage in progress_updates:
            result = CourseCompletionService.update_course_progress(
                user_id='student-1',
                course_id='test-course-1',
                completion_percentage=percentage
            )

            self.assertTrue(result['success'])

            progress = UserCourseProgress.query.filter_by(
                user_id='student-1',
                course_id='test-course-1'
            ).first()

            self.assertEqual(progress.completion_percentage, percentage)

            # Status should change from enrolled -> in_progress -> completed
            if percentage == 0:
                self.assertEqual(progress.status, 'enrolled')
            elif percentage < 100:
                self.assertEqual(progress.status, 'in_progress')
            else:
                self.assertEqual(progress.status, 'in_progress')  # Completion requires final score

    def test_error_handling_workflows(self):
        """Test error handling in various scenarios"""

        # Test completion for non-existent user
        result = CourseCompletionService.record_course_completion(
            user_id='non-existent',
            course_id='test-course-1',
            final_score=90.0
        )

        self.assertFalse(result['success'])
        self.assertIn('not found', result['error'])

        # Test completion for non-existent course
        result = CourseCompletionService.record_course_completion(
            user_id='student-1',
            course_id='non-existent',
            final_score=90.0
        )

        self.assertFalse(result['success'])
        self.assertIn('not found', result['error'])

        # Test manual qualification by non-admin
        result = CourseCompletionService.manually_qualify_tutor(
            admin_user_id='student-1',  # Student trying to act as admin
            student_user_id='student-1',
            course_id='test-course-1',
            reason='Test'
        )

        self.assertFalse(result['success'])
        self.assertIn('Admin privileges required', result['error'])

def run_integration_tests():
    """Run all integration tests with detailed output"""
    print("🧪 Running Multi-Role System Integration Tests...\n")

    # Create test suite
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(MultiRoleIntegrationTestCase)

    # Run tests with verbose output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Print summary
    print(f"\n📊 Test Results Summary:")
    print(f"   Tests run: {result.testsRun}")
    print(f"   Failures: {len(result.failures)}")
    print(f"   Errors: {len(result.errors)}")
    print(f"   Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")

    if result.failures:
        print(f"\n❌ Failures:")
        for test, traceback in result.failures:
            print(f"   - {test}: {traceback}")

    if result.errors:
        print(f"\n🔥 Errors:")
        for test, traceback in result.errors:
            print(f"   - {test}: {traceback}")

    if result.wasSuccessful():
        print("\n✅ All integration tests passed!")
        return True
    else:
        print("\n❌ Some integration tests failed!")
        return False

if __name__ == '__main__':
    success = run_integration_tests()
    exit(0 if success else 1)