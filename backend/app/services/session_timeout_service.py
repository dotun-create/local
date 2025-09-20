"""
Session Timeout Service
Handles timeout mechanisms for recording and analysis processes
"""

import os
import logging
from datetime import datetime, timedelta
from typing import List
from app import db
from app.models import Session
from app.services.admin_notification_service import admin_notification_service
from app.services.session_status_service import session_status_service
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

class SessionTimeoutService:
    """Service for handling session analysis timeouts"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.is_running = False
        
        # Timeout configurations (in minutes)
        self.recording_timeout = int(os.environ.get('RECORDING_TIMEOUT_MINUTES', 30))  # 30 min after meeting ends
        self.analysis_timeout = int(os.environ.get('ANALYSIS_TIMEOUT_MINUTES', 60))   # 60 min after ready_for_analysis
        
        logger.info(f"Session timeout service configured: recording={self.recording_timeout}min, analysis={self.analysis_timeout}min")
    
    def start_scheduler(self):
        """Start the timeout monitoring scheduler"""
        if self.is_running:
            logger.warning("Session timeout service already running")
            return
        
        try:
            # Run timeout check every 15 minutes
            self.scheduler.add_job(
                func=self.check_timeouts,
                trigger='interval',
                minutes=15,
                id='session_timeout_checker',
                name='Session Timeout Checker',
                replace_existing=True,
                max_instances=1
            )
            
            # Run session status updates every 15 minutes
            self.scheduler.add_job(
                func=session_status_service.update_overdue_sessions,
                trigger='interval',
                minutes=15,
                id='session_status_updater',
                name='Session Status Updater',
                replace_existing=True,
                max_instances=1
            )
            
            self.scheduler.start()
            self.is_running = True
            logger.info("Session timeout service started")
            
        except Exception as e:
            logger.error(f"Failed to start session timeout service: {str(e)}")
    
    def stop_scheduler(self):
        """Stop the timeout monitoring scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
        self.is_running = False
        logger.info("Session timeout service stopped")
    
    def check_timeouts(self):
        """Check for sessions that have timed out"""
        try:
            logger.info("Checking for session timeouts...")
            
            # Check for recording timeouts
            recording_timeouts = self.find_recording_timeouts()
            for session in recording_timeouts:
                self.handle_recording_timeout(session)
            
            # Check for analysis timeouts
            analysis_timeouts = self.find_analysis_timeouts()
            for session in analysis_timeouts:
                self.handle_analysis_timeout(session)
                
            if recording_timeouts or analysis_timeouts:
                logger.info(f"Processed {len(recording_timeouts)} recording timeouts and {len(analysis_timeouts)} analysis timeouts")
            
        except Exception as e:
            logger.error(f"Error during timeout check: {str(e)}")
    
    def find_recording_timeouts(self) -> List[Session]:
        """Find sessions that are completed but haven't received recording webhooks within timeout"""
        try:
            timeout_cutoff = datetime.utcnow() - timedelta(minutes=self.recording_timeout)
            
            # Find sessions that are still 'completed' (not moved to ready_for_analysis)
            # and were completed more than recording_timeout minutes ago
            sessions = db.session.query(Session).filter(
                Session.status == 'completed',
                Session.scheduled_date < timeout_cutoff,  # Use scheduled_date as proxy for completion time
                Session.meeting_id.isnot(None)  # Only check sessions that had Zoom meetings
            ).all()
            
            # Additional filtering - only sessions that should have recordings
            # (i.e., sessions created after we enabled recording by default)
            recent_sessions = [s for s in sessions if s.created_at and s.created_at > (datetime.utcnow() - timedelta(days=7))]
            
            return recent_sessions
            
        except Exception as e:
            logger.error(f"Error finding recording timeouts: {str(e)}")
            return []
    
    def find_analysis_timeouts(self) -> List[Session]:
        """Find sessions that are ready_for_analysis but haven't been analyzed within timeout"""
        try:
            timeout_cutoff = datetime.utcnow() - timedelta(minutes=self.analysis_timeout)
            
            # Find sessions that have been in ready_for_analysis status for too long
            # Note: We don't have a status_changed_at field, so we'll use feedback_generated_at as a proxy
            # or fall back to scheduled_date
            sessions = db.session.query(Session).filter(
                Session.status == 'ready_for_analysis',
                Session.scheduled_date < timeout_cutoff  # Conservative approach
            ).all()
            
            return sessions
            
        except Exception as e:
            logger.error(f"Error finding analysis timeouts: {str(e)}")
            return []
    
    def handle_recording_timeout(self, session: Session):
        """Handle a session that has timed out waiting for recordings"""
        try:
            logger.warning(f"Recording timeout for session {session.id}")
            
            # Check if this session was created with recording enabled
            meeting_created_recently = session.created_at and session.created_at > (datetime.utcnow() - timedelta(days=7))
            
            if meeting_created_recently:
                # This session should have had recording enabled
                admin_notification_service.notify_recordings_not_enabled(session)
                logger.info(f"Notified admin about missing recordings for session {session.id}")
            else:
                # Older session, might not have had recording enabled by default
                admin_notification_service.notify_no_recordings_available(session)
                logger.info(f"Notified admin about no recordings for older session {session.id}")
            
        except Exception as e:
            logger.error(f"Error handling recording timeout for session {session.id}: {str(e)}")
    
    def handle_analysis_timeout(self, session: Session):
        """Handle a session that has timed out waiting for AI analysis"""
        try:
            logger.warning(f"Analysis timeout for session {session.id}")
            
            # Notify admin about analysis timeout
            admin_notification_service.notify_ai_analysis_failed(
                session,
                f"AI analysis timed out after {self.analysis_timeout} minutes. " +
                "This may indicate an issue with the AI service or processing queue."
            )
            
            # Optionally, we could retry analysis here or mark as analyzed without AI feedback
            # For now, we'll leave it as ready_for_analysis for manual intervention
            
            logger.info(f"Notified admin about analysis timeout for session {session.id}")
            
        except Exception as e:
            logger.error(f"Error handling analysis timeout for session {session.id}: {str(e)}")
    
    def reset_session_for_retry(self, session_id: str) -> bool:
        """Reset a session status for retry (admin tool)"""
        try:
            session = Session.query.get(session_id)
            if not session:
                logger.error(f"Session {session_id} not found for reset")
                return False
            
            if session.status == 'analyzed':
                session.status = 'ready_for_analysis'
                # Clear previous AI feedback to force regeneration
                session.ai_tutor_feedback = None
                session.session_rating = None
                session.feedback_generated_at = None
                
            elif session.status == 'ready_for_analysis':
                session.status = 'completed'
                # Clear transcript to force re-download
                session.transcript_text = None
                
            db.session.commit()
            logger.info(f"Session {session_id} reset from {session.status} for retry")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting session {session_id}: {str(e)}")
            return False

# Create global instance
session_timeout_service = SessionTimeoutService()