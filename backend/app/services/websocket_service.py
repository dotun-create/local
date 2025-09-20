"""
WebSocket Service for Real-time Updates

This service handles WebSocket connections and broadcasts for the hybrid refresh strategy.
It categorizes events by priority and manages client connections.
"""

from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class EventPriority:
    """Event priority levels for refresh strategy"""
    CRITICAL = "CRITICAL"  # Immediate refresh (0 delay)
    IMPORTANT = "IMPORTANT"  # 30-second delay with notification
    MINOR = "MINOR"  # 5-minute background sync

class EventCategory:
    """Event categories for different admin actions"""
    PAYMENT = "PAYMENT"
    ENROLLMENT = "ENROLLMENT"
    COURSE_UPDATE = "COURSE_UPDATE"
    USER_MANAGEMENT = "USER_MANAGEMENT"
    AVAILABILITY_CHANGE = "AVAILABILITY_CHANGE"
    SYSTEM_SETTINGS = "SYSTEM_SETTINGS"
    SESSION_CHANGE = "SESSION_CHANGE"
    PROFILE_UPDATE = "PROFILE_UPDATE"
    NOTIFICATION_NEW = "NOTIFICATION_NEW"
    NOTIFICATION_READ = "NOTIFICATION_READ"
    NOTIFICATION_DELETED = "NOTIFICATION_DELETED"

