from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, AIPrompt, SystemConfig, StudentSessionFeedback, Session, Course
from app import db
import uuid
from datetime import datetime

@api_bp.route('/admin/prompts', methods=['GET'])
@jwt_required()
def get_ai_prompts():
    """Get all AI prompts (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        prompts = AIPrompt.query.all()
        return jsonify([prompt.to_dict() for prompt in prompts]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/prompts', methods=['POST'])
@jwt_required()
def create_ai_prompt():
    """Create new AI prompt (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data or not data.get('promptName') or not data.get('promptContent'):
            return jsonify({'error': 'Prompt name and content are required'}), 400
        
        # Check if prompt name already exists
        existing = AIPrompt.query.filter_by(prompt_name=data['promptName']).first()
        if existing:
            return jsonify({'error': 'Prompt name already exists'}), 400
        
        prompt = AIPrompt(
            id=f"prompt_{uuid.uuid4().hex[:8]}",
            prompt_name=data['promptName'],
            prompt_content=data['promptContent'],
            created_by=current_user_id,
            updated_by=current_user_id
        )
        
        db.session.add(prompt)
        db.session.commit()
        
        return jsonify({
            'message': 'Prompt created successfully',
            'prompt': prompt.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/prompts/<string:prompt_name>', methods=['PUT'])
@jwt_required()
def update_ai_prompt(prompt_name):
    """Update AI prompt (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        prompt = AIPrompt.query.filter_by(prompt_name=prompt_name).first()
        if not prompt:
            return jsonify({'error': 'Prompt not found'}), 404
        
        data = request.get_json()
        if not data or not data.get('promptContent'):
            return jsonify({'error': 'Prompt content is required'}), 400
        
        prompt.prompt_content = data['promptContent']
        prompt.updated_by = current_user_id
        prompt.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Prompt updated successfully',
            'prompt': prompt.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/system-config', methods=['GET'])
@jwt_required()
def get_system_config():
    """Get system configuration (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        configs = SystemConfig.query.all()
        config_dict = {config.config_key: config.config_value for config in configs}
        
        # Set defaults if not present
        if 'session_job_frequency_hours' not in config_dict:
            config_dict['session_job_frequency_hours'] = '24'
        if 'openai_model' not in config_dict:
            config_dict['openai_model'] = 'gpt-4-turbo'
        
        return jsonify(config_dict), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/system-config', methods=['PUT'])
@jwt_required()
def update_system_config():
    """Update system configuration (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Configuration data is required'}), 400
        
        updated_configs = []
        for key, value in data.items():
            config = SystemConfig.query.filter_by(config_key=key).first()
            if config:
                config.config_value = str(value)
                config.updated_by = current_user_id
                config.updated_at = datetime.utcnow()
            else:
                config = SystemConfig(
                    id=f"config_{uuid.uuid4().hex[:8]}",
                    config_key=key,
                    config_value=str(value),
                    updated_by=current_user_id
                )
                db.session.add(config)
            
            updated_configs.append(config.to_dict())
        
        db.session.commit()
        
        return jsonify({
            'message': 'System configuration updated successfully',
            'configs': updated_configs
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/feedback-stats', methods=['GET'])
@jwt_required()
def get_feedback_stats():
    """Get feedback system statistics (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get sessions with AI feedback
        sessions_with_feedback = Session.query.filter(Session.ai_tutor_feedback.isnot(None)).count()
        total_sessions = Session.query.filter(Session.status.in_(['completed', 'scheduled'])).count()
        
        # Get student feedback count
        student_feedback_count = StudentSessionFeedback.query.count()
        
        # Get recent processing stats
        from datetime import datetime, timedelta
        recent_cutoff = datetime.utcnow() - timedelta(days=7)
        recent_feedback = Session.query.filter(
            Session.feedback_generated_at >= recent_cutoff
        ).count()
        
        stats = {
            'totalSessions': total_sessions,
            'sessionsWithFeedback': sessions_with_feedback,
            'feedbackProcessingRate': round((sessions_with_feedback / total_sessions * 100) if total_sessions > 0 else 0, 2),
            'studentFeedbackCount': student_feedback_count,
            'recentProcessingCount': recent_feedback
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/guardian-feedback/<string:guardian_id>', methods=['GET'])
@jwt_required()
def get_guardian_student_feedback(guardian_id):
    """Get all session feedback for guardian's students (admin or guardian access)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check access permissions
        if current_user.account_type != 'admin' and current_user_id != guardian_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get feedback grouped by student
        feedback_query = db.session.query(
            User.id.label('student_id'),
            User.profile['name'].label('student_name'),
            StudentSessionFeedback,
            Session.title.label('session_title'),
            Session.scheduled_date,
            Course.title.label('course_name')
        ).join(
            StudentSessionFeedback, User.id == StudentSessionFeedback.student_id
        ).join(
            Session, StudentSessionFeedback.session_id == Session.id
        ).outerjoin(
            Course, Session.course_id == Course.id
        ).filter(
            StudentSessionFeedback.guardian_id == guardian_id
        ).order_by(
            User.profile['name'], Session.scheduled_date.desc()
        ).all()
        
        # Group by student
        feedback_by_student = {}
        for record in feedback_query:
            student_name = record.student_name or f"Student {record.student_id[:8]}"
            if student_name not in feedback_by_student:
                feedback_by_student[student_name] = []
            
            feedback_by_student[student_name].append({
                'sessionId': record.StudentSessionFeedback.session_id,
                'sessionTitle': record.session_title,
                'courseName': record.course_name,
                'sessionDate': record.scheduled_date.isoformat() if record.scheduled_date else None,
                'feedback': record.StudentSessionFeedback.ai_guardian_feedback,
                'performanceSummary': record.StudentSessionFeedback.student_performance_summary,
                'areasOfImprovement': record.StudentSessionFeedback.areas_of_improvement,
                'strengthsHighlighted': record.StudentSessionFeedback.strengths_highlighted,
                'feedbackDate': record.StudentSessionFeedback.created_at.isoformat()
            })
        
        return jsonify(feedback_by_student), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/session-processor/status', methods=['GET'])
@jwt_required()
def get_processor_status():
    """Get session processor status and statistics"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        from app.services.session_processor import session_processor
        stats = session_processor.get_processing_stats()
        
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/session-processor/manual-process/<string:session_id>', methods=['POST'])
@jwt_required()
def manual_process_session(session_id):
    """Manually process a specific session (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        from app.services.session_processor import session_processor
        result = session_processor.manual_process_session(session_id)
        
        return jsonify(result), 200 if result.get('success') else 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/session-processor/restart', methods=['POST'])
@jwt_required()
def restart_processor():
    """Restart the session processor"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        from app.services.session_processor import session_processor
        
        # Stop and restart the processor
        session_processor.stop_scheduler()
        session_processor.start_scheduler()
        
        return jsonify({'message': 'Session processor restarted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/ai-service/validate', methods=['GET'])
@jwt_required()
def validate_ai_service():
    """Validate AI service configuration"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        from app.services.ai_service import ai_service
        from app.services.zoom_service import zoom_service
        
        # Validate AI service
        ai_validation = ai_service.validate_api_key()
        
        # Validate Zoom service
        zoom_validation = zoom_service.validate_credentials()
        
        return jsonify({
            'ai_service': ai_validation,
            'zoom_service': zoom_validation
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/prompts/initialize-defaults', methods=['POST'])
@jwt_required()
def initialize_default_prompts():
    """Initialize default AI prompts"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        from app.services.ai_service import ai_service
        
        default_prompts = ai_service.get_default_prompts()
        created_prompts = []
        
        for prompt_name, prompt_content in default_prompts.items():
            # Check if prompt already exists
            existing = AIPrompt.query.filter_by(prompt_name=prompt_name).first()
            if not existing:
                prompt = AIPrompt(
                    id=f"prompt_{uuid.uuid4().hex[:8]}",
                    prompt_name=prompt_name,
                    prompt_content=prompt_content,
                    created_by=current_user_id,
                    updated_by=current_user_id
                )
                db.session.add(prompt)
                created_prompts.append(prompt_name)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Initialized {len(created_prompts)} default prompts',
            'created_prompts': created_prompts
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500