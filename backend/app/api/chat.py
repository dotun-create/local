from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    User, Course, Enrollment, CourseChat, ChatParticipant, 
    ChatMessage, MessageReadStatus, SystemSettings
)
from datetime import datetime
import os

chat_bp = Blueprint('chat', __name__)

def is_chat_enabled():
    """Check if chat system is enabled by admin"""
    return SystemSettings.get_setting('chat_system_enabled', False)

def check_chat_permission(user_id, course_id, action='view'):
    """Check if user has permission to perform chat actions on a course"""
    user = User.query.get(user_id)
    if not user:
        return False, "User not found"
    
    # Admin can access all chats
    if user.account_type == 'admin':
        return True, None
    
    # Check if course exists
    course = Course.query.get(course_id)
    if not course:
        return False, "Course not found"
    
    # Check permissions based on user type
    if user.account_type == 'student':
        # Student must be enrolled in the course
        enrollment = Enrollment.query.filter_by(
            student_id=user_id,
            course_id=course_id,
            status='active'
        ).first()
        if not enrollment:
            return False, "Student not enrolled in this course"
    
    elif user.account_type == 'tutor':
        # Tutor must be assigned to the course
        if user not in course.tutors:
            return False, "Tutor not assigned to this course"
    
    else:
        return False, "Invalid user type for chat access"
    
    return True, None

