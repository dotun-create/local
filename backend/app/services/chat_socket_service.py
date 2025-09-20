from flask import current_app
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask_jwt_extended import decode_token
from app.models import User, CourseChat, ChatParticipant, ChatMessage, SystemSettings
from app import db
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger(__name__)

socketio = None

def init_socketio(app):
    """Initialize SocketIO with the Flask app"""
    global socketio
    socketio = SocketIO(
        app,
        cors_allowed_origins="http://localhost:3000",
        logger=True,
        engineio_logger=True,
        async_mode='threading'
    )
    register_socket_events()

    # Initialize WebSocket service with the SocketIO instance
    from app.services.websocket_service import websocket_service
    websocket_service.init_app(socketio)

    return socketio

def is_chat_enabled():
    """Check if chat system is enabled by admin"""
    return SystemSettings.get_setting('chat_system_enabled', False)

def authenticate_socket_user(token):
    """Authenticate user from JWT token"""
    try:
        if not token or not token.startswith('Bearer '):
            return None
        
        token = token.replace('Bearer ', '')
        decoded = decode_token(token)
        user_id = decoded['sub']
        user = User.query.get(user_id)
        
        return user
    except Exception as e:
        logger.error(f"Socket authentication failed: {str(e)}")
        return None

def check_chat_permission(user, course_id):
    """Check if user has permission to join chat"""
    if not user:
        return False
    
    # Admin can join any chat
    if user.account_type == 'admin':
        return True
    
    # Check if user is participant in this course chat
    chat = CourseChat.query.filter_by(course_id=course_id, is_active=True).first()
    if not chat:
        return False
    
    participant = ChatParticipant.query.filter_by(
        chat_id=chat.id,
        user_id=user.id,
        is_active=True
    ).first()
    
    return participant is not None

