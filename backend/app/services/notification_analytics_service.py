from datetime import datetime, timedelta
from sqlalchemy import func, desc
from app.models import Notification, User
from app import db
import logging

logger = logging.getLogger(__name__)

class NotificationAnalyticsService:

    def get_user_notification_stats(self, user_id, days=30):
        """Get notification statistics for a specific user"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)

            # Total notifications
            total_notifications = Notification.query.filter(
                Notification.user_id == user_id,
                Notification.created_at >= start_date
            ).count()

            # Unread notifications
            unread_notifications = Notification.query.filter(
                Notification.user_id == user_id,
                Notification.read == False
            ).count()

            # Read rate
            read_notifications = total_notifications - unread_notifications
            read_rate = (read_notifications / total_notifications * 100) if total_notifications > 0 else 0

            # Notifications by type
            type_stats = db.session.query(
                Notification.type,
                func.count(Notification.id).label('count')
            ).filter(
                Notification.user_id == user_id,
                Notification.created_at >= start_date
            ).group_by(Notification.type).all()

            # Daily notification count for the period
            daily_stats = db.session.query(
                func.date(Notification.created_at).label('date'),
                func.count(Notification.id).label('count')
            ).filter(
                Notification.user_id == user_id,
                Notification.created_at >= start_date
            ).group_by(func.date(Notification.created_at)).order_by(desc('date')).all()

            # Most recent notifications
            recent_notifications = Notification.query.filter(
                Notification.user_id == user_id
            ).order_by(desc(Notification.created_at)).limit(5).all()

            return {
                'period_days': days,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'total_notifications': total_notifications,
                'unread_notifications': unread_notifications,
                'read_notifications': read_notifications,
                'read_rate': round(read_rate, 2),
                'notifications_by_type': [
                    {'type': stat.type, 'count': stat.count}
                    for stat in type_stats
                ],
                'daily_stats': [
                    {'date': stat.date.isoformat(), 'count': stat.count}
                    for stat in daily_stats
                ],
                'recent_notifications': [notif.to_dict() for notif in recent_notifications]
            }

        except Exception as e:
            logger.error(f"Error getting user notification stats: {str(e)}")
            return None

    def get_notification_digest(self, user_id, period='daily'):
        """Generate a notification digest for a user"""
        try:
            if period == 'daily':
                start_date = datetime.utcnow() - timedelta(days=1)
                period_name = 'Daily'
            elif period == 'weekly':
                start_date = datetime.utcnow() - timedelta(days=7)
                period_name = 'Weekly'
            else:
                start_date = datetime.utcnow() - timedelta(days=30)
                period_name = 'Monthly'

            # Get notifications for the period
            notifications = Notification.query.filter(
                Notification.user_id == user_id,
                Notification.created_at >= start_date
            ).order_by(desc(Notification.created_at)).all()

            if not notifications:
                return {
                    'period': period_name.lower(),
                    'period_name': period_name,
                    'start_date': start_date.isoformat(),
                    'end_date': datetime.utcnow().isoformat(),
                    'total_notifications': 0,
                    'notifications': [],
                    'summary': f"No notifications in the last {period_name.lower()} period"
                }

            # Group by type for summary
            type_counts = {}
            important_notifications = []

            for notification in notifications:
                # Count by type
                if notification.type not in type_counts:
                    type_counts[notification.type] = 0
                type_counts[notification.type] += 1

                # Collect important notifications
                if self._is_important_notification(notification):
                    important_notifications.append(notification.to_dict())

            # Generate summary message
            summary_parts = []
            for notif_type, count in type_counts.items():
                readable_type = notif_type.replace('_', ' ').title()
                summary_parts.append(f"{count} {readable_type}")

            summary = f"{period_name} digest: {', '.join(summary_parts)}"

            return {
                'period': period_name.lower(),
                'period_name': period_name,
                'start_date': start_date.isoformat(),
                'end_date': datetime.utcnow().isoformat(),
                'total_notifications': len(notifications),
                'notifications_by_type': [
                    {'type': notif_type, 'count': count}
                    for notif_type, count in type_counts.items()
                ],
                'important_notifications': important_notifications,
                'all_notifications': [notif.to_dict() for notif in notifications],
                'summary': summary
            }

        except Exception as e:
            logger.error(f"Error generating notification digest: {str(e)}")
            return None

    def get_system_notification_stats(self, days=30):
        """Get system-wide notification statistics (admin only)"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)

            # Total notifications system-wide
            total_notifications = Notification.query.filter(
                Notification.created_at >= start_date
            ).count()

            # Notifications by type system-wide
            type_stats = db.session.query(
                Notification.type,
                func.count(Notification.id).label('count')
            ).filter(
                Notification.created_at >= start_date
            ).group_by(Notification.type).order_by(desc('count')).all()

            # Most active users (by notification count)
            user_stats = db.session.query(
                Notification.user_id,
                func.count(Notification.id).label('count')
            ).filter(
                Notification.created_at >= start_date
            ).group_by(Notification.user_id).order_by(desc('count')).limit(10).all()

            # Add user details to user stats
            user_stats_with_details = []
            for stat in user_stats:
                user = User.query.get(stat.user_id)
                user_stats_with_details.append({
                    'user_id': stat.user_id,
                    'user_email': user.email if user else 'Unknown',
                    'notification_count': stat.count
                })

            # Daily notification count for the period
            daily_stats = db.session.query(
                func.date(Notification.created_at).label('date'),
                func.count(Notification.id).label('count')
            ).filter(
                Notification.created_at >= start_date
            ).group_by(func.date(Notification.created_at)).order_by(desc('date')).all()

            return {
                'period_days': days,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'total_notifications': total_notifications,
                'notifications_by_type': [
                    {'type': stat.type, 'count': stat.count}
                    for stat in type_stats
                ],
                'most_active_users': user_stats_with_details,
                'daily_stats': [
                    {'date': stat.date.isoformat(), 'count': stat.count}
                    for stat in daily_stats
                ]
            }

        except Exception as e:
            logger.error(f"Error getting system notification stats: {str(e)}")
            return None

    def _is_important_notification(self, notification):
        """Determine if a notification is considered important"""
        important_types = [
            'ai_feedback',
            'session_reminder',
            'payment',
            'course_update',
            'system'
        ]
        return notification.type in important_types

# Create global instance
notification_analytics_service = NotificationAnalyticsService()