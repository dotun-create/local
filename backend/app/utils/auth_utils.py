"""
Authentication and authorization utilities for multi-role system.
"""

from functools import wraps
from datetime import datetime
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models import User, TutorQualification


def get_current_user():
    """Get the current authenticated user"""
    user_id = get_jwt_identity()
    if not user_id:
        return None
    return User.query.get(user_id)


def require_roles(*allowed_roles):
    """
    Decorator to require specific roles for accessing an endpoint.
    Usage: @require_roles('admin', 'tutor')
    """
    def decorator(func):
        @wraps(func)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'error': 'User not found'}), 404

            # Check if user has any of the required roles
            user_roles = user.roles or []
            if not any(role in user_roles for role in allowed_roles):
                return jsonify({
                    'error': 'Insufficient permissions',
                    'required_roles': list(allowed_roles),
                    'user_roles': user_roles
                }), 403

            return func(*args, **kwargs)
        return wrapper
    return decorator


def require_course_permission(permission_type='view'):
    """
    Decorator to require course-specific permissions.
    Usage: @require_course_permission('tutor')

    permission_type options:
    - 'view': Can view course (enrolled students, assigned tutors)
    - 'tutor': Can tutor this specific course
    - 'admin': Admin access to course
    """
    def decorator(func):
        @wraps(func)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'error': 'User not found'}), 404

            # Get course_id from URL parameters or request body
            course_id = kwargs.get('course_id')
            if not course_id:
                # Try to get from request JSON
                from flask import request
                data = request.get_json() if request.is_json else {}
                course_id = data.get('course_id') or data.get('courseId')

            if not course_id:
                return jsonify({'error': 'Course ID required'}), 400

            # Check permissions based on type
            if permission_type == 'admin':
                if not user.has_role('admin'):
                    return jsonify({'error': 'Admin access required'}), 403

            elif permission_type == 'tutor':
                if not user.has_role('tutor'):
                    return jsonify({'error': 'Tutor role required'}), 403

                # Check if user is qualified to tutor this specific course
                if not user.can_tutor_course(course_id):
                    return jsonify({
                        'error': 'Not qualified to tutor this course',
                        'course_id': course_id
                    }), 403

            elif permission_type == 'view':
                # Students can view if enrolled, tutors if qualified, admins always
                if user.has_role('admin'):
                    pass  # Admins can view any course
                elif user.has_role('tutor') and user.can_tutor_course(course_id):
                    pass  # Tutors can view courses they can tutor
                elif user.has_role('student'):
                    # Check if student is enrolled in the course
                    from app.models import Enrollment
                    enrollment = Enrollment.query.filter_by(
                        student_id=user.id,
                        course_id=course_id,
                        status='active'
                    ).first()
                    if not enrollment:
                        return jsonify({
                            'error': 'Not enrolled in this course',
                            'course_id': course_id
                        }), 403
                else:
                    return jsonify({'error': 'Access denied to this course'}), 403

            return func(*args, **kwargs)
        return wrapper
    return decorator


def check_qualification_threshold(user_id, course_id, score):
    """
    Check if a user's score meets the threshold to become a tutor for a course.
    Auto-creates TutorQualification if threshold is met.
    """
    from app.models import CourseSettings, TutorQualification, Course
    from app import db

    user = User.query.get(user_id)
    course = Course.query.get(course_id)

    if not user or not course:
        return False

    # Get course settings
    settings = CourseSettings.get_or_create_for_course(course_id)

    # Check if score meets threshold
    if score >= settings.min_score_to_tutor:
        # Check if user already has qualification
        existing_qual = TutorQualification.query.filter_by(
            user_id=user_id,
            course_id=course_id
        ).first()

        if not existing_qual:
            # Create new qualification
            qualification = TutorQualification(
                user_id=user_id,
                course_id=course_id,
                qualification_type='completion',
                qualifying_score=score,
                is_active=settings.auto_approve_tutors
            )

            # Add tutor role if user doesn't have it and auto-approval is enabled
            user_became_tutor = False
            if settings.auto_approve_tutors and not user.has_role('tutor'):
                user.add_role('tutor')
                user_became_tutor = True

            db.session.add(qualification)
            db.session.commit()

            return user_became_tutor
        else:
            # Update existing qualification if score is better
            if score > (existing_qual.qualifying_score or 0):
                existing_qual.qualifying_score = score
                existing_qual.qualified_at = datetime.utcnow()
                db.session.commit()
            # User already has qualification, check if they already have tutor role
            return user.has_role('tutor')

    return False


def get_user_permissions(user_id):
    """Get all permissions for a user"""
    user = User.query.get(user_id)
    if not user:
        return {}

    permissions = {
        'roles': user.roles or [],
        'can_access_admin': user.has_role('admin'),
        'can_access_tutor_dashboard': user.has_role('tutor'),
        'can_access_student_dashboard': user.has_role('student'),
        'qualified_courses': user.get_qualified_courses() if user.has_role('tutor') else []
    }

    return permissions


def create_enhanced_access_token(user_id):
    """Create access token with role information in claims"""
    from flask_jwt_extended import create_access_token

    user = User.query.get(user_id)
    if not user:
        return None

    # Add user roles and permissions to JWT claims
    additional_claims = {
        'roles': user.roles or [],
        'account_type': user.account_type,
        'permissions': get_user_permissions(user_id)
    }

    return create_access_token(
        identity=user_id,
        additional_claims=additional_claims
    )


# Compatibility function for existing code
def require_admin():
    """Decorator to require admin role"""
    return require_roles('admin')


def require_tutor():
    """Decorator to require tutor role"""
    return require_roles('tutor')


def require_student():
    """Decorator to require student role"""
    return require_roles('student')


def require_guardian():
    """Decorator to require guardian role (keeping compatibility)"""
    return require_roles('guardian')