class WebSocketService:
    def __init__(self, socketio: SocketIO = None):
        self.socketio = socketio
        self.connected_clients: Dict[str, Dict] = {}
        self.event_queue: List[Dict] = []
        self.priority_mapping = {
            EventCategory.PAYMENT: EventPriority.CRITICAL,
            EventCategory.ENROLLMENT: EventPriority.CRITICAL,
            EventCategory.SESSION_CHANGE: EventPriority.CRITICAL,
            EventCategory.COURSE_UPDATE: EventPriority.IMPORTANT,
            EventCategory.AVAILABILITY_CHANGE: EventPriority.IMPORTANT,
            EventCategory.USER_MANAGEMENT: EventPriority.IMPORTANT,
            EventCategory.SYSTEM_SETTINGS: EventPriority.IMPORTANT,
            EventCategory.PROFILE_UPDATE: EventPriority.MINOR,
        }
    
    def init_app(self, socketio: SocketIO):
        """Initialize WebSocket service with SocketIO instance"""
        self.socketio = socketio
        self._register_handlers()
    
    def _register_handlers(self):
        """Register WebSocket event handlers"""
        if not self.socketio:
            return

        # Note: connect/disconnect handlers are already handled by chat_socket_service
        # We'll add our notification-specific handlers here
        @self.socketio.on('subscribe_to_notifications')
        def handle_notification_subscription():
            """Handle subscription to user-specific notifications"""
            try:
                from flask import session
                user_id = session.get('user_id')

                if user_id:
                    room_name = f"user_{user_id}"
                    join_room(room_name)
                    emit('notification_subscription_confirmed', {
                        'status': 'subscribed',
                        'room': room_name
                    })
                    logger.info(f"User {user_id} subscribed to notifications")
                else:
                    emit('error', {'message': 'Authentication required for notifications'})
            except Exception as e:
                logger.error(f"Error in notification subscription: {e}")
                emit('error', {'message': 'Failed to subscribe to notifications'})
    
    def _get_user_from_request(self) -> Optional[Dict]:
        """Extract user information from request context"""
        try:
            from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
            from app.models import User
            
            # Try to get user from JWT token
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            
            if user_id:
                user = User.query.get(user_id)
                if user:
                    return {
                        'id': user.id,
                        'account_type': user.account_type,
                        'email': user.email
                    }
        except Exception:
            # Try to get token from connection auth data
            if hasattr(request, 'event') and hasattr(request.event, 'get'):
                token = request.event.get('auth', {}).get('token')
                if token:
                    try:
                        from flask_jwt_extended import decode_token
                        from app.models import User
                        
                        decoded = decode_token(token)
                        user_id = decoded.get('sub')
                        if user_id:
                            user = User.query.get(user_id)
                            if user:
                                return {
                                    'id': user.id,
                                    'account_type': user.account_type,
                                    'email': user.email
                                }
                    except Exception:
                        pass
            
        return None
    
    def broadcast_admin_event(self, 
                            event_category: str,
                            event_data: Dict[str, Any],
                            affected_entities: Optional[List[Dict]] = None,
                            custom_priority: Optional[str] = None) -> bool:
        """
        Broadcast an admin event to relevant clients
        
        Args:
            event_category: Category of the event (from EventCategory)
            event_data: Data associated with the event
            affected_entities: List of entities affected (e.g., [{'type': 'course', 'id': 'course_123'}])
            custom_priority: Override default priority for this event
        
        Returns:
            bool: True if broadcast successful
        """
        try:
            if not self.socketio:
                logger.warning("WebSocket service not initialized")
                return False
            
            # Determine priority
            priority = custom_priority or self.priority_mapping.get(
                event_category, 
                EventPriority.MINOR
            )
            
            # Create event payload
            event_payload = {
                'event_id': f"evt_{int(datetime.utcnow().timestamp())}",
                'category': event_category,
                'priority': priority,
                'timestamp': datetime.utcnow().isoformat(),
                'data': event_data,
                'affected_entities': affected_entities or []
            }
            
            # Queue event for processing
            self.event_queue.append(event_payload)
            
            # Determine broadcast strategy based on priority
            if priority == EventPriority.CRITICAL:
                # Immediate broadcast to all users
                self._broadcast_immediate(event_payload)
            elif priority == EventPriority.IMPORTANT:
                # Broadcast with notification
                self._broadcast_with_notification(event_payload)
            else:
                # Queue for background sync
                self._queue_for_background_sync(event_payload)
            
            return True
            
        except Exception as e:
            logger.error(f"Error broadcasting admin event: {str(e)}")
            return False
    
    def _broadcast_immediate(self, event_payload: Dict):
        """Broadcast event immediately to all relevant clients"""
        try:
            # Broadcast to all connected clients
            self.socketio.emit('admin_update', event_payload)
            
            # Also broadcast to specific entity rooms if applicable
            for entity in event_payload.get('affected_entities', []):
                room_name = f"{entity['type']}_{entity['id']}"
                self.socketio.emit('entity_update', event_payload, room=room_name)
            
            logger.info(f"Critical event broadcast: {event_payload['event_id']}")
            
        except Exception as e:
            logger.error(f"Error in immediate broadcast: {str(e)}")
    
    def _broadcast_with_notification(self, event_payload: Dict):
        """Broadcast event with user notification"""
        try:
            # Add notification flag to payload
            event_payload['show_notification'] = True
            event_payload['notification_message'] = self._get_notification_message(event_payload)
            
            # Broadcast to all connected clients
            self.socketio.emit('admin_update_pending', event_payload)
            
            logger.info(f"Important event queued with notification: {event_payload['event_id']}")
            
        except Exception as e:
            logger.error(f"Error in notification broadcast: {str(e)}")
    
    def _queue_for_background_sync(self, event_payload: Dict):
        """Queue event for background synchronization"""
        try:
            # Add to background sync queue
            event_payload['sync_type'] = 'background'
            
            # Broadcast as low-priority update
            self.socketio.emit('background_sync_available', event_payload)
            
            logger.info(f"Minor event queued for background sync: {event_payload['event_id']}")
            
        except Exception as e:
            logger.error(f"Error in background sync queue: {str(e)}")
    
    def _get_notification_message(self, event_payload: Dict) -> str:
        """Generate user-friendly notification message based on event"""
        category = event_payload.get('category')
        messages = {
            EventCategory.COURSE_UPDATE: "Course information has been updated",
            EventCategory.ENROLLMENT: "Enrollment changes detected",
            EventCategory.SESSION_CHANGE: "Session schedule has been modified",
            EventCategory.AVAILABILITY_CHANGE: "Tutor availability has changed",
            EventCategory.USER_MANAGEMENT: "User information has been updated",
            EventCategory.SYSTEM_SETTINGS: "System settings have been modified",
            EventCategory.PAYMENT: "Payment information updated",
            EventCategory.PROFILE_UPDATE: "Profile information has been updated"
        }
        return messages.get(category, "Updates are available")
    
    def get_connected_clients_count(self) -> int:
        """Get count of currently connected clients"""
        return len(self.connected_clients)
    
    def get_event_queue_size(self) -> int:
        """Get size of current event queue"""
        return len(self.event_queue)
    
    def clear_event_queue(self):
        """Clear the event queue"""
        self.event_queue.clear()

    def broadcast_notification(self, user_id: str, notification_dict: dict, notification_type: str = "new") -> bool:
        """Send real-time notification to specific user"""
        try:
            if not self.socketio:
                logger.warning("WebSocket service not initialized")
                return False

            room_name = f"user_{user_id}"
            notification_data = {
                'type': notification_type,
                'notification': notification_dict,
                'timestamp': datetime.utcnow().isoformat(),
                'event_id': f"notif_{int(datetime.utcnow().timestamp())}"
            }

            self.socketio.emit('notification_event', notification_data, room=room_name)
            logger.info(f"Notification broadcast to user {user_id}: {notification_type}")
            return True

        except Exception as e:
            logger.error(f"Error broadcasting notification: {e}")
            return False

    def broadcast_unread_count_update(self, user_id: str, unread_count: int) -> bool:
        """Broadcast updated unread count to user"""
        try:
            if not self.socketio:
                logger.warning("WebSocket service not initialized")
                return False

            room_name = f"user_{user_id}"
            count_data = {
                'type': 'unread_count_update',
                'unread_count': unread_count,
                'timestamp': datetime.utcnow().isoformat()
            }

            self.socketio.emit('notification_count_update', count_data, room=room_name)
            logger.info(f"Unread count update broadcast to user {user_id}: {unread_count}")
            return True

        except Exception as e:
            logger.error(f"Error broadcasting unread count: {e}")
            return False

# Create global instance
websocket_service = WebSocketService()