from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Course, Enrollment
from app import db
from datetime import datetime

@api_bp.route('/enrollments', methods=['GET'])
@jwt_required()
def get_enrollments():
    """Get enrollments based on user role"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = Enrollment.query
        
        # Filter by user role
        if current_user.account_type == 'student':
            query = query.filter_by(student_id=current_user_id)
        elif current_user.account_type == 'guardian':
            query = query.filter_by(guardian_id=current_user_id)
        elif current_user.account_type != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        if status:
            query = query.filter_by(status=status)
        
        enrollments = query.order_by(Enrollment.enrolled_date.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        enrollment_data = []
        for enrollment in enrollments.items:
            data = enrollment.to_dict()
            # Add course and student info
            if enrollment.course:
                data['course'] = {
                    'id': enrollment.course.id,
                    'title': enrollment.course.title,
                    'subject': enrollment.course.subject
                }
            if enrollment.student:
                data['student'] = {
                    'id': enrollment.student.id,
                    'name': enrollment.student.profile.get('name', enrollment.student.email)
                }
            enrollment_data.append(data)
        
        return jsonify({
            'enrollments': enrollment_data,
            'totalEnrollments': enrollments.total,
            'totalPages': enrollments.pages,
            'currentPage': page,
            'hasNext': enrollments.has_next,
            'hasPrev': enrollments.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/enrollments/<string:enrollment_id>', methods=['GET'])
@jwt_required()
def get_enrollment(enrollment_id):
    """Get specific enrollment"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        enrollment = Enrollment.query.get(enrollment_id)
        if not enrollment:
            return jsonify({'error': 'Enrollment not found'}), 404
        
        # Check access permissions
        has_access = (
            current_user.account_type == 'admin' or
            enrollment.student_id == current_user_id or
            enrollment.guardian_id == current_user_id
        )
        
        if not has_access:
            return jsonify({'error': 'Access denied'}), 403
        
        enrollment_data = enrollment.to_dict()
        # Add course and student info
        if enrollment.course:
            enrollment_data['course'] = enrollment.course.to_dict()
        if enrollment.student:
            enrollment_data['student'] = enrollment.student.to_dict()
        if enrollment.guardian:
            enrollment_data['guardian'] = enrollment.guardian.to_dict()
        
        return jsonify({'enrollment': enrollment_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/enrollments/<string:enrollment_id>/approve', methods=['POST'])
@jwt_required()
def approve_enrollment(enrollment_id):
    """Approve enrollment (guardian or admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        enrollment = Enrollment.query.get(enrollment_id)
        if not enrollment:
            return jsonify({'error': 'Enrollment not found'}), 404
        
        # Check permissions (admin or guardian who owns the enrollment)
        if (current_user.account_type != 'admin' and 
            enrollment.guardian_id != current_user_id):
            return jsonify({'error': 'Access denied'}), 403
        
        if enrollment.status != 'pending':
            return jsonify({'error': 'Enrollment is not pending approval'}), 400
        
        # Capture timezone information for approval
        user_timezone = request.headers.get('X-Timezone', 'UTC')

        enrollment.status = 'active'
        enrollment.approved_date = datetime.utcnow()
        enrollment.approved_timezone = user_timezone
        
        db.session.commit()
        
        return jsonify({
            'enrollment': enrollment.to_dict(),
            'message': 'Enrollment approved successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/enrollments/<string:enrollment_id>/reject', methods=['POST'])
@jwt_required()
def reject_enrollment(enrollment_id):
    """Reject enrollment (guardian or admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        enrollment = Enrollment.query.get(enrollment_id)
        if not enrollment:
            return jsonify({'error': 'Enrollment not found'}), 404
        
        # Check permissions (admin or guardian who owns the enrollment)
        if (current_user.account_type != 'admin' and 
            enrollment.guardian_id != current_user_id):
            return jsonify({'error': 'Access denied'}), 403
        
        if enrollment.status != 'pending':
            return jsonify({'error': 'Enrollment is not pending approval'}), 400
        
        enrollment.status = 'rejected'
        
        db.session.commit()
        
        return jsonify({
            'enrollment': enrollment.to_dict(),
            'message': 'Enrollment rejected'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/enrollments/<string:enrollment_id>/progress', methods=['PUT'])
@jwt_required()
def update_enrollment_progress(enrollment_id):
    """Update enrollment progress"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        enrollment = Enrollment.query.get(enrollment_id)
        if not enrollment:
            return jsonify({'error': 'Enrollment not found'}), 404
        
        # Check permissions (admin, student, or tutor of the course)
        has_access = (
            current_user.account_type == 'admin' or
            enrollment.student_id == current_user_id or
            (current_user.account_type == 'tutor' and 
             enrollment.course and current_user in enrollment.course.tutors)
        )
        
        if not has_access:
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        if 'progress' in data:
            enrollment.progress = max(0, min(100, data['progress']))
        
        if 'currentModule' in data:
            enrollment.current_module = data['currentModule']
        
        if 'completedModules' in data:
            enrollment.completed_modules = data['completedModules']
        
        db.session.commit()
        
        return jsonify({
            'enrollment': enrollment.to_dict(),
            'message': 'Progress updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/enrollments/<string:enrollment_id>', methods=['DELETE'])
@jwt_required()
def delete_enrollment(enrollment_id):
    """Delete enrollment (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        enrollment = Enrollment.query.get(enrollment_id)
        if not enrollment:
            return jsonify({'error': 'Enrollment not found'}), 404
        
        db.session.delete(enrollment)
        db.session.commit()
        
        return jsonify({'message': 'Enrollment deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500