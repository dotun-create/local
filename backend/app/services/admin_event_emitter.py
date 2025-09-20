"""
Admin Event Emitter Service

This service tracks admin actions and emits appropriate WebSocket events
for the hybrid refresh strategy.
"""

from typing import Dict, List, Any, Optional
from app.services.websocket_service import websocket_service, EventCategory, EventPriority
import logging

logger = logging.getLogger(__name__)

class AdminEventEmitter:
    """Service to emit events when admin performs CRUD operations"""
    
    def __init__(self):
        self.websocket_service = websocket_service
    
    def emit_user_created(self, user_data: Dict[str, Any]) -> bool:
        """Emit event when admin creates a new user"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.USER_MANAGEMENT,
                event_data={
                    'action': 'user_created',
                    'user_id': user_data.get('id'),
                    'user_type': user_data.get('account_type'),
                    'details': {
                        'email': user_data.get('email'),
                        'name': user_data.get('profile', {}).get('fullName')
                    }
                },
                affected_entities=[
                    {'type': 'user', 'id': user_data.get('id')}
                ]
            )
        except Exception as e:
            logger.error(f"Error emitting user_created event: {str(e)}")
            return False
    
    def emit_user_updated(self, user_id: str, changes: Dict[str, Any]) -> bool:
        """Emit event when admin updates a user"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.USER_MANAGEMENT,
                event_data={
                    'action': 'user_updated',
                    'user_id': user_id,
                    'changes': changes
                },
                affected_entities=[
                    {'type': 'user', 'id': user_id}
                ]
            )
        except Exception as e:
            logger.error(f"Error emitting user_updated event: {str(e)}")
            return False
    
    def emit_user_deleted(self, user_id: str) -> bool:
        """Emit event when admin deletes a user"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.USER_MANAGEMENT,
                event_data={
                    'action': 'user_deleted',
                    'user_id': user_id
                },
                affected_entities=[
                    {'type': 'user', 'id': user_id}
                ],
                custom_priority=EventPriority.CRITICAL
            )
        except Exception as e:
            logger.error(f"Error emitting user_deleted event: {str(e)}")
            return False
    
    def emit_course_created(self, course_data: Dict[str, Any]) -> bool:
        """Emit event when admin creates a new course"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.COURSE_UPDATE,
                event_data={
                    'action': 'course_created',
                    'course_id': course_data.get('id'),
                    'title': course_data.get('title'),
                    'details': {
                        'subject': course_data.get('subject'),
                        'grade_level': course_data.get('grade_level')
                    }
                },
                affected_entities=[
                    {'type': 'course', 'id': course_data.get('id')}
                ]
            )
        except Exception as e:
            logger.error(f"Error emitting course_created event: {str(e)}")
            return False
    
    def emit_course_updated(self, course_id: str, changes: Dict[str, Any]) -> bool:
        """Emit event when admin updates a course"""
        try:
            # Determine if this is a critical update
            is_critical = any(key in changes for key in ['price', 'status', 'tutors'])
            
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.COURSE_UPDATE,
                event_data={
                    'action': 'course_updated',
                    'course_id': course_id,
                    'changes': changes
                },
                affected_entities=[
                    {'type': 'course', 'id': course_id}
                ],
                custom_priority=EventPriority.CRITICAL if is_critical else None
            )
        except Exception as e:
            logger.error(f"Error emitting course_updated event: {str(e)}")
            return False
    
    def emit_course_deleted(self, course_id: str) -> bool:
        """Emit event when admin deletes a course"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.COURSE_UPDATE,
                event_data={
                    'action': 'course_deleted',
                    'course_id': course_id
                },
                affected_entities=[
                    {'type': 'course', 'id': course_id}
                ],
                custom_priority=EventPriority.CRITICAL
            )
        except Exception as e:
            logger.error(f"Error emitting course_deleted event: {str(e)}")
            return False
    
    def emit_enrollment_changed(self, enrollment_data: Dict[str, Any]) -> bool:
        """Emit event when enrollment is created, approved, or rejected"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.ENROLLMENT,
                event_data={
                    'action': 'enrollment_changed',
                    'enrollment_id': enrollment_data.get('id'),
                    'student_id': enrollment_data.get('student_id'),
                    'course_id': enrollment_data.get('course_id'),
                    'status': enrollment_data.get('status')
                },
                affected_entities=[
                    {'type': 'enrollment', 'id': enrollment_data.get('id')},
                    {'type': 'course', 'id': enrollment_data.get('course_id')},
                    {'type': 'user', 'id': enrollment_data.get('student_id')}
                ],
                custom_priority=EventPriority.CRITICAL
            )
        except Exception as e:
            logger.error(f"Error emitting enrollment_changed event: {str(e)}")
            return False
    
    def emit_session_created(self, session_data: Dict[str, Any]) -> bool:
        """Emit event when admin creates a new session"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.SESSION_CHANGE,
                event_data={
                    'action': 'session_created',
                    'session_id': session_data.get('id'),
                    'course_id': session_data.get('course_id'),
                    'scheduled_date': session_data.get('scheduled_date'),
                    'tutor_id': session_data.get('tutor_id')
                },
                affected_entities=[
                    {'type': 'session', 'id': session_data.get('id')},
                    {'type': 'course', 'id': session_data.get('course_id')},
                    {'type': 'user', 'id': session_data.get('tutor_id')}
                ],
                custom_priority=EventPriority.CRITICAL
            )
        except Exception as e:
            logger.error(f"Error emitting session_created event: {str(e)}")
            return False
    
    def emit_session_updated(self, session_id: str, changes: Dict[str, Any]) -> bool:
        """Emit event when admin updates a session"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.SESSION_CHANGE,
                event_data={
                    'action': 'session_updated',
                    'session_id': session_id,
                    'changes': changes
                },
                affected_entities=[
                    {'type': 'session', 'id': session_id}
                ],
                custom_priority=EventPriority.CRITICAL
            )
        except Exception as e:
            logger.error(f"Error emitting session_updated event: {str(e)}")
            return False
    
    def emit_session_cancelled(self, session_id: str, course_id: str) -> bool:
        """Emit event when admin cancels a session"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.SESSION_CHANGE,
                event_data={
                    'action': 'session_cancelled',
                    'session_id': session_id,
                    'course_id': course_id
                },
                affected_entities=[
                    {'type': 'session', 'id': session_id},
                    {'type': 'course', 'id': course_id}
                ],
                custom_priority=EventPriority.CRITICAL
            )
        except Exception as e:
            logger.error(f"Error emitting session_cancelled event: {str(e)}")
            return False
    
    def emit_payment_processed(self, payment_data: Dict[str, Any]) -> bool:
        """Emit event when payment is processed"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.PAYMENT,
                event_data={
                    'action': 'payment_processed',
                    'payment_id': payment_data.get('id'),
                    'guardian_id': payment_data.get('guardian_id'),
                    'amount': payment_data.get('amount'),
                    'credits_added': payment_data.get('credits_added')
                },
                affected_entities=[
                    {'type': 'payment', 'id': payment_data.get('id')},
                    {'type': 'user', 'id': payment_data.get('guardian_id')}
                ],
                custom_priority=EventPriority.CRITICAL
            )
        except Exception as e:
            logger.error(f"Error emitting payment_processed event: {str(e)}")
            return False
    
    def emit_availability_changed(self, tutor_id: str, changes: Dict[str, Any]) -> bool:
        """Emit event when tutor availability is changed"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.AVAILABILITY_CHANGE,
                event_data={
                    'action': 'availability_changed',
                    'tutor_id': tutor_id,
                    'changes': changes
                },
                affected_entities=[
                    {'type': 'user', 'id': tutor_id}
                ]
            )
        except Exception as e:
            logger.error(f"Error emitting availability_changed event: {str(e)}")
            return False
    
    def emit_system_settings_changed(self, setting_key: str, new_value: Any) -> bool:
        """Emit event when system settings are changed"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.SYSTEM_SETTINGS,
                event_data={
                    'action': 'settings_changed',
                    'setting_key': setting_key,
                    'new_value': new_value
                },
                affected_entities=[],
                custom_priority=EventPriority.IMPORTANT
            )
        except Exception as e:
            logger.error(f"Error emitting system_settings_changed event: {str(e)}")
            return False
    
    def emit_bulk_operation_complete(self, operation_type: str, 
                                    affected_count: int,
                                    details: Dict[str, Any]) -> bool:
        """Emit event when a bulk operation completes"""
        try:
            return self.websocket_service.broadcast_admin_event(
                event_category=EventCategory.USER_MANAGEMENT,
                event_data={
                    'action': 'bulk_operation_complete',
                    'operation_type': operation_type,
                    'affected_count': affected_count,
                    'details': details
                },
                affected_entities=[],
                custom_priority=EventPriority.IMPORTANT
            )
        except Exception as e:
            logger.error(f"Error emitting bulk_operation_complete event: {str(e)}")
            return False

# Create global instance
admin_event_emitter = AdminEventEmitter()