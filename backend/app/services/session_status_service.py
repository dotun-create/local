"""
Session Status Management Service

This service handles automatic session status updates based on scheduling and time.
It ensures sessions transition properly from scheduled -> in_progress -> completed/no_show.
"""

from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from app.models import Session, User
from app import db
import logging

logger = logging.getLogger(__name__)

class SessionStatus:
    """Session status constants"""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress" 
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class SessionStatusService:
    """Service for managing session status transitions"""
    
    @staticmethod
    def update_overdue_sessions():
        """
        Update sessions that have passed their scheduled time.
        This is designed to be called periodically (e.g., every 15 minutes).
        """
        try:
            now = datetime.utcnow()
            updated_count = 0
            
            # Find sessions that should be marked as no_show or completed
            overdue_sessions = Session.query.filter(
                and_(
                    Session.status == SessionStatus.SCHEDULED,
                    Session.scheduled_date < now - timedelta(minutes=15)  # 15 min grace period
                )
            ).all()
            
            for session in overdue_sessions:
                # Calculate session end time
                session_end = session.scheduled_date + timedelta(minutes=session.duration or 60)
                
                if now > session_end:
                    # Session has ended, update based on student participation
                    if session.students and len(session.students) > 0:
                        # Had students registered, assume completed
                        session.status = SessionStatus.COMPLETED
                        logger.info(f"Updated session {session.id} to completed")
                    else:
                        # No students, mark as no_show
                        session.status = SessionStatus.NO_SHOW
                        logger.info(f"Updated session {session.id} to no_show")
                    
                    updated_count += 1
            
            if updated_count > 0:
                db.session.commit()
                logger.info(f"Updated {updated_count} overdue sessions")
            
            return updated_count
            
        except Exception as e:
            logger.error(f"Error updating overdue sessions: {str(e)}")
            db.session.rollback()
            return 0
    
    @staticmethod
    def mark_session_in_progress(session_id):
        """
        Mark a session as in progress when it starts.
        Called when tutor joins the meeting.
        """
        try:
            session = Session.query.get(session_id)
            if not session:
                return False
            
            if session.status == SessionStatus.SCHEDULED:
                session.status = SessionStatus.IN_PROGRESS
                db.session.commit()
                logger.info(f"Session {session_id} marked as in progress")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error marking session {session_id} as in progress: {str(e)}")
            db.session.rollback()
            return False
    
    @staticmethod
    def complete_session(session_id, participants_count=None):
        """
        Mark a session as completed.
        Called when session ends or tutor manually marks it complete.
        """
        try:
            session = Session.query.get(session_id)
            if not session:
                return False
            
            if session.status in [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS]:
                session.status = SessionStatus.COMPLETED
                
                # Update participant count if provided
                if participants_count is not None:
                    session.zoom_participants_count = participants_count
                
                db.session.commit()
                logger.info(f"Session {session_id} marked as completed")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error completing session {session_id}: {str(e)}")
            db.session.rollback()
            return False
    
    @staticmethod
    def cancel_session(session_id, reason=None):
        """
        Cancel a session.
        Called when tutor or admin cancels a session.
        """
        try:
            session = Session.query.get(session_id)
            if not session:
                return False
            
            if session.status in [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS]:
                session.status = SessionStatus.CANCELLED
                db.session.commit()
                logger.info(f"Session {session_id} cancelled. Reason: {reason or 'Not specified'}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error cancelling session {session_id}: {str(e)}")
            db.session.rollback()
            return False
    
    @staticmethod
    def get_session_status_counts(tutor_id=None):
        """
        Get counts of sessions by status.
        Useful for dashboard statistics.
        """
        try:
            query = Session.query
            
            if tutor_id:
                query = query.filter(Session.tutor_id == tutor_id)
            
            status_counts = {}
            for status in [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS, 
                          SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.NO_SHOW]:
                count = query.filter(Session.status == status).count()
                status_counts[status] = count
            
            return status_counts
            
        except Exception as e:
            logger.error(f"Error getting session status counts: {str(e)}")
            return {}
    
    @staticmethod
    def find_orphaned_availability_slots():
        """
        Find availability slots that might be orphaned.
        This is a diagnostic function to identify cleanup opportunities.
        """
        try:
            # This would need to be implemented based on your availability model
            # For now, return empty list to avoid breaking anything
            logger.info("Orphaned slot detection not yet implemented")
            return []
            
        except Exception as e:
            logger.error(f"Error finding orphaned slots: {str(e)}")
            return []

# Initialize service on import
session_status_service = SessionStatusService()