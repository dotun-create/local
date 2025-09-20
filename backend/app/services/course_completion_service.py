"""
Service for handling course completion and automatic tutor qualification.
"""

from datetime import datetime
from app import db
from app.models import User, UserCourseProgress, TutorQualification, CourseSettings, Course
from app.utils.auth_utils import check_qualification_threshold
import logging

logger = logging.getLogger(__name__)


class CourseCompletionService:
    """Service for managing course completion and tutor qualification workflows"""

    @staticmethod
    def record_course_completion(user_id, course_id, final_score):
        """
        Record a course completion and check for tutor qualification.

        Args:
            user_id (str): The user who completed the course
            course_id (str): The course that was completed
            final_score (float): The final score achieved (0.0 to 100.0)

        Returns:
            dict: Completion result with qualification status
        """
        try:
            user = User.query.get(user_id)
            course = Course.query.get(course_id)

            if not user or not course:
                return {
                    'success': False,
                    'error': 'User or course not found'
                }

            # Get or create progress record
            progress = UserCourseProgress.query.filter_by(
                user_id=user_id,
                course_id=course_id
            ).first()

            if not progress:
                progress = UserCourseProgress(
                    user_id=user_id,
                    course_id=course_id,
                    enrolled_at=datetime.utcnow()
                )
                db.session.add(progress)

            # Update completion details
            progress.status = 'completed'
            progress.completion_percentage = 100.0
            progress.final_score = final_score
            progress.completion_date = datetime.utcnow()

            # Check for tutor qualification
            became_tutor = check_qualification_threshold(user_id, course_id, final_score)

            db.session.commit()

            result = {
                'success': True,
                'completion_date': progress.completion_date.isoformat(),
                'final_score': final_score,
                'became_tutor': became_tutor
            }

            if became_tutor:
                result['message'] = f'Congratulations! You scored {final_score}% and are now qualified to tutor this course!'
                logger.info(f'User {user_id} qualified as tutor for course {course_id} with score {final_score}%')
            else:
                settings = CourseSettings.get_or_create_for_course(course_id)
                result['message'] = f'Course completed with {final_score}%. Score of {settings.min_score_to_tutor}% required to become a tutor.'

            return result

        except Exception as e:
            db.session.rollback()
            logger.error(f'Error recording course completion: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def update_course_progress(user_id, course_id, completion_percentage):
        """
        Update a user's progress in a course.

        Args:
            user_id (str): The user
            course_id (str): The course
            completion_percentage (float): Progress percentage (0.0 to 100.0)
        """
        try:
            progress = UserCourseProgress.query.filter_by(
                user_id=user_id,
                course_id=course_id
            ).first()

            if not progress:
                progress = UserCourseProgress(
                    user_id=user_id,
                    course_id=course_id,
                    enrolled_at=datetime.utcnow()
                )
                db.session.add(progress)

            # Update progress
            if progress.status == 'enrolled' and completion_percentage > 0:
                progress.status = 'in_progress'
                progress.started_at = datetime.utcnow()

            progress.completion_percentage = completion_percentage
            progress.updated_at = datetime.utcnow()

            db.session.commit()

            return {
                'success': True,
                'progress': progress.to_dict()
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f'Error updating course progress: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def get_user_course_progress(user_id):
        """Get all course progress for a user"""
        try:
            progress_records = UserCourseProgress.query.filter_by(user_id=user_id).all()
            return [record.to_dict() for record in progress_records]

        except Exception as e:
            logger.error(f'Error getting user course progress: {str(e)}')
            return []

    @staticmethod
    def manually_qualify_tutor(admin_user_id, student_user_id, course_id, reason="Manual qualification"):
        """
        Manually qualify a student as a tutor for a course (admin function).

        Args:
            admin_user_id (str): Admin performing the action
            student_user_id (str): Student to qualify
            course_id (str): Course to qualify for
            reason (str): Reason for manual qualification
        """
        try:
            admin = User.query.get(admin_user_id)
            student = User.query.get(student_user_id)
            course = Course.query.get(course_id)

            if not admin or not admin.has_role('admin'):
                return {
                    'success': False,
                    'error': 'Admin privileges required'
                }

            if not student or not course:
                return {
                    'success': False,
                    'error': 'Student or course not found'
                }

            # Check if qualification already exists
            existing = TutorQualification.query.filter_by(
                user_id=student_user_id,
                course_id=course_id
            ).first()

            if existing:
                existing.is_active = True
                existing.approved_by = admin_user_id
                existing.qualification_type = 'manual'
                existing.qualified_at = datetime.utcnow()
            else:
                qualification = TutorQualification(
                    user_id=student_user_id,
                    course_id=course_id,
                    qualification_type='manual',
                    approved_by=admin_user_id,
                    is_active=True
                )
                db.session.add(qualification)

            # Add tutor role if student doesn't have it
            if not student.has_role('tutor'):
                student.add_role('tutor')

            db.session.commit()

            logger.info(f'Admin {admin_user_id} manually qualified user {student_user_id} for course {course_id}: {reason}')

            return {
                'success': True,
                'message': f'Successfully qualified {student.profile.get("name", student.email)} as tutor for {course.title}'
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f'Error manually qualifying tutor: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def revoke_tutor_qualification(admin_user_id, tutor_user_id, course_id, reason):
        """
        Revoke a tutor's qualification for a course (admin function).
        """
        try:
            admin = User.query.get(admin_user_id)
            tutor = User.query.get(tutor_user_id)

            if not admin or not admin.has_role('admin'):
                return {
                    'success': False,
                    'error': 'Admin privileges required'
                }

            if not tutor:
                return {
                    'success': False,
                    'error': 'Tutor not found'
                }

            qualification = TutorQualification.query.filter_by(
                user_id=tutor_user_id,
                course_id=course_id
            ).first()

            if not qualification:
                return {
                    'success': False,
                    'error': 'Qualification not found'
                }

            # Revoke qualification
            qualification.is_active = False
            qualification.revoked_by = admin_user_id
            qualification.revoked_at = datetime.utcnow()
            qualification.revoke_reason = reason

            # Check if tutor has other qualifications
            other_qualifications = TutorQualification.query.filter_by(
                user_id=tutor_user_id,
                is_active=True
            ).filter(TutorQualification.id != qualification.id).first()

            # Remove tutor role if no other qualifications
            if not other_qualifications and tutor.has_role('tutor'):
                tutor.remove_role('tutor')

            db.session.commit()

            logger.info(f'Admin {admin_user_id} revoked tutor qualification for user {tutor_user_id} on course {course_id}: {reason}')

            return {
                'success': True,
                'message': f'Successfully revoked tutor qualification for {tutor.profile.get("name", tutor.email)}'
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f'Error revoking tutor qualification: {str(e)}')
            return {
                'success': False,
                'error': str(e)
            }