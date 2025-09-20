import uuid
from datetime import datetime
from typing import Dict, List, Optional
import logging
from app import db
from app.models import User, Notification, StudentSessionFeedback, Session, Course
from app.utils.email_helper import send_email

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        pass
    
    def create_notification(self, user_id: str, notification_type: str, title: str, 
                           message: str, data: Dict = None) -> Optional[Notification]:
        """
        Create a new notification for a user
        
        Args:
            user_id (str): ID of the user to receive the notification
            notification_type (str): Type of notification
            title (str): Notification title
            message (str): Notification message
            data (Dict): Additional data for the notification
        
        Returns:
            Optional[Notification]: Created notification or None if failed
        """
        try:
            notification = Notification(
                id=f"notification_{uuid.uuid4().hex[:8]}",
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                data=data or {}
            )
            
            db.session.add(notification)
            db.session.commit()

            logger.info(f"Created notification {notification.id} for user {user_id}")

            # NEW: Broadcast via WebSocket
            try:
                from app.services.websocket_service import websocket_service
                websocket_service.broadcast_notification(user_id, notification.to_dict(), "new")

                # Update unread count
                unread_count = Notification.query.filter_by(user_id=user_id, read=False).count()
                websocket_service.broadcast_unread_count_update(user_id, unread_count)
            except Exception as ws_error:
                logger.warning(f"WebSocket broadcast failed for notification {notification.id}: {ws_error}")

            return notification
            
        except Exception as e:
            logger.error(f"Failed to create notification for user {user_id}: {e}")
            db.session.rollback()
            return None
    
    def send_ai_feedback_notification(self, session_id: str, feedback_type: str = 'both') -> Dict:
        """
        Send AI feedback notifications for a completed session
        
        Args:
            session_id (str): ID of the processed session
            feedback_type (str): Type of feedback to send ('tutor', 'guardian', or 'both')
        
        Returns:
            Dict: Results of notification sending
        """
        try:
            results = {
                'tutor_notifications': 0,
                'guardian_notifications': 0,
                'emails_sent': 0,
                'errors': []
            }
            
            # Get session details
            session = Session.query.get(session_id)
            if not session:
                results['errors'].append(f"Session {session_id} not found")
                return results
            
            # Send tutor feedback notification
            if feedback_type in ['tutor', 'both'] and session.ai_tutor_feedback:
                tutor_result = self._send_tutor_feedback_notification(session)
                if tutor_result:
                    results['tutor_notifications'] += 1
                    if tutor_result.get('email_sent'):
                        results['emails_sent'] += 1
                else:
                    results['errors'].append(f"Failed to send tutor notification for session {session_id}")
            
            # Send guardian feedback notifications
            if feedback_type in ['guardian', 'both']:
                guardian_feedbacks = StudentSessionFeedback.query.filter_by(session_id=session_id).all()
                for feedback in guardian_feedbacks:
                    guardian_result = self._send_guardian_feedback_notification(session, feedback)
                    if guardian_result:
                        results['guardian_notifications'] += 1
                        if guardian_result.get('email_sent'):
                            results['emails_sent'] += 1
                    else:
                        results['errors'].append(f"Failed to send guardian notification for feedback {feedback.id}")
            
            logger.info(f"AI feedback notifications sent for session {session_id}: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error sending AI feedback notifications for session {session_id}: {e}")
            results['errors'].append(str(e))
            return results
    
    def _send_tutor_feedback_notification(self, session: Session) -> Optional[Dict]:
        """
        Send AI feedback notification to the session tutor
        
        Args:
            session (Session): The session object
        
        Returns:
            Optional[Dict]: Result of notification sending
        """
        try:
            if not session.tutor_id or not session.ai_tutor_feedback:
                return None
            
            tutor = User.query.get(session.tutor_id)
            if not tutor:
                return None
            
            # Create notification
            title = f"AI Feedback Available - {session.title}"
            message = f"AI feedback is now available for your session '{session.title}' completed on {session.scheduled_date.strftime('%Y-%m-%d')}."
            
            if session.session_rating:
                message += f" Session rating: {session.session_rating}/5.0"
            
            notification_data = {
                'session_id': session.id,
                'session_title': session.title,
                'session_date': session.scheduled_date.isoformat() if session.scheduled_date else None,
                'rating': session.session_rating,
                'feedback_type': 'tutor_ai_feedback'
            }
            
            notification = self.create_notification(
                user_id=tutor.id,
                notification_type='ai_feedback',
                title=title,
                message=message,
                data=notification_data
            )
            
            result = {'notification_created': bool(notification)}
            
            # Send email notification if user preferences allow
            if notification and self._should_send_email(tutor, 'ai_feedback'):
                email_sent = self._send_tutor_feedback_email(tutor, session)
                result['email_sent'] = email_sent
            else:
                result['email_sent'] = False
            
            return result
            
        except Exception as e:
            logger.error(f"Error sending tutor feedback notification: {e}")
            return None
    
    def _send_guardian_feedback_notification(self, session: Session, feedback: StudentSessionFeedback) -> Optional[Dict]:
        """
        Send AI feedback notification to a guardian
        
        Args:
            session (Session): The session object
            feedback (StudentSessionFeedback): The feedback object for the student
        
        Returns:
            Optional[Dict]: Result of notification sending
        """
        try:
            if not feedback.guardian_id or not feedback.ai_guardian_feedback:
                return None
            
            guardian = User.query.get(feedback.guardian_id)
            student = User.query.get(feedback.student_id)
            
            if not guardian or not student:
                return None
            
            # Create notification
            student_name = student.profile.get('name', 'Student') if student.profile else 'Student'
            title = f"AI Feedback Available for {student_name}"
            message = f"Personalized AI feedback is now available for {student_name}'s session '{session.title}' completed on {session.scheduled_date.strftime('%Y-%m-%d')}."
            
            notification_data = {
                'session_id': session.id,
                'session_title': session.title,
                'session_date': session.scheduled_date.isoformat() if session.scheduled_date else None,
                'student_id': feedback.student_id,
                'student_name': student_name,
                'feedback_id': feedback.id,
                'feedback_type': 'guardian_ai_feedback'
            }
            
            notification = self.create_notification(
                user_id=guardian.id,
                notification_type='ai_feedback',
                title=title,
                message=message,
                data=notification_data
            )
            
            result = {'notification_created': bool(notification)}
            
            # Send email notification if user preferences allow
            if notification and self._should_send_email(guardian, 'ai_feedback'):
                email_sent = self._send_guardian_feedback_email(guardian, student, session, feedback)
                result['email_sent'] = email_sent
            else:
                result['email_sent'] = False
            
            return result
            
        except Exception as e:
            logger.error(f"Error sending guardian feedback notification: {e}")
            return None
    
    def _should_send_email(self, user: User, notification_type: str) -> bool:
        """
        Check if email should be sent based on user preferences
        
        Args:
            user (User): User object
            notification_type (str): Type of notification
        
        Returns:
            bool: True if email should be sent
        """
        try:
            # Check user profile for notification preferences
            if user.profile and 'notification_preferences' in user.profile:
                preferences = user.profile['notification_preferences']
                
                # Check specific preference for AI feedback
                if notification_type in preferences:
                    return preferences[notification_type].get('email', True)
                
                # Check general email preference
                return preferences.get('email_enabled', True)
            
            # Default to sending emails if no preferences set
            return True
            
        except Exception as e:
            logger.error(f"Error checking email preferences for user {user.id}: {e}")
            return True  # Default to sending email on error
    
    def _send_tutor_feedback_email(self, tutor: User, session: Session) -> bool:
        """
        Send email notification to tutor about AI feedback
        
        Args:
            tutor (User): Tutor user object
            session (Session): Session object
        
        Returns:
            bool: True if email sent successfully
        """
        try:
            tutor_name = tutor.profile.get('name', tutor.email) if tutor.profile else tutor.email
            
            subject = f"AI Feedback Available - {session.title}"
            
            # Get course name if available
            course_name = "Course"
            if session.course_id:
                course = Course.query.get(session.course_id)
                if course:
                    course_name = course.title
            
            text_content = f"""
            Hi {tutor_name},

            AI-generated feedback is now available for your recent tutoring session.

            Session Details:
            - Title: {session.title}
            - Course: {course_name}
            - Date: {session.scheduled_date.strftime('%Y-%m-%d %H:%M') if session.scheduled_date else 'N/A'}
            - Duration: {session.duration or 'N/A'} minutes
            """
            
            if session.session_rating:
                text_content += f"- AI Rating: {session.session_rating}/5.0\n"
            
            text_content += """
            You can view your detailed AI feedback by logging into your tutor dashboard.

            The AI feedback includes:
            - Analysis of teaching effectiveness
            - Student engagement insights
            - Areas for improvement
            - Specific suggestions for future sessions

            Best regards,
            The Tutor Academy Team
            """
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h2 style="margin: 0;">🤖 AI Feedback Available</h2>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                        <p>Hi <strong>{tutor_name}</strong>,</p>
                        
                        <p>AI-generated feedback is now available for your recent tutoring session.</p>
                        
                        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <h3 style="margin-top: 0; color: #2d3748;">Session Details</h3>
                            <p><strong>Title:</strong> {session.title}</p>
                            <p><strong>Course:</strong> {course_name}</p>
                            <p><strong>Date:</strong> {session.scheduled_date.strftime('%Y-%m-%d %H:%M') if session.scheduled_date else 'N/A'}</p>
                            <p><strong>Duration:</strong> {session.duration or 'N/A'} minutes</p>
                            {f'<p><strong>AI Rating:</strong> <span style="color: #667eea; font-size: 1.1em; font-weight: bold;">{session.session_rating}/5.0</span></p>' if session.session_rating else ''}
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="margin-top: 0; color: #1565c0;">The AI feedback includes:</h4>
                            <ul style="margin: 10px 0;">
                                <li>Analysis of teaching effectiveness</li>
                                <li>Student engagement insights</li>
                                <li>Areas for improvement</li>
                                <li>Specific suggestions for future sessions</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <p>You can view your detailed AI feedback by logging into your tutor dashboard.</p>
                        </div>
                        
                        <p>Best regards,<br>
                        <strong>The Tutor Academy Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            return send_email(tutor.email, subject, text_content, html_content)
            
        except Exception as e:
            logger.error(f"Error sending tutor feedback email: {e}")
            return False
    
    def _send_guardian_feedback_email(self, guardian: User, student: User, session: Session, feedback: StudentSessionFeedback) -> bool:
        """
        Send email notification to guardian about AI feedback for their child
        
        Args:
            guardian (User): Guardian user object
            student (User): Student user object
            session (Session): Session object
            feedback (StudentSessionFeedback): Feedback object
        
        Returns:
            bool: True if email sent successfully
        """
        try:
            guardian_name = guardian.profile.get('name', guardian.email) if guardian.profile else guardian.email
            student_name = student.profile.get('name', 'Student') if student.profile else 'Student'
            
            subject = f"AI Learning Report for {student_name} - {session.title}"
            
            # Get course name if available
            course_name = "Course"
            if session.course_id:
                course = Course.query.get(session.course_id)
                if course:
                    course_name = course.title
            
            # Extract key insights from feedback
            feedback_preview = feedback.ai_guardian_feedback[:200] + "..." if len(feedback.ai_guardian_feedback) > 200 else feedback.ai_guardian_feedback
            
            text_content = f"""
            Hi {guardian_name},

            A personalized AI learning report is now available for {student_name}'s recent tutoring session.

            Session Details:
            - Title: {session.title}
            - Course: {course_name}
            - Date: {session.scheduled_date.strftime('%Y-%m-%d %H:%M') if session.scheduled_date else 'N/A'}
            - Duration: {session.duration or 'N/A'} minutes

            AI Feedback Preview:
            {feedback_preview}

            You can view the complete personalized report by logging into your guardian dashboard.

            The AI report includes:
            - {student_name}'s participation and engagement
            - Concepts covered and understood
            - Areas where {student_name} showed strength
            - Areas for continued focus and improvement
            - Suggestions for supporting {student_name}'s learning at home

            Best regards,
            The Tutor Academy Team
            """
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h2 style="margin: 0;">📊 AI Learning Report</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Personalized insights for {student_name}</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                        <p>Hi <strong>{guardian_name}</strong>,</p>
                        
                        <p>A personalized AI learning report is now available for <strong>{student_name}'s</strong> recent tutoring session.</p>
                        
                        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <h3 style="margin-top: 0; color: #2d3748;">Session Details</h3>
                            <p><strong>Title:</strong> {session.title}</p>
                            <p><strong>Course:</strong> {course_name}</p>
                            <p><strong>Date:</strong> {session.scheduled_date.strftime('%Y-%m-%d %H:%M') if session.scheduled_date else 'N/A'}</p>
                            <p><strong>Duration:</strong> {session.duration or 'N/A'} minutes</p>
                        </div>
                        
                        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                            <h4 style="margin-top: 0; color: #155724;">🤖 AI Feedback Preview</h4>
                            <p style="font-style: italic; color: #495057;">{feedback_preview}</p>
                        </div>
                        
                        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="margin-top: 0; color: #856404;">The AI report includes:</h4>
                            <ul style="margin: 10px 0;">
                                <li>{student_name}'s participation and engagement</li>
                                <li>Concepts covered and understood</li>
                                <li>Areas where {student_name} showed strength</li>
                                <li>Areas for continued focus and improvement</li>
                                <li>Suggestions for supporting {student_name}'s learning at home</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #e3f2fd; border-radius: 8px;">
                            <p style="margin: 0; color: #1565c0;"><strong>📱 View the complete personalized report by logging into your guardian dashboard.</strong></p>
                        </div>
                        
                        <p>Best regards,<br>
                        <strong>The Tutor Academy Team</strong></p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #666; text-align: center;">
                            This report was generated by our AI system to provide insights into {student_name}'s learning progress.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            return send_email(guardian.email, subject, text_content, html_content)
            
        except Exception as e:
            logger.error(f"Error sending guardian feedback email: {e}")
            return False
    
    def send_bulk_feedback_notifications(self, session_ids: List[str]) -> Dict:
        """
        Send AI feedback notifications for multiple sessions
        
        Args:
            session_ids (List[str]): List of session IDs to process
        
        Returns:
            Dict: Aggregated results of notification sending
        """
        try:
            total_results = {
                'processed_sessions': 0,
                'tutor_notifications': 0,
                'guardian_notifications': 0,
                'emails_sent': 0,
                'errors': []
            }
            
            for session_id in session_ids:
                try:
                    result = self.send_ai_feedback_notification(session_id)
                    total_results['processed_sessions'] += 1
                    total_results['tutor_notifications'] += result.get('tutor_notifications', 0)
                    total_results['guardian_notifications'] += result.get('guardian_notifications', 0)
                    total_results['emails_sent'] += result.get('emails_sent', 0)
                    total_results['errors'].extend(result.get('errors', []))
                    
                except Exception as e:
                    error_msg = f"Error processing session {session_id}: {e}"
                    total_results['errors'].append(error_msg)
                    logger.error(error_msg)
            
            logger.info(f"Bulk notification sending completed: {total_results}")
            return total_results
            
        except Exception as e:
            logger.error(f"Error in bulk notification sending: {e}")
            return {
                'processed_sessions': 0,
                'tutor_notifications': 0,
                'guardian_notifications': 0,
                'emails_sent': 0,
                'errors': [str(e)]
            }

# Singleton instance
notification_service = NotificationService()