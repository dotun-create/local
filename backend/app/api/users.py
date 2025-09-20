from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User
from app import db
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import func, text
from datetime import datetime
import logging

@api_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        account_type = request.args.get('accountType')
        
        query = User.query
        if account_type:
            query = query.filter_by(account_type=account_type)
        
        users = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'users': [user.to_dict(include_sensitive=True) for user in users.items],
            'totalUsers': users.total,
            'totalPages': users.pages,
            'currentPage': page,
            'hasNext': users.has_next,
            'hasPrev': users.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/<string:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get specific user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Users can only view their own profile unless they're admin
        if current_user_id != user_id and current_user.account_type != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        include_sensitive = current_user.account_type == 'admin'
        return jsonify({'user': user.to_dict(include_sensitive=include_sensitive)}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/<string:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update user profile"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Users can only update their own profile unless they're admin
        if current_user_id != user_id and current_user.account_type != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'email' in data:
            user.email = data['email']
        
        # Update profile data
        if not user.profile:
            user.profile = {}
            
        profile_updated = False
        if 'name' in data:
            user.profile['name'] = data['name']
            profile_updated = True
        if 'phone' in data:
            user.profile['phone'] = data['phone']
            profile_updated = True
        if 'profile' in data:
            user.profile = {**user.profile, **data['profile']}
            profile_updated = True
            
        # Mark profile as modified for SQLAlchemy to detect the change
        if profile_updated:
            flag_modified(user, 'profile')
        
        # Admin can update additional fields
        if current_user.account_type == 'admin':
            if 'accountType' in data:
                user.account_type = data['accountType']
            if 'status' in data:
                # Update the actual status field
                user.status = data['status']
                # Also update is_active based on status
                user.is_active = data['status'] in ['active', 'potential_student', 'potential_tutor']
            if 'isActive' in data:
                user.is_active = data['isActive']
            if 'roles' in data:
                # Update the roles array field
                if isinstance(data['roles'], list):
                    user.roles = data['roles']
                    flag_modified(user, 'roles')  # Mark as modified for SQLAlchemy
        
        db.session.commit()
        db.session.flush()  # Ensure changes are fully committed
        
        # Refresh the user object to get the latest data from database
        db.session.refresh(user)
        
        return jsonify({
            'user': user.to_dict(include_sensitive=current_user.account_type == 'admin'),
            'message': 'User updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/<string:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """Delete user (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Don't allow admin to delete themselves
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/<string:user_id>/profile', methods=['GET'])
@jwt_required()
def get_user_profile(user_id):
    """Get user profile"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Users can only view their own profile unless they're admin
        if current_user_id != user_id and current_user.account_type != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/<string:user_id>/profile', methods=['PUT'])
@jwt_required()
def update_user_profile(user_id):
    """Update user profile with support for image uploads"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Users can only update their own profile unless they're admin
        if current_user_id != user_id and current_user.account_type != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if this is a form data request (with file upload)
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle file upload
            profile_data_json = request.form.get('profileData')
            if profile_data_json:
                import json
                data = json.loads(profile_data_json)
            else:
                data = {}
            
            # Handle image upload
            if 'image' in request.files:
                image_file = request.files['image']
                if image_file and image_file.filename:
                    import os
                    from werkzeug.utils import secure_filename
                    
                    # Create uploads directory if it doesn't exist
                    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads')
                    if not os.path.exists(upload_dir):
                        os.makedirs(upload_dir)
                    
                    # Generate unique filename
                    filename = secure_filename(f"{user_id}_{image_file.filename}")
                    file_path = os.path.join(upload_dir, filename)
                    image_file.save(file_path)
                    
                    # Store relative path in profile
                    if not user.profile:
                        user.profile = {}
                    user.profile['avatar'] = f"/uploads/{filename}"
        else:
            # Handle JSON request
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
        
        # Initialize profile if it doesn't exist
        if not user.profile:
            user.profile = {}
        
        # Update basic user fields
        if 'name' in data:
            user.profile['name'] = data['name']
        if 'email' in data:
            user.email = data['email']
        
        # Update profile fields
        if 'profile' in data:
            profile_info = data['profile']
            if 'phone' in profile_info:
                user.profile['phone'] = profile_info['phone']
            if 'bio' in profile_info:
                user.profile['bio'] = profile_info['bio']
            if 'address' in profile_info:
                user.profile['address'] = profile_info['address']
            if 'guardianName' in profile_info:
                user.profile['guardian_name'] = profile_info['guardianName']
            if 'guardianEmail' in profile_info:
                user.profile['guardian_email'] = profile_info['guardianEmail']
            
            # Handle guardian ID linking/unlinking
            if 'guardianId' in profile_info:
                guardian_id = profile_info['guardianId'].strip() if profile_info['guardianId'] else ''
                
                # Get current guardian ID to check for changes
                current_guardian_id = user.profile.get('guardian_id') if user.profile else None
                
                if guardian_id:
                    logging.info(f"Guardian linking attempt - Current guardian: {current_guardian_id}, New guardian: {guardian_id}")
                    
                # Re-link or establish new link (including same guardian to fix broken bidirectional links)
                if guardian_id:
                    # If changing guardians, unlink from old guardian first
                    if current_guardian_id and guardian_id != current_guardian_id:
                        old_guardian = User.query.get(current_guardian_id)
                        if old_guardian and old_guardian.profile and 'students' in old_guardian.profile:
                            old_guardian.profile['students'] = [
                                s for s in old_guardian.profile['students'] 
                                if s.get('id') != user.id
                            ]
                            flag_modified(old_guardian, 'profile')
                            db.session.merge(old_guardian)
                            logging.info(f"Student {user.id} unlinked from old guardian {current_guardian_id}")
                    
                    # Find the guardian by ID
                    guardian = User.query.filter_by(id=guardian_id, account_type='guardian').first()
                    if guardian:
                        # Link student to guardian
                        user.profile['guardian_id'] = guardian.id
                        
                        # Get guardian's name and email from their profile
                        guardian_name = guardian.profile.get('name') if guardian.profile else None
                        guardian_email = guardian.email
                        
                        # Update student's guardian info with actual guardian data
                        user.profile['guardian_name'] = guardian_name or f'Guardian {guardian.id}'
                        user.profile['guardian_email'] = guardian_email
                        
                        # Also add this student to the guardian's profile
                        if not guardian.profile:
                            guardian.profile = {}
                        if 'students' not in guardian.profile:
                            guardian.profile['students'] = []
                        
                        # Check if student is already linked to avoid duplicates
                        student_already_linked = any(s.get('id') == user.id for s in guardian.profile['students'])
                        if not student_already_linked:
                            guardian.profile['students'].append({
                                'id': user.id,
                                'name': user.profile.get('name') if user.profile else user.email,
                                'email': user.email,
                                'linked_at': datetime.utcnow().isoformat()
                            })
                            # Mark guardian profile as modified for SQLAlchemy
                            flag_modified(guardian, 'profile')
                            # Ensure guardian is tracked in current session
                            db.session.merge(guardian)
                        
                        logging.info(f"Student {user.id} linked to guardian {guardian.id} ({guardian_name}, {guardian_email})")
                    else:
                        # Guardian ID provided but not found
                        logging.warning(f"Guardian ID {guardian_id} not found for student {user.id}")
                        # You can choose to either:
                        # 1. Store the guardian ID anyway (for future reference)
                        # user.profile['guardian_id'] = guardian_id
                        # 2. Or return an error
                        return jsonify({'error': f'Guardian with ID {guardian_id} not found'}), 400
                
                elif not guardian_id and current_guardian_id:
                    # Student is unlinking from current guardian
                    old_guardian = User.query.get(current_guardian_id)
                    if old_guardian and old_guardian.profile and 'students' in old_guardian.profile:
                        # Remove student from old guardian's student list
                        old_guardian.profile['students'] = [
                            s for s in old_guardian.profile['students'] 
                            if s.get('id') != user.id
                        ]
                        flag_modified(old_guardian, 'profile')
                        db.session.merge(old_guardian)
                    
                    # Clear guardian info from student profile
                    user.profile['guardian_id'] = None
                    user.profile['guardian_name'] = ''
                    user.profile['guardian_email'] = ''
                    
                    logging.info(f"Student {user.id} unlinked from guardian {current_guardian_id}")
                
                elif guardian_id != current_guardian_id and current_guardian_id:
                    # Student is changing guardians - unlink from old guardian first
                    old_guardian = User.query.get(current_guardian_id)
                    if old_guardian and old_guardian.profile and 'students' in old_guardian.profile:
                        old_guardian.profile['students'] = [
                            s for s in old_guardian.profile['students'] 
                            if s.get('id') != user.id
                        ]
                        flag_modified(old_guardian, 'profile')
                        db.session.merge(old_guardian)
                        logging.info(f"Student {user.id} unlinked from old guardian {current_guardian_id}")
            # Handle tutor-specific fields
            if 'subjects' in profile_info:
                subjects = profile_info['subjects']
                # Validate subjects is a list
                if not isinstance(subjects, list):
                    return jsonify({'error': 'Subjects must be a list'}), 400
                # Filter out empty strings and ensure all items are strings
                valid_subjects = [str(subject).strip() for subject in subjects if subject and str(subject).strip()]
                user.profile['subjects'] = valid_subjects
                logging.info(f"Updated subjects for user {user.id}: {valid_subjects}")
            if 'tutor_grade_level' in profile_info:
                user.profile['tutor_grade_level'] = profile_info['tutor_grade_level']
            if 'grade_levels_taught' in profile_info:
                user.profile['grade_levels_taught'] = profile_info['grade_levels_taught']
        
        # Update academic fields
        if 'academicCountry' in data:
            user.profile['academic_country'] = data['academicCountry']
        if 'grade' in data:
            user.profile['grade_level'] = data['grade']
        
        # Mark profile as modified for SQLAlchemy
        flag_modified(user, 'profile')
        logging.info(f"Profile updated for user {user.id}: {user.profile}")
        
        # Update timestamp
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'user': user.to_dict(),
            'message': 'Profile updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    """Get user statistics (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        total_users = User.query.count()
        students = User.query.filter_by(account_type='student').count()
        guardians = User.query.filter_by(account_type='guardian').count()
        tutors = User.query.filter(text("users.roles::jsonb @> :tutor_role")).params(tutor_role='["tutor"]').count()
        admins = User.query.filter_by(account_type='admin').count()
        active_users = User.query.filter_by(is_active=True).count()
        
        return jsonify({
            'totalUsers': total_users,
            'students': students,
            'guardians': guardians,
            'tutors': tutors,
            'admins': admins,
            'activeUsers': active_users,
            'inactiveUsers': total_users - active_users
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/users/update-statuses', methods=['POST'])
@jwt_required()
def update_user_statuses():
    """Update all user statuses based on login activity (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get all users except admins (admins always remain active)
        users = User.query.filter(User.account_type != 'admin').all()
        
        updated_count = 0
        status_changes = []
        
        for user in users:
            old_status = user.status
            user.update_status_based_on_activity()
            
            if user.status != old_status:
                updated_count += 1
                status_changes.append({
                    'userId': user.id,
                    'email': user.email,
                    'accountType': user.account_type,
                    'oldStatus': old_status,
                    'newStatus': user.status,
                    'lastLogin': user.last_login.isoformat() if user.last_login else None
                })
        
        db.session.commit()
        
        return jsonify({
            'message': f'Updated {updated_count} user statuses',
            'totalProcessed': len(users),
            'updatedCount': updated_count,
            'changes': status_changes
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/users/status-summary', methods=['GET'])
@jwt_required()
def get_user_status_summary():
    """Get summary of user statuses by account type (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        from sqlalchemy import func
        
        # Get status counts by account type
        status_summary = db.session.query(
            User.account_type,
            User.status,
            func.count(User.id).label('count')
        ).group_by(User.account_type, User.status).all()
        
        # Format the results
        summary = {}
        for account_type, status, count in status_summary:
            if account_type not in summary:
                summary[account_type] = {}
            summary[account_type][status] = count
        
        return jsonify({
            'statusSummary': summary,
            'totalUsers': User.query.count(),
            'lastUpdated': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/tutors', methods=['GET'])
@jwt_required()
def get_tutors_for_admin():
    """Get all tutors with verification status (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        tutors = User.query.filter(text("users.roles::jsonb @> :tutor_role")).params(tutor_role='["tutor"]').paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'tutors': [tutor.to_dict(include_sensitive=True) for tutor in tutors.items],
            'totalTutors': tutors.total,
            'totalPages': tutors.pages,
            'currentPage': page,
            'hasNext': tutors.has_next,
            'hasPrev': tutors.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/tutors/all', methods=['GET'])
@jwt_required()
def get_all_tutors_for_filter():
    """Get all tutors without pagination (for filters/dropdowns) (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get all tutors without pagination
        tutors = User.query.filter(text("users.roles::jsonb @> :tutor_role")).params(tutor_role='["tutor"]').all()
        
        return jsonify({
            'tutors': [tutor.to_dict(include_sensitive=True) for tutor in tutors],
            'totalTutors': len(tutors)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/tutors/<string:tutor_id>/verify', methods=['PUT'])
@jwt_required()
def verify_tutor(tutor_id):
    """Verify a tutor (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        tutor = User.query.get(tutor_id)
        if not tutor:
            return jsonify({'error': 'Tutor not found'}), 404
        
        if not tutor.has_role('tutor'):
            return jsonify({'error': 'User does not have tutor role'}), 400
        
        data = request.get_json() or {}
        verification_notes = data.get('notes', '')
        
        # Initialize profile if it doesn't exist
        if not tutor.profile:
            tutor.profile = {}
        
        # Update verification status
        tutor.profile['is_verified'] = True
        tutor.profile['verified_by'] = current_user_id
        tutor.profile['verified_at'] = datetime.utcnow().isoformat()
        tutor.profile['verification_notes'] = verification_notes
        
        # Mark the profile as modified for SQLAlchemy
        flag_modified(tutor, 'profile')
        
        db.session.commit()
        
        return jsonify({
            'message': 'Tutor verified successfully',
            'tutor': tutor.to_dict(include_sensitive=True)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/tutors/<string:tutor_id>/unverify', methods=['PUT'])
@jwt_required()
def unverify_tutor(tutor_id):
    """Unverify a tutor (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        tutor = User.query.get(tutor_id)
        if not tutor:
            return jsonify({'error': 'Tutor not found'}), 404
        
        if not tutor.has_role('tutor'):
            return jsonify({'error': 'User does not have tutor role'}), 400
        
        data = request.get_json() or {}
        verification_notes = data.get('notes', '')
        
        # Initialize profile if it doesn't exist
        if not tutor.profile:
            tutor.profile = {}
        
        # Update verification status
        tutor.profile['is_verified'] = False
        tutor.profile['verified_by'] = current_user_id
        tutor.profile['verified_at'] = datetime.utcnow().isoformat()
        tutor.profile['verification_notes'] = verification_notes
        
        # Mark the profile as modified for SQLAlchemy
        flag_modified(tutor, 'profile')
        
        db.session.commit()
        
        return jsonify({
            'message': 'Tutor unverified successfully',
            'tutor': tutor.to_dict(include_sensitive=True)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/users/<string:user_id>/debug-profile', methods=['GET'])
@jwt_required()
def debug_user_profile(user_id):
    """Debug endpoint to check user profile data (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        debug_info = {
            'userId': user.id,
            'accountType': user.account_type,
            'profileRaw': user.profile,
            'profileSubjects': user.profile.get('subjects', []) if user.profile else [],
            'toDictSubjects': user.to_dict().get('subjects', []),
            'lastUpdated': user.updated_at.isoformat() if user.updated_at else None
        }
        
        logging.info(f"Debug info for user {user_id}: {debug_info}")
        return jsonify(debug_info), 200
        
    except Exception as e:
        logging.error(f"Error in debug endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/<string:tutor_id>/verification-status', methods=['GET'])
@jwt_required()
def get_tutor_verification_status(tutor_id):
    """Get tutor verification status and details"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
        
        tutor = User.query.get(tutor_id)
        if not tutor:
            return jsonify({'error': 'Tutor not found'}), 404
        
        if not tutor.has_role('tutor'):
            return jsonify({'error': 'User does not have tutor role'}), 400
        
        profile = tutor.profile or {}
        verification_data = {
            'isVerified': profile.get('is_verified', False),
            'verifiedBy': profile.get('verified_by'),
            'verifiedAt': profile.get('verified_at'),
            'verificationNotes': profile.get('verification_notes', '')
        }
        
        # If admin is requesting, include admin details
        if current_user.account_type == 'admin' and verification_data['verifiedBy']:
            admin = User.query.get(verification_data['verifiedBy'])
            if admin:
                verification_data['verifiedByAdmin'] = {
                    'name': admin.profile.get('name') if admin.profile else admin.email,
                    'email': admin.email
                }
        
        return jsonify(verification_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/users/guardians', methods=['GET'])
@jwt_required()
def get_guardians():
    """Get all guardians (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        guardians = User.query.filter_by(account_type='guardian').paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'users': [guardian.to_dict(include_sensitive=False) for guardian in guardians.items],
            'totalUsers': guardians.total,
            'totalPages': guardians.pages,
            'currentPage': page,
            'hasNext': guardians.has_next,
            'hasPrev': guardians.has_prev
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/tutors/qualify', methods=['POST'])
@jwt_required()
def qualify_tutor_for_course():
    """Manually qualify a tutor for a specific course (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json()
        user_email = data.get('user_email')
        course_id = data.get('course_id')
        qualification_type = data.get('qualification_type', 'manual')
        score = data.get('score')
        reason = data.get('reason', 'Manual qualification by admin')

        if not user_email or not course_id:
            return jsonify({'error': 'user_email and course_id are required'}), 400

        # Find the user by email
        user = User.query.filter_by(email=user_email).first()
        if not user:
            return jsonify({'error': f'User with email {user_email} not found'}), 404

        # Verify the course exists
        from app.models import Course, TutorQualification
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': f'Course with ID {course_id} not found'}), 404

        # Check if qualification already exists
        existing_qual = TutorQualification.query.filter_by(
            user_id=user.id,
            course_id=course_id,
            is_active=True
        ).first()

        if existing_qual:
            return jsonify({'error': f'User {user_email} is already qualified for course {course.title}'}), 400

        # Create new qualification
        qualification = TutorQualification(
            user_id=user.id,
            course_id=course_id,
            qualification_type=qualification_type,
            qualifying_score=score,
            is_active=True,
            approved_by=current_user_id,
            qualified_at=datetime.utcnow()
        )

        db.session.add(qualification)
        db.session.commit()

        return jsonify({
            'message': f'Successfully qualified {user_email} for course {course.title}',
            'qualification': {
                'id': qualification.id,
                'user_email': user_email,
                'course_title': course.title,
                'qualification_type': qualification_type,
                'score': score,
                'reason': reason,
                'qualified_at': qualification.qualified_at.isoformat()
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Error qualifying tutor: {str(e)}")
        return jsonify({'error': str(e)}), 500