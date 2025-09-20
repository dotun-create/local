from typing import List, Optional
import logging
from app.models import User, Course, db
from app.utils.grade_utils import GradeUtils

logger = logging.getLogger(__name__)

class TutorAssignmentService:
    """Service for automatic tutor assignment to courses."""

    @staticmethod
    def find_eligible_tutors(course_grade_level: str, course_subject: str) -> List[User]:
        """
        Find tutors eligible to teach a course based on grade level and subject.

        Args:
            course_grade_level (str): Grade level of the course
            course_subject (str): Subject of the course

        Returns:
            List[User]: List of eligible tutors
        """
        try:
            # Get all active tutors
            tutors = User.query.filter_by(
                account_type='tutor',
                is_active=True,
                status='active'
            ).all()

            eligible_tutors = []

            for tutor in tutors:
                if TutorAssignmentService._is_tutor_eligible(tutor, course_grade_level, course_subject):
                    eligible_tutors.append(tutor)

            logger.info(f"Found {len(eligible_tutors)} eligible tutors for {course_subject} Grade {course_grade_level}")
            return eligible_tutors

        except Exception as e:
            logger.error(f"Error finding eligible tutors: {str(e)}")
            return []

    @staticmethod
    def _is_tutor_eligible(tutor: User, course_grade_level: str, course_subject: str) -> bool:
        """
        Check if a tutor is eligible for a specific course.

        Args:
            tutor (User): Tutor to check
            course_grade_level (str): Course grade level
            course_subject (str): Course subject

        Returns:
            bool: True if tutor is eligible
        """
        try:
            # Check if tutor has required profile data
            if not tutor.profile:
                logger.debug(f"Tutor {tutor.id} has no profile data")
                return False

            # Get tutor's grade level
            tutor_grade = tutor.profile.get('grade_level') or tutor.profile.get('tutor_grade_level')
            if not tutor_grade:
                logger.debug(f"Tutor {tutor.id} has no grade level")
                return False

            # Check grade level eligibility (tutor must be higher grade than course)
            if not GradeUtils.can_tutor_teach_grade(tutor_grade, course_grade_level):
                logger.debug(f"Tutor {tutor.id} grade {tutor_grade} cannot teach grade {course_grade_level}")
                return False

            # Get tutor's subjects
            tutor_subjects = tutor.profile.get('subjects', [])
            if not tutor_subjects:
                logger.debug(f"Tutor {tutor.id} has no subjects")
                return False

            # Ensure subjects is a list
            if isinstance(tutor_subjects, str):
                tutor_subjects = [tutor_subjects]

            # Check subject match (case-insensitive)
            course_subject_lower = course_subject.lower()
            for subject in tutor_subjects:
                if isinstance(subject, str) and subject.lower() == course_subject_lower:
                    logger.debug(f"Tutor {tutor.id} is eligible: grade {tutor_grade}, subject match")
                    return True

            logger.debug(f"Tutor {tutor.id} subject mismatch: {tutor_subjects} vs {course_subject}")
            return False

        except Exception as e:
            logger.error(f"Error checking tutor eligibility for {tutor.id}: {str(e)}")
            return False

    @staticmethod
    def assign_tutors_to_course(course: Course, tutor_ids: List[str]) -> bool:
        """
        Assign tutors to a course.

        Args:
            course (Course): Course to assign tutors to
            tutor_ids (List[str]): List of tutor IDs to assign

        Returns:
            bool: True if assignment successful
        """
        try:
            for tutor_id in tutor_ids:
                tutor = User.query.get(tutor_id)
                if tutor and tutor not in course.tutors:
                    course.tutors.append(tutor)
                    logger.info(f"Assigned tutor {tutor_id} to course {course.id}")

            db.session.commit()
            return True

        except Exception as e:
            logger.error(f"Error assigning tutors to course {course.id}: {str(e)}")
            db.session.rollback()
            return False

    @staticmethod
    def auto_assign_tutors(course: Course) -> dict:
        """
        Automatically assign eligible tutors to a course.

        Args:
            course (Course): Course to assign tutors to

        Returns:
            dict: Assignment result with status and details
        """
        try:
            logger.info(f"Starting auto-assignment for course {course.id}: {course.subject} Grade {course.grade_level}")

            # Find eligible tutors
            eligible_tutors = TutorAssignmentService.find_eligible_tutors(
                course.grade_level,
                course.subject
            )

            if not eligible_tutors:
                logger.warning(f"No eligible tutors found for course {course.id}")
                return {
                    'success': True,
                    'assigned_count': 0,
                    'message': 'No eligible tutors found',
                    'assigned_tutors': []
                }

            # Get tutor IDs
            tutor_ids = [tutor.id for tutor in eligible_tutors]

            # Assign tutors to course
            success = TutorAssignmentService.assign_tutors_to_course(course, tutor_ids)

            if success:
                assigned_tutors = [
                    {
                        'id': tutor.id,
                        'name': tutor.profile.get('name', tutor.email),
                        'grade_level': tutor.profile.get('grade_level') or tutor.profile.get('tutor_grade_level'),
                        'subjects': tutor.profile.get('subjects', [])
                    }
                    for tutor in eligible_tutors
                ]

                logger.info(f"Successfully assigned {len(eligible_tutors)} tutors to course {course.id}")
                return {
                    'success': True,
                    'assigned_count': len(eligible_tutors),
                    'message': f'Successfully assigned {len(eligible_tutors)} tutors',
                    'assigned_tutors': assigned_tutors
                }
            else:
                logger.error(f"Failed to assign tutors to course {course.id}")
                return {
                    'success': False,
                    'assigned_count': 0,
                    'message': 'Failed to assign tutors',
                    'assigned_tutors': []
                }

        except Exception as e:
            logger.error(f"Error in auto-assignment for course {course.id}: {str(e)}")
            return {
                'success': False,
                'assigned_count': 0,
                'message': f'Assignment failed: {str(e)}',
                'assigned_tutors': []
            }

    @staticmethod
    def get_assignment_preview(course_grade_level: str, course_subject: str) -> dict:
        """
        Preview which tutors would be assigned without actually assigning them.

        Args:
            course_grade_level (str): Course grade level
            course_subject (str): Course subject

        Returns:
            dict: Preview information
        """
        try:
            eligible_tutors = TutorAssignmentService.find_eligible_tutors(
                course_grade_level,
                course_subject
            )

            preview_tutors = [
                {
                    'id': tutor.id,
                    'name': tutor.profile.get('name', tutor.email),
                    'email': tutor.email,
                    'grade_level': tutor.profile.get('grade_level') or tutor.profile.get('tutor_grade_level'),
                    'subjects': tutor.profile.get('subjects', [])
                }
                for tutor in eligible_tutors
            ]

            return {
                'eligible_count': len(eligible_tutors),
                'tutors': preview_tutors
            }

        except Exception as e:
            logger.error(f"Error getting assignment preview: {str(e)}")
            return {
                'eligible_count': 0,
                'tutors': []
            }