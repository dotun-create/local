"""
Health check endpoints for monitoring service availability
"""

import os
from flask import Blueprint, jsonify
from app.services.ai_service import AIFeedbackService
from app.services.zoom_service import ZoomService
from app import db
from sqlalchemy import text

health_bp = Blueprint('health', __name__)

# Register health endpoints with main API blueprint
from app.api import api_bp
api_bp.register_blueprint(health_bp)

@health_bp.route('/health', methods=['GET'])
def basic_health():
    """Basic health check for load balancers"""
    return jsonify({
        'status': 'healthy',
        'service': 'troupe-backend',
        'timestamp': '2024-01-01T00:00:00Z'
    }), 200

@health_bp.route('/health/detailed', methods=['GET'])
def detailed_health():
    """Detailed health check with service dependencies"""
    health_status = {
        'status': 'healthy',
        'service': 'troupe-backend',
        'services': {}
    }
    
    # Database health check
    try:
        db.session.execute(text('SELECT 1'))
        health_status['services']['database'] = {
            'status': 'healthy',
            'message': 'Database connection successful'
        }
    except Exception as e:
        health_status['services']['database'] = {
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}'
        }
        health_status['status'] = 'degraded'
    
    # AI service health check
    ai_enabled = os.getenv('AI_SESSION_PROCESSOR_ENABLED', 'false').lower() == 'true'
    if ai_enabled:
        try:
            ai_service = AIFeedbackService()
            if ai_service.is_configured():
                health_status['services']['ai'] = {
                    'status': 'healthy',
                    'message': 'AI service configured and ready',
                    'model': ai_service.model
                }
            else:
                health_status['services']['ai'] = {
                    'status': 'unavailable',
                    'message': 'AI service not configured (missing API key)'
                }
                health_status['status'] = 'degraded'
        except Exception as e:
            health_status['services']['ai'] = {
                'status': 'error',
                'message': f'AI service error: {str(e)}'
            }
            health_status['status'] = 'degraded'
    else:
        health_status['services']['ai'] = {
            'status': 'disabled',
            'message': 'AI service disabled by configuration'
        }
    
    # Video conferencing health check
    video_enabled = os.getenv('VIDEO_CONFERENCING_ENABLED', 'false').lower() == 'true'
    if video_enabled:
        try:
            zoom_service = ZoomService()
            if zoom_service.is_configured():
                health_status['services']['video'] = {
                    'status': 'healthy',
                    'message': 'Video conferencing service configured',
                    'provider': 'zoom'
                }
            else:
                health_status['services']['video'] = {
                    'status': 'unavailable',
                    'message': 'Video conferencing not configured (missing credentials)'
                }
                health_status['status'] = 'degraded'
        except Exception as e:
            health_status['services']['video'] = {
                'status': 'error',
                'message': f'Video conferencing error: {str(e)}'
            }
            health_status['status'] = 'degraded'
    else:
        health_status['services']['video'] = {
            'status': 'disabled',
            'message': 'Video conferencing disabled by configuration'
        }
    
    # Environment configuration check
    required_vars = ['DATABASE_URL', 'JWT_SECRET_KEY', 'SECRET_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        health_status['services']['environment'] = {
            'status': 'unhealthy',
            'message': f'Missing required environment variables: {", ".join(missing_vars)}'
        }
        health_status['status'] = 'unhealthy'
    else:
        health_status['services']['environment'] = {
            'status': 'healthy',
            'message': 'All required environment variables present'
        }
    
    # Determine overall status code
    status_code = 200
    if health_status['status'] == 'unhealthy':
        status_code = 503
    elif health_status['status'] == 'degraded':
        status_code = 200  # Still functional but with warnings
    
    return jsonify(health_status), status_code

@health_bp.route('/health/ai', methods=['GET'])
def ai_health():
    """AI service specific health check"""
    ai_enabled = os.getenv('AI_SESSION_PROCESSOR_ENABLED', 'false').lower() == 'true'
    
    if not ai_enabled:
        return jsonify({
            'status': 'disabled',
            'message': 'AI service disabled by configuration'
        }), 200
    
    try:
        ai_service = AIFeedbackService()
        if ai_service.is_configured():
            return jsonify({
                'status': 'healthy',
                'message': 'AI service available',
                'model': ai_service.model,
                'api_key_configured': bool(ai_service.api_key)
            }), 200
        else:
            return jsonify({
                'status': 'unavailable',
                'message': 'AI service not configured (missing API key)'
            }), 503
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'AI service error: {str(e)}'
        }), 503

@health_bp.route('/health/video', methods=['GET'])
def video_health():
    """Video conferencing specific health check"""
    video_enabled = os.getenv('VIDEO_CONFERENCING_ENABLED', 'false').lower() == 'true'
    
    if not video_enabled:
        return jsonify({
            'status': 'disabled',
            'message': 'Video conferencing disabled by configuration'
        }), 200
    
    try:
        zoom_service = ZoomService()
        if zoom_service.is_configured():
            return jsonify({
                'status': 'healthy',
                'message': 'Video conferencing service available',
                'provider': 'zoom',
                'credentials_configured': True
            }), 200
        else:
            return jsonify({
                'status': 'unavailable',
                'message': 'Video conferencing not configured (missing credentials)'
            }), 503
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Video conferencing error: {str(e)}'
        }), 503