from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Module, Lesson, Session
from app import db
import uuid

@api_bp.route('/modules/<string:module_id>/lessons', methods=['GET'])
def get_lessons(module_id):
    """Get all lessons for a module"""
    try:
        module = Module.query.get(module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
        
        lessons = Lesson.query.filter_by(module_id=module_id).order_by(Lesson.order).all()
        
        return jsonify({
            'lessons': [lesson.to_dict() for lesson in lessons]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/lessons/<string:lesson_id>', methods=['GET'])
def get_lesson(lesson_id):
    """Get specific lesson"""
    try:
        lesson = Lesson.query.get(lesson_id)
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        return jsonify({'lesson': lesson.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/modules/<string:module_id>/lessons', methods=['POST'])
@jwt_required()
def create_lesson(module_id):
    """Create new lesson (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        module = Module.query.get(module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
        
        data = request.get_json()
        required_fields = ['title']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get the next order number
        max_order = db.session.query(db.func.max(Lesson.order)).filter_by(module_id=module_id).scalar() or 0
        
        lesson = Lesson(
            id=f"lesson_{uuid.uuid4().hex[:8]}",
            module_id=module_id,
            title=data['title'],
            description=data.get('description'),
            duration=data.get('duration'),
            type=data.get('type', 'video'),
            content=data.get('content', {}),
            order=data.get('order', max_order + 1)
        )
        
        db.session.add(lesson)
        db.session.commit()
        
        return jsonify({
            'lesson': lesson.to_dict(),
            'message': 'Lesson created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/lessons/<string:lesson_id>', methods=['PUT'])
@jwt_required()
def update_lesson(lesson_id):
    """Update lesson (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        lesson = Lesson.query.get(lesson_id)
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = ['title', 'description', 'duration', 'type', 'content', 'order', 'status']
        
        for field in updatable_fields:
            if field in data:
                setattr(lesson, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'lesson': lesson.to_dict(),
            'message': 'Lesson updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/lessons/<string:lesson_id>', methods=['DELETE'])
@jwt_required()
def delete_lesson(lesson_id):
    """Delete lesson (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        lesson = Lesson.query.get(lesson_id)
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        db.session.delete(lesson)
        db.session.commit()
        
        return jsonify({'message': 'Lesson deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/lessons/<string:lesson_id>/sessions', methods=['GET'])
@jwt_required()
def get_lesson_sessions(lesson_id):
    """Get all sessions for a specific lesson"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        lesson = Lesson.query.get(lesson_id)
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        # Get sessions that match this lesson by lesson_id
        sessions = Session.query.filter_by(lesson_id=lesson_id).all()
        
        return jsonify({
            'sessions': [session.to_dict(current_student_id=current_user_id if current_user.account_type == 'student' else None) for session in sessions],
            'lesson_id': lesson_id,
            'lesson_title': lesson.title
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500