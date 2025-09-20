"""
Admin Creation API
Handles admin user creation and management with passkey protection
"""

from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid
import os
from app import db
from app.models import User

admin_creation_bp = Blueprint('admin_creation', __name__)

@admin_creation_bp.route('/verify', methods=['POST'])
def verify_passkey():
    """Verify the admin creation passkey"""
    try:
        data = request.get_json()
        provided_passkey = data.get('passkey', '').strip()
        
        if not provided_passkey:
            return jsonify({
                'success': False,
                'message': 'Passkey is required'
            }), 400
        
        # Get the admin secret from environment
        admin_secret = os.environ.get('ADMIN_SECRET')
        if not admin_secret:
            return jsonify({
                'success': False,
                'message': 'Admin secret not configured on server'
            }), 500
        
        # Verify passkey
        if provided_passkey != admin_secret:
            return jsonify({
                'success': False,
                'message': 'Invalid passkey'
            }), 401
        
        # Store verification in session
        session['admin_verified'] = True
        session.permanent = True
        
        return jsonify({
            'success': True,
            'message': 'Passkey verified successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error verifying passkey: {str(e)}'
        }), 500

@admin_creation_bp.route('/create', methods=['POST'])
def create_admin():
    """Create a new admin user"""
    try:
        # Check if session is verified
        if not session.get('admin_verified'):
            return jsonify({
                'success': False,
                'message': 'Access denied. Please verify passkey first.'
            }), 403
        
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        name = data.get('name', '').strip()
        role = data.get('role', 'Administrator').strip()
        
        # Validate required fields
        if not email or not password or not name:
            return jsonify({
                'success': False,
                'message': 'Email, password, and name are required'
            }), 400
        
        # Check if admin already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({
                'success': False,
                'message': f'User with email {email} already exists'
            }), 409
        
        # Create admin user
        admin_user = User(
            id=f"admin_{uuid.uuid4().hex[:8]}",
            email=email,
            account_type='admin',
            profile={
                'name': name,
                'role': role,
                'permissions': ['all'],
                'created_by': 'admin_creation_api'
            },
            is_active=True,
            status='active'
        )
        
        admin_user.set_password(password)
        
        db.session.add(admin_user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Admin user created successfully',
            'admin': {
                'id': admin_user.id,
                'email': admin_user.email,
                'name': name,
                'role': role,
                'created_at': admin_user.created_at.isoformat()
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error creating admin user: {str(e)}'
        }), 500

@admin_creation_bp.route('/delete', methods=['DELETE'])
def delete_admin():
    """Delete an admin user by email"""
    try:
        # Check if session is verified
        if not session.get('admin_verified'):
            return jsonify({
                'success': False,
                'message': 'Access denied. Please verify passkey first.'
            }), 403
        
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        # Find the admin user
        admin_user = User.query.filter_by(email=email, account_type='admin').first()
        if not admin_user:
            return jsonify({
                'success': False,
                'message': f'Admin user with email {email} not found'
            }), 404
        
        # Store user info before deletion
        user_info = {
            'id': admin_user.id,
            'email': admin_user.email,
            'name': admin_user.profile.get('name', 'N/A')
        }
        
        # Delete the admin user
        db.session.delete(admin_user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Admin user deleted successfully',
            'deleted_admin': user_info
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error deleting admin user: {str(e)}'
        }), 500

@admin_creation_bp.route('/list', methods=['GET'])
def list_admins():
    """List all admin users"""
    try:
        # Check if session is verified
        if not session.get('admin_verified'):
            return jsonify({
                'success': False,
                'message': 'Access denied. Please verify passkey first.'
            }), 403
        
        # Get all admin users
        admin_users = User.query.filter_by(account_type='admin').all()
        
        admin_list = []
        for admin in admin_users:
            admin_list.append({
                'id': admin.id,
                'email': admin.email,
                'name': admin.profile.get('name', 'N/A'),
                'role': admin.profile.get('role', 'Administrator'),
                'is_active': admin.is_active,
                'status': admin.status,
                'created_at': admin.created_at.isoformat() if admin.created_at else None,
                'last_login': admin.last_login.isoformat() if admin.last_login else None
            })
        
        return jsonify({
            'success': True,
            'admins': admin_list,
            'total_count': len(admin_list)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving admin users: {str(e)}'
        }), 500

@admin_creation_bp.route('/session-status', methods=['GET'])
def get_session_status():
    """Check if the current session is verified"""
    return jsonify({
        'verified': session.get('admin_verified', False)
    })

@admin_creation_bp.route('/logout', methods=['POST'])
def logout():
    """Clear admin verification session"""
    session.pop('admin_verified', None)
    return jsonify({
        'success': True,
        'message': 'Admin session cleared'
    })