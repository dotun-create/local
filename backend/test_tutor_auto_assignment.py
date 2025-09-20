#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import unittest
from unittest.mock import patch, MagicMock
from app import create_app, db
from app.models import User, Course
from app.utils.grade_utils import GradeUtils
from app.services.tutor_assignment_service import TutorAssignmentService

class TestGradeUtils(unittest.TestCase):
    """Test cases for GradeUtils class."""

    def test_parse_grade_level_valid_formats(self):
        """Test parsing of various valid grade level formats."""
        # Test "Grade X" format
        self.assertEqual(GradeUtils.parse_grade_level("Grade 10"), 10)
        self.assertEqual(GradeUtils.parse_grade_level("grade 1"), 1)
        self.assertEqual(GradeUtils.parse_grade_level("GRADE 12"), 12)

        # Test "Year X" format
        self.assertEqual(GradeUtils.parse_grade_level("Year 8"), 8)
        self.assertEqual(GradeUtils.parse_grade_level("year 13"), 13)
        self.assertEqual(GradeUtils.parse_grade_level("YEAR 5"), 5)

        # Test numeric only format
        self.assertEqual(GradeUtils.parse_grade_level("7"), 7)
        self.assertEqual(GradeUtils.parse_grade_level("11"), 11)

    def test_parse_grade_level_invalid_formats(self):
        """Test parsing of invalid grade level formats."""
        self.assertIsNone(GradeUtils.parse_grade_level(""))
        self.assertIsNone(GradeUtils.parse_grade_level(None))
        self.assertIsNone(GradeUtils.parse_grade_level("invalid"))
        self.assertIsNone(GradeUtils.parse_grade_level("Grade"))
        self.assertIsNone(GradeUtils.parse_grade_level("Grade ABC"))
        self.assertIsNone(GradeUtils.parse_grade_level("0"))  # Outside valid range
        self.assertIsNone(GradeUtils.parse_grade_level("14"))  # Outside valid range

    def test_can_tutor_teach_grade_valid(self):
        """Test valid tutor teaching scenarios."""
        # Grade 12 tutor can teach all lower grades
        self.assertTrue(GradeUtils.can_tutor_teach_grade("Grade 12", "Grade 1"))
        self.assertTrue(GradeUtils.can_tutor_teach_grade("12", "11"))
        self.assertTrue(GradeUtils.can_tutor_teach_grade("Year 10", "Grade 5"))

        # Edge cases
        self.assertTrue(GradeUtils.can_tutor_teach_grade("Grade 2", "Grade 1"))

    def test_can_tutor_teach_grade_invalid(self):
        """Test invalid tutor teaching scenarios."""
        # Same grade level (not allowed)
        self.assertFalse(GradeUtils.can_tutor_teach_grade("Grade 10", "Grade 10"))

        # Lower grade tutor cannot teach higher grade
        self.assertFalse(GradeUtils.can_tutor_teach_grade("Grade 5", "Grade 8"))
        self.assertFalse(GradeUtils.can_tutor_teach_grade("1", "2"))

        # Invalid inputs
        self.assertFalse(GradeUtils.can_tutor_teach_grade("invalid", "Grade 5"))
        self.assertFalse(GradeUtils.can_tutor_teach_grade("Grade 5", "invalid"))
        self.assertFalse(GradeUtils.can_tutor_teach_grade(None, "Grade 5"))

    def test_normalize_grade_format(self):
        """Test grade format normalization."""
        self.assertEqual(GradeUtils.normalize_grade_format("10"), "Grade 10")
        self.assertEqual(GradeUtils.normalize_grade_format("Year 8"), "Grade 8")
        self.assertEqual(GradeUtils.normalize_grade_format("grade 5"), "Grade 5")

        # Invalid inputs remain unchanged
        self.assertEqual(GradeUtils.normalize_grade_format("invalid"), "invalid")

    def test_get_teachable_grades(self):
        """Test getting list of teachable grades."""
        self.assertEqual(GradeUtils.get_teachable_grades("Grade 10"), [1, 2, 3, 4, 5, 6, 7, 8, 9])
        self.assertEqual(GradeUtils.get_teachable_grades("3"), [1, 2])
        self.assertEqual(GradeUtils.get_teachable_grades("Grade 1"), [])
        self.assertEqual(GradeUtils.get_teachable_grades("invalid"), [])


