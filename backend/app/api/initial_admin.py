"""
Initial Admin Creation Endpoint for Deployment

This module provides a secure endpoint to create the initial admin user during deployment.
The endpoint is protected by a secret key that must be provided in the request headers.
"""

from flask import request, jsonify
from werkzeug.security import generate_password_hash
from app import db
from app.models import User
from app.api import api_bp
import os
import logging

logger = logging.getLogger(__name__)

@api_bp.route('/create-initial-admin', methods=['POST'])
def create_initial_admin():
    """
    Create an initial admin user during deployment.
    
    This endpoint is protected by an admin secret that must be provided in the headers.
    It's designed to be called by the deployment script to create the first admin user.
    
    Headers:
        X-Admin-Secret: The secret key for admin creation (must match ADMIN_SECRET env var)
    
    Request Body:
        {
            "email": "admin@example.com",
            "password": "SecurePassword123!",
            "name": "Admin Name",
            "account_type": "admin"
        }
    
    Returns:
        201: Admin user created successfully
        409: Admin user already exists
        401: Invalid or missing admin secret
        400: Invalid request data
        500: Server error
    """
    try:
        # Check admin secret
        admin_secret = request.headers.get('X-Admin-Secret')
        expected_secret = os.environ.get('ADMIN_SECRET', 'admin123')
        
        if not admin_secret or admin_secret != expected_secret:
            logger.warning("Invalid admin secret provided for initial admin creation")
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['email', 'password', 'name']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        name = data['name']
        account_type = data.get('account_type', 'admin')
        
        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength (at least 8 characters)
        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long'}), 400
        
        # Check if admin already exists
        existing_admin = User.query.filter_by(email=email).first()
        if existing_admin:
            logger.info(f"Admin user already exists: {email}")
            return jsonify({'message': 'Admin user already exists'}), 409
        
        # Check if any admin exists (optional: only allow first admin via this endpoint)
        any_admin = User.query.filter_by(account_type='admin').first()
        if any_admin:
            logger.warning("Attempt to create admin when one already exists")
            return jsonify({'error': 'An admin user already exists. Use the admin panel to create additional admins.'}), 403
        
        # Create the admin user
        admin_user = User(
            email=email,
            password_hash=generate_password_hash(password),
            account_type=account_type,
            is_active=True,
            status='active'
        )
        
        # Set the name in the profile JSON field
        admin_user.profile = {'name': name}
        
        db.session.add(admin_user)
        db.session.commit()
        
        logger.info(f"Initial admin user created successfully: {email}")
        
        return jsonify({
            'message': 'Admin user created successfully',
            'user': {
                'id': admin_user.id,
                'email': admin_user.email,
                'name': admin_user.profile.get('name', 'Admin'),
                'account_type': admin_user.account_type
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating initial admin: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create admin user'}), 500

@api_bp.route('/check-admin-exists', methods=['GET'])
def check_admin_exists():
    """
    Check if any admin user exists in the system.
    
    This endpoint is public and can be used to determine if the initial setup is needed.
    
    Returns:
        200: JSON with exists: true/false
    """
    try:
        admin_exists = User.query.filter_by(account_type='admin').first() is not None
        return jsonify({'exists': admin_exists}), 200
    except Exception as e:
        logger.error(f"Error checking admin existence: {str(e)}")
        return jsonify({'error': 'Failed to check admin existence'}), 500