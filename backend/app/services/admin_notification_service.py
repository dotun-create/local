"""
Admin Notification Service
Handles email notifications to administrators for session analysis issues
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Optional
from app.models import Session, User, Course
from app import db

logger = logging.getLogger(__name__)

class AdminNotificationService:
    """Service for sending admin notifications about session analysis issues"""
    
    def __init__(self):
        self.sender_email = os.environ.get('SENDER_EMAIL', 'internal@troupe.academy')
        self.sender_password = os.environ.get('SENDER_PASSWORD', '')
        self.sender_name = os.environ.get('SENDER_NAME', 'Troupe Academy')
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.mail.eu-west-1.awsapps.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', 465))
        self.smtp_use_ssl = os.environ.get('SMTP_USE_SSL', 'true').lower() == 'true'
        
        # Check if email is configured
        self.email_configured = bool(self.sender_email and self.sender_password)
        
        if not self.email_configured:
            logger.warning("Email notifications not configured - admin notifications will be logged only")
    
    def get_admin_emails(self) -> list:
        """Get list of admin email addresses"""
        try:
            admins = User.query.filter_by(account_type='admin', is_active=True).all()
            return [admin.email for admin in admins if admin.email]
        except Exception as e:
            logger.error(f"Error fetching admin emails: {str(e)}")
            return []
    
    def get_session_details(self, session: Session) -> Dict:
        """Get detailed session information for notifications"""
        try:
            # Get course information
            course = Course.query.get(session.course_id) if session.course_id else None
            
            # Get tutor information
            tutor = User.query.get(session.tutor_id) if session.tutor_id else None
            
            # Get student information
            students = session.students if hasattr(session, 'students') else []
            student_names = [s.profile.get('name', s.email) if s.profile else s.email for s in students]
            
            return {
                'session_id': session.id,
                'meeting_id': session.meeting_id,
                'meeting_uuid': session.meeting_uuid,
                'title': session.title,
                'scheduled_date': session.scheduled_date,
                'duration': session.duration,
                'course_title': course.title if course else 'Unknown Course',
                'tutor_name': tutor.profile.get('name', tutor.email) if tutor and tutor.profile else (tutor.email if tutor else 'Unknown Tutor'),
                'student_names': student_names,
                'status': session.status
            }
        except Exception as e:
            logger.error(f"Error getting session details: {str(e)}")
            return {
                'session_id': session.id,
                'meeting_id': session.meeting_id or 'Unknown',
                'meeting_uuid': session.meeting_uuid or 'Unknown',
                'title': session.title or 'Unknown Session',
                'scheduled_date': session.scheduled_date,
                'error': f"Could not fetch full details: {str(e)}"
            }
    
    def send_email_notification(self, subject: str, body: str, is_html: bool = False) -> bool:
        """Send email notification to all admins"""
        if not self.email_configured:
            logger.info(f"Email not configured - logging notification:\nSubject: {subject}\nBody: {body}")
            return False
        
        admin_emails = self.get_admin_emails()
        if not admin_emails:
            logger.warning("No admin email addresses found")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.sender_name} <{self.sender_email}>"
            msg['To'] = ', '.join(admin_emails)
            msg['Subject'] = subject
            
            # Add body
            if is_html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            if self.smtp_use_ssl:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            
            server.login(self.sender_email, self.sender_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Admin notification sent to {len(admin_emails)} admins: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send admin notification: {str(e)}")
            return False
    
    def notify_no_recordings_available(self, session: Session) -> None:
        """Notify admin when no recordings are available for a session"""
        details = self.get_session_details(session)
        
        subject = f"No Recordings Available - Session {details['meeting_id']}"
        
        body = f"""
TROUPE ACADEMY - SESSION RECORDING ALERT

No recordings were generated for the following session:

SESSION DETAILS:
- Meeting ID: {details['meeting_id']}
- Meeting UUID: {details['meeting_uuid']}
- Session Title: {details['title']}
- Scheduled Date: {details['scheduled_date'].strftime('%Y-%m-%d %H:%M:%S UTC')}
- Course: {details.get('course_title', 'Unknown')}
- Tutor: {details.get('tutor_name', 'Unknown')}
- Students: {', '.join(details.get('student_names', [])) if details.get('student_names') else 'None'}

ISSUE:
No recording.completed webhook was received from Zoom for this session. This could indicate:
- Recording was not enabled during the meeting
- Technical issue with Zoom recording service
- Meeting was very short or had no participants

ACTION:
- Session status remains as 'completed'
- No AI analysis will be performed for this session
- Consider checking Zoom settings for future sessions