class TestTutorAssignmentService(unittest.TestCase):
    """Test cases for TutorAssignmentService class."""

    def setUp(self):
        """Set up test fixtures."""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

        with self.app.app_context():
            db.create_all()

            # Create test tutors
            self.tutor1 = User(
                id='tutor1',
                email='tutor1@test.com',
                account_type='tutor',
                is_active=True,
                status='active',
                profile={
                    'name': 'John Tutor',
                    'grade_level': 'Grade 12',
                    'subjects': ['Mathematics', 'Physics']
                }
            )
            self.tutor1.set_password('password')

            self.tutor2 = User(
                id='tutor2',
                email='tutor2@test.com',
                account_type='tutor',
                is_active=True,
                status='active',
                profile={
                    'name': 'Jane Tutor',
                    'grade_level': '10',
                    'subjects': ['English', 'History']
                }
            )
            self.tutor2.set_password('password')

            # Inactive tutor (should be excluded)
            self.inactive_tutor = User(
                id='tutor3',
                email='tutor3@test.com',
                account_type='tutor',
                is_active=False,
                status='inactive',
                profile={
                    'name': 'Inactive Tutor',
                    'grade_level': 'Grade 11',
                    'subjects': ['Mathematics']
                }
            )
            self.inactive_tutor.set_password('password')

            # Test course
            self.course = Course(
                id='test_course',
                title='Test Math Course',
                description='Test course for mathematics',
                subject='Mathematics',
                grade_level='Grade 8',
                price=100.0
            )

            db.session.add_all([self.tutor1, self.tutor2, self.inactive_tutor, self.course])
            db.session.commit()

    def tearDown(self):
        """Clean up after tests."""
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_find_eligible_tutors_success(self):
        """Test finding eligible tutors successfully."""
        with self.app.app_context():
            eligible_tutors = TutorAssignmentService.find_eligible_tutors('Grade 8', 'Mathematics')

            # Only tutor1 should be eligible (Grade 12, teaches Mathematics)
            self.assertEqual(len(eligible_tutors), 1)
            self.assertEqual(eligible_tutors[0].id, 'tutor1')

    def test_find_eligible_tutors_no_matches(self):
        """Test finding tutors with no eligible matches."""
        with self.app.app_context():
            # No tutors teach Chemistry
            eligible_tutors = TutorAssignmentService.find_eligible_tutors('Grade 8', 'Chemistry')
            self.assertEqual(len(eligible_tutors), 0)

            # Grade too high for available tutors
            eligible_tutors = TutorAssignmentService.find_eligible_tutors('Grade 13', 'Mathematics')
            self.assertEqual(len(eligible_tutors), 0)

    def test_find_eligible_tutors_excludes_inactive(self):
        """Test that inactive tutors are excluded."""
        with self.app.app_context():
            # Even though inactive_tutor teaches Mathematics, should be excluded
            eligible_tutors = TutorAssignmentService.find_eligible_tutors('Grade 8', 'Mathematics')

            tutor_ids = [t.id for t in eligible_tutors]
            self.assertNotIn('tutor3', tutor_ids)

    def test_is_tutor_eligible_grade_matching(self):
        """Test tutor eligibility based on grade levels."""
        with self.app.app_context():
            tutor = User.query.get('tutor1')

            # Grade 12 tutor can teach Grade 8
            self.assertTrue(TutorAssignmentService._is_tutor_eligible(tutor, 'Grade 8', 'Mathematics'))

            # Grade 12 tutor cannot teach Grade 12 (same level)
            self.assertFalse(TutorAssignmentService._is_tutor_eligible(tutor, 'Grade 12', 'Mathematics'))

            # Grade 12 tutor cannot teach Grade 13 (higher level)
            self.assertFalse(TutorAssignmentService._is_tutor_eligible(tutor, 'Grade 13', 'Mathematics'))

    def test_is_tutor_eligible_subject_matching(self):
        """Test tutor eligibility based on subjects."""
        with self.app.app_context():
            tutor = User.query.get('tutor1')

            # Tutor teaches Mathematics
            self.assertTrue(TutorAssignmentService._is_tutor_eligible(tutor, 'Grade 8', 'Mathematics'))

            # Tutor teaches Physics
            self.assertTrue(TutorAssignmentService._is_tutor_eligible(tutor, 'Grade 8', 'Physics'))

            # Tutor doesn't teach Chemistry
            self.assertFalse(TutorAssignmentService._is_tutor_eligible(tutor, 'Grade 8', 'Chemistry'))

    def test_is_tutor_eligible_case_insensitive(self):
        """Test that subject matching is case-insensitive."""
        with self.app.app_context():
            tutor = User.query.get('tutor1')

            # Different cases should match
            self.assertTrue(TutorAssignmentService._is_tutor_eligible(tutor, 'Grade 8', 'mathematics'))
            self.assertTrue(TutorAssignmentService._is_tutor_eligible(tutor, 'Grade 8', 'MATHEMATICS'))
            self.assertTrue(TutorAssignmentService._is_tutor_eligible(tutor, 'Grade 8', 'MaThEmAtIcS'))

    def test_is_tutor_eligible_no_profile(self):
        """Test tutor with no profile data."""
        with self.app.app_context():
            # Create tutor with no profile
            tutor_no_profile = User(
                id='tutor_no_profile',
                email='noprofile@test.com',
                account_type='tutor',
                is_active=True,
                status='active',
                profile=None
            )

            self.assertFalse(TutorAssignmentService._is_tutor_eligible(
                tutor_no_profile, 'Grade 8', 'Mathematics'
            ))

    def test_assign_tutors_to_course(self):
        """Test assigning tutors to a course."""
        with self.app.app_context():
            course = Course.query.get('test_course')

            # Initially no tutors assigned
            self.assertEqual(len(course.tutors), 0)

            # Assign tutors
            success = TutorAssignmentService.assign_tutors_to_course(course, ['tutor1', 'tutor2'])
            self.assertTrue(success)

            # Refresh course from database
            db.session.refresh(course)
            self.assertEqual(len(course.tutors), 2)

            tutor_ids = [t.id for t in course.tutors]
            self.assertIn('tutor1', tutor_ids)
            self.assertIn('tutor2', tutor_ids)

    def test_assign_tutors_to_course_duplicate(self):
        """Test assigning same tutor multiple times."""
        with self.app.app_context():
            course = Course.query.get('test_course')
            tutor = User.query.get('tutor1')

            # Manually assign tutor first
            course.tutors.append(tutor)
            db.session.commit()

            # Try to assign same tutor again
            success = TutorAssignmentService.assign_tutors_to_course(course, ['tutor1'])
            self.assertTrue(success)

            # Should still only have one instance
            db.session.refresh(course)
            self.assertEqual(len(course.tutors), 1)

    def test_auto_assign_tutors_success(self):
        """Test successful auto-assignment."""
        with self.app.app_context():
            course = Course.query.get('test_course')

            result = TutorAssignmentService.auto_assign_tutors(course)

            self.assertTrue(result['success'])
            self.assertEqual(result['assigned_count'], 1)
            self.assertEqual(len(result['assigned_tutors']), 1)
            self.assertEqual(result['assigned_tutors'][0]['id'], 'tutor1')

            # Verify tutor was actually assigned
            db.session.refresh(course)
            self.assertEqual(len(course.tutors), 1)

    def test_auto_assign_tutors_no_eligible(self):
        """Test auto-assignment when no eligible tutors found."""
        with self.app.app_context():
            # Create course with subject no tutors teach
            course = Course(
                id='chemistry_course',
                title='Chemistry Course',
                description='Test chemistry course',
                subject='Chemistry',
                grade_level='Grade 8',
                price=100.0
            )
            db.session.add(course)
            db.session.commit()

            result = TutorAssignmentService.auto_assign_tutors(course)

            self.assertTrue(result['success'])  # Success even with no assignments
            self.assertEqual(result['assigned_count'], 0)
            self.assertEqual(result['message'], 'No eligible tutors found')
            self.assertEqual(len(result['assigned_tutors']), 0)

    def test_get_assignment_preview(self):
        """Test getting assignment preview."""
        with self.app.app_context():
            preview = TutorAssignmentService.get_assignment_preview('Grade 8', 'Mathematics')

            self.assertEqual(preview['eligible_count'], 1)
            self.assertEqual(len(preview['tutors']), 1)
            self.assertEqual(preview['tutors'][0]['id'], 'tutor1')
            self.assertEqual(preview['tutors'][0]['name'], 'John Tutor')


