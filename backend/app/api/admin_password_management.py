from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.services.admin_security_service import AdminSecurityService
from app.services.admin_password_reset_service import AdminPasswordResetService
from app.models import User, PasswordViewAudit, AdminAction
from app import db
from datetime import datetime

@api_bp.route('/admin/secure-session/initiate', methods=['POST'])
@jwt_required()
def initiate_secure_session():
    """Initiate secure session for password viewing"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        admin_password = data.get('admin_password')
        operations = data.get('operations', ['view_passwords'])
        
        if not admin_password:
            return jsonify({'error': 'Admin password required'}), 400
        
        result = AdminSecurityService.initiate_secure_session(
            current_user_id, admin_password, operations
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/admin/users/<string:user_id>/password/view', methods=['POST'])
@jwt_required()
def view_user_password(user_id):
    """
    HIGHLY SENSITIVE ENDPOINT: View user's plaintext password
    Requires secure session and extensive auditing
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        session_token = data.get('session_token') or request.headers.get('X-Secure-Session-Token')
        justification = data.get('justification', '')
        
        # Verify secure session
        if not AdminSecurityService.verify_secure_session(current_user_id, session_token):
            return jsonify({'error': 'Invalid or expired secure session'}), 403
        
        # Check rate limits
        if not AdminSecurityService.check_rate_limit(current_user_id):
            return jsonify({'error': 'Rate limit exceeded'}), 429
        
        # Get target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Require justification
        if len(justification.strip()) < 10:
            return jsonify({'error': 'Justification required (minimum 10 characters)'}), 400
        
        # Get plaintext password (this logs the access)
        try:
            plaintext_password = target_user.get_plaintext_password(
                current_user_id, justification
            )
            
            return jsonify({
                'success': True,
                'user_id': user_id,
                'user_email': target_user.email,
                'password': plaintext_password,
                'warning': 'This information is highly sensitive and audited'
            }), 200
            
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
            
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/admin/users/<string:user_id>/reset-password', methods=['POST'])
@jwt_required()
def admin_reset_user_password(user_id):
    """Admin-initiated password reset for individual user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        method = data.get('method', 'email')  # 'email' or 'temp'
        notify_user = data.get('notify_user', True)
        password_length = data.get('password_length', 12)
        
        if method == 'email':
            result = AdminPasswordResetService.reset_password_via_email(
                current_user_id, user_id, notify_user
            )
        elif method == 'temp':
            result = AdminPasswordResetService.generate_temporary_password(
                current_user_id, user_id, password_length
            )
        else:
            return jsonify({'error': 'Invalid reset method'}), 400
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/admin/users/bulk-reset-passwords', methods=['POST'])
@jwt_required()
def admin_bulk_reset_passwords():
    """Bulk password reset for multiple users"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        user_ids = data.get('user_ids', [])
        method = data.get('method', 'email')
        
        if not user_ids:
            return jsonify({'error': 'No users specified'}), 400
        
        if len(user_ids) > 50:  # Rate limiting
            return jsonify({'error': 'Maximum 50 users per bulk operation'}), 400
        
        result = AdminPasswordResetService.bulk_reset_passwords(
            current_user_id, user_ids, method
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/admin/password-viewing/audit', methods=['GET'])
@jwt_required()
def get_password_viewing_audit():
    """Get password viewing audit log"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        audit_entries = PasswordViewAudit.query.order_by(
            PasswordViewAudit.viewed_at.desc()
        ).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = {
            'entries': [],
            'pagination': {
                'current_page': audit_entries.page,
                'total_pages': audit_entries.pages,
                'total_items': audit_entries.total,
                'per_page': audit_entries.per_page
            }
        }
        
        for entry in audit_entries.items:
            admin_name = 'Unknown Admin'
            target_user_email = 'Unknown User'
            
            if entry.admin:
                admin_name = entry.admin.profile.get('name', entry.admin.email) if entry.admin.profile else entry.admin.email
            
            if entry.target_user:
                target_user_email = entry.target_user.email
            
            result['entries'].append({
                'id': str(entry.id),
                'admin_name': admin_name,
                'target_user_email': target_user_email,
                'view_type': entry.view_type,
                'justification': entry.justification,
                'viewed_at': entry.viewed_at.isoformat(),
                'ip_address': entry.ip_address,
                'mfa_verified': entry.mfa_verified
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/admin/password-reset-history', methods=['GET'])
@jwt_required()
def get_password_reset_history():
    """Get password reset audit history"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        actions = AdminAction.query.filter(
            AdminAction.action_type.in_(['password_reset_email', 'password_reset_temp'])
        ).order_by(
            AdminAction.created_at.desc()
        ).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        result = {
            'actions': [],
            'pagination': {
                'current_page': actions.page,
                'total_pages': actions.pages,
                'total_items': actions.total,
                'per_page': actions.per_page
            }
        }
        
        for action in actions.items:
            admin_name = 'Unknown Admin'
            target_user_name = 'Unknown User'
            target_user_email = 'Unknown Email'
            
            if action.admin:
                admin_name = action.admin.profile.get('name', action.admin.email) if action.admin.profile else action.admin.email
            
            if action.target_user:
                target_user_name = action.target_user.profile.get('name', action.target_user.email) if action.target_user.profile else action.target_user.email
                target_user_email = action.target_user.email
            
            result['actions'].append({
                'id': str(action.id),
                'admin_name': admin_name,
                'target_user_name': target_user_name,
                'target_user_email': target_user_email,
                'action_type': action.action_type,
                'method': action.details.get('method', ''),
                'created_at': action.created_at.isoformat(),
                'ip_address': action.ip_address
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/admin/password-viewing/config', methods=['GET', 'PUT'])
@jwt_required()
def manage_password_viewing_config():
    """Get or update password viewing configuration"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        if request.method == 'GET':
            config = AdminSecurityService.get_password_viewing_config()
            return jsonify(config), 200
        
        elif request.method == 'PUT':
            # For demo purposes, allow any admin to update config
            # In production, this should be restricted to super admins
            data = request.get_json()
            
            # Update configuration
            from app.models import AdminSecurityConfig
            config_record = AdminSecurityConfig.query.filter_by(
                config_key='password_viewing_enabled'
            ).first()
            
            if config_record:
                config_record.config_value = data
                config_record.updated_by = current_user_id
                config_record.updated_at = datetime.utcnow()
            else:
                config_record = AdminSecurityConfig(
                    config_key='password_viewing_enabled',
                    config_value=data,
                    created_by=current_user_id,
                    updated_by=current_user_id
                )
                db.session.add(config_record)
            
            db.session.commit()
            
            return jsonify({'message': 'Configuration updated'}), 200
            
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/reset-password-with-token', methods=['POST'])
def reset_password_with_token():
    """User endpoint to reset password using admin-generated token"""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        result = AdminPasswordResetService.reset_password_with_token(token, new_password)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'error': 'Internal server error'}), 500