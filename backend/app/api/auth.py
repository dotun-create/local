from flask import request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, create_refresh_token, get_jwt_identity
from app.api import api_bp
from app.models import User
from app.services.guardian_service import GuardianService
from app.utils.auth_utils import create_enhanced_access_token, get_user_permissions
from app import db
import uuid
import logging
import secrets
import string
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def get_user_with_courses(user):
    """Helper function to get user data with role-specific course information"""
    user_data = user.to_dict()

    # Add permissions
    user_data['permissions'] = get_user_permissions(user.id)

    # If user has tutor role, include assigned/qualified courses
    if user.has_role('tutor'):
        assigned_courses = []
        for course in user.taught_courses:
            assigned_courses.append({
                'id': course.id,
                'title': course.title,
                'description': course.description,
                'subject': course.subject,
                'level': course.level,
                'status': course.status,
                'enrolledStudents': len([e for e in course.enrollments if e.status == 'active']),
                'totalModules': len(course.modules)
            })
        user_data['assignedCourses'] = assigned_courses

        # Add qualified courses
        user_data['qualifiedCourses'] = user.get_qualified_courses()

    # If user has student role, include enrolled courses
    if user.has_role('student'):
        enrolled_courses = []
        for enrollment in user.enrollments:
            if enrollment.status == 'active':
                course = enrollment.course
                enrolled_courses.append({
                    'id': course.id,
                    'title': course.title,
                    'description': course.description,
                    'progress': enrollment.progress or 0,
                    'enrolledDate': enrollment.enrolled_date.isoformat() if enrollment.enrolled_date else None
                })
        user_data['enrolledCourses'] = enrolled_courses

    return user_data