class TestTutorAutoAssignmentIntegration(unittest.TestCase):
    """Integration tests for the complete auto-assignment flow using mocks."""

    @patch('app.services.tutor_assignment_service.User.query')
    @patch('app.services.tutor_assignment_service.db.session')
    def test_multiple_eligible_tutors_assignment(self, mock_session, mock_user_query):
        """Test assignment when multiple tutors are eligible."""
        # Create mock tutors
        mock_tutor_math = MagicMock()
        mock_tutor_math.id = 'tutor_math_12'
        mock_tutor_math.profile = {
            'name': 'Math Expert Grade 12',
            'grade_level': 'Grade 12',
            'subjects': ['Mathematics', 'Physics', 'Chemistry']
        }
        mock_tutor_math.account_type = 'tutor'
        mock_tutor_math.is_active = True
        mock_tutor_math.status = 'active'

        mock_tutor_multi = MagicMock()
        mock_tutor_multi.id = 'tutor_multi_13'
        mock_tutor_multi.profile = {
            'name': 'Multi Subject Grade 13',
            'grade_level': 'Year 13',
            'subjects': ['Mathematics', 'English', 'Physics', 'Biology']
        }
        mock_tutor_multi.account_type = 'tutor'
        mock_tutor_multi.is_active = True
        mock_tutor_multi.status = 'active'

        # Mock the query chain
        mock_user_query.filter_by.return_value.all.return_value = [mock_tutor_math, mock_tutor_multi]

        # Create mock course
        mock_course = MagicMock()
        mock_course.id = 'math_course_grade5'
        mock_course.subject = 'Mathematics'
        mock_course.grade_level = 'Grade 5'
        mock_course.tutors = []

        # Test the assignment
        result = TutorAssignmentService.auto_assign_tutors(mock_course)

        # Both tutors should be eligible for Grade 5 Mathematics
        self.assertTrue(result['success'])
        self.assertEqual(result['assigned_count'], 2)

        assigned_tutor_ids = [t['id'] for t in result['assigned_tutors']]
        self.assertIn('tutor_math_12', assigned_tutor_ids)
        self.assertIn('tutor_multi_13', assigned_tutor_ids)

    @patch('app.services.tutor_assignment_service.User.query')
    @patch('app.services.tutor_assignment_service.db.session')
    def test_grade_boundary_conditions(self, mock_session, mock_user_query):
        """Test assignment at grade boundaries."""
        # Create mock tutors with different grade levels
        mock_tutor_english_10 = MagicMock()
        mock_tutor_english_10.id = 'tutor_english_10'
        mock_tutor_english_10.profile = {
            'name': 'English Expert Grade 10',
            'grade_level': 'Grade 10',
            'subjects': ['English', 'Literature', 'History']
        }
        mock_tutor_english_10.account_type = 'tutor'
        mock_tutor_english_10.is_active = True
        mock_tutor_english_10.status = 'active'

        mock_tutor_multi_13 = MagicMock()
        mock_tutor_multi_13.id = 'tutor_multi_13'
        mock_tutor_multi_13.profile = {
            'name': 'Multi Subject Grade 13',
            'grade_level': 'Year 13',
            'subjects': ['Mathematics', 'English', 'Physics', 'Biology']
        }
        mock_tutor_multi_13.account_type = 'tutor'
        mock_tutor_multi_13.is_active = True
        mock_tutor_multi_13.status = 'active'

        # Mock the query
        mock_user_query.filter_by.return_value.all.return_value = [mock_tutor_english_10, mock_tutor_multi_13]

        # Create mock course
        mock_course = MagicMock()
        mock_course.id = 'english_course_grade9'
        mock_course.subject = 'English'
        mock_course.grade_level = 'Grade 9'
        mock_course.tutors = []

        # Test the assignment
        result = TutorAssignmentService.auto_assign_tutors(mock_course)

        # Both Grade 10+ tutors should be eligible for Grade 9 English
        self.assertTrue(result['success'])
        self.assertEqual(result['assigned_count'], 2)

        assigned_tutor_ids = [t['id'] for t in result['assigned_tutors']]
        self.assertIn('tutor_english_10', assigned_tutor_ids)
        self.assertIn('tutor_multi_13', assigned_tutor_ids)

    @patch('app.services.tutor_assignment_service.User.query')
    @patch('app.services.tutor_assignment_service.db.session')
    def test_subject_filtering(self, mock_session, mock_user_query):
        """Test that subject filtering works correctly."""
        # Create mock tutors with different subjects
        mock_tutor_science_11 = MagicMock()
        mock_tutor_science_11.id = 'tutor_science_11'
        mock_tutor_science_11.profile = {
            'name': 'Science Expert Grade 11',
            'grade_level': '11',
            'subjects': ['Biology', 'Chemistry', 'Physics']
        }
        mock_tutor_science_11.account_type = 'tutor'
        mock_tutor_science_11.is_active = True
        mock_tutor_science_11.status = 'active'

        mock_tutor_multi_13 = MagicMock()
        mock_tutor_multi_13.id = 'tutor_multi_13'
        mock_tutor_multi_13.profile = {
            'name': 'Multi Subject Grade 13',
            'grade_level': 'Year 13',
            'subjects': ['Mathematics', 'English', 'Physics', 'Biology']
        }
        mock_tutor_multi_13.account_type = 'tutor'
        mock_tutor_multi_13.is_active = True
        mock_tutor_multi_13.status = 'active'

        # Mock tutor that doesn't teach Biology
        mock_tutor_math_12 = MagicMock()
        mock_tutor_math_12.id = 'tutor_math_12'
        mock_tutor_math_12.profile = {
            'name': 'Math Expert Grade 12',
            'grade_level': 'Grade 12',
            'subjects': ['Mathematics', 'Physics', 'Chemistry']
        }
        mock_tutor_math_12.account_type = 'tutor'
        mock_tutor_math_12.is_active = True
        mock_tutor_math_12.status = 'active'

        # Mock the query to return all tutors
        mock_user_query.filter_by.return_value.all.return_value = [
            mock_tutor_science_11, mock_tutor_multi_13, mock_tutor_math_12
        ]

        # Create mock course
        mock_course = MagicMock()
        mock_course.id = 'biology_course'
        mock_course.subject = 'Biology'
        mock_course.grade_level = 'Grade 8'
        mock_course.tutors = []

        # Test the assignment
        result = TutorAssignmentService.auto_assign_tutors(mock_course)

        # Only tutors who teach Biology should be assigned
        self.assertTrue(result['success'])
        self.assertEqual(result['assigned_count'], 2)

        assigned_tutor_ids = [t['id'] for t in result['assigned_tutors']]
        self.assertIn('tutor_science_11', assigned_tutor_ids)
        self.assertIn('tutor_multi_13', assigned_tutor_ids)
        self.assertNotIn('tutor_math_12', assigned_tutor_ids)  # Doesn't teach Biology

    @patch('app.services.tutor_assignment_service.User.query')
    @patch('app.services.tutor_assignment_service.db.session')
    def test_no_eligible_tutors_scenario(self, mock_session, mock_user_query):
        """Test scenario where no tutors are eligible."""
        # Create mock tutor with wrong grade level
        mock_tutor_low_grade = MagicMock()
        mock_tutor_low_grade.id = 'tutor_grade_5'
        mock_tutor_low_grade.profile = {
            'name': 'Low Grade Tutor',
            'grade_level': 'Grade 5',
            'subjects': ['Mathematics']
        }
        mock_tutor_low_grade.account_type = 'tutor'
        mock_tutor_low_grade.is_active = True
        mock_tutor_low_grade.status = 'active'

        # Mock the query
        mock_user_query.filter_by.return_value.all.return_value = [mock_tutor_low_grade]

        # Create mock course with higher grade level
        mock_course = MagicMock()
        mock_course.id = 'advanced_math_course'
        mock_course.subject = 'Mathematics'
        mock_course.grade_level = 'Grade 10'  # Higher than tutor's grade
        mock_course.tutors = []

        # Test the assignment
        result = TutorAssignmentService.auto_assign_tutors(mock_course)

        # No tutors should be eligible
        self.assertTrue(result['success'])  # Success even with no assignments
        self.assertEqual(result['assigned_count'], 0)
        self.assertEqual(result['message'], 'No eligible tutors found')
        self.assertEqual(len(result['assigned_tutors']), 0)

    @patch('app.services.tutor_assignment_service.User.query')
    @patch('app.services.tutor_assignment_service.db.session')
    def test_inactive_tutor_exclusion(self, mock_session, mock_user_query):
        """Test that inactive tutors are excluded from assignment."""
        # Create mock active tutor
        mock_active_tutor = MagicMock()
        mock_active_tutor.id = 'tutor_active'
        mock_active_tutor.profile = {
            'name': 'Active Tutor',
            'grade_level': 'Grade 12',
            'subjects': ['Mathematics']
        }
        mock_active_tutor.account_type = 'tutor'
        mock_active_tutor.is_active = True
        mock_active_tutor.status = 'active'

        # Create mock inactive tutor
        mock_inactive_tutor = MagicMock()
        mock_inactive_tutor.id = 'tutor_inactive'
        mock_inactive_tutor.profile = {
            'name': 'Inactive Tutor',
            'grade_level': 'Grade 12',
            'subjects': ['Mathematics']
        }
        mock_inactive_tutor.account_type = 'tutor'
        mock_inactive_tutor.is_active = False
        mock_inactive_tutor.status = 'inactive'

        # Mock query should only return active tutors (filter_by handles this)
        mock_user_query.filter_by.return_value.all.return_value = [mock_active_tutor]

        # Create mock course
        mock_course = MagicMock()
        mock_course.id = 'math_course'
        mock_course.subject = 'Mathematics'
        mock_course.grade_level = 'Grade 8'
        mock_course.tutors = []

        # Test the assignment
        result = TutorAssignmentService.auto_assign_tutors(mock_course)

        # Only active tutor should be assigned
        self.assertTrue(result['success'])
        self.assertEqual(result['assigned_count'], 1)
        self.assertEqual(result['assigned_tutors'][0]['id'], 'tutor_active')


if __name__ == '__main__':
    # Run all test suites
    unittest.main(verbosity=2)