def register_socket_events():
    """Register all socket event handlers"""
    global socketio
    
    @socketio.on('connect')
    def handle_connect(auth):
        """Handle client connection"""
        try:
            if not is_chat_enabled():
                logger.warning("Chat system disabled - rejecting connection")
                disconnect()
                return False
            
            logger.info(f"Client attempting to connect with auth: {auth}")
            
            # Authenticate user
            token = auth.get('token') if auth else None
            user = authenticate_socket_user(token)
            
            if not user:
                logger.warning("Unauthenticated socket connection attempt")
                disconnect()
                return False
            
            logger.info(f"User {user.email} connected to chat socket")
            
            # Store user info and token in session
            from flask import session
            session['user_id'] = user.id
            session['user_email'] = user.email
            session['auth_token'] = token

            # Auto-subscribe user to their notification room
            notification_room = f"user_{user.id}"
            join_room(notification_room)

            emit('connected', {
                'status': 'success',
                'user': user.email,
                'notification_room': notification_room
            })
            
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            disconnect()
            return False
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        try:
            from flask import session
            user_email = session.get('user_email', 'Unknown')
            logger.info(f"User {user_email} disconnected from chat socket")
        except Exception as e:
            logger.error(f"Disconnection error: {str(e)}")
    
    @socketio.on('join_course_chat')
    def handle_join_course_chat(data):
        """Handle user joining a course chat room"""
        try:
            if not is_chat_enabled():
                emit('error', {'message': 'Chat system is disabled'})
                return
            
            # Get auth token from session (stored during connection)
            from flask import session
            token = session.get('auth_token')
            user_id = session.get('user_id')
            
            # Authenticate user from stored token or fallback to session user_id
            if token:
                user = authenticate_socket_user(token)
            elif user_id:
                user = User.query.get(user_id)
            else:
                user = None
            
            course_id = data.get('course_id')
            
            if not user or not course_id:
                emit('error', {'message': 'Missing user or course information'})
                return
            
            # Check permissions
            if not check_chat_permission(user, course_id):
                emit('error', {'message': 'Permission denied to join this chat'})
                return
            
            # Join the room
            room = f"course_{course_id}"
            join_room(room)
            
            logger.info(f"User {user.email} joined chat room {room}")
            
            emit('joined_chat', {
                'course_id': course_id,
                'room': room,
                'status': 'success'
            })
            
            # Notify others in the room
            emit('user_joined', {
                'user_name': user.profile.get('name', user.email),
                'user_id': user.id
            }, room=room, skip_sid=True)
            
        except Exception as e:
            logger.error(f"Error joining course chat: {str(e)}")
            emit('error', {'message': 'Failed to join chat'})
    
    @socketio.on('leave_course_chat')
    def handle_leave_course_chat(data):
        """Handle user leaving a course chat room"""
        try:
            # Get auth token from session (stored during connection)
            from flask import session
            token = session.get('auth_token')
            user_id = session.get('user_id')
            
            # Authenticate user from stored token or fallback to session user_id
            if token:
                user = authenticate_socket_user(token)
            elif user_id:
                user = User.query.get(user_id)
            else:
                user = None
            
            course_id = data.get('course_id')
            
            if not user or not course_id:
                return
            room = f"course_{course_id}"
            
            leave_room(room)
            
            logger.info(f"User {user.email} left chat room {room}")
            
            # Notify others in the room
            emit('user_left', {
                'user_name': user.profile.get('name', user.email),
                'user_id': user.id
            }, room=room)
            
        except Exception as e:
            logger.error(f"Error leaving course chat: {str(e)}")
    
    @socketio.on('send_message')
    def handle_send_message(data):
        """Handle real-time message sending"""
        logger.info(f"Received send_message event with data: {data}")
        try:
            if not is_chat_enabled():
                logger.warning("Chat system is disabled")
                emit('error', {'message': 'Chat system is disabled'})
                return
            
            # Get auth token from session (stored during connection)
            from flask import session
            token = session.get('auth_token')
            user_id = session.get('user_id')
            
            # Authenticate user from stored token or fallback to session user_id
            if token:
                user = authenticate_socket_user(token)
            elif user_id:
                user = User.query.get(user_id)
            else:
                user = None
            
            course_id = data.get('course_id')
            message_text = data.get('message_text', '').strip()
            reply_to_message_id = data.get('reply_to_message_id')
            
            if not user or not course_id or not message_text:
                emit('error', {'message': 'Missing required message data or authentication failed'})
                return
            
            # Check permissions
            if not check_chat_permission(user, course_id):
                emit('error', {'message': 'Permission denied'})
                return
            
            # Find chat
            chat = CourseChat.query.filter_by(course_id=course_id, is_active=True).first()
            if not chat:
                emit('error', {'message': 'Chat not found'})
                return
            
            # Check if user can send messages
            participant = ChatParticipant.query.filter_by(
                chat_id=chat.id,
                user_id=user.id,
                is_active=True
            ).first()
            
            if not participant or not participant.can_send_messages:
                emit('error', {'message': 'You cannot send messages to this chat'})
                return
            
            # Create and save message
            message = ChatMessage(
                chat_id=chat.id,
                sender_id=user.id,
                message_text=message_text,
                reply_to_message_id=reply_to_message_id
            )
            
            db.session.add(message)
            
            # Update chat last message time
            chat.last_message_at = datetime.utcnow()
            
            db.session.commit()
            
            # Prepare message data for broadcast
            message_data = message.to_dict()
            message_data['sender_name'] = user.profile.get('name', user.email)
            
            # Broadcast to all users in the room
            room = f"course_{course_id}"
            emit('new_message', message_data, room=room)
            
            logger.info(f"Message sent by {user.email} in course {course_id}")
            
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            db.session.rollback()
            emit('error', {'message': 'Failed to send message'})
    
    @socketio.on('typing')
    def handle_typing(data):
        """Handle typing indicators"""
        try:
            # Get auth token from session (stored during connection)
            from flask import session
            token = session.get('auth_token')
            user_id = session.get('user_id')
            
            # Authenticate user from stored token or fallback to session user_id
            if token:
                user = authenticate_socket_user(token)
            elif user_id:
                user = User.query.get(user_id)
            else:
                user = None
            
            course_id = data.get('course_id')
            is_typing = data.get('is_typing', False)
            
            if not user or not course_id:
                return
            
            # Check permissions
            if not check_chat_permission(user, course_id):
                return
            
            room = f"course_{course_id}"
            
            emit('user_typing', {
                'user_id': user.id,
                'user_name': user.profile.get('name', user.email),
                'is_typing': is_typing
            }, room=room, skip_sid=True)
            
        except Exception as e:
            logger.error(f"Error handling typing indicator: {str(e)}")
    
    @socketio.on('error')
    def handle_error(error):
        """Handle socket errors"""
        logger.error(f"Socket error: {error}")

def broadcast_message_to_course(course_id, message_data):
    """Broadcast a message to all users in a course chat room"""
    try:
        if socketio and is_chat_enabled():
            room = f"course_{course_id}"
            socketio.emit('new_message', message_data, room=room)
            logger.info(f"Broadcasted message to room {room}")
    except Exception as e:
        logger.error(f"Error broadcasting message: {str(e)}")

def notify_user_joined(course_id, user_data):
    """Notify room that a user has joined"""
    try:
        if socketio and is_chat_enabled():
            room = f"course_{course_id}"
            socketio.emit('user_joined', user_data, room=room)
    except Exception as e:
        logger.error(f"Error notifying user joined: {str(e)}")

def notify_user_left(course_id, user_data):
    """Notify room that a user has left"""
    try:
        if socketio and is_chat_enabled():
            room = f"course_{course_id}"
            socketio.emit('user_left', user_data, room=room)
    except Exception as e:
        logger.error(f"Error notifying user left: {str(e)}")