This is an automated notification from the Troupe Academy system.
        """.strip()
        
        self.send_email_notification(subject, body)
    
    def notify_recordings_not_enabled(self, session: Session) -> None:
        """Notify admin when recordings/transcripts weren't enabled during meeting creation"""
        details = self.get_session_details(session)
        
        subject = f"Recording Not Enabled - Session {details['meeting_id']}"
        
        body = f"""
TROUPE ACADEMY - SESSION RECORDING CONFIGURATION ALERT

Recording and transcript features were not enabled for the following session:

SESSION DETAILS:
- Meeting ID: {details['meeting_id']}
- Meeting UUID: {details['meeting_uuid']}
- Session Title: {details['title']}
- Scheduled Date: {details['scheduled_date'].strftime('%Y-%m-%d %H:%M:%S UTC')}
- Course: {details.get('course_title', 'Unknown')}
- Tutor: {details.get('tutor_name', 'Unknown')}
- Students: {', '.join(details.get('student_names', [])) if details.get('student_names') else 'None'}

ISSUE:
The Zoom meeting was created without recording and transcript features enabled.

RECOMMENDATION:
- Verify Zoom API configuration includes auto-recording settings
- Check that future meetings are created with recording enabled by default
- Review session creation process to ensure proper Zoom settings

ACTION:
- Session status remains as 'completed'
- No AI analysis will be performed for this session

This is an automated notification from the Troupe Academy system.
        """.strip()
        
        self.send_email_notification(subject, body)
    
    def notify_transcript_download_failed(self, session: Session, error_details: str, download_url: str = None) -> None:
        """Notify admin when transcript download fails"""
        details = self.get_session_details(session)
        
        subject = f"Transcript Download Failed - Session {details['meeting_id']}"
        
        body = f"""
TROUPE ACADEMY - TRANSCRIPT PROCESSING ALERT

Failed to download transcript for the following session:

SESSION DETAILS:
- Meeting ID: {details['meeting_id']}
- Meeting UUID: {details['meeting_uuid']}
- Session Title: {details['title']}
- Scheduled Date: {details['scheduled_date'].strftime('%Y-%m-%d %H:%M:%S UTC')}
- Course: {details.get('course_title', 'Unknown')}
- Tutor: {details.get('tutor_name', 'Unknown')}
- Students: {', '.join(details.get('student_names', [])) if details.get('student_names') else 'None'}

ERROR DETAILS:
{error_details}

DOWNLOAD URL:
{download_url if download_url else 'Not available'}

ISSUE TYPE: Transcript processing failed
- Transcript was available but download/processing failed
- Session status may remain as 'ready_for_analysis'

ACTION REQUIRED:
- Check Zoom API credentials and permissions
- Verify network connectivity to Zoom servers
- Consider manual transcript download if needed
- Review error logs for additional details

This is an automated notification from the Troupe Academy system.
        """.strip()
        
        self.send_email_notification(subject, body)
    
    def notify_ai_analysis_failed(self, session: Session, error_details: str) -> None:
        """Notify admin when AI analysis fails"""
        details = self.get_session_details(session)
        
        subject = f"AI Analysis Failed - Session {details['meeting_id']}"
        
        body = f"""
TROUPE ACADEMY - AI ANALYSIS ALERT

AI analysis failed for the following session:

SESSION DETAILS:
- Meeting ID: {details['meeting_id']}
- Meeting UUID: {details['meeting_uuid']}
- Session Title: {details['title']}
- Scheduled Date: {details['scheduled_date'].strftime('%Y-%m-%d %H:%M:%S UTC')}
- Course: {details.get('course_title', 'Unknown')}
- Tutor: {details.get('tutor_name', 'Unknown')}
- Students: {', '.join(details.get('student_names', [])) if details.get('student_names') else 'None'}

ERROR DETAILS:
{error_details}

ISSUE TYPE: AI analysis processing failed
- Transcript was available but AI processing failed
- Session status remains as 'ready_for_analysis'

ACTION REQUIRED:
- Check OpenAI API configuration and credits
- Verify AI service availability
- Review transcript quality and format
- Consider manual analysis if needed

This is an automated notification from the Troupe Academy system.
        """.strip()
        
        self.send_email_notification(subject, body)
    
    def notify_no_transcript_available(self, session: Session, reason: str = "Unknown") -> None:
        """Notify admin when no transcript is available from Zoom"""
        details = self.get_session_details(session)
        
        subject = f"No Transcript Available - Session {details['meeting_id']}"
        
        body = f"""
TROUPE ACADEMY - TRANSCRIPT AVAILABILITY ALERT

No transcript was generated for the following session:

SESSION DETAILS:
- Meeting ID: {details['meeting_id']}
- Meeting UUID: {details['meeting_uuid']}
- Session Title: {details['title']}
- Scheduled Date: {details['scheduled_date'].strftime('%Y-%m-%d %H:%M:%S UTC')}
- Course: {details.get('course_title', 'Unknown')}
- Tutor: {details.get('tutor_name', 'Unknown')}
- Students: {', '.join(details.get('student_names', [])) if details.get('student_names') else 'None'}

REASON:
{reason}

ISSUE TYPE: No transcript was generated by Zoom
This could be due to:
- Transcript feature disabled in Zoom settings
- Poor audio quality preventing transcription
- Meeting duration too short for transcription
- No speech detected during the session

ACTION:
- Session status remains as 'completed'
- No AI analysis will be performed
- Consider reviewing Zoom transcription settings

This is an automated notification from the Troupe Academy system.
        """.strip()
        
        self.send_email_notification(subject, body)

# Create global instance
admin_notification_service = AdminNotificationService()