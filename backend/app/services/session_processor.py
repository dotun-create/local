import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app import db
from app.models import Session, User, StudentSessionFeedback, AIPrompt, SystemConfig, Course
from app.services.zoom_service import zoom_service
from app.services.ai_service import ai_service
from app.services.notification_service import notification_service
from app.services.admin_notification_service import admin_notification_service
import logging
import uuid

class SessionStatusProcessor:
    """AI-powered session processing service"""
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.is_running = False
        self.logger = logging.getLogger(__name__)
        
        # Configure logging
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            ))
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def start_scheduler(self):
        """Start the scheduled job system"""
        if self.is_running:
            self.logger.warning("Session processor already running")
            return
        
        try:
            # Get job frequency from system config (default 24 hours)
            frequency_hours = self._get_job_frequency()
            
            # Add the processing job
            self.scheduler.add_job(
                func=self.process_pending_sessions,
                trigger=IntervalTrigger(hours=frequency_hours),
                id='session_ai_processor',
                name='AI Session Feedback Processor',
                replace_existing=True,
                max_instances=1  # Ensure only one instance runs at a time
            )
            
            # Start the scheduler
            self.scheduler.start()
            self.is_running = True
            
            self.logger.info(f"Session processor started - running every {frequency_hours} hours")
            
        except Exception as e:
            self.logger.error(f"Failed to start session processor: {e}")
            raise
    
    def stop_scheduler(self):
        """Stop the scheduled job system"""
        if not self.is_running:
            return
        
        try:
            self.scheduler.shutdown()
            self.is_running = False
            self.logger.info("Session processor stopped")
        except Exception as e:
            self.logger.error(f"Error stopping session processor: {e}")
    
    def update_job_frequency(self, hours: int):
        """Update the job frequency"""
        try:
            if self.is_running:
                # Reschedule the job
                self.scheduler.reschedule_job(
                    job_id='session_ai_processor',
                    trigger=IntervalTrigger(hours=hours)
                )
                self.logger.info(f"Job frequency updated to {hours} hours")
            else:
                self.logger.warning("Scheduler not running - frequency will be applied when started")
                
        except Exception as e:
            self.logger.error(f"Error updating job frequency: {e}")
    
    def _get_job_frequency(self) -> int:
        """Get job frequency from system config"""
        try:
            config = SystemConfig.query.filter_by(config_key='session_job_frequency_hours').first()
            if config:
                return int(config.config_value)
            else:
                # Set default if not exists
                default_config = SystemConfig(
                    id=f"config_{uuid.uuid4().hex[:8]}",
                    config_key='session_job_frequency_hours',
                    config_value='24'
                )
                db.session.add(default_config)
                db.session.commit()
                return 24
                
        except Exception as e:
            self.logger.error(f"Error getting job frequency: {e}")
            return 24  # Default fallback
    
    def process_pending_sessions(self):
        """Main processing pipeline - processes sessions eligible for AI feedback"""
        try:
            self.logger.info("Starting session processing job...")
            
            # Get sessions to process
            sessions_to_process = self._get_sessions_for_processing()
            
            if not sessions_to_process:
                self.logger.info("No sessions to process")
                return
            
            self.logger.info(f"Found {len(sessions_to_process)} sessions to process")
            
            processed_count = 0
            failed_count = 0
            
            for session in sessions_to_process:
                try:
                    success = self._process_single_session(session)
                    if success:
                        processed_count += 1
                    else:
                        failed_count += 1
                        
                except Exception as e:
                    self.logger.error(f"Error processing session {session.id}: {e}")
                    failed_count += 1
            
            self.logger.info(f"Session processing complete - Processed: {processed_count}, Failed: {failed_count}")
            
        except Exception as e:
            self.logger.error(f"Error in session processing job: {e}")
    
    def _get_sessions_for_processing(self) -> List[Session]:
        """Get sessions that are eligible for AI feedback processing"""
        try:
            # Get processing window from config (default 48 hours)
            cutoff_time = datetime.utcnow() - timedelta(hours=48)
            current_time = datetime.utcnow()
            
            # Query sessions that:
            # 1. Have status 'scheduled' (haven't been processed yet)
            # 2. Have ended (scheduled_date + duration < now)
            # 3. Are within the processing window (not too old)
            # 4. Have meeting_id for Zoom integration
            sessions = Session.query.filter(
                Session.status == 'scheduled',
                Session.meeting_id.isnot(None),
                # Session has ended
                Session.scheduled_date + db.text("INTERVAL '1 minute' * duration") < current_time,
                # Within processing window
                Session.scheduled_date > cutoff_time
            ).all()
            
            return sessions
            
        except Exception as e:
            self.logger.error(f"Error querying sessions for processing: {e}")
            return []
    
    def _process_single_session(self, session: Session) -> bool:
        """Process a single session for AI feedback"""
        try:
            self.logger.info(f"Processing session {session.id}")
            
            # Step 1: Validate meeting via Zoom
            meeting_data = self._validate_zoom_meeting(session)
            
            if not meeting_data['is_valid']:
                self.logger.info(f"Session {session.id} failed validation: {meeting_data.get('reason', 'Unknown')}")
                # Mark as incomplete
                session.status = 'incomplete'
                db.session.commit()
                return True  # Successfully processed (marked as incomplete)
            
            # Step 2: Get transcript
            transcript_data = zoom_service.get_meeting_transcript(session.meeting_id)
            
            if not transcript_data or not transcript_data.get('text'):
                self.logger.warning(f"No transcript available for session {session.id}")
                # Mark as completed without AI feedback
                session.status = 'completed_no_transcript'
                self._update_session_basic_info(session, meeting_data)
                db.session.commit()
                return True
            
            # Step 3: Generate tutor feedback
            tutor_feedback = self._generate_tutor_feedback(session, transcript_data)
            
            # Step 4: Generate individual guardian feedback
            student_feedback_data = self._generate_individual_guardian_feedback(session, transcript_data, meeting_data)
            
            # Step 5: Update session with all data
            self._update_session_complete(session, meeting_data, transcript_data, tutor_feedback)
            
            # Step 6: Save individual student feedback records
            self._save_student_feedback_records(session, student_feedback_data)
            
            # Step 7: Update tutor's overall rating
            self._recalculate_tutor_rating(session.tutor_id)
            
            # Step 8: Send notifications
            self._send_feedback_notifications(session)
            
            self.logger.info(f"Successfully processed session {session.id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error processing session {session.id}: {e}")
            return False
    
    def _send_feedback_notifications(self, session: Session):
        """Send notifications for AI feedback"""
        try:
            # Send notifications for both tutor and guardian feedback
            results = notification_service.send_ai_feedback_notification(session.id, 'both')
            
            self.logger.info(
                f"Notifications sent for session {session.id}: "
                f"{results.get('tutor_notifications', 0)} tutor, "
                f"{results.get('guardian_notifications', 0)} guardian, "
                f"{results.get('emails_sent', 0)} emails sent"
            )
            
            if results.get('errors'):
                self.logger.warning(f"Notification errors for session {session.id}: {results['errors']}")
                
        except Exception as e:
            self.logger.error(f"Error sending notifications for session {session.id}: {e}")
    
    def _validate_zoom_meeting(self, session: Session) -> Dict:
        """Validate meeting via Zoom API"""
        try:
            # Get meeting report from Zoom
            meeting_report = zoom_service.get_meeting_report(session.meeting_id)
            
            if not meeting_report:
                return {
                    'is_valid': False,
                    'reason': 'Could not retrieve meeting report from Zoom'
                }
            
            # Check minimum duration (15 minutes)
            duration_valid = zoom_service.validate_meeting_duration(meeting_report, 15)
            
            # Check attendance (tutor must be present)
            tutor = User.query.get(session.tutor_id)
            tutor_email = tutor.email if tutor else ""
            attendance_data = zoom_service.validate_meeting_attendance(meeting_report, tutor_email)
            
            is_valid = duration_valid and attendance_data.get('meeting_valid', False)
            
            return {
                'is_valid': is_valid,
                'duration': meeting_report.get('duration', 0),
                'participants_count': meeting_report.get('participants_count', 0),
                'participants': meeting_report.get('participants', []),
                'tutor_attended': attendance_data.get('tutor_attended', False),
                'meeting_report': meeting_report,
                'reason': 'Valid meeting' if is_valid else 'Failed duration or attendance validation'
            }
            
        except Exception as e:
            self.logger.error(f"Error validating meeting {session.meeting_id}: {e}")
            return {
                'is_valid': False,
                'reason': f'Validation error: {str(e)}'
            }
    
    def _generate_tutor_feedback(self, session: Session, transcript_data: Dict) -> Dict:
        """Generate AI feedback for the tutor"""
        try:
            # Get tutor feedback prompt
            prompt = self._get_prompt('tutor_feedback_prompt')
            if not prompt:
                return {'success': False, 'error': 'Tutor feedback prompt not found'}
            
            # Prepare session context
            session_context = {
                'title': session.title,
                'course_name': session.course.title if session.course else 'N/A',
                'duration': session.duration,
                'session_date': session.scheduled_date.strftime('%Y-%m-%d') if session.scheduled_date else '',
                'participants_count': len(session.students)
            }
            
            # Generate feedback using AI service
            return ai_service.generate_tutor_feedback(
                transcript_data['text'],
                prompt,
                session_context
            )
            
        except Exception as e:
            self.logger.error(f"Error generating tutor feedback: {e}")
            return {'success': False, 'error': str(e)}
    
    def _generate_individual_guardian_feedback(self, session: Session, transcript_data: Dict, meeting_data: Dict) -> List[Dict]:
        """Generate individual feedback for each student's guardian"""
        try:
            # Get guardian feedback prompt
            prompt = self._get_prompt('guardian_feedback_prompt')
            if not prompt:
                return []
            
            student_feedback_data = []
            
            # Process each enrolled student
            for student in session.students:
                # Get student's guardian
                guardian = self._get_student_guardian(student.id)
                if not guardian:
                    continue
                
                # Get student's attendance info
                student_attendance = zoom_service.get_student_attendance_info(
                    meeting_data.get('meeting_report', {}),
                    student.email
                )
                
                # Prepare contexts
                student_context = {
                    'student_name': student.profile.get('name', student.email) if student.profile else student.email,
                    'student_grade': student.profile.get('grade_level', 'N/A') if student.profile else 'N/A',
                    'guardian_name': guardian.profile.get('name', guardian.email) if guardian.profile else guardian.email,
                    'student_attendance': student_attendance
                }
                
                session_context = {
                    'title': session.title,
                    'course_name': session.course.title if session.course else 'N/A',
                    'duration': session.duration,
                    'session_date': session.scheduled_date.strftime('%Y-%m-%d') if session.scheduled_date else ''
                }
                
                # Generate AI feedback
                feedback_result = ai_service.generate_individual_guardian_feedback(
                    transcript_data['text'],
                    prompt,
                    student_context,
                    session_context
                )
                
                if feedback_result.get('success'):
                    metrics = feedback_result.get('performance_metrics', {})
                    student_feedback_data.append({
                        'student_id': student.id,
                        'guardian_id': guardian.id,
                        'feedback': feedback_result['feedback'],
                        'performance_summary': metrics.get('summary', ''),
                        'areas_of_improvement': metrics.get('improvements', ''),
                        'strengths_highlighted': metrics.get('strengths', '')
                    })
            
            return student_feedback_data
            
        except Exception as e:
            self.logger.error(f"Error generating guardian feedback: {e}")
            return []
    
    def _get_student_guardian(self, student_id: str) -> Optional[User]:
        """Get guardian for a student"""
        try:
            # Look in enrollments for guardian relationship
            from app.models import Enrollment
            enrollment = Enrollment.query.filter_by(student_id=student_id).first()
            if enrollment and enrollment.guardian_id:
                return User.query.get(enrollment.guardian_id)
            
            # Alternative: check student profile for guardian info
            student = User.query.get(student_id)
            if student and student.profile and student.profile.get('guardian'):
                guardian_email = student.profile['guardian']
                return User.query.filter_by(email=guardian_email).first()
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting guardian for student {student_id}: {e}")
            return None
    
    def _get_prompt(self, prompt_name: str) -> Optional[str]:
        """Get AI prompt template from database"""
        try:
            prompt = AIPrompt.query.filter_by(prompt_name=prompt_name).first()
            if prompt:
                return prompt.prompt_content
            
            # Create default prompts if they don't exist
            default_prompts = ai_service.get_default_prompts()
            if prompt_name in default_prompts:
                new_prompt = AIPrompt(
                    id=f"prompt_{uuid.uuid4().hex[:8]}",
                    prompt_name=prompt_name,
                    prompt_content=default_prompts[prompt_name]
                )
                db.session.add(new_prompt)
                db.session.commit()
                return new_prompt.prompt_content
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting prompt {prompt_name}: {e}")
            return None
    
    def _update_session_basic_info(self, session: Session, meeting_data: Dict):
        """Update session with basic meeting info (no AI feedback)"""
        session.zoom_meeting_duration = meeting_data.get('duration', 0)
        session.zoom_participants_count = meeting_data.get('participants_count', 0)
        participants = meeting_data.get('participants', [])
        if participants:
            participant_names = [p.get('user_name', 'Unknown') for p in participants[:5]]
            if len(participants) > 5:
                session.participants_summary = f"{', '.join(participant_names)} and {len(participants) - 5} others"
            else:
                session.participants_summary = ', '.join(participant_names)
        else:
            session.participants_summary = f"{meeting_data.get('participants_count', 0)} participants attended"
    
    def _update_session_complete(self, session: Session, meeting_data: Dict, transcript_data: Dict, tutor_feedback: Dict):
        """Update session with all processed data"""
        session.status = 'completed'
        session.transcript_text = transcript_data.get('text', '')
        session.transcript_language = transcript_data.get('language', 'en')
        
        if tutor_feedback.get('success'):
            session.ai_tutor_feedback = tutor_feedback['feedback']
            session.session_rating = tutor_feedback['rating']
        
        session.zoom_meeting_duration = meeting_data.get('duration', 0)
        session.zoom_participants_count = meeting_data.get('participants_count', 0)
        participants = meeting_data.get('participants', [])
        if participants:
            participant_names = [p.get('user_name', 'Unknown') for p in participants[:5]]
            if len(participants) > 5:
                session.participants_summary = f"{', '.join(participant_names)} and {len(participants) - 5} others"
            else:
                session.participants_summary = ', '.join(participant_names)
        else:
            session.participants_summary = f"{meeting_data.get('participants_count', 0)} participants attended"
        session.feedback_generated_at = datetime.utcnow()
        
        db.session.commit()
    
    def _save_student_feedback_records(self, session: Session, student_feedback_data: List[Dict]):
        """Save individual student feedback records"""
        try:
            for feedback_data in student_feedback_data:
                student_feedback = StudentSessionFeedback(
                    id=f"feedback_{uuid.uuid4().hex[:8]}",
                    session_id=session.id,
                    student_id=feedback_data['student_id'],
                    guardian_id=feedback_data['guardian_id'],
                    ai_guardian_feedback=feedback_data['feedback'],
                    student_performance_summary=feedback_data['performance_summary'],
                    areas_of_improvement=feedback_data['areas_of_improvement'],
                    strengths_highlighted=feedback_data['strengths_highlighted']
                )
                
                db.session.add(student_feedback)
            
            db.session.commit()
            
        except Exception as e:
            self.logger.error(f"Error saving student feedback records: {e}")
            db.session.rollback()
    
    def _recalculate_tutor_rating(self, tutor_id: str):
        """Recalculate tutor's overall rating based on session ratings"""
        try:
            # Get average rating from all sessions with ratings
            from sqlalchemy import func
            avg_rating = db.session.query(func.avg(Session.session_rating)).filter(
                Session.tutor_id == tutor_id,
                Session.session_rating.isnot(None)
            ).scalar()
            
            if avg_rating:
                tutor = User.query.get(tutor_id)
                if tutor:
                    # Update tutor's profile with new rating
                    if not tutor.profile:
                        tutor.profile = {}
                    tutor.profile['rating'] = round(float(avg_rating), 2)
                    db.session.commit()
                    
        except Exception as e:
            self.logger.error(f"Error recalculating tutor rating for {tutor_id}: {e}")
    
    def process_completed_session(self, session: Session, meeting_data: Dict):
        """
        Process a session that was completed (triggered by webhook)
        
        Args:
            session: The session that was completed
            meeting_data: Meeting data from Zoom webhook
        """
        try:
            self.logger.info(f"Processing completed session {session.id} from webhook")
            
            # Update basic session info first
            self._update_session_basic_info(session, meeting_data)
            db.session.commit()
            
            # Check if AI processing is enabled
            ai_enabled = os.getenv('AI_SESSION_PROCESSOR_ENABLED', 'false').lower() == 'true'
            
            if ai_enabled and self.ai_service:
                try:
                    # Try to get transcript if available
                    transcript_data = {}
                    meeting_uuid = meeting_data.get('uuid')
                    
                    if meeting_uuid and hasattr(self, '_get_zoom_transcript'):
                        transcript_data = self._get_zoom_transcript(meeting_uuid)
                    
                    # Generate AI feedback if we have transcript
                    if transcript_data.get('text'):
                        tutor_feedback = self._generate_tutor_feedback(
                            session, transcript_data['text']
                        )
                        
                        # Update session with complete data
                        self._update_session_complete(
                            session, meeting_data, transcript_data, tutor_feedback
                        )
                        
                        # Set status to analyzed when AI processing completes successfully
                        session.status = 'analyzed'
                        db.session.commit()
                        self.logger.info(f"AI processing completed for session {session.id} - status set to analyzed")
                    else:
                        self.logger.info(f"No transcript available for session {session.id}, skipping AI processing")
                        # Keep status as completed since no transcript means no AI analysis possible
                        
                except Exception as ai_error:
                    self.logger.error(f"AI processing failed for session {session.id}: {str(ai_error)}")
                    # Notify admin of AI analysis failure
                    try:
                        admin_notification_service.notify_ai_analysis_failed(session, str(ai_error))
                    except Exception as notify_error:
                        self.logger.error(f"Failed to send admin notification: {str(notify_error)}")
                    # Keep status as ready_for_analysis for potential retry
            else:
                self.logger.info(f"AI processing disabled or not configured for session {session.id}")
                # If AI is disabled, mark as analyzed since manual review would be the alternative
                if session.status == 'ready_for_analysis':
                    session.status = 'analyzed'
                    db.session.commit()
                    self.logger.info(f"AI processing disabled - session {session.id} marked as analyzed")
            
        except Exception as e:
            self.logger.error(f"Error processing completed session {session.id}: {str(e)}")
            # Don't raise exception to avoid failing webhook
    
    def process_transcript_from_url(self, session: Session, transcript_url: str):
        """
        Download and process transcript from URL
        
        Args:
            session: The session to update
            transcript_url: URL to download transcript from
        """
        try:
            self.logger.info(f"Processing transcript from URL for session {session.id}")
            
            # Download transcript
            import requests
            response = requests.get(transcript_url, timeout=30)
            
            if response.status_code == 200:
                transcript_text = response.text
                
                # Update session with transcript
                session.transcript_text = transcript_text
                session.transcript_language = 'en'  # Default, could be detected
                
                # Generate AI feedback if enabled
                ai_enabled = os.getenv('AI_SESSION_PROCESSOR_ENABLED', 'false').lower() == 'true'
                
                if ai_enabled and self.ai_service and transcript_text:
                    try:
                        tutor_feedback = self._generate_tutor_feedback(session, transcript_text)
                        
                        if tutor_feedback.get('success'):
                            session.ai_tutor_feedback = tutor_feedback['feedback']
                            session.session_rating = tutor_feedback['rating']
                            session.feedback_generated_at = datetime.utcnow()
                        
                        # Set status to analyzed when AI processing completes successfully
                        session.status = 'analyzed'
                        self.logger.info(f"AI feedback generation completed for session {session.id}")
                        
                    except Exception as ai_error:
                        self.logger.error(f"AI feedback generation failed for session {session.id}: {str(ai_error)}")
                        # Notify admin of AI analysis failure
                        try:
                            admin_notification_service.notify_ai_analysis_failed(session, str(ai_error))
                        except Exception as notify_error:
                            self.logger.error(f"Failed to send admin notification: {str(notify_error)}")
                        # Keep status as ready_for_analysis for potential retry
                        return
                else:
                    # AI disabled but transcript available - mark as analyzed for manual review
                    session.status = 'analyzed'
                    self.logger.info(f"AI disabled - session {session.id} marked as analyzed for manual review")
                
                db.session.commit()
                self.logger.info(f"Transcript processed successfully for session {session.id}")
                
            else:
                self.logger.error(f"Failed to download transcript: {response.status_code} from {transcript_url}")
                # Notify admin of transcript download failure
                try:
                    admin_notification_service.notify_transcript_download_failed(
                        session,
                        f"HTTP {response.status_code}: Failed to download transcript from Zoom",
                        transcript_url
                    )
                except Exception as notify_error:
                    self.logger.error(f"Failed to send admin notification: {str(notify_error)}")
                
        except Exception as e:
            self.logger.error(f"Error processing transcript from URL for session {session.id}: {str(e)}")
            # Notify admin of transcript processing failure
            try:
                admin_notification_service.notify_transcript_download_failed(
                    session,
                    f"Exception during transcript processing: {str(e)}",
                    transcript_url if 'transcript_url' in locals() else 'Unknown URL'
                )
            except Exception as notify_error:
                self.logger.error(f"Failed to send admin notification: {str(notify_error)}")
    
    def _get_zoom_transcript(self, meeting_uuid: str) -> Dict:
        """
        Get transcript from Zoom API
        
        Args:
            meeting_uuid: The meeting UUID
            
        Returns:
            Dict with transcript data
        """
        try:
            # This would use zoom_service to get transcript
            # Implementation depends on Zoom API availability
            self.logger.info(f"Attempting to get transcript for meeting {meeting_uuid}")
            
            # Placeholder - implement actual Zoom transcript retrieval
            return {
                'success': False,
                'text': '',
                'language': 'en',
                'message': 'Transcript retrieval not yet implemented'
            }
            
        except Exception as e:
            self.logger.error(f"Error getting Zoom transcript: {str(e)}")
            return {
                'success': False,
                'text': '',
                'error': str(e)
            }
    
    def manual_process_session(self, session_id: str) -> Dict:
        """Manually process a specific session (for testing/admin use)"""
        try:
            session = Session.query.get(session_id)
            if not session:
                return {'success': False, 'error': 'Session not found'}
            
            success = self._process_single_session(session)
            
            return {
                'success': success,
                'message': f'Session {session_id} processed successfully' if success else f'Failed to process session {session_id}'
            }
            
        except Exception as e:
            self.logger.error(f"Error in manual session processing: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_processing_stats(self) -> Dict:
        """Get statistics about session processing"""
        try:
            total_sessions = Session.query.filter(Session.status.in_(['completed', 'incomplete', 'completed_no_transcript'])).count()
            sessions_with_ai = Session.query.filter(Session.ai_tutor_feedback.isnot(None)).count()
            student_feedback_count = StudentSessionFeedback.query.count()
            
            # Recent processing (last 7 days)
            recent_cutoff = datetime.utcnow() - timedelta(days=7)
            recent_processing = Session.query.filter(
                Session.feedback_generated_at >= recent_cutoff
            ).count()
            
            return {
                'total_processed_sessions': total_sessions,
                'sessions_with_ai_feedback': sessions_with_ai,
                'student_feedback_records': student_feedback_count,
                'recent_processing_count': recent_processing,
                'processing_rate': round((sessions_with_ai / total_sessions * 100) if total_sessions > 0 else 0, 2),
                'scheduler_running': self.is_running
            }
            
        except Exception as e:
            self.logger.error(f"Error getting processing stats: {e}")
            return {'error': str(e)}

# Global instance
session_processor = SessionStatusProcessor()