@chat_bp.route('/status', methods=['GET'])
@jwt_required()
def get_chat_status():
    """Get chat system status"""
    try:
        enabled = is_chat_enabled()
        return jsonify({
            'success': True,
            'enabled': enabled
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@chat_bp.route('/courses/<course_id>/chat', methods=['GET'])
@jwt_required()
def get_or_create_course_chat(course_id):
    """Get or create chat for a specific course"""
    try:
        if not is_chat_enabled():
            return jsonify({
                'success': False,
                'error': 'Chat system is disabled'
            }), 403
        
        user_id = get_jwt_identity()
        
        # Check permissions
        has_permission, error_msg = check_chat_permission(user_id, course_id)
        if not has_permission:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 403
        
        # Try to find existing chat for this course
        chat = CourseChat.query.filter_by(course_id=course_id, is_active=True).first()
        
        if not chat:
            # Create new chat
            course = Course.query.get(course_id)
            chat = CourseChat(
                course_id=course_id,
                name=f"{course.title} - Course Chat",
                created_by=user_id
            )
            db.session.add(chat)
            db.session.flush()  # Get the ID
            
            # Add creator as participant
            user = User.query.get(user_id)
            participant = ChatParticipant(
                chat_id=chat.id,
                user_id=user_id,
                role=user.account_type
            )
            db.session.add(participant)
            
            # Add all assigned tutors as participants
            participants_added = 1  # Creator already added
            for tutor in course.tutors:
                if tutor.id != user_id:  # Don't add creator twice
                    tutor_participant = ChatParticipant(
                        chat_id=chat.id,
                        user_id=tutor.id,
                        role='tutor'
                    )
                    db.session.add(tutor_participant)
                    participants_added += 1
            
            chat.participants_count = participants_added
            db.session.commit()
        
        # Check if current user is a participant, if not add them
        existing_participant = ChatParticipant.query.filter_by(
            chat_id=chat.id,
            user_id=user_id,
            is_active=True
        ).first()
        
        if not existing_participant:
            user = User.query.get(user_id)
            participant = ChatParticipant(
                chat_id=chat.id,
                user_id=user_id,
                role=user.account_type
            )
            db.session.add(participant)
            chat.participants_count += 1
            
        # If current user is a tutor accessing existing chat, also add any other assigned tutors who aren't participants yet
        current_user = User.query.get(user_id)
        if current_user.account_type == 'tutor':
            course = Course.query.get(course_id)
            for tutor in course.tutors:
                # Check if this tutor is already a participant
                tutor_participant = ChatParticipant.query.filter_by(
                    chat_id=chat.id,
                    user_id=tutor.id,
                    is_active=True
                ).first()
                
                if not tutor_participant:
                    new_tutor_participant = ChatParticipant(
                        chat_id=chat.id,
                        user_id=tutor.id,
                        role='tutor'
                    )
                    db.session.add(new_tutor_participant)
                    chat.participants_count += 1
            
        db.session.commit()
        
        # Get participants for response
        participants = ChatParticipant.query.filter_by(
            chat_id=chat.id,
            is_active=True
        ).all()
        
        chat_data = chat.to_dict()
        chat_data['participants'] = [p.to_dict() for p in participants]
        
        return jsonify({
            'success': True,
            'chat': chat_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting/creating course chat: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@chat_bp.route('/courses/<course_id>/messages', methods=['GET'])
@jwt_required()
def get_chat_messages(course_id):
    """Get chat messages for a course"""
    try:
        if not is_chat_enabled():
            return jsonify({
                'success': False,
                'error': 'Chat system is disabled'
            }), 403
        
        user_id = get_jwt_identity()
        
        # Check permissions
        has_permission, error_msg = check_chat_permission(user_id, course_id)
        if not has_permission:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 403
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        # Find chat for this course
        chat = CourseChat.query.filter_by(course_id=course_id, is_active=True).first()
        
        if not chat:
            return jsonify({
                'success': True,
                'messages': [],
                'total': 0,
                'page': page,
                'pages': 0
            }), 200
        
        # Get messages with pagination
        messages_query = ChatMessage.query.filter_by(
            chat_id=chat.id,
            is_deleted=False
        ).order_by(ChatMessage.created_at.desc())
        
        paginated = messages_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        messages = [msg.to_dict() for msg in paginated.items]
        
        return jsonify({
            'success': True,
            'messages': messages,
            'total': paginated.total,
            'page': page,
            'pages': paginated.pages
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting chat messages: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@chat_bp.route('/courses/<course_id>/messages', methods=['POST'])
@jwt_required()
def send_message(course_id):
    """Send a message to course chat"""
    try:
        if not is_chat_enabled():
            return jsonify({
                'success': False,
                'error': 'Chat system is disabled'
            }), 403
        
        user_id = get_jwt_identity()
        
        # Check permissions
        has_permission, error_msg = check_chat_permission(user_id, course_id, 'send')
        if not has_permission:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 403
        
        data = request.get_json()
        message_text = data.get('message_text', '').strip()
        reply_to_message_id = data.get('reply_to_message_id')
        
        if not message_text:
            return jsonify({
                'success': False,
                'error': 'Message text is required'
            }), 400
        
        # Find or create chat
        chat = CourseChat.query.filter_by(course_id=course_id, is_active=True).first()
        if not chat:
            return jsonify({
                'success': False,
                'error': 'Chat not found'
            }), 404
        
        # Check if user can send messages
        participant = ChatParticipant.query.filter_by(
            chat_id=chat.id,
            user_id=user_id,
            is_active=True
        ).first()
        
        if not participant or not participant.can_send_messages:
            return jsonify({
                'success': False,
                'error': 'You do not have permission to send messages'
            }), 403
        
        # Create message
        message = ChatMessage(
            chat_id=chat.id,
            sender_id=user_id,
            message_text=message_text,
            reply_to_message_id=reply_to_message_id
        )
        
        db.session.add(message)
        
        # Update chat last message time
        chat.last_message_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': message.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error sending message: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@chat_bp.route('/messages/<message_id>/read', methods=['POST'])
@jwt_required()
def mark_message_read(message_id):
    """Mark a message as read"""
    try:
        if not is_chat_enabled():
            return jsonify({
                'success': False,
                'error': 'Chat system is disabled'
            }), 403
        
        user_id = get_jwt_identity()
        
        # Get message
        message = ChatMessage.query.get(message_id)
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message not found'
            }), 404
        
        # Check if user is participant in this chat
        participant = ChatParticipant.query.filter_by(
            chat_id=message.chat_id,
            user_id=user_id,
            is_active=True
        ).first()
        
        if not participant:
            return jsonify({
                'success': False,
                'error': 'You are not a participant in this chat'
            }), 403
        
        # Check if already marked as read
        existing_read = MessageReadStatus.query.filter_by(
            message_id=message_id,
            user_id=user_id
        ).first()
        
        if not existing_read:
            read_status = MessageReadStatus(
                message_id=message_id,
                user_id=user_id
            )
            db.session.add(read_status)
            
            # Update participant's last read time
            participant.last_read_at = datetime.utcnow()
            
            db.session.commit()
        
        return jsonify({
            'success': True
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error marking message as read: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@chat_bp.route('/user/conversations', methods=['GET'])
@jwt_required()
def get_user_conversations():
    """Get all conversations for current user"""
    try:
        if not is_chat_enabled():
            return jsonify({
                'success': False,
                'error': 'Chat system is disabled'
            }), 403
        
        user_id = get_jwt_identity()
        
        # Get all chats where user is a participant
        participants = ChatParticipant.query.filter_by(
            user_id=user_id,
            is_active=True
        ).all()
        
        conversations = []
        for participant in participants:
            chat = participant.chat
            if chat.is_active:
                chat_data = chat.to_dict()
                
                # Get unread message count
                unread_count = ChatMessage.query.join(MessageReadStatus, 
                    MessageReadStatus.message_id == ChatMessage.id, 
                    isouter=True
                ).filter(
                    ChatMessage.chat_id == chat.id,
                    ChatMessage.sender_id != user_id,
                    ChatMessage.is_deleted == False,
                    MessageReadStatus.id.is_(None)  # No read status means unread
                ).count()
                
                chat_data['unreadCount'] = unread_count
                conversations.append(chat_data)
        
        # Sort by last message time (handle None values)
        conversations.sort(key=lambda x: x.get('lastMessageAt') or '', reverse=True)
        
        return jsonify({
            'success': True,
            'conversations': conversations
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting user conversations: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@chat_bp.route('/admin/all', methods=['GET'])
@jwt_required()
def get_all_chats_admin():
    """Admin endpoint to get all chats with filtering"""
    try:
        if not is_chat_enabled():
            return jsonify({
                'success': False,
                'error': 'Chat system is disabled'
            }), 403
        
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.account_type != 'admin':
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        # Get filter parameters
        course_id = request.args.get('course_id')
        tutor_id = request.args.get('tutor_id')
        student_id = request.args.get('student_id')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Build query
        query = CourseChat.query.filter_by(is_active=True)
        
        if course_id:
            query = query.filter_by(course_id=course_id)
        
        if tutor_id or student_id:
            # Join with participants to filter by user
            query = query.join(ChatParticipant)
            if tutor_id:
                query = query.filter(
                    ChatParticipant.user_id == tutor_id,
                    ChatParticipant.role == 'tutor'
                )
            if student_id:
                query = query.filter(
                    ChatParticipant.user_id == student_id,
                    ChatParticipant.role == 'student'
                )
        
        # Paginate results
        paginated = query.order_by(CourseChat.last_message_at.desc().nulls_last()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        chats = []
        for chat in paginated.items:
            chat_data = chat.to_dict()
            
            # Get participants
            participants = ChatParticipant.query.filter_by(
                chat_id=chat.id,
                is_active=True
            ).all()
            chat_data['participants'] = [p.to_dict() for p in participants]
            
            # Get recent message count
            recent_messages_count = ChatMessage.query.filter_by(
                chat_id=chat.id,
                is_deleted=False
            ).count()
            chat_data['messageCount'] = recent_messages_count
            
            chats.append(chat_data)
        
        return jsonify({
            'success': True,
            'chats': chats,
            'total': paginated.total,
            'page': page,
            'pages': paginated.pages
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting admin chats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@chat_bp.route('/admin/settings', methods=['GET'])
@jwt_required()
def get_chat_settings():
    """Get chat system settings (admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.account_type != 'admin':
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        enabled = SystemSettings.get_setting('chat_system_enabled', False)
        
        return jsonify({
            'success': True,
            'settings': {
                'enabled': enabled
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting chat settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@chat_bp.route('/admin/settings', methods=['POST'])
@jwt_required()
def update_chat_settings():
    """Update chat system settings (admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.account_type != 'admin':
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        data = request.get_json()
        enabled = data.get('enabled', False)
        
        SystemSettings.set_setting(
            'chat_system_enabled', 
            enabled, 
            description='Enable/disable the course chat system',
            updated_by=user_id
        )
        
        # Emit socket event to notify all connected clients
        try:
            from app import socketio
            socketio.emit('chat_system_toggled', {
                'enabled': enabled,
                'message': f'Chat system {"enabled" if enabled else "disabled"} by administrator'
            })
            current_app.logger.info(f"Socket event emitted: chat_system_toggled, enabled: {enabled}")
        except Exception as socket_error:
            current_app.logger.error(f"Failed to emit socket event: {str(socket_error)}")
        
        return jsonify({
            'success': True,
            'message': f'Chat system {"enabled" if enabled else "disabled"} successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating chat settings: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500