"""
Auto Qualification Service
Handles automatic qualification of students as tutors based on quiz performance and course settings
"""

import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime
from flask import current_app
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import User, Course, CourseSettings, TutorQualification, QuizResult, Notification
from app.services.notification_service import NotificationService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AutoQualificationService:
    """Service for automatic tutor qualification based on quiz performance"""

    def __init__(self):
        self.notification_service = NotificationService()

    def check_and_qualify_student(
        self,
        student_id: str,
        course_id: str,
        quiz_result: 'QuizResult'
    ) -> Dict[str, Any]:
        """
        Check if student meets qualification criteria and automatically qualify them as tutor

        Args:
            student_id: ID of the student
            course_id: ID of the course
            quiz_result: QuizResult object with the latest quiz performance

        Returns:
            Dict containing qualification result and details
        """
        try:
            # Feature flag check - can be disabled via environment variable
            if not self._is_auto_qualification_enabled():
                logger.info(f"Auto-qualification disabled via feature flag")
                return {
                    'qualified': False,
                    'reason': 'Auto-qualification feature disabled',
                    'feature_disabled': True
                }

            # Get course settings
            course_settings = CourseSettings.query.filter_by(course_id=course_id).first()
            if not course_settings:
                logger.warning(f"No settings found for course {course_id}, creating default settings")
                course_settings = CourseSettings.get_or_create_for_course(course_id)

            # Check if auto-qualification is enabled for this course
            if not course_settings.auto_qualify:
                logger.info(f"Auto-qualification disabled for course {course_id}")
                return {
                    'qualified': False,
                    'reason': f'Auto-qualification disabled for this course',
                    'course_setting_disabled': True
                }

            # Get student and course objects
            student = User.query.get(student_id)
            course = Course.query.get(course_id)

            if not student:
                logger.error(f"Student {student_id} not found")
                return {'qualified': False, 'error': 'Student not found'}

            if not course:
                logger.error(f"Course {course_id} not found")
                return {'qualified': False, 'error': 'Course not found'}

            # Check if student is already qualified for this course
            existing_qualification = TutorQualification.query.filter_by(
                user_id=student_id,
                course_id=course_id,
                is_active=True
            ).first()

            if existing_qualification:
                logger.info(f"Student {student_id} already qualified for course {course_id}")
                return {
                    'qualified': False,
                    'reason': 'Student already qualified as tutor for this course',
                    'already_qualified': True,
                    'existing_qualification_id': existing_qualification.id
                }

            # Check if student meets the minimum score requirement
            if quiz_result.score < course_settings.min_score_to_tutor:
                logger.info(f"Student {student_id} scored {quiz_result.score}%, "
                          f"below minimum {course_settings.min_score_to_tutor}% for course {course_id}")
                return {
                    'qualified': False,
                    'reason': f'Score {quiz_result.score}% below minimum required {course_settings.min_score_to_tutor}%',
                    'score_too_low': True,
                    'actual_score': quiz_result.score,
                    'required_score': course_settings.min_score_to_tutor
                }

            # Check attempt limits if configured
            if course_settings.max_attempts_before_tutor_eligible > 1:
                student_attempts = QuizResult.query.filter_by(
                    student_id=student_id,
                    course_id=course_id
                ).count()

                if student_attempts < course_settings.max_attempts_before_tutor_eligible:
                    logger.info(f"Student {student_id} has {student_attempts} attempts, "
                              f"needs {course_settings.max_attempts_before_tutor_eligible} for course {course_id}")
                    return {
                        'qualified': False,
                        'reason': f'Need {course_settings.max_attempts_before_tutor_eligible} attempts, currently has {student_attempts}',
                        'insufficient_attempts': True,
                        'current_attempts': student_attempts,
                        'required_attempts': course_settings.max_attempts_before_tutor_eligible
                    }

            # All checks passed - proceed with qualification
            return self._create_qualification(student, course, course_settings, quiz_result)

        except Exception as e:
            logger.error(f"Error in auto-qualification check: {str(e)}")
            return {
                'qualified': False,
                'error': str(e),
                'exception_occurred': True
            }

    def _create_qualification(
        self,
        student: User,
        course: Course,
        settings: CourseSettings,
        quiz_result: QuizResult
    ) -> Dict[str, Any]:
        """Create tutor qualification record and update user roles"""

        try:
            # Begin transaction
            db.session.begin()

            # Create qualification record
            qualification = TutorQualification(
                user_id=student.id,
                course_id=course.id,
                qualification_type='automatic',
                qualifying_score=quiz_result.score,
                is_active=True,
                approved_by=None,  # Automatic qualification doesn't need manual approval
                qualified_at=datetime.utcnow()
            )
            db.session.add(qualification)

            # Update student roles if they don't already have tutor role
            current_roles = student.roles or []
            if 'tutor' not in current_roles:
                current_roles.append('tutor')
                student.roles = current_roles
                logger.info(f"Added 'tutor' role to student {student.id}")

            db.session.commit()

            # Send notifications (async to avoid blocking)
            try:
                self._send_qualification_notifications(student, course, qualification, quiz_result)
            except Exception as notif_error:
                logger.error(f"Failed to send qualification notifications: {str(notif_error)}")
                # Don't fail the whole process if notifications fail

            logger.info(f"Successfully auto-qualified student {student.id} for course {course.id} "
                       f"with score {quiz_result.score}%")

            return {
                'qualified': True,
                'qualification_id': qualification.id,
                'qualification_type': 'automatic',
                'qualifying_score': quiz_result.score,
                'course_title': course.title,
                'student_name': student.profile.get('name', student.email) if student.profile else student.email,
                'qualified_at': qualification.qualified_at.isoformat()
            }

        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Database integrity error during qualification: {str(e)}")
            return {
                'qualified': False,
                'error': 'Database integrity error - student may already be qualified',
                'integrity_error': True
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating qualification: {str(e)}")
            return {
                'qualified': False,
                'error': str(e),
                'creation_error': True
            }

    def _send_qualification_notifications(
        self,
        student: User,
        course: Course,
        qualification: TutorQualification,
        quiz_result: QuizResult
    ):
        """Send notifications about the automatic qualification"""

        # Notification to the student
        student_message = (
            f"Congratulations! You have been automatically qualified as a tutor for "
            f"{course.title} based on your excellent performance (scored {quiz_result.score}%). "
            f"You can now tutor other students in this course."
        )

        self.notification_service.send_notification(
            user_id=student.id,
            notification_type='auto_qualification',
            title='You\'re now a tutor!',
            message=student_message,
            data={
                'course_id': course.id,
                'course_title': course.title,
                'qualification_id': qualification.id,
                'qualifying_score': quiz_result.score,
                'qualification_type': 'automatic'
            }
        )

        # Notification to admins (if email notifications are configured)
        try:
            from app.services.admin_notification_service import AdminNotificationService
            admin_service = AdminNotificationService()

            admin_message = (
                f"Student {student.profile.get('name', student.email) if student.profile else student.email} "
                f"has been automatically qualified as a tutor for {course.title} "
                f"with a score of {quiz_result.score}%."
            )

            admin_service.notify_admins(
                subject="New Automatic Tutor Qualification",
                message=admin_message,
                notification_type="auto_qualification",
                data={
                    'student_id': student.id,
                    'student_email': student.email,
                    'course_id': course.id,
                    'course_title': course.title,
                    'qualification_id': qualification.id,
                    'qualifying_score': quiz_result.score
                }
            )
        except Exception as e:
            logger.warning(f"Failed to send admin notification: {str(e)}")

    def _is_auto_qualification_enabled(self) -> bool:
        """Check if auto-qualification feature is enabled via environment variable"""
        return os.getenv('AUTO_QUALIFICATION_ENABLED', 'true').lower() == 'true'

    def get_qualification_statistics(self, course_id: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about automatic qualifications"""

        try:
            base_query = TutorQualification.query.filter_by(
                qualification_type='automatic',
                is_active=True
            )

            if course_id:
                base_query = base_query.filter_by(course_id=course_id)

            total_auto_qualifications = base_query.count()

            # Get qualifications by course if no specific course requested
            if not course_id:
                qualifications_by_course = (
                    db.session.query(
                        Course.title,
                        db.func.count(TutorQualification.id).label('count')
                    )
                    .join(TutorQualification)
                    .filter(
                        TutorQualification.qualification_type == 'automatic',
                        TutorQualification.is_active == True
                    )
                    .group_by(Course.title)
                    .all()
                )

                by_course = [{'course': title, 'count': count} for title, count in qualifications_by_course]
            else:
                by_course = []

            # Get recent qualifications (last 7 days)
            from datetime import datetime, timedelta
            recent_threshold = datetime.utcnow() - timedelta(days=7)

            recent_qualifications = base_query.filter(
                TutorQualification.qualified_at >= recent_threshold
            ).count()

            return {
                'total_automatic_qualifications': total_auto_qualifications,
                'recent_qualifications_7_days': recent_qualifications,
                'qualifications_by_course': by_course,
                'feature_enabled': self._is_auto_qualification_enabled()
            }

        except Exception as e:
            logger.error(f"Error getting qualification statistics: {str(e)}")
            return {
                'error': str(e),
                'feature_enabled': self._is_auto_qualification_enabled()
            }