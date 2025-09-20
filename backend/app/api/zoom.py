from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User
from app.services.zoom_service import zoom_service

@api_bp.route('/zoom/status', methods=['GET'])
@jwt_required()
def get_zoom_status():
    """Get Zoom integration status"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins and tutors can check Zoom status
        if current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Access denied'}), 403
        
        status = zoom_service.validate_credentials()
        
        return jsonify({
            'configured': zoom_service.is_configured(),
            'status': status
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/zoom/meetings', methods=['POST'])
@jwt_required()
def create_zoom_meeting():
    """Create a new Zoom meeting"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins and tutors can create meetings
        if current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('topic'):
            return jsonify({'error': 'Meeting topic is required'}), 400
        
        meeting_result = zoom_service.create_meeting(data)
        
        if meeting_result['success']:
            return jsonify({
                'success': True,
                'meeting': {
                    'id': meeting_result['meeting_id'],
                    'join_url': meeting_result['join_url'],
                    'start_url': meeting_result['start_url'],
                    'password': meeting_result['password'],
                    'uuid': meeting_result['uuid'],
                    'topic': meeting_result.get('topic'),
                    'start_time': meeting_result.get('start_time'),
                    'duration': meeting_result.get('duration')
                }
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': meeting_result['error']
            }), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/zoom/meetings/<string:meeting_id>', methods=['GET'])
@jwt_required()
def get_zoom_meeting(meeting_id):
    """Get Zoom meeting details"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins and tutors can view meeting details
        if current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Access denied'}), 403
        
        meeting_result = zoom_service.get_meeting(meeting_id)
        
        if meeting_result['success']:
            return jsonify({
                'success': True,
                'meeting': meeting_result['meeting']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': meeting_result['error']
            }), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/zoom/meetings/<string:meeting_id>', methods=['PATCH'])
@jwt_required()
def update_zoom_meeting(meeting_id):
    """Update Zoom meeting"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins and tutors can update meetings
        if current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        meeting_result = zoom_service.update_meeting(meeting_id, data)
        
        if meeting_result['success']:
            return jsonify({
                'success': True,
                'message': meeting_result['message']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': meeting_result['error']
            }), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/zoom/meetings/<string:meeting_id>', methods=['DELETE'])
@jwt_required()
def delete_zoom_meeting(meeting_id):
    """Delete Zoom meeting"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins and tutors can delete meetings
        if current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Access denied'}), 403
        
        meeting_result = zoom_service.delete_meeting(meeting_id)
        
        if meeting_result['success']:
            return jsonify({
                'success': True,
                'message': meeting_result['message']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': meeting_result['error']
            }), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/zoom/meetings', methods=['GET'])
@jwt_required()
def list_zoom_meetings():
    """List Zoom meetings"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins and tutors can list meetings
        if current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Access denied'}), 403
        
        meeting_type = request.args.get('type', 'scheduled')
        
        meetings_result = zoom_service.list_meetings(meeting_type=meeting_type)
        
        if meetings_result['success']:
            return jsonify({
                'success': True,
                'meetings': meetings_result['meetings'],
                'total_records': meetings_result['total_records']
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': meetings_result['error']
            }), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/zoom/sessions/meeting', methods=['POST'])
@jwt_required()
def create_session_meeting():
    """Create a Zoom meeting for a course session"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins can create session meetings
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['course_data', 'session_data']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        course_data = data['course_data']
        session_data = data['session_data']
        
        # Create the meeting
        meeting_result = zoom_service.create_course_session_meeting(course_data, session_data)
        
        if meeting_result['success']:
            return jsonify({
                'success': True,
                'meeting_id': meeting_result['meeting_id'],
                'join_url': meeting_result['join_url'],
                'start_url': meeting_result['start_url'],
                'password': meeting_result['password'],
                'uuid': meeting_result['uuid']
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': meeting_result['error'],
                'meeting_id': None,
                'join_url': None,
                'start_url': None,
                'password': None,
                'uuid': None
            }), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500