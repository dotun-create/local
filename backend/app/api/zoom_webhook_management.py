"""
Zoom Webhook Management API
Provides endpoints for managing webhook registration and configuration
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User
from app.services.zoom_webhook_service import zoom_webhook_service
import logging

logger = logging.getLogger(__name__)

def require_admin():
    """Decorator to require admin access"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user or user.account_type != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    return None

@api_bp.route('/zoom/webhooks/register', methods=['POST'])
@jwt_required()
def register_webhook():
    """
    Register webhook with Zoom
    
    Body:
    {
        "webhook_url": "https://your-domain.com/api/zoom/webhook",
        "events": ["meeting.started", "meeting.ended"] // optional
    }
    """
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        webhook_url = data.get('webhook_url')
        if not webhook_url:
            return jsonify({'error': 'webhook_url is required'}), 400
        
        events = data.get('events')  # Optional, will use defaults if not provided
        
        result = zoom_webhook_service.register_webhook(webhook_url, events)
        
        if result.get('success'):
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error in webhook registration endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/zoom/webhooks', methods=['GET'])
@jwt_required()
def list_webhooks():
    """
    List all registered webhooks
    """
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    try:
        result = zoom_webhook_service.list_webhooks()
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error listing webhooks: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/zoom/webhooks/<webhook_id>', methods=['DELETE'])
@jwt_required()
def delete_webhook(webhook_id):
    """
    Delete a webhook by ID
    """
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    try:
        result = zoom_webhook_service.delete_webhook(webhook_id)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error deleting webhook: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/zoom/webhooks/<webhook_id>', methods=['PATCH'])
@jwt_required()
def update_webhook(webhook_id):
    """
    Update a webhook
    
    Body:
    {
        "webhook_url": "https://your-domain.com/api/zoom/webhook",
        "events": ["meeting.started", "meeting.ended"] // optional
    }
    """
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        webhook_url = data.get('webhook_url')
        if not webhook_url:
            return jsonify({'error': 'webhook_url is required'}), 400
        
        events = data.get('events')
        
        result = zoom_webhook_service.update_webhook(webhook_id, webhook_url, events)
        
        if result.get('success'):
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error updating webhook: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/zoom/webhooks/validate', methods=['GET'])
@jwt_required()
def validate_webhook_config():
    """
    Validate webhook configuration
    """
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    try:
        result = zoom_webhook_service.validate_webhook_configuration()
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error validating webhook config: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@api_bp.route('/zoom/webhooks/setup-guide', methods=['GET'])
@jwt_required()
def webhook_setup_guide():
    """
    Get webhook setup instructions
    """
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    # Get the base URL from the request
    base_url = request.url_root.rstrip('/')
    webhook_url = zoom_webhook_service.get_webhook_url(base_url)
    
    return jsonify({
        'webhook_url': webhook_url,
        'setup_steps': [
            {
                'step': 1,
                'title': 'Set Environment Variable',
                'description': 'Set ZOOM_WEBHOOK_SECRET_TOKEN in your environment',
                'command': 'export ZOOM_WEBHOOK_SECRET_TOKEN="your_secret_token_here"'
            },
            {
                'step': 2,
                'title': 'Configure Zoom App',
                'description': 'Add webhook URL to your Zoom app configuration',
                'webhook_url': webhook_url
            },
            {
                'step': 3,
                'title': 'Subscribe to Events',
                'description': 'Subscribe to these events in your Zoom app',
                'events': [
                    'meeting.started',
                    'meeting.ended',
                    'meeting.participant_joined', 
                    'meeting.participant_left',
                    'recording.completed'
                ]
            },
            {
                'step': 4,
                'title': 'Test Webhook',
                'description': 'Use the validation endpoint to test your configuration',
                'endpoint': f"{base_url}/api/zoom/webhooks/validate"
            }
        ],
        'validation': zoom_webhook_service.validate_webhook_configuration()
    }), 200

@api_bp.route('/zoom/webhooks/auto-setup', methods=['POST'])
@jwt_required()
def auto_setup_webhook():
    """
    Automatically set up webhook with current deployment URL
    """
    admin_check = require_admin()
    if admin_check:
        return admin_check
    
    try:
        # Get base URL from request
        base_url = request.url_root.rstrip('/')
        webhook_url = zoom_webhook_service.get_webhook_url(base_url)
        
        # Validate configuration first
        validation = zoom_webhook_service.validate_webhook_configuration()
        if not validation['valid']:
            return jsonify({
                'success': False,
                'error': 'Webhook configuration is not valid',
                'validation': validation
            }), 400
        
        # Register webhook with default events
        result = zoom_webhook_service.register_webhook(webhook_url)
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'message': 'Webhook automatically configured',
                'webhook_url': webhook_url,
                'webhook_id': result.get('webhook_id'),
                'events': result.get('events')
            }), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"Error in auto webhook setup: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500