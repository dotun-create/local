from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Notification
from app.services.notification_analytics_service import notification_analytics_service
from app import db
import uuid
import logging

logger = logging.getLogger(__name__)

@api_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications for current user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        read_status = request.args.get('read')
        notification_type = request.args.get('type')
        
        query = Notification.query.filter_by(user_id=current_user_id)
        
        if read_status is not None:
            query = query.filter_by(read=read_status.lower() == 'true')
        
        if notification_type:
            query = query.filter_by(type=notification_type)
        
        notifications = query.order_by(Notification.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'notifications': [notification.to_dict() for notification in notifications.items],
            'totalNotifications': notifications.total,
            'totalPages': notifications.pages,
            'currentPage': page,
            'hasNext': notifications.has_next,
            'hasPrev': notifications.has_prev,
            'unreadCount': Notification.query.filter_by(user_id=current_user_id, read=False).count()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications', methods=['POST'])
@jwt_required()
def create_notification():
    """Create notification (admin only or system generated)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        required_fields = ['userId', 'type', 'message']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if target user exists
        target_user = User.query.get(data['userId'])
        if not target_user:
            return jsonify({'error': 'Target user not found'}), 404
        
        notification = Notification(
            id=f"notification_{uuid.uuid4().hex[:8]}",
            user_id=data['userId'],
            type=data['type'],
            title=data.get('title'),
            message=data['message'],
            data=data.get('data', {})
        )
        
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'notification': notification.to_dict(),
            'message': 'Notification created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/<string:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark notification as read"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Check if notification belongs to current user
        if notification.user_id != current_user_id:
            return jsonify({'error': 'Access denied'}), 403
        
        notification.read = True
        db.session.commit()

        # NEW: Broadcast update via WebSocket
        try:
            from app.services.websocket_service import websocket_service
            websocket_service.broadcast_notification(
                current_user_id,
                notification.to_dict(),
                "read"
            )

            # Update unread count
            unread_count = Notification.query.filter_by(user_id=current_user_id, read=False).count()
            websocket_service.broadcast_unread_count_update(current_user_id, unread_count)
        except Exception as ws_error:
            logger.warning(f"WebSocket broadcast failed for notification read {notification_id}: {ws_error}")

        return jsonify({
            'notification': notification.to_dict(),
            'message': 'Notification marked as read'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_notifications_read():
    """Mark all notifications as read for current user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        Notification.query.filter_by(
            user_id=current_user_id,
            read=False
        ).update({'read': True})

        db.session.commit()

        # NEW: Broadcast update via WebSocket
        try:
            from app.services.websocket_service import websocket_service
            websocket_service.broadcast_unread_count_update(current_user_id, 0)
        except Exception as ws_error:
            logger.warning(f"WebSocket broadcast failed for mark all read: {ws_error}")

        return jsonify({'message': 'All notifications marked as read'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/<string:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    """Delete notification"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Check if notification belongs to current user or user is admin
        if (notification.user_id != current_user_id and 
            current_user.account_type != 'admin'):
            return jsonify({'error': 'Access denied'}), 403
        
        db.session.delete(notification)
        db.session.commit()

        # NEW: Broadcast update via WebSocket
        try:
            from app.services.websocket_service import websocket_service
            websocket_service.broadcast_notification(
                notification.user_id,
                {'id': notification_id},
                "deleted"
            )

            # Update unread count if it was unread
            if not notification.read:
                unread_count = Notification.query.filter_by(user_id=notification.user_id, read=False).count()
                websocket_service.broadcast_unread_count_update(notification.user_id, unread_count)
        except Exception as ws_error:
            logger.warning(f"WebSocket broadcast failed for notification delete {notification_id}: {ws_error}")

        return jsonify({'message': 'Notification deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/broadcast', methods=['POST'])
@jwt_required()
def broadcast_notification():
    """Send notification to multiple users (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        required_fields = ['type', 'message']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        user_ids = data.get('userIds', [])
        account_types = data.get('accountTypes', [])
        
        # If no specific users provided, get users by account type
        if not user_ids and account_types:
            users = User.query.filter(User.account_type.in_(account_types)).all()
            user_ids = [user.id for user in users]
        elif not user_ids and not account_types:
            # Broadcast to all users
            users = User.query.all()
            user_ids = [user.id for user in users]
        
        if not user_ids:
            return jsonify({'error': 'No users specified'}), 400
        
        notifications = []
        for user_id in user_ids:
            notification = Notification(
                id=f"notification_{uuid.uuid4().hex[:8]}",
                user_id=user_id,
                type=data['type'],
                title=data.get('title'),
                message=data['message'],
                data=data.get('data', {})
            )
            notifications.append(notification)
        
        db.session.add_all(notifications)
        db.session.commit()
        
        return jsonify({
            'message': f'Notification sent to {len(notifications)} users',
            'count': len(notifications)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/preferences', methods=['GET'])
@jwt_required()
def get_notification_preferences():
    """Get notification preferences for current user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get preferences from user profile
        preferences = {}
        if current_user.profile and 'notification_preferences' in current_user.profile:
            preferences = current_user.profile['notification_preferences']
        else:
            # Return default preferences
            preferences = {
                'email_enabled': True,
                'ai_feedback': {
                    'email': True,
                    'push': True
                },
                'session_reminders': {
                    'email': True,
                    'push': True
                },
                'general_announcements': {
                    'email': True,
                    'push': False
                }
            }
        
        return jsonify({'preferences': preferences}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/preferences', methods=['PUT'])
@jwt_required()
def update_notification_preferences():
    """Update notification preferences for current user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        if not data or 'preferences' not in data:
            return jsonify({'error': 'Preferences data is required'}), 400
        
        new_preferences = data['preferences']
        
        # Validate preferences structure
        valid_keys = ['email_enabled', 'ai_feedback', 'session_reminders', 'general_announcements']
        for key in new_preferences:
            if key not in valid_keys:
                return jsonify({'error': f'Invalid preference key: {key}'}), 400
        
        # Ensure profile exists
        if not current_user.profile:
            current_user.profile = {}
        
        # Update notification preferences
        current_user.profile['notification_preferences'] = new_preferences
        
        # Mark profile as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(current_user, 'profile')
        
        db.session.commit()
        
        return jsonify({
            'message': 'Notification preferences updated successfully',
            'preferences': new_preferences
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/test-email', methods=['POST'])
@jwt_required()
def send_test_notification_email():
    """Send a test email notification to current user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        from app.services.notification_service import notification_service
        from app.utils.email_helper import send_email
        
        # Send test email
        user_name = current_user.profile.get('name', current_user.email) if current_user.profile else current_user.email
        
        subject = "Test Email Notification - Tutor Academy"
        text_content = f"""
        Hi {user_name},

        This is a test email notification from Tutor Academy.

        If you're receiving this email, your notification settings are working correctly.

        Best regards,
        The Tutor Academy Team
        """
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h2 style="margin: 0;">✅ Test Email Notification</h2>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                    <p>Hi <strong>{user_name}</strong>,</p>
                    
                    <p>This is a test email notification from Tutor Academy.</p>
                    
                    <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <strong>✅ Your email notification settings are working correctly!</strong>
                    </div>
                    
                    <p>Best regards,<br>
                    <strong>The Tutor Academy Team</strong></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        email_sent = send_email(current_user.email, subject, text_content, html_content)
        
        if email_sent:
            return jsonify({'message': 'Test email sent successfully'}), 200
        else:
            return jsonify({'error': 'Failed to send test email'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/analytics/stats', methods=['GET'])
@jwt_required()
def get_notification_analytics():
    """Get notification analytics for current user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        days = request.args.get('days', 30, type=int)
        if days > 365:
            days = 365  # Limit to 1 year

        stats = notification_analytics_service.get_user_notification_stats(current_user_id, days)

        if stats is None:
            return jsonify({'error': 'Failed to generate analytics'}), 500

        return jsonify({'analytics': stats}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/analytics/digest', methods=['GET'])
@jwt_required()
def get_notification_digest():
    """Get notification digest for current user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        period = request.args.get('period', 'daily')
        if period not in ['daily', 'weekly', 'monthly']:
            period = 'daily'

        digest = notification_analytics_service.get_notification_digest(current_user_id, period)

        if digest is None:
            return jsonify({'error': 'Failed to generate digest'}), 500

        return jsonify({'digest': digest}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/notifications/analytics/system', methods=['GET'])
@jwt_required()
def get_system_notification_analytics():
    """Get system-wide notification analytics (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        days = request.args.get('days', 30, type=int)
        if days > 365:
            days = 365  # Limit to 1 year

        stats = notification_analytics_service.get_system_notification_stats(days)

        if stats is None:
            return jsonify({'error': 'Failed to generate system analytics'}), 500

        return jsonify({'system_analytics': stats}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500