@api_bp.route('/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Update last login timestamp and potentially status
        user.update_last_login()
        db.session.commit()
        
        # Create enhanced tokens with role information
        access_token = create_enhanced_access_token(user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        # Get user data with assigned courses for tutors
        user_data = get_user_with_courses(user)
        
        return jsonify({
            'user': user_data,
            'token': access_token,
            'refreshToken': refresh_token,
            'message': 'Login successful'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        account_type = data.get('accountType', 'student')
        profile = data.get('profile', {})
        
        # Extract name fields
        first_name = data.get('firstName', '')
        last_name = data.get('lastName', '')
        
        # Extract new fields for students
        academic_country = data.get('academicCountry', '')
        grade_level = data.get('gradeLevel', '')
        guardian_email = data.get('guardianEmail', '')
        guardian_first_name = data.get('guardianFirstName', '')
        guardian_last_name = data.get('guardianLastName', '')
        
        # Also check for guardian email in profile (frontend sends it there)
        if not guardian_email and profile:
            guardian_email = profile.get('guardianEmail', '')
        
        # Add name fields to profile
        if first_name:
            profile['firstName'] = first_name
        if last_name:
            profile['lastName'] = last_name
        
        # Combine first and last name for backwards compatibility
        if first_name or last_name:
            profile['name'] = f"{first_name} {last_name}".strip()
        
        # Add guardian name fields for students
        if account_type == 'student':
            if guardian_first_name:
                profile['guardianFirstName'] = guardian_first_name
            if guardian_last_name:
                profile['guardianLastName'] = guardian_last_name
            # Combine guardian names for backwards compatibility
            if guardian_first_name or guardian_last_name:
                profile['guardianName'] = f"{guardian_first_name} {guardian_last_name}".strip()
        
        # Add new fields to profile
        if academic_country:
            profile['academic_country'] = academic_country
        if grade_level:
            profile['grade_level'] = grade_level
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        if account_type not in ['student', 'guardian', 'tutor', 'admin']:
            return jsonify({'error': 'Invalid account type'}), 400
        
        # Check if user exists
        if User.query.filter_by(email=email.lower()).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User(
            id=f"user_{uuid.uuid4().hex[:8]}",
            email=email.lower(),
            account_type=account_type,
            profile=profile
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Create guardian request if guardian email is provided and user is a student
        guardian_invitation_result = None
        if account_type == 'student' and guardian_email and guardian_email.strip():
            try:
                # Validate guardian email format
                if '@' in guardian_email and '.' in guardian_email:
                    # Use new approval workflow that creates guardian_student_request records
                    guardian_invitation_result = GuardianService.create_guardian_request_on_signup(
                        user.id, guardian_email.strip().lower()
                    )
                    if guardian_invitation_result['success']:
                        action = guardian_invitation_result.get('action', 'unknown')
                        if action == 'request_created':
                            logger.info(f"Guardian request created for student {user.id} - Guardian will need to approve")
                        elif action == 'created_pending':
                            logger.info(f"Guardian account created and pending request submitted for student {user.id} - Guardian approval required")
                        else:
                            logger.info(f"Guardian processing completed for student {user.id}: {action}")
                    else:
                        logger.warning(f"Failed to create guardian request for student {user.id}: {guardian_invitation_result.get('error')}")
                else:
                    logger.warning(f"Invalid guardian email format provided during registration: {guardian_email}")
            except Exception as e:
                logger.error(f"Error creating guardian request during student registration: {str(e)}")
        
        # Set last login since this is automatic login after registration
        user.update_last_login()
        
        # Create enhanced tokens with role information
        access_token = create_enhanced_access_token(user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        # Prepare response
        response_data = {
            'user': user.to_dict(),
            'token': access_token,
            'refreshToken': refresh_token,
            'message': 'Registration successful'
        }
        
        # Add guardian invitation information to response if applicable
        if guardian_invitation_result:
            response_data['guardianInvitation'] = {
                'success': guardian_invitation_result['success'],
                'action': guardian_invitation_result.get('action'),
                'message': guardian_invitation_result.get('message'),
                'error': guardian_invitation_result.get('error')
            }
        
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active:
            return jsonify({'error': 'User not found or inactive'}), 404
        
        access_token = create_enhanced_access_token(user.id)
        
        # Get user data with assigned courses for tutors
        user_data = get_user_with_courses(user)
        
        return jsonify({
            'token': access_token,
            'user': user_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user data with assigned courses for tutors
        user_data = get_user_with_courses(user)
        
        return jsonify({'user': user_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new passwords are required'}), 400
        
        if not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        user.set_password(new_password)
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    try:
        current_user_id = get_jwt_identity()
        
        # Optional: Add any server-side logout logic here
        # (e.g., token blacklisting, session cleanup, etc.)
        
        return jsonify({
            'message': 'Successfully logged out',
            'user_id': current_user_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_reset_token():
    """Generate a secure random token for password reset"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))

@api_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset - send reset email"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Find user by email
        user = User.query.filter_by(email=email.lower()).first()
        
        # Always return success to prevent email enumeration attacks
        # But only send email if user exists
        if user and user.is_active:
            # Generate reset token
            reset_token = generate_reset_token()
            reset_expires = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
            
            # Store reset token and expiration in user record
            user.reset_token = reset_token
            user.reset_token_expires = reset_expires
            db.session.commit()
            
            # Send email with reset link
            try:
                from app.services.email_service import send_password_reset_email
                reset_url = f"{request.host_url}reset-password?token={reset_token}"
                send_password_reset_email(user.email, user.profile.get('name', user.email), reset_url)
                logger.info(f"Password reset email sent to {email}")
            except Exception as email_error:
                logger.error(f"Failed to send password reset email to {email}: {str(email_error)}")
                # Don't reveal email sending failures to prevent information disclosure
        
        return jsonify({
            'message': 'If an account with that email exists, you will receive password reset instructions.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Password reset request failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/auth/verify-reset-token', methods=['POST'])
def verify_reset_token():
    """Verify if password reset token is valid"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        user = User.query.filter_by(reset_token=token).first()
        
        if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        return jsonify({
            'message': 'Token is valid',
            'email': user.email
        }), 200
        
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        user = User.query.filter_by(reset_token=token).first()
        
        if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        # Update password and clear reset token
        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        
        logger.info(f"Password reset successful for user {user.email}")
        
        return jsonify({
            'message': 'Password reset successful'
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Password reset failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api_bp.route('/auth/permissions', methods=['GET'])
@jwt_required()
def get_permissions():
    """Get current user's permissions and roles"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        permissions = get_user_permissions(user.id)
        return jsonify(permissions), 200

    except Exception as e:
        logger.error(f'Get permissions error: {str(e)}')
        return jsonify({'error': str(e)}), 500


@api_bp.route('/auth/switch-role', methods=['POST'])
@jwt_required()
def switch_role():
    """Switch active role for multi-role users"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        target_role = data.get('role')

        if not target_role:
            return jsonify({'error': 'Role is required'}), 400

        # Check if user has the requested role
        if not user.has_role(target_role):
            return jsonify({
                'error': 'User does not have this role',
                'requested_role': target_role,
                'available_roles': user.roles
            }), 403

        # Create new token with role preference
        # Note: This could be enhanced to store role preference in session/cache
        access_token = create_enhanced_access_token(user.id)
        user_data = get_user_with_courses(user)

        return jsonify({
            'access_token': access_token,
            'user': user_data,
            'active_role': target_role
        }), 200

    except Exception as e:
        logger.error(f'Switch role error: {str(e)}')
        return jsonify({'error': str(e)}), 500