"""
Guardian authentication and invitation endpoints
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from app.api import api_bp
from app.models import User, GuardianInvitation
from app.services.guardian_service import GuardianService
from app import db
import logging

logger = logging.getLogger(__name__)

@api_bp.route('/guardian/invitation/<invitation_token>', methods=['GET'])
def get_guardian_invitation(invitation_token):
    """
    Get guardian invitation details for signup form
    
    Args:
        invitation_token (str): The invitation token from the email link
        
    Returns:
        JSON response with invitation details
    """
    try:
        result = GuardianService.get_invitation_details(invitation_token)
        
        if result['success']:
            return jsonify({
                'invitation': result['invitation']
            }), 200
        else:
            return jsonify({'error': result['error']}), 400
            
    except Exception as e:
        logger.error(f"Error getting guardian invitation: {str(e)}")
        return jsonify({'error': 'Failed to get invitation details'}), 500

@api_bp.route('/guardian/signup', methods=['POST'])
def guardian_signup():
    """
    Accept guardian invitation and create guardian account
    
    Request Body:
        {
            "invitationToken": "string",
            "name": "string",
            "password": "string",
            "phone": "string",
            "address": {
                "street": "string",
                "city": "string",
                "state": "string",
                "zipCode": "string",
                "country": "string"
            }
        }
        
    Returns:
        JSON response with guardian account creation result
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['invitationToken', 'name', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate password strength
        password = data.get('password')
        if len(password) < 8:
            return jsonify({
                'error': 'Password must be at least 8 characters long'
            }), 400
        
        # Prepare guardian profile data
        guardian_data = {
            'name': data.get('name'),
            'phone': data.get('phone', ''),
            'address': data.get('address', {}),
            'students': [],  # Will be populated by the service
            'account_created_at': None,  # Will be set by the service
            'password': password
        }
        
        # Accept invitation and create guardian account
        result = GuardianService.accept_guardian_invitation(
            data.get('invitationToken'),
            guardian_data
        )
        
        if result['success']:
            # Create access token for automatic login
            guardian = User.query.get(result['guardian_id'])
            # Set last login since this is automatic login after signup
            guardian.update_last_login()
            db.session.commit()
            access_token = create_access_token(identity=guardian.id)
            
            return jsonify({
                'message': result['message'],
                'user': guardian.to_dict(),
                'token': access_token
            }), 201
        else:
            return jsonify({'error': result['error']}), 400
            
    except Exception as e:
        logger.error(f"Error in guardian signup: {str(e)}")
        return jsonify({'error': 'Failed to create guardian account'}), 500

@api_bp.route('/guardian/invite', methods=['POST'])
@jwt_required()
def invite_guardian():
    """
    Create guardian invitation (typically called during student registration)
    
    Request Body:
        {
            "studentId": "string",
            "guardianEmail": "string"
        }
        
    Returns:
        JSON response with invitation result
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Only students and admins can create guardian invitations
        if current_user.account_type not in ['student', 'admin']:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        data = request.get_json()
        student_id = data.get('studentId')
        guardian_email = data.get('guardianEmail')
        
        if not student_id or not guardian_email:
            return jsonify({
                'error': 'Student ID and guardian email are required'
            }), 400
        
        # Students can only invite guardians for themselves
        if current_user.account_type == 'student' and student_id != current_user_id:
            return jsonify({'error': 'Students can only invite guardians for themselves'}), 403
        
        # Validate email format (basic validation)
        if '@' not in guardian_email or '.' not in guardian_email:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Create guardian invitation
        result = GuardianService.create_guardian_invitation(student_id, guardian_email)
        
        if result['success']:
            return jsonify({
                'message': result['message'],
                'action': result.get('action'),
                'invitationId': result.get('invitation_id'),
                'guardianId': result.get('guardian_id')
            }), 200
        else:
            return jsonify({'error': result['error']}), 400
            
    except Exception as e:
        logger.error(f"Error creating guardian invitation: {str(e)}")
        return jsonify({'error': 'Failed to create guardian invitation'}), 500

@api_bp.route('/guardian/invitations', methods=['GET'])
@jwt_required()
def get_guardian_invitations():
    """
    Get guardian invitations (for admin or student to see pending invitations)
    
    Query Parameters:
        - studentId (optional): Filter by student ID
        - status (optional): Filter by status (pending, accepted, expired)
        
    Returns:
        JSON response with list of invitations
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Build query
        query = GuardianInvitation.query
        
        # Filter by student ID if provided or if user is student
        student_id = request.args.get('studentId')
        if current_user.account_type == 'student':
            # Students can only see their own invitations
            query = query.filter_by(student_id=current_user_id)
        elif student_id and current_user.account_type == 'admin':
            query = query.filter_by(student_id=student_id)
        elif current_user.account_type not in ['admin']:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        # Filter by status if provided
        status = request.args.get('status')
        if status:
            query = query.filter_by(status=status)
        
        # Get invitations
        invitations = query.order_by(GuardianInvitation.invited_at.desc()).all()
        
        # Prepare response data
        invitation_data = []
        for invitation in invitations:
            student = User.query.get(invitation.student_id)
            guardian = User.query.get(invitation.guardian_id) if invitation.guardian_id else None
            
            inv_dict = invitation.to_dict()
            inv_dict['studentName'] = student.profile.get('name', student.email) if student and student.profile else 'Unknown'
            inv_dict['guardianName'] = guardian.profile.get('name', guardian.email) if guardian and guardian.profile else None
            inv_dict['isExpired'] = invitation.is_expired()
            
            invitation_data.append(inv_dict)
        
        return jsonify({
            'invitations': invitation_data,
            'total': len(invitation_data)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting guardian invitations: {str(e)}")
        return jsonify({'error': 'Failed to get guardian invitations'}), 500

@api_bp.route('/guardian/invitations/<invitation_id>/resend', methods=['POST'])
@jwt_required()
def resend_guardian_invitation(invitation_id):
    """
    Resend a guardian invitation email
    
    Args:
        invitation_id (str): The invitation ID
        
    Returns:
        JSON response with resend result
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Get invitation
        invitation = GuardianInvitation.query.get(invitation_id)
        if not invitation:
            return jsonify({'error': 'Invitation not found'}), 404
        
        # Check permissions
        if (current_user.account_type == 'student' and invitation.student_id != current_user_id) or \
           (current_user.account_type not in ['student', 'admin']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        # Check invitation status
        if invitation.status != 'pending':
            return jsonify({'error': 'Can only resend pending invitations'}), 400
        
        if invitation.is_expired():
            return jsonify({'error': 'Cannot resend expired invitation'}), 400
        
        # Resend invitation
        student = User.query.get(invitation.student_id)
        email_sent = GuardianService._send_invitation_email(invitation, student)
        
        if email_sent:
            return jsonify({'message': 'Guardian invitation resent successfully'}), 200
        else:
            return jsonify({'error': 'Failed to resend invitation email'}), 500
            
    except Exception as e:
        logger.error(f"Error resending guardian invitation: {str(e)}")
        return jsonify({'error': 'Failed to resend guardian invitation'}), 500

@api_bp.route('/guardian/students', methods=['GET'])
@jwt_required()
def get_guardian_students():
    """
    Get students linked to the guardian
    
    Returns:
        JSON response with list of students
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.account_type != 'guardian':
            return jsonify({'error': 'Guardian access required'}), 403
        
        # Get students from guardian profile
        students_info = current_user.profile.get('students', []) if current_user.profile else []
        
        # Get full student details with credit allocations
        students = []
        logger.info(f"Guardian {current_user_id} has {len(students_info)} linked students")
        
        for student_info in students_info:
            student_id = student_info.get('id')
            logger.info(f"Processing student info: {student_info}")
            
            student = User.query.get(student_id)
            if student:
                student_data = student.to_dict()
                student_data['linkedAt'] = student_info.get('linked_at')
                
                # Get credit allocation for this student
                from app.models import StudentCreditAllocation
                logger.info(f"Querying credit allocation for guardian_id={current_user_id}, student_id={student.id}")
                
                allocation = StudentCreditAllocation.query.filter_by(
                    guardian_id=current_user_id,
                    student_id=student.id
                ).first()
                
                if allocation:
                    logger.info(f"Found allocation: {allocation.allocated_credits} allocated, {allocation.used_credits} used")
                    student_data['creditAllocation'] = {
                        'allocated_credits': allocation.allocated_credits,
                        'used_credits': allocation.used_credits,
                        'remaining_credits': allocation.remaining_credits,
                        'last_updated': allocation.last_updated.isoformat() if allocation.last_updated else None
                    }
                else:
                    logger.warning(f"No credit allocation found for guardian={current_user_id}, student={student.id}")
                    # Let's also check what allocations exist for this student
                    all_allocations = StudentCreditAllocation.query.filter_by(student_id=student.id).all()
                    logger.info(f"All allocations for student {student.id}: {[(a.guardian_id, a.allocated_credits) for a in all_allocations]}")
                    
                    student_data['creditAllocation'] = {
                        'allocated_credits': 0,
                        'used_credits': 0,
                        'remaining_credits': 0,
                        'last_updated': None
                    }
                
                students.append(student_data)
            else:
                logger.warning(f"Student with ID {student_id} not found in database")
        
        return jsonify({
            'students': students,
            'total': len(students)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting guardian students: {str(e)}")
        return jsonify({'error': 'Failed to get guardian students'}), 500

@api_bp.route('/guardian/students/<student_id>/unlink', methods=['POST'])
@jwt_required()
def unlink_guardian_student(student_id):
    """
    Unlink a student from guardian (admin only or with proper authorization)
    
    Args:
        student_id (str): The student ID to unlink
        
    Returns:
        JSON response with unlink result
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Only admins can unlink students for now
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get student and current guardian
        student = User.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        guardian_id = student.profile.get('guardian_id') if student.profile else None
        if not guardian_id:
            return jsonify({'error': 'Student is not linked to any guardian'}), 400
        
        guardian = User.query.get(guardian_id)
        if not guardian:
            return jsonify({'error': 'Guardian not found'}), 404
        
        # Remove student from guardian profile
        if guardian.profile and 'students' in guardian.profile:
            guardian.profile['students'] = [
                s for s in guardian.profile['students'] 
                if s.get('id') != student_id
            ]
        
        # Remove guardian from student profile
        if student.profile:
            student.profile.pop('guardian_id', None)
            student.profile.pop('guardian_email', None)
            student.profile.pop('guardian_name', None)
        
        # Update enrollments to remove guardian link
        enrollments = db.session.query(Enrollment).filter_by(
            student_id=student_id,
            guardian_id=guardian_id
        ).all()
        
        for enrollment in enrollments:
            enrollment.guardian_id = None
        
        db.session.commit()
        
        return jsonify({'message': 'Student unlinked from guardian successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error unlinking guardian student: {str(e)}")
        return jsonify({'error': 'Failed to unlink student from guardian